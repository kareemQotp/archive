from app import db
from datetime import datetime
import json

class Document(db.Model):
    """Document model for managing archived files."""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255))
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(100))
    file_size = db.Column(db.Integer)  # Size in bytes
    file_hash = db.Column(db.String(64))  # SHA-256 hash
    barcode = db.Column(db.String(100), unique=True)
    barcode_path = db.Column(db.String(500))
    thumbnail_path = db.Column(db.String(500))
    tags = db.Column(db.Text)  # JSON array of tags
    
    # Metadata
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    last_modified = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    uploaded_by = db.relationship('User', backref=db.backref('uploaded_documents', lazy=True))
    allowed_users = db.relationship('User', secondary='user_document_permissions',
                                  backref=db.backref('accessible_documents', lazy='dynamic'))
    
    @property
    def tag_list(self):
        """Get list of tags from JSON string."""
        if not self.tags:
            return []
        try:
            return json.loads(self.tags)
        except json.JSONDecodeError:
            return []
    
    @tag_list.setter
    def tag_list(self, tags):
        """Set tags as JSON string."""
        if isinstance(tags, list):
            self.tags = json.dumps(tags)
        else:
            self.tags = '[]'
    
    def user_can_access(self, user):
        """Check if a user has access to this document."""
        if user.is_admin or user.is_archive_officer:
            return True
        if user.id == self.uploaded_by_id:
            return True
        if user.is_documentation_user:
            return user in self.allowed_users
        return False
    
    def user_can_edit(self, user):
        """Check if a user can edit this document."""
        return user.is_admin or user.id == self.uploaded_by_id
    
    def user_can_delete(self, user):
        """Check if a user can delete this document."""
        return user.is_admin or user.id == self.uploaded_by_id
    
    def get_file_icon(self):
        """Get appropriate icon class based on file type."""
        type_icons = {
            'application/pdf': 'fa-file-pdf',
            'image/jpeg': 'fa-file-image',
            'image/png': 'fa-file-image',
            'application/msword': 'fa-file-word',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fa-file-word',
            'application/vnd.ms-excel': 'fa-file-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fa-file-excel'
        }
        return type_icons.get(self.file_type, 'fa-file')
    
    def __repr__(self):
        return f'<Document {self.id} {self.title}>'