from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
import os
from flask import redirect, url_for
from datetime import datetime

db = SQLAlchemy()
login_manager = LoginManager()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///archive.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
    
    # Ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'يرجى تسجيل الدخول للوصول إلى هذه الصفحة'
    
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
    
    # Add root route redirect
    @app.route('/')
    def index():
        return redirect(url_for('document.index'))
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app