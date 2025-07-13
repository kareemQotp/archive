from flask_login import UserMixin
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from app import db, login_manager
from datetime import datetime, timedelta
from sqlalchemy.ext.associationproxy import association_proxy
import re

# Initialize Argon2 password hasher with secure parameters
ph = PasswordHasher(
    time_cost=3,  # Iterations
    memory_cost=65536,  # 64MB memory usage
    parallelism=4,  # Number of parallel threads
    hash_len=32,  # Length of the hash in bytes
    salt_len=16  # Length of the salt in bytes
)

class User(UserMixin, db.Model):
    """User model for authentication and user management."""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100))
    role = db.Column(db.String(20), default='user')
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime)
    failed_login_attempts = db.Column(db.Integer, default=0)
    last_failed_login = db.Column(db.DateTime)
    password_changed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    uploaded_documents = db.relationship('Document', backref='uploader', lazy=True,
                                      foreign_keys='Document.uploaded_by_id')
    
    def __init__(self, username, password, email=None, full_name=None, role='user'):
        self.username = username
        self.set_password(password)
        self.email = email
        self.full_name = full_name
        self.role = role
        self.password_changed_at = datetime.utcnow()
    
    @property
    def is_admin(self):
        """Check if user has admin role."""
        return self.role == 'admin'
    
    @property
    def is_archive_officer(self):
        """Check if user is an archive manager."""
        return self.role == 'archive_officer'
    
    @property
    def is_documentation_user(self):
        """Check if user is a documentation user."""
        return self.role == 'documentation'
    
    def set_password(self, password):
        """Hash password before storing."""
        if not self._is_password_strong(password):
            raise ValueError('Password does not meet security requirements')
        self.password_hash = ph.hash(password)
        self.password_changed_at = datetime.utcnow()
    
    def check_password(self, password):
        """Verify password against stored hash."""
        try:
            ph.verify(self.password_hash, password)
            # Check if hash needs to be updated
            if ph.check_needs_rehash(self.password_hash):
                self.password_hash = ph.hash(password)
            return True
        except VerifyMismatchError:
            return False
    
    def _is_password_strong(self, password):
        """
        Check if password meets security requirements:
        - At least 12 characters long
        - Contains uppercase and lowercase letters
        - Contains numbers
        - Contains special characters
        """
        if len(password) < 12:
            return False
        if not re.search(r'[A-Z]', password):
            return False
        if not re.search(r'[a-z]', password):
            return False
        if not re.search(r'\d', password):
            return False
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            return False
        return True
    
    def record_login_attempt(self, success):
        """Record login attempt success/failure."""
        if success:
            self.failed_login_attempts = 0
            self.last_login = datetime.utcnow()
        else:
            self.failed_login_attempts += 1
            self.last_failed_login = datetime.utcnow()
    
    @property
    def is_locked(self):
        """Check if account is locked due to failed login attempts."""
        if self.failed_login_attempts >= 5:
            # Check if lockout period (15 minutes) has expired
            if self.last_failed_login:
                lockout_expiry = self.last_failed_login + timedelta(minutes=15)
                if datetime.utcnow() < lockout_expiry:
                    return True
            return False
        return False
    
    def password_needs_change(self):
        """Check if password needs to be changed (older than 90 days)."""
        if not self.password_changed_at:
            return True
        max_age = timedelta(days=90)
        return datetime.utcnow() - self.password_changed_at > max_age
    
    def __repr__(self):
        return f'<User {self.username}>'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))