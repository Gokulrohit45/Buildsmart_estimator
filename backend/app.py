"""
BuildSmart AI Estimator – Flask Application Entry Point
Registers all blueprints and exposes a health-check endpoint.
"""

import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env before anything else
load_dotenv()

app = Flask(__name__)

# Allow requests only from explicitly trusted origins (no wildcards)
allowed_origins = os.environ.get(
    "CORS_ALLOWED_ORIGINS", 
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
).split(",")
CORS(app, origins=allowed_origins, supports_credentials=True)


# ── Enforce Content-Type Header Validation ───────────────────────────────────
@app.before_request
def enforce_json_content_type():
    """
    Validates the Content-Type header on incoming state-changing requests.
    Rejects requests with unexpected content types with a 415 error.
    """
    if request.method in ['POST', 'PUT', 'PATCH']:
        path = request.path
        if path.startswith('/api/'):
            # Allow multipart/form-data for bulk rates import route
            if path == '/api/admin/rates/import':
                return
            
            content_type = request.content_type or ''
            if 'application/json' not in content_type.lower():
                return jsonify({'error': 'Content-Type must be application/json.'}), 415


# ── Enforce Session Lifecycle & Block Check ────────────────────────────────
@app.before_request
def check_user_status():
    """
    Enforces immediate session invalidation if a builder account is blocked.
    Checks user's approval status in the database on every authenticated request.
    """
    # Bypass auth endpoints and public APIs
    path = request.path
    bypass_prefixes = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/forgot-password',
        '/api/auth/verify-otp',
        '/api/auth/reset-password',
        '/api/health'
    ]
    if any(path.startswith(prefix) for prefix in bypass_prefixes) or path == '/':
        return

    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[len('Bearer '):]
        try:
            from services.db import get_supabase_user, supabase_admin
            user_response = get_supabase_user(token)
            user = user_response.user
            if user:
                # Query database profile status
                profile_resp = (
                    supabase_admin
                    .table('profiles')
                    .select('is_approved, role')
                    .eq('id', user.id)
                    .single()
                    .execute()
                )
                profile = profile_resp.data
                if profile:
                    is_approved = profile.get('is_approved')
                    role = profile.get('role')
                    
                    # If not approved and not admin, reject access immediately
                    if not is_approved and role != 'admin':
                        from services.audit import log_audit_event
                        log_audit_event(user.id, "BLOCKED_USER_ATTEMPT", request.remote_addr, status="FAILED", details=f"Attempted to access {path}")
                        return jsonify({'error': 'Account is blocked or pending approval. Please contact admin.'}), 403
        except Exception:
            # Let individual endpoint's get_user_id_from_token raise token validation errors
            pass


# ── Welcome & Status Root Route ────────────────────────────────────────────
@app.route('/')
def home():
    """Welcome page showcasing the AI Estimator Status."""
    return jsonify({
        'status': 'active',
        'system': 'Buildsmart 360 API Engine',
        'message': 'Buildsmart 360 backend is running properly. Systems: AI Estimator (Active), Database (Connected), Auth Service (Online).',
        'documentation': 'Access /api/health for system status check.'
    })

# ── Register blueprints ────────────────────────────────────────────────────
from routes.auth      import auth_bp
from routes.projects  import projects_bp
from routes.estimates import estimates_bp
from routes.admin     import admin_bp

app.register_blueprint(auth_bp)
app.register_blueprint(projects_bp)
app.register_blueprint(estimates_bp)
app.register_blueprint(admin_bp)


# ── Health-check ───────────────────────────────────────────────────────────
@app.route('/api/health')
def health():
    """Simple liveness probe."""
    return jsonify({'status': 'ok', 'version': '1.0.0'})


# ── Security HTTP Response Headers ──────────────────────────────────────────
@app.after_request
def add_security_headers(response):
    """
    Appends mandatory security headers to all outbound HTTP responses.
    """
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    # Secure Content Security Policy (CSP)
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "connect-src 'self' https://*.supabase.co;"
    )
    
    # Remove deprecated/information-exposing headers if present
    response.headers.pop('X-Powered-By', None)
    response.headers.pop('X-XSS-Protection', None)
    
    return response


# ── Entry point ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    port  = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'true').lower() in ('true', '1', 'yes')
    app.run(host='0.0.0.0', port=port, debug=debug)
