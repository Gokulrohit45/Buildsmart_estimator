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
