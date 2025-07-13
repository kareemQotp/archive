from app import db
from datetime import datetime

class UserDocumentPermission(db.Model):
    __tablename__ = 'user_document_permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    granted_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    granted_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('document_permissions', lazy=True))
    document = db.relationship('Document', backref=db.backref('user_permissions', lazy=True))
    granted_by = db.relationship('User', foreign_keys=[granted_by_id])
    
    def __repr__(self):
        return f'<Permission {self.id} {self.user.username} -> {self.document.title}>'
