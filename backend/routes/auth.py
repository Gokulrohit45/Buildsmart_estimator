"""
Authentication routes for BuildSmart AI Estimator.
Handles user registration, login, and profile retrieval.
"""

from flask import Blueprint, request, jsonify
from services.db import supabase_admin

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/auth')


# ---------------------------------------------------------------------------
# POST /api/auth/register
# ---------------------------------------------------------------------------
@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new builder account.
    Body: { email, password, company_name, phone, city, gstin }
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
        gstin        = data.get('gstin', '').strip()

        if not email or not password:
            return jsonify({'error': 'Email and password are required.'}), 400

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

        # Update the auto-created profile row with business details & auto-approve directly
        profile_update = (
            supabase_admin
            .table('profiles')
            .update({
                'company_name': company_name,
                'phone':        phone,
                'city':         city,
                'gstin':        gstin,
                'is_approved':  True,
            })
            .eq('id', user.id)
            .execute()
        )

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

        email    = data.get('email', '').strip()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required.'}), 400

        # Sign in via password flow
        auth_response = supabase_admin.auth.sign_in_with_password({
            'email':    email,
            'password': password,
        })

        session = auth_response.session
        user    = auth_response.user

        if not session or not user:
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
            return jsonify({'error': 'Profile not found.'}), 404

        # Enforce admin approval gate
        if not profile.get('is_approved', False):
            return jsonify({'error': 'Account pending admin approval.'}), 403

        return jsonify({
            'success': True,
            'token':   session.access_token,
            'user': {
                'id':           user.id,
                'email':        user.email,
                'role':         profile.get('role'),
                'company_name': profile.get('company_name'),
                'city':         profile.get('city'),
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
        user_response = supabase_admin.auth.get_user(token)
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

        return jsonify({
            'id':           user.id,
            'email':        user.email,
            'role':         profile.get('role'),
            'company_name': profile.get('company_name'),
            'city':         profile.get('city'),
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
            .select('id')
            .eq('email', email)
            .execute()
        )
        if not profile_response.data:
            return jsonify({'error': 'No account found with this email address.'}), 404

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
                    <h2 style="color: #0f766e; text-align: center;">BuildSmart AI Estimator</h2>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p>Hello,</p>
                    <p>We received a request to reset your password. Use the following 6-digit One-Time Password (OTP) to proceed:</p>
                    <div style="background-color: #f0fdfa; border: 1px solid #5eead4; border-radius: 6px; padding: 16px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #0f766e; letter-spacing: 6px;">{otp}</span>
                    </div>
                    <p style="color: #64748b; font-size: 13px;">This OTP is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="font-size: 12px; color: #94a3b8; text-align: center;">© 2026 BuildSmart AI. Built for Indian Builders.</p>
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

        # Query OTP table
        otp_response = (
            supabase_admin
            .table('password_reset_otps')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .execute()
        )

        if not otp_response.data:
            return jsonify({'error': 'Invalid OTP code.'}), 400

        otp_record = otp_response.data[0]

        # Check expiry
        from datetime import datetime, timezone
        expires_at = datetime.fromisoformat(otp_record['expires_at'].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires_at:
            return jsonify({'error': 'OTP has expired. Please request a new one.'}), 400

        # Mark as verified
        supabase_admin.table('password_reset_otps').update({'verified': True}).eq('email', email).execute()

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

        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters.'}), 400

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

        # Update password using admin client
        supabase_admin.auth.admin.update_user_by_id(
            user_id,
            attributes={'password': password}
        )

        # Delete OTP record
        supabase_admin.table('password_reset_otps').delete().eq('email', email).execute()

        return jsonify({'success': True, 'message': 'Password has been reset successfully. You can now log in.'}), 200

    except Exception as exc:
        return jsonify({'error': str(exc)}), 500
