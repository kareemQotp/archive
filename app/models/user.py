from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db, login_manager
from datetime import datetime
from sqlalchemy.ext.associationproxy import association_proxy

class User(UserMixin, db.Model):
    """User model for authentication and user management."""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100))
    role = db.Column(db.String(20), default='user')  # 'admin', 'archive_officer', 'documentation', 'offload'
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, user_id, document_id, created_by_id):
        self.user_id = user_id
        self.document_id = document_id
        self.created_by_id = created_by_id
    
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

    @property
    def is_offload_user(self):
        """Check if user is an offload user."""
        return self.role == 'offload'
    
    def __init__(self, username, password, email=None, full_name=None, role='user'):
        self.username = username
        self.set_password(password)
        self.email = email
        self.full_name = full_name
        self.role = role
    
    def set_password(self, password):
        """Hash and set the user's password."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verify the user's password."""
        return check_password_hash(self.password_hash, password)
    
    def update_last_login(self):
        """Update user's last login timestamp."""
        self.last_login = datetime.utcnow()
        db.session.commit()
    
    # Relationships
    documents = db.relationship('Document', backref='uploaded_by', lazy=True)
    allowed_documents = db.relationship('Document',
                                      secondary='user_document_permissions',
                                      primaryjoin='User.id == UserDocumentPermission.user_id',
                                      secondaryjoin='UserDocumentPermission.document_id == Document.id',
                                      backref=db.backref('allowed_users', lazy=True))

class UserDocumentPermission(db.Model):
    """Model for managing document access permissions for documentation users."""
    __tablename__ = 'user_document_permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    document_id = db.Column(db.Integer, db.ForeignKey('document.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    user = db.relationship('User', foreign_keys=[user_id])
    document = db.relationship('Document')
    created_by = db.relationship('User', foreign_keys=[created_by_id])
    
    def __init__(self, user_id, document_id, created_by_id):
        self.user_id = user_id
        self.document_id = document_id
        self.created_by_id = created_by_id
    

    
    def to_dict(self):
        """Convert user object to dictionary."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'is_active': self.is_active,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def __repr__(self):
        return f'<User {self.username}>'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))