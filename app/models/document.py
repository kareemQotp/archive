from app import db
from datetime import datetime
import json

class Document(db.Model):
    """Document model for managing archived files."""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(100))
    file_size = db.Column(db.Integer)  # Size in bytes
    file_hash = db.Column(db.String(64))  # SHA-256 hash
    barcode = db.Column(db.String(100), unique=True)
    thumbnail_path = db.Column(db.String(500))
    tags = db.Column(db.Text)  # JSON array of tags
    
    # Metadata
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    last_modified = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, title, filename, file_path, uploaded_by_id, **kwargs):
        self.title = title
        self.filename = filename
        self.file_path = file_path
        self.uploaded_by_id = uploaded_by_id
        
        # Set optional attributes
        self.description = kwargs.get('description')
        self.file_type = kwargs.get('file_type')
        self.file_size = kwargs.get('file_size')
        self.file_hash = kwargs.get('file_hash')
        self.barcode = kwargs.get('barcode')
        self.thumbnail_path = kwargs.get('thumbnail_path')
        self.tags = json.dumps(kwargs.get('tags', []))
    
    @property
    def tag_list(self):
        """Get list of tags."""
        try:
            return json.loads(self.tags)
        except (json.JSONDecodeError, TypeError):
            return []
    
    @tag_list.setter
    def tag_list(self, tags):
        """Set list of tags."""
        self.tags = json.dumps(tags)
    
    def add_tag(self, tag):
        """Add a tag to the document."""
        tags = self.tag_list
        if tag not in tags:
            tags.append(tag)
            self.tag_list = tags
    
    def remove_tag(self, tag):
        """Remove a tag from the document."""
        tags = self.tag_list
        if tag in tags:
            tags.remove(tag)
            self.tag_list = tags
    
    def to_dict(self):
        """Convert document object to dictionary."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'filename': self.filename,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'barcode': self.barcode,
            'tags': self.tag_list,
            'uploaded_by': self.uploaded_by_id,
            'upload_date': self.upload_date.isoformat(),
            'last_modified': self.last_modified.isoformat()
        }
    
    def update(self, **kwargs):
        """Update document attributes."""
        for key, value in kwargs.items():
            if hasattr(self, key):
                if key == 'tags':
                    self.tag_list = value
                else:
                    setattr(self, key, value)
    
    def __repr__(self):
        return f'<Document {self.title}>'

# Create indices for common queries
db.Index('idx_document_tags', Document.tags)
db.Index('idx_document_upload_date', Document.upload_date)
db.Index('idx_document_barcode', Document.barcode)
db.Index('idx_document_file_type', Document.file_type)