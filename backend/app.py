"""
BuildSmart AI Estimator – Flask Application Entry Point
Registers all blueprints and exposes a health-check endpoint.
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env before anything else
load_dotenv()

app = Flask(__name__)

# Allow requests from the Vite dev server and any local React app
CORS(app, origins=[
    'http://localhost:5173',
    'http://localhost:3000',
])

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


# ── Entry point ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    port  = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'true').lower() in ('true', '1', 'yes')
    app.run(host='0.0.0.0', port=port, debug=debug)
