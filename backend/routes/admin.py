"""
Admin routes for BuildSmart AI Estimator.
Handles user management, material rates, system settings, and analytics.
All routes require an authenticated admin user.
"""

import csv
import io
from flask import Blueprint, request, jsonify
from services.db import supabase_admin, get_supabase_user

admin_bp = Blueprint('admin_bp', __name__, url_prefix='/api/admin')



# ---------------------------------------------------------------------------
# Helper – verify caller is an authenticated admin
# ---------------------------------------------------------------------------
def is_admin(req):
    """
    Validate the Bearer token and confirm the caller's role is 'admin'.

    Returns:
        str: admin user UUID on success.

    Raises:
        PermissionError: if token is missing, invalid, or role != 'admin'.
    """
    auth_header = req.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        raise PermissionError('Missing or invalid Authorization header.')

    token = auth_header[len('Bearer '):]

    try:
        user_response = get_supabase_user(token)
        user = user_response.user
    except Exception as exc:
        raise PermissionError(f'Token validation failed: {exc}')

    if not user:
        raise PermissionError('Invalid or expired token.')

    profile_response = (
        supabase_admin
        .table('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .execute()
    )

    profile = profile_response.data
    if not profile or profile.get('role') != 'admin':
        raise PermissionError('Admin access required.')

    return user.id


# ============================================================================
# USER MANAGEMENT
# ============================================================================

# ---------------------------------------------------------------------------
# GET /api/admin/users
# ---------------------------------------------------------------------------
@admin_bp.route('/users', methods=['GET'])
def list_users():
    """Return all user profiles."""
    try:
        is_admin(request)

        response = (
            supabase_admin
            .table('profiles')
            .select('*')
            .order('created_at', desc=True)
            .execute()
        )

        return jsonify({'success': True, 'data': response.data}), 200

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# PUT /api/admin/users/<user_id>/approve
# ---------------------------------------------------------------------------
@admin_bp.route('/users/<user_id>/approve', methods=['PUT'])
def approve_user(user_id):
    """Approve a builder account."""
    try:
        admin_id = is_admin(request)

        supabase_admin.table('profiles').update(
            {'is_approved': True}
        ).eq('id', user_id).execute()

        from services.audit import log_audit_event
        log_audit_event(admin_id, "APPROVE_USER", request.remote_addr, target_id=user_id, status="SUCCESS")

        return jsonify({'success': True, 'message': f'User {user_id} approved.'}), 200

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# PUT /api/admin/users/<user_id>/block
# ---------------------------------------------------------------------------
@admin_bp.route('/users/<user_id>/block', methods=['PUT'])
def block_user(user_id):
    """Block (revoke approval of) a builder account."""
    try:
        admin_id = is_admin(request)

        supabase_admin.table('profiles').update(
            {'is_approved': False}
        ).eq('id', user_id).execute()

        from services.audit import log_audit_event
        log_audit_event(admin_id, "BLOCK_USER", request.remote_addr, target_id=user_id, status="SUCCESS")

        return jsonify({'success': True, 'message': f'User {user_id} blocked.'}), 200

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# DELETE /api/admin/users/<user_id>
# ---------------------------------------------------------------------------
@admin_bp.route('/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Permanently delete a builder or admin account."""
    try:
        current_admin_id = is_admin(request)
        if current_admin_id == user_id:
            return jsonify({'error': 'Cannot delete your own admin account.'}), 400

        supabase_admin.auth.admin.delete_user(user_id)

        from services.audit import log_audit_event
        log_audit_event(current_admin_id, "DELETE_USER", request.remote_addr, target_id=user_id, status="SUCCESS")

        return jsonify({'success': True, 'message': f'User {user_id} deleted successfully.'}), 200

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ============================================================================
# MATERIAL RATES
# ============================================================================

# ---------------------------------------------------------------------------
# GET /api/admin/rates
# ---------------------------------------------------------------------------
@admin_bp.route('/rates', methods=['GET'])
def list_rates():
    """
    Return material rates, optionally filtered by city.
    Query param: ?city=Mumbai
    Joins material_rates with material_master for name and category.
    """
    try:
        is_admin(request)

        city_filter = request.args.get('city', '').strip()

        query = (
            supabase_admin
            .table('material_rates')
            .select('*, material_master(name, category, unit)')
            .order('city')
            .order('material_code')
        )

        if city_filter:
            query = query.eq('city', city_filter)

        response = query.execute()

        return jsonify({'success': True, 'data': response.data}), 200

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# POST /api/admin/rates/import
# ---------------------------------------------------------------------------
@admin_bp.route('/rates/import', methods=['POST'])
def import_rates():
    """
    Import rates in bulk from a CSV file.
    Expects multipart/form-data with a 'file' key.
    CSV Columns: city, material_code, rate, vendor
    """
    try:
        admin_id = is_admin(request)
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file part in the request.'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected for uploading.'}), 400
            
        if not file.filename.lower().endswith('.csv'):
            return jsonify({'error': 'Only CSV files are supported.'}), 400

        # Read CSV data
        stream = io.StringIO(file.stream.read().decode("utf-8"), newline=None)
        reader = csv.DictReader(stream)
        
        records_to_insert = []
        errors = []
        row_num = 1
        
        for row in reader:
            row_num += 1
            city = (row.get('city') or 'Default').strip()
            material_code = row.get('material_code', '').strip().upper()
            rate_str = row.get('rate', '').strip()
            vendor = row.get('vendor', '').strip()
            
            if not city or not material_code or not rate_str:
                errors.append(f"Row {row_num}: Missing required columns (material_code, rate)")
                continue
                
            try:
                rate = float(rate_str)
            except ValueError:
                errors.append(f"Row {row_num}: Invalid rate value '{rate_str}'")
                continue
                
            records_to_insert.append({
                'city': city,
                'material_code': material_code,
                'rate': rate,
                'vendor': vendor
            })
            
        if errors:
            return jsonify({'error': 'CSV Validation failed', 'details': errors}), 400
            
        if not records_to_insert:
            return jsonify({'error': 'No valid records found in CSV.'}), 400
            
        # Delete existing entries first to avoid constraint conflicts or duplicates
        for record in records_to_insert:
            supabase_admin.table('material_rates').delete().eq('city', record['city']).eq('material_code', record['material_code']).execute()
            
        supabase_admin.table('material_rates').insert(records_to_insert).execute()
        
        from services.audit import log_audit_event
        log_audit_event(admin_id, "IMPORT_RATES", request.remote_addr, status="SUCCESS", details=f"Successfully imported {len(records_to_insert)} rates.")

        return jsonify({'success': True, 'message': f'Successfully imported {len(records_to_insert)} rates.'}), 200

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# POST /api/admin/rates
# ---------------------------------------------------------------------------
@admin_bp.route('/rates', methods=['POST'])
def create_rate():
    """
    Insert a new material rate entry.
    Body: { city, material_code, rate, vendor }
    """
    try:
        is_admin(request)
        data = request.get_json(force=True) or {}

        city          = (data.get('city') or 'Default').strip()
        material_code = data.get('material_code', '').strip()
        rate          = data.get('rate')
        vendor        = data.get('vendor', '').strip()

        if not city or not material_code or rate is None:
            return jsonify({'error': 'material_code and rate are required.'}), 400

        response = (
            supabase_admin
            .table('material_rates')
            .insert({
                'city':          city,
                'material_code': material_code,
                'rate':          rate,
                'vendor':        vendor,
            })
            .execute()
        )

        created = response.data[0] if response.data else {}
        return jsonify({'success': True, 'data': created}), 201

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# PUT /api/admin/rates/<rate_id>
# ---------------------------------------------------------------------------
@admin_bp.route('/rates/<rate_id>', methods=['PUT'])
def update_rate(rate_id):
    """
    Update an existing material rate.
    Body: { rate, vendor }
    """
    try:
        is_admin(request)
        data = request.get_json(force=True) or {}

        update_payload = {}
        if 'rate'   in data: update_payload['rate']   = data['rate']
        if 'vendor' in data: update_payload['vendor'] = data['vendor']

        if not update_payload:
            return jsonify({'error': 'No updatable fields provided.'}), 400

        response = (
            supabase_admin
            .table('material_rates')
            .update(update_payload)
            .eq('id', rate_id)
            .execute()
        )

        updated = response.data[0] if response.data else {}
        return jsonify({'success': True, 'data': updated}), 200

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# DELETE /api/admin/rates/<rate_id>
# ---------------------------------------------------------------------------
@admin_bp.route('/rates/<rate_id>', methods=['DELETE'])
def delete_rate(rate_id):
    """Delete a material rate entry."""
    try:
        is_admin(request)

        supabase_admin.table('material_rates').delete().eq('id', rate_id).execute()

        return jsonify({'success': True, 'message': f'Rate {rate_id} deleted.'}), 200

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ============================================================================
# SYSTEM SETTINGS
# ============================================================================

# ---------------------------------------------------------------------------
# GET /api/admin/settings
# ---------------------------------------------------------------------------
@admin_bp.route('/settings', methods=['GET'])
def list_settings():
    """Return all system settings as a flat { key: value } dict."""
    try:
        is_admin(request)

        response = (
            supabase_admin
            .table('system_settings')
            .select('key, value')
            .execute()
        )

        settings_dict = {row['key']: row['value'] for row in (response.data or [])}

        return jsonify({'success': True, 'data': settings_dict}), 200

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# PUT /api/admin/settings  –  Bulk update settings
# ---------------------------------------------------------------------------
@admin_bp.route('/settings', methods=['PUT'])
def update_settings_bulk():
    """
    Update (upsert) multiple system settings in bulk.
    Body: { settings: { key: value, ... } } or directly { key: value, ... }
    """
    try:
        admin_id = is_admin(request)
        data = request.get_json(force=True) or {}
        
        settings_to_update = data.get('settings') if 'settings' in data else data
        
        if not isinstance(settings_to_update, dict):
            return jsonify({'error': 'Invalid payload format. Expected dict.'}), 400
            
        payload = [{'key': k, 'value': str(v)} for k, v in settings_to_update.items()]
        
        if payload:
            supabase_admin.table('system_settings').upsert(payload, on_conflict='key').execute()
            
        from services.audit import log_audit_event
        log_audit_event(admin_id, "UPDATE_SETTINGS", request.remote_addr, status="SUCCESS", details=f"Bulk updated {len(payload)} keys.")

        return jsonify({'success': True, 'message': f"Updated {len(payload)} settings successfully."}), 200
        
    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# PUT /api/admin/settings/<key>
# ---------------------------------------------------------------------------
@admin_bp.route('/settings/<key>', methods=['PUT'])
def update_setting(key):
    """
    Update (upsert) a system setting by its key.
    Body: { value }
    """
    try:
        admin_id = is_admin(request)
        data  = request.get_json(force=True) or {}
        value = data.get('value')

        if value is None:
            return jsonify({'error': "'value' is required."}), 400

        # Upsert: update if exists, insert if not
        supabase_admin.table('system_settings').upsert(
            {'key': key, 'value': value},
            on_conflict='key'
        ).execute()

        from services.audit import log_audit_event
        log_audit_event(admin_id, "UPDATE_SETTINGS", request.remote_addr, target_id=key, status="SUCCESS", details=f"Set to: {value}")

        return jsonify({'success': True, 'message': f"Setting '{key}' updated."}), 200

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ============================================================================
# ANALYTICS
# ============================================================================

# ---------------------------------------------------------------------------
# GET /api/admin/analytics
# ---------------------------------------------------------------------------
@admin_bp.route('/analytics', methods=['GET'])
def get_analytics():
    """
    Return high-level platform analytics:
    - Total builder accounts
    - Total estimates generated
    - Unique cities covered
    - 10 most recent estimates with project and profile info
    """
    try:
        is_admin(request)

        # Total builders (role = 'builder')
        builders_resp = (
            supabase_admin
            .table('profiles')
            .select('id', count='exact')
            .eq('role', 'builder')
            .execute()
        )
        total_builders = builders_resp.count if builders_resp.count is not None else len(builders_resp.data or [])

        # Total estimates
        estimates_resp = (
            supabase_admin
            .table('estimates')
            .select('id', count='exact')
            .execute()
        )
        total_estimates = estimates_resp.count if estimates_resp.count is not None else len(estimates_resp.data or [])

        # Unique cities (from projects)
        cities_resp = (
            supabase_admin
            .table('projects')
            .select('location')
            .execute()
        )
        unique_cities = list({
            row['location']
            for row in (cities_resp.data or [])
            if row.get('location')
        })

        # Query all estimates to calculate city stats
        all_estimates_resp = (
            supabase_admin
            .table('estimates')
            .select('grand_total, projects(location)')
            .execute()
        )
        
        city_map = {}
        for est in (all_estimates_resp.data or []):
            proj = est.get('projects') or {}
            city = proj.get('location') or 'Unknown'
            val = float(est.get('grand_total') or 0.0)
            
            if city not in city_map:
                city_map[city] = {
                    'city': city,
                    'estimate_count': 0,
                    'total_value': 0.0
                }
            city_map[city]['estimate_count'] += 1
            city_map[city]['total_value'] += val
            
        city_stats = list(city_map.values())

        # Recent 10 estimates with joined project + profile info
        recent_resp = (
            supabase_admin
            .table('estimates')
            .select(
                'id, grand_total, status, generated_at, version, '
                'projects(id, name, location, building_type, builder_id, '
                'profiles(id, company_name, city, email))'
            )
            .order('generated_at', desc=True)
            .limit(10)
            .execute()
        )

        return jsonify({
            'success': True,
            'data': {
                'total_builders':  total_builders,
                'total_estimates': total_estimates,
                'unique_cities':   unique_cities,
                'total_cities':    len(unique_cities),
                'city_stats':      city_stats,
                'recent_estimates': recent_resp.data or [],
            },
        }), 200

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# POST /api/admin/create-admin
# ---------------------------------------------------------------------------
@admin_bp.route('/create-admin', methods=['POST'])
def create_admin():
    """
    Create a new admin user account.
    Body: { email, password }
    """
    try:
        is_admin(request)
        data = request.get_json(force=True) or {}
        email = data.get('email', '').strip()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required.'}), 400

        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters.'}), 400

        # Create auth user using service role client
        auth_response = supabase_admin.auth.admin.create_user({
            'email': email,
            'password': password,
            'email_confirm': True,
        })

        user = auth_response.user
        if not user:
            return jsonify({'error': 'Failed to create admin user.'}), 500

        # Force role='admin' and is_approved=True in profiles
        supabase_admin.table('profiles').update({
            'company_name': 'BuildSmart Administrator',
            'role': 'admin',
            'is_approved': True,
        }).eq('id', user.id).execute()

        return jsonify({'success': True, 'message': f'Admin user {email} created successfully.'}), 201

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# PUT /api/admin/users/<user_id>/change-password
# ---------------------------------------------------------------------------
@admin_bp.route('/users/<user_id>/change-password', methods=['PUT'])
def change_user_password(user_id):
    """
    Update the password of an existing user account.
    Body: { password }
    """
    try:
        admin_id = is_admin(request)
        data = request.get_json(force=True) or {}
        new_password = data.get('password', '')

        if not new_password:
            return jsonify({'error': 'New password is required.'}), 400

        if len(new_password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters.'}), 400

        # Update user password using Supabase Auth Admin API
        supabase_admin.auth.admin.update_user_by_id(
            user_id,
            attributes={'password': new_password}
        )

        from services.audit import log_audit_event
        log_audit_event(admin_id, "ADMIN_CHANGE_USER_PASSWORD", request.remote_addr, target_id=user_id, status="SUCCESS")

        return jsonify({'success': True, 'message': 'Password updated successfully.'}), 200

    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# GET /api/admin/city-indexes
# ---------------------------------------------------------------------------
@admin_bp.route('/city-indexes', methods=['GET'])
def list_city_indexes():
    """List all city cost indexes."""
    try:
        is_admin(request)
        response = (
            supabase_admin
            .table('city_indexes')
            .select('*')
            .order('city')
            .execute()
        )
        return jsonify({'success': True, 'data': response.data or []}), 200
    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# PUT /api/admin/city-indexes/<city>
# ---------------------------------------------------------------------------
@admin_bp.route('/city-indexes/<city>', methods=['PUT'])
def update_city_index(city):
    """Update or upsert a city cost index."""
    try:
        admin_id = is_admin(request)
        data = request.get_json(force=True) or {}
        cost_index = data.get('cost_index')

        if cost_index is None:
            return jsonify({'error': "'cost_index' is required."}), 400

        state = data.get('state', 'India').strip()
        from datetime import datetime

        response = (
            supabase_admin
            .table('city_indexes')
            .upsert({
                'city': city,
                'state': state,
                'cost_index': float(cost_index),
                'last_updated': datetime.utcnow().isoformat()
            }, on_conflict='city')
            .execute()
        )

        from services.audit import log_audit_event
        log_audit_event(admin_id, "UPDATE_CITY_INDEX", request.remote_addr, target_id=city, status="SUCCESS", details=f"Index set to: {cost_index}")

        return jsonify({'success': True, 'message': f"Cost Index for '{city}' updated to {cost_index}."}), 200
    except PermissionError as pe:
        return jsonify({'error': str(pe)}), 403
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500
