from flask import Flask, redirect, url_for, render_template, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime
import os
from .config import Config

db = SQLAlchemy()
login_manager = LoginManager()
csrf = CSRFProtect()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    limiter.init_app(app)
    
    # Configure login manager
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'يرجى تسجيل الدخول للوصول إلى هذه الصفحة'
    login_manager.login_message_category = 'warning'
    
    # Root route
    @app.route('/')
    def index():
        return redirect(url_for('document.index'))
    
    # Security headers
    @app.after_request
    def add_security_headers(response):
        response.headers.update(app.config['SECURITY_HEADERS'])
        return response
    
    # Offline route
    @app.route('/offline')
    def offline():
        return render_template('offline.html')
    
    # Manifest route
    @app.route('/app.webmanifest')
    def manifest():
        return send_from_directory(app.static_folder, 'app.webmanifest', 
                                 mimetype='application/manifest+json')
    
    # Service worker route
    @app.route('/sw.js')
    def service_worker():
        return send_from_directory(app.static_folder, 'sw.js', 
                                 mimetype='application/javascript')
    
    # Register blueprints
    from app.controllers.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    from app.controllers.document import bp as document_bp
    app.register_blueprint(document_bp, url_prefix='/documents')
    
    from app.controllers.scanner import bp as scanner_bp
    app.register_blueprint(scanner_bp, url_prefix='/scanner')
    
    # Add template context processor for current date
    @app.context_processor
    def inject_now():
        return {'now': datetime.utcnow()}
    
    # Create required directories if they don't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(app.static_folder, 'images'), exist_ok=True)
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app