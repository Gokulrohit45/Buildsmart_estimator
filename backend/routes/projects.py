"""
Project management routes for BuildSmart AI Estimator.
Handles CRUD operations for builder projects.
"""

from flask import Blueprint, request, jsonify
from services.db import supabase_admin

projects_bp = Blueprint('projects_bp', __name__, url_prefix='/api/projects')


# ---------------------------------------------------------------------------
# Helpers for database check constraint compatibility
# Maps 'Base' (UI) to 'Budget' (DB constraint)
# ---------------------------------------------------------------------------
def map_quality_to_db(q):
    if q == 'Base':
        return 'Budget'
    return q

def map_quality_from_db(q):
    if q == 'Budget':
        return 'Base'
    return q


# Helper – extract authenticated user id from Bearer token
def get_user_id_from_token(req):
    """
    Extract and validate the Bearer token from the request Authorization header.

    Returns:
        str: The authenticated user's UUID.

    Raises:
        ValueError: If the header is missing, malformed, or the token is invalid.
    """
    auth_header = req.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        raise ValueError('Missing or invalid Authorization header.')

    token = auth_header[len('Bearer '):]

    try:
        user_response = supabase_admin.auth.get_user(token)
        user = user_response.user
    except Exception as exc:
        raise ValueError(f'Token validation failed: {exc}')

    if not user:
        raise ValueError('Invalid or expired token.')

    return user.id


# ---------------------------------------------------------------------------
# GET /api/projects  –  list all projects for authenticated builder
# ---------------------------------------------------------------------------
@projects_bp.route('', methods=['GET'])
def list_projects():
    """
    Return all projects belonging to the authenticated builder,
    including a nested array of their estimates.
    """
    try:
        user_id = get_user_id_from_token(request)

        response = (
            supabase_admin
            .table('projects')
            .select('*, estimates(id, grand_total, generated_at, status)')
            .eq('builder_id', user_id)
            .order('created_at', desc=True)
            .execute()
        )

        projects_data = response.data or []
        for p in projects_data:
            if 'quality' in p:
                p['quality'] = map_quality_from_db(p['quality'])

        return jsonify({'success': True, 'data': projects_data}), 200


    except ValueError as ve:
        return jsonify({'error': str(ve)}), 401
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# POST /api/projects  –  create a new project
# ---------------------------------------------------------------------------
@projects_bp.route('', methods=['POST'])
def create_project():
    """
    Create a new project for the authenticated builder.
    Body: { name, location, building_type, total_sqft, floors,
            bedrooms, bathrooms, quality }
    """
    try:
        user_id = get_user_id_from_token(request)
        data    = request.get_json(force=True) or {}

        name          = data.get('name', '').strip()
        location      = data.get('location', '').strip()
        building_type = (data.get('building_type') or data.get('buildingType') or 'Residential Villa').strip()
        total_sqft    = data.get('total_sqft') or data.get('totalSqft')
        floors        = data.get('floors')
        bedrooms      = data.get('bedrooms')
        bathrooms     = data.get('bathrooms')
        quality       = data.get('quality', '').strip()

        if not name:
            return jsonify({'error': 'Project name is required.'}), 400

        insert_payload = {
            'builder_id':    user_id,
            'name':          name,
            'location':      location,
            'building_type': building_type,
            'total_sqft':    total_sqft,
            'floors':        floors,
            'bedrooms':      bedrooms,
            'bathrooms':     bathrooms,
            'quality':       map_quality_to_db(quality),
        }

        response = (
            supabase_admin
            .table('projects')
            .insert(insert_payload)
            .execute()
        )

        created = response.data[0] if response.data else {}
        if 'quality' in created:
            created['quality'] = map_quality_from_db(created['quality'])
        return jsonify({'success': True, 'data': created}), 201

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 401
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# GET /api/projects/<project_id>  –  get a single project
# ---------------------------------------------------------------------------
@projects_bp.route('/<project_id>', methods=['GET'])
def get_project(project_id):
    """
    Return a single project by ID if it belongs to the authenticated builder.
    """
    try:
        user_id = get_user_id_from_token(request)

        response = (
            supabase_admin
            .table('projects')
            .select('*, estimates(id, grand_total, generated_at, status)')
            .eq('id', project_id)
            .eq('builder_id', user_id)
            .single()
            .execute()
        )

        if not response.data:
            return jsonify({'error': 'Project not found.'}), 404

        project = response.data
        if 'quality' in project:
            project['quality'] = map_quality_from_db(project['quality'])

        return jsonify({'success': True, 'data': project}), 200


    except ValueError as ve:
        return jsonify({'error': str(ve)}), 401
    except Exception as exc:
        # Supabase raises when .single() finds no rows
        if 'No rows found' in str(exc) or 'PGRST116' in str(exc):
            return jsonify({'error': 'Project not found.'}), 404
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# DELETE /api/projects/<project_id>  –  delete a project
# ---------------------------------------------------------------------------
@projects_bp.route('/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """
    Delete a project if it belongs to the authenticated builder.
    """
    try:
        user_id = get_user_id_from_token(request)

        # Verify ownership before deletion
        check = (
            supabase_admin
            .table('projects')
            .select('id')
            .eq('id', project_id)
            .eq('builder_id', user_id)
            .single()
            .execute()
        )

        if not check.data:
            return jsonify({'error': 'Project not found or access denied.'}), 404

        supabase_admin.table('projects').delete().eq('id', project_id).execute()

        return jsonify({'success': True, 'message': 'Project deleted.'}), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 401
    except Exception as exc:
        if 'No rows found' in str(exc) or 'PGRST116' in str(exc):
            return jsonify({'error': 'Project not found or access denied.'}), 404
        return jsonify({'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# GET /api/projects/settings  –  fetch public system settings for builders
# ---------------------------------------------------------------------------
@projects_bp.route('/settings', methods=['GET'])
def get_public_settings():
    """
    Return all system settings as a flat { key: value } dict for builders.
    Allows builders to see what turnkey features are included in each package.
    """
    try:
        get_user_id_from_token(request)

        response = (
            supabase_admin
            .table('system_settings')
            .select('key, value')
            .execute()
        )

        settings_dict = {row['key']: row['value'] for row in (response.data or [])}
        return jsonify({'success': True, 'data': settings_dict}), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 401
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500

