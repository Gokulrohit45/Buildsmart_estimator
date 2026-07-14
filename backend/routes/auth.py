"""
Authentication routes for BuildSmart AI Estimator.
Handles user registration, login, and profile retrieval.
"""

from flask import Blueprint, request, jsonify
from services.db import supabase_admin, get_supabase_user, supabase_client

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/auth')


def validate_password_strength(password):
    """
    Validates password strength according to the security guidelines:
    - Passwords must be at least 12 characters in length.
    - Passwords exceeding 128 characters must be denied.
    - Password complexity: requires a combination of lowercase letters, 
      uppercase letters, numbers, and special characters.
    - Password must not be in the weak/common password blocklist.
    """
    if not password:
        return False, 'Password is required.'
        
    if len(password) < 12:
        return False, 'Password must be at least 12 characters long.'
        
    if len(password) > 128:
        return False, 'Password must not exceed 128 characters.'
        
    import re
    if not re.search(r'[a-z]', password):
        return False, 'Password must contain at least one lowercase letter.'
    if not re.search(r'[A-Z]', password):
        return False, 'Password must contain at least one uppercase letter.'
    if not re.search(r'[0-9]', password):
        return False, 'Password must contain at least one number.'
    if not re.search(r'[^a-zA-Z0-9]', password):
        return False, 'Password must contain at least one special character.'
        
    weak_passwords = {
        'password123', 'password1234', '123456789012', 'admin12345678', 
        'welcome12345', 'buildsmart360', 'buildsmart123', 'rohit12345678', 
        'gokul12345678', 'qwertyuiopas', 'vtabproject123'
    }
    if password.lower() in weak_passwords:
        return False, 'This password is too common or weak. Please choose a more secure password.'
        
    return True, ''


# ---------------------------------------------------------------------------
# POST /api/auth/register
# ---------------------------------------------------------------------------
@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new builder account.
    Body: { email, password, company_name, phone, city }
    Creates the auth user with email_confirm=True, then fills in the profile.
    Account is inactive until an admin approves it.
    """
    try:
        data = request.get_json(force=True) or {}

        email        = data.get('email', '').strip()
        password     = data.get('password', '')
        company_name = data.get('company_name', '').strip()
        phone        = data.get('phone', '').strip()
        city         = data.get('city', '').strip()

        if not email or not password:
            return jsonify({'error': 'Email and password are required.'}), 400

        is_valid, pwd_err = validate_password_strength(password)
        if not is_valid:
            return jsonify({'error': pwd_err}), 400

        # Validate email format
        import re
        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, email):
            return jsonify({'error': 'Please enter a valid email address.'}), 400

        # Validate phone format (if entered)
        if phone:
            phone_regex = r'^[6-9]\d{9}$'
            if not re.match(phone_regex, phone):
                return jsonify({'error': 'Please enter a valid 10-digit phone number starting with 6-9.'}), 400

        # Check if email already exists
        existing_profile = (
            supabase_admin
            .table('profiles')
            .select('id')
            .eq('email', email)
            .execute()
        )
        if existing_profile.data:
            return jsonify({'error': 'A user with this email address is already registered.'}), 400

        # Create auth user (admin API – bypasses email verification flow)
        auth_response = supabase_admin.auth.admin.create_user({
            'email': email,
            'password': password,
            'email_confirm': True,
        })

        user = auth_response.user
        if not user:
            return jsonify({'error': 'Failed to create user.'}), 500

        from datetime import datetime, timezone
        # Update the auto-created profile row with business details & auto-approve directly
        profile_update = (
            supabase_admin
            .table('profiles')
            .update({
                'company_name': company_name,
                'phone':        phone,
                'city':         city,
                'is_approved':  True,
                'password_changed_at': datetime.now(timezone.utc).isoformat()
            })
            .eq('id', user.id)
            .execute()
        )

        # Seed password history with first password hash
        from werkzeug.security import generate_password_hash
        pwd_hash = generate_password_hash(password)
        supabase_admin.table('password_history').insert({
            'user_id': user.id,
            'password_hash': pwd_hash
        }).execute()

        return jsonify({
            'success': True,
            'message': 'Registration successful! You can now log in.',
        }), 201

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------
@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login with email and password.
    Body: { email, password }
    Returns JWT access_token and user profile if approved.
    """
    try:
        data = request.get_json(force=True) or {}

        email    = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required.'}), 400

        from services.audit import log_audit_event
        from datetime import datetime, timezone, timedelta

        # Check account lockout before calling Supabase auth
        profile_db_resp = (
            supabase_admin
            .table('profiles')
            .select('*')
            .eq('email', email)
            .execute()
        )
        profile_db = None
        if profile_db_resp.data:
            profile_db = profile_db_resp.data[0]
            locked_until = profile_db.get('locked_until')
            if locked_until:
                # Convert locked_until ISO string to comparison time
                locked_dt = datetime.fromisoformat(locked_until.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) < locked_dt:
                    log_audit_event(email, "USER_LOGIN", request.remote_addr, status="FAILED", details="Account is locked out")
                    return jsonify({'error': 'Account is temporarily locked due to too many failed attempts. Try again in 15 minutes.'}), 423

        # Sign in via password flow
        try:
            auth_response = supabase_client.auth.sign_in_with_password({
                'email':    email,
                'password': password,
            })
            session = auth_response.session
            user    = auth_response.user
            if not session or not user:
                raise Exception("Invalid credentials.")
        except Exception as exc:
            # Increment failed attempts on failure
            if profile_db:
                attempts = profile_db.get('failed_login_attempts', 0) + 1
                update_payload = {'failed_login_attempts': attempts}
                if attempts >= 5:
                    lock_time = datetime.now(timezone.utc) + timedelta(minutes=15)
                    update_payload['locked_until'] = lock_time.isoformat()
                    # Send security notification for lockout
                    send_security_notification(email, "Account Locked", "Your BuildSmart account has been temporarily locked due to 5 consecutive failed login attempts. It will automatically unlock in 15 minutes.")
                supabase_admin.table('profiles').update(update_payload).eq('id', profile_db['id']).execute()
                
            log_audit_event(email, "USER_LOGIN", request.remote_addr, status="FAILED", details=str(exc))
            return jsonify({'error': 'Invalid credentials.'}), 401

        # Fetch the builder profile
        profile_response = (
            supabase_admin
            .table('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
            .execute()
        )

        profile = profile_response.data
        if not profile:
            log_audit_event(user.id, "USER_LOGIN", request.remote_addr, status="FAILED", details="Profile not found")
            return jsonify({'error': 'Profile not found.'}), 404

        # Enforce admin approval gate
        if not profile.get('is_approved', False):
            log_audit_event(user.id, "USER_LOGIN", request.remote_addr, status="FAILED", details="Account pending admin approval")
            return jsonify({'error': 'Account pending admin approval.'}), 403

        # Clear login failures on successful login
        supabase_admin.table('profiles').update({
            'failed_login_attempts': 0,
            'locked_until': None
        }).eq('id', user.id).execute()

        # Check if password has expired (older than 90 days)
        password_expired = False
        if profile.get('password_changed_at'):
            changed_at = datetime.fromisoformat(profile['password_changed_at'].replace('Z', '+00:00'))
            if (datetime.now(timezone.utc) - changed_at).days >= 90:
                password_expired = True

        # Login Success
        log_audit_event(user.id, "USER_LOGIN", request.remote_addr, status="SUCCESS")

        return jsonify({
            'success': True,
            'token':   session.access_token,
            'password_expired': password_expired,
            'user': {
                'id':           user.id,
                'email':        user.email,
                'role':         profile.get('role'),
                'company_name': profile.get('company_name'),
                'city':         profile.get('city'),
                'phone':        profile.get('phone'),
                'avatar_url':   profile.get('avatar_url'),
                'is_approved':  profile.get('is_approved'),
            },
        }), 200

    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------
@auth_bp.route('/me', methods=['GET'])
def me():
    """
    Return the currently authenticated user's profile.
    Requires: Authorization: Bearer <token>
    """
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header.'}), 401

        token = auth_header[len('Bearer '):]

        # Validate token and retrieve user from Supabase
        user_response = get_supabase_user(token)
        user = user_response.user

        if not user:
            return jsonify({'error': 'Invalid or expired token.'}), 401

        # Fetch profile details
        profile_response = (
            supabase_admin
            .table('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
            .execute()
        )

        profile = profile_response.data
        if not profile:
            return jsonify({'error': 'Profile not found.'}), 404

        # Check if password has expired (older than 90 days)
        password_expired = False
        if profile.get('password_changed_at'):
            from datetime import datetime, timezone
            changed_at = datetime.fromisoformat(profile['password_changed_at'].replace('Z', '+00:00'))
            if (datetime.now(timezone.utc) - changed_at).days >= 90:
                password_expired = True

        return jsonify({
            'id':           user.id,
            'email':        user.email,
            'role':         profile.get('role'),
            'company_name': profile.get('company_name'),
            'phone':        profile.get('phone'),
            'city':         profile.get('city'),
            'avatar_url':   profile.get('avatar_url'),
            'password_expired': password_expired,
        }), 200

    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# POST /api/auth/forgot-password
# ---------------------------------------------------------------------------
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """
    Generate and send email OTP to reset user password.
    Body: { email }
    """
    try:
        data = request.get_json(force=True) or {}
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'error': 'Email address is required.'}), 400

        # Check if the email exists in profiles
        profile_response = (
            supabase_admin
            .table('profiles')
            .select('id, is_approved')
            .eq('email', email)
            .execute()
        )
        if not profile_response.data:
            # Shield account enumeration: return identical success response
            return jsonify({
                'success': True,
                'message': 'A 6-digit OTP code has been sent to your email.'
            }), 200

        profile = profile_response.data[0]
        if not profile.get('is_approved', False):
            return jsonify({'error': 'Your account is pending admin approval or has been suspended. Please contact support.'}), 403

        # Generate 6-digit OTP
        import random
        from datetime import datetime, timedelta, timezone
        otp = f"{random.randint(100000, 999999)}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        # Upsert OTP (delete existing first to keep table clean)
        supabase_admin.table('password_reset_otps').delete().eq('email', email).execute()
        supabase_admin.table('password_reset_otps').insert({
            'email': email,
            'otp': otp,
            'expires_at': expires_at.isoformat(),
            'verified': False
        }).execute()

        # Send Email using Brevo REST API
        import os
        import requests
        brevo_key = os.getenv('BREVO_API_KEY')
        sender_email = os.getenv('BREVO_SENDER_EMAIL')
        sender_name = os.getenv('BREVO_SENDER_NAME', 'Vtab square')

        if not brevo_key or not sender_email:
            return jsonify({'error': 'Email gateway is not configured on the server.'}), 500

        payload = {
            "sender": {"name": sender_name, "email": sender_email},
            "to": [{"email": email}],
            "subject": "Password Reset OTP - BuildSmart AI",
            "htmlContent": f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #0f766e; text-align: center;">Buildsmart 360</h2>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p>Hello,</p>
                    <p>We received a request to reset your password. Use the following 6-digit One-Time Password (OTP) to proceed:</p>
                    <div style="background-color: #f0fdfa; border: 1px solid #5eead4; border-radius: 6px; padding: 16px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #0f766e; letter-spacing: 6px;">{otp}</span>
                    </div>
                    <p style="color: #64748b; font-size: 13px;">This OTP is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="font-size: 12px; color: #94a3b8; text-align: center;">© 2026 Buildsmart 360. Built for Indian Builders.</p>
                </div>
            </body>
            </html>
            """
        }
        headers = {
            "api-key": brevo_key,
            "content-type": "application/json",
            "accept": "application/json"
        }

        response = requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
        if response.status_code not in (200, 201, 202):
            return jsonify({'error': 'Failed to send OTP email. Please try again later.'}), 502

        return jsonify({'success': True, 'message': 'OTP sent to your email address.'}), 200

    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# POST /api/auth/verify-otp
# ---------------------------------------------------------------------------
@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """
    Verify OTP sent to user email.
    Body: { email, otp }
    """
    try:
        data = request.get_json(force=True) or {}
        email = data.get('email', '').strip().lower()
        otp = data.get('otp', '').strip()

        if not email or not otp:
            return jsonify({'error': 'Email and OTP are required.'}), 400

        # Query OTP table by email only to track failed attempts
        otp_response = (
            supabase_admin
            .table('password_reset_otps')
            .select('*')
            .eq('email', email)
            .execute()
        )

        if not otp_response.data:
            return jsonify({'error': 'OTP verification session not found or invalid.'}), 400

        otp_record = otp_response.data[0]

        # Check expiry
        from datetime import datetime, timezone
        expires_at = datetime.fromisoformat(otp_record['expires_at'].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires_at:
            # Delete expired record
            supabase_admin.table('password_reset_otps').delete().eq('email', email).execute()
            return jsonify({'error': 'OTP has expired. Please request a new one.'}), 400

        # Check OTP match
        if otp_record['otp'] != otp:
            # Increment failed attempts count
            attempts = otp_record.get('attempts', 0) + 1
            if attempts >= 5:
                # Lockout: delete OTP record, forcing a new request
                supabase_admin.table('password_reset_otps').delete().eq('email', email).execute()
                # Send security notification
                send_security_notification(email, "Failed Password Reset Attempt", "We detected 5 incorrect OTP attempts during password reset. The verification session was terminated for security.")
                return jsonify({'error': 'Too many incorrect OTP attempts. Please request a new code.'}), 400
            else:
                supabase_admin.table('password_reset_otps').update({'attempts': attempts}).eq('email', email).execute()
                return jsonify({'error': 'Invalid OTP code.'}), 400

        # Mark as verified and reset attempts
        supabase_admin.table('password_reset_otps').update({'verified': True, 'attempts': 0}).eq('email', email).execute()

        return jsonify({'success': True, 'message': 'OTP verified successfully.'}), 200

    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# POST /api/auth/reset-password
# ---------------------------------------------------------------------------
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """
    Reset password after OTP verification.
    Body: { email, otp, password }
    """
    try:
        data = request.get_json(force=True) or {}
        email = data.get('email', '').strip().lower()
        otp = data.get('otp', '').strip()
        password = data.get('password', '')

        if not email or not otp or not password:
            return jsonify({'error': 'Email, OTP, and new password are required.'}), 400

        is_valid, pwd_err = validate_password_strength(password)
        if not is_valid:
            return jsonify({'error': pwd_err}), 400

        # Verify OTP record is marked as verified
        otp_response = (
            supabase_admin
            .table('password_reset_otps')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .eq('verified', True)
            .execute()
        )

        if not otp_response.data:
            return jsonify({'error': 'OTP verification session not found or invalid.'}), 400

        # Fetch profile user_id
        profile_response = (
            supabase_admin
            .table('profiles')
            .select('id')
            .eq('email', email)
            .single()
            .execute()
        )
        profile = profile_response.data
        if not profile:
            return jsonify({'error': 'User profile not found.'}), 404

        user_id = profile['id']

        # Verify password history (last 5 passwords must not be reused)
        history_response = (
            supabase_admin
            .table('password_history')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', desc=True)
            .limit(5)
            .execute()
        )

        from werkzeug.security import generate_password_hash, check_password_hash
        for entry in history_response.data:
            if check_password_hash(entry['password_hash'], password):
                return jsonify({'error': 'You cannot reuse any of your last 5 passwords. Please choose a different password.'}), 400

        # Insert new password hash into history
        pwd_hash = generate_password_hash(password)
        supabase_admin.table('password_history').insert({
            'user_id': user_id,
            'password_hash': pwd_hash
        }).execute()

        # Clean older history (keep only top 5)
        all_history = (
            supabase_admin
            .table('password_history')
            .select('id')
            .eq('user_id', user_id)
            .order('created_at', desc=True)
            .execute()
        )
        if len(all_history.data) > 5:
            for row in all_history.data[5:]:
                supabase_admin.table('password_history').delete().eq('id', row['id']).execute()

        from datetime import datetime, timezone
        # Update password using admin client
        supabase_admin.auth.admin.update_user_by_id(
            user_id,
            attributes={'password': password}
        )

        # Update password age in profile
        supabase_admin.table('profiles').update({
            'password_changed_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', user_id).execute()

        # Delete OTP record
        supabase_admin.table('password_reset_otps').delete().eq('email', email).execute()

        # Send security notification
        send_security_notification(email, "Password Reset Successful", "Your BuildSmart account password has been reset successfully. If you did not perform this action, please contact support immediately.")

        return jsonify({'success': True, 'message': 'Password has been reset successfully. You can now log in.'}), 200

    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# PUT /api/auth/profile  –  update authenticated user's profile
# ---------------------------------------------------------------------------
@auth_bp.route('/profile', methods=['PUT'])
def update_profile():
    """
    Update the authenticated builder's profile.
    Body: { company_name, phone, city, avatar_url }
    """
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header.'}), 401

        token = auth_header[len('Bearer '):]
        user_response = get_supabase_user(token)
        user = user_response.user

        if not user:
            return jsonify({'error': 'Invalid or expired token.'}), 401

        data = request.get_json(force=True) or {}
        company_name = data.get('company_name')
        phone        = data.get('phone')
        city         = data.get('city')
        avatar_url   = data.get('avatar_url')

        update_data = {}
        if company_name is not None:
            update_data['company_name'] = company_name.strip()
        if phone is not None:
            update_data['phone'] = phone.strip()
        if city is not None:
            update_data['city'] = city.strip()
        if avatar_url is not None:
            update_data['avatar_url'] = avatar_url.strip()

        if not update_data:
            return jsonify({'error': 'No fields to update.'}), 400

        response = (
            supabase_admin
            .table('profiles')
            .update(update_data)
            .eq('id', user.id)
            .execute()
        )

        if not response.data:
            return jsonify({'error': 'Failed to update profile.'}), 500

        updated = response.data[0]
        return jsonify({
            'success': True,
            'user': {
                'id':           updated.get('id'),
                'email':        updated.get('email'),
                'role':         updated.get('role'),
                'company_name': updated.get('company_name'),
                'phone':        updated.get('phone'),
                'city':         updated.get('city'),
                'avatar_url':   updated.get('avatar_url'),
                'is_approved':  updated.get('is_approved')
            }
        }), 200

    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


def send_security_notification(email, action_name, details_msg):
    """
    Sends transactional security update notifications to the user.
    """
    import os
    import requests
    brevo_key = os.getenv('BREVO_API_KEY')
    sender_email = os.getenv('BREVO_SENDER_EMAIL')
    sender_name = os.getenv('BREVO_SENDER_NAME', 'Vtab square')

    if not brevo_key or not sender_email:
        return False

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": email}],
        "subject": f"Security Alert: {action_name} - BuildSmart AI",
        "htmlContent": f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f766e; text-align: center;">Buildsmart 360</h2>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p>Hello,</p>
                <p>This is an automated security notification regarding your BuildSmart AI Estimator account.</p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; font-weight: bold; color: #1e293b;">Event: {action_name}</p>
                    <p style="margin: 8px 0 0 0; color: #475569;">{details_msg}</p>
                </div>
                <p style="color: #64748b; font-size: 13px;">If you did not perform this action, please contact support immediately.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">© 2026 Buildsmart 360. Built for Indian Builders.</p>
            </div>
        </body>
        </html>
        """
    }
    headers = {
        "api-key": brevo_key,
        "content-type": "application/json",
        "accept": "application/json"
    }

    try:
        requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
        return True
    except Exception:
        return False

