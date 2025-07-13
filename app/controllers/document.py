from flask import Blueprint, render_template, request, flash, redirect, url_for, current_app, send_from_directory, jsonify, send_file
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from app.models.document import Document
from app.models.user import User
from app.models.permission import UserDocumentPermission
from app import db, limiter
from app.utils.file_handler import (
    allowed_file, generate_barcode, get_file_info, 
    generate_unique_filename, create_thumbnail
)
import os
from datetime import datetime
import json
import time
import hashlib

bp = Blueprint('document', __name__)

@bp.route('/')
@login_required
def index():
    """Display list of documents."""
    page = request.args.get('page', 1, type=int)
    per_page = 12
    
    # Build query based on filters
    if current_user.is_admin or current_user.is_archive_officer:
        # Admin and archive managers can see all documents
        query = Document.query
    elif current_user.is_documentation_user:
        # Documentation users can only see allowed documents
        query = Document.query.join(Document.allowed_users).filter(User.id == current_user.id)
    else:
        # Regular users can't see any documents
        flash('ليس لديك صلاحية لعرض المستندات', 'error')
        return redirect(url_for('index'))
    
    # Filter by type
    doc_type = request.args.get('type')
    if doc_type:
        query = query.filter(Document.file_type.like(f'%{doc_type}%'))
    
    # Filter by tag
    tag = request.args.get('tag')
    if tag:
        query = query.filter(Document.tags.like(f'%{tag}%'))
    
    # Filter by search term
    search = request.args.get('search')
    if search:
        query = query.filter(
            (Document.title.like(f'%{search}%')) |
            (Document.description.like(f'%{search}%')) |
            (Document.barcode.like(f'%{search}%'))
        )
    
    # Sort documents
    sort = request.args.get('sort', 'newest')
    if sort == 'oldest':
        query = query.order_by(Document.upload_date.asc())
    elif sort == 'name':
        query = query.order_by(Document.title.asc())
    else:  # newest
        query = query.order_by(Document.upload_date.desc())
    
    # Paginate results
    documents = query.paginate(page=page, per_page=per_page)
    
    # Initialize selected_documents_count for the template
    selected_documents_count = 0
    
    return render_template('document/index.html', documents=documents, selected_documents_count=selected_documents_count)

@bp.route('/upload', methods=['GET', 'POST'])
@login_required
@limiter.limit("20 per hour", error_message="تم تجاوز الحد المسموح به من عمليات الرفع. يرجى المحاولة بعد ساعة.")
def upload():
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('لم يتم اختيار ملف', 'error')
            return redirect(request.url)
            
        file = request.files['file']
        if file.filename == '':
            flash('لم يتم اختيار ملف', 'error')
            return redirect(request.url)
            
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_hash = hashlib.md5(file.read()).hexdigest()
            file.seek(0)  # Reset file pointer after reading
            
            unique_filename = generate_unique_filename(filename)
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            
            # Generate barcode
            barcode_data = f"{file_hash[:8]}_{int(time.time())}"
            barcode_path = generate_barcode(barcode_data)
            
            # Create thumbnail
            thumbnail_path = create_thumbnail(file_path)
            
            # Get file info
            file_type, file_size = get_file_info(file_path)
            
            # Create document record
            document = Document(
                title=request.form.get('title', filename),
                description=request.form.get('description', ''),
                filename=unique_filename,
                original_filename=filename,
                file_path=file_path,
                file_type=file_type,
                file_size=file_size,
                barcode=barcode_data,
                barcode_path=barcode_path,
                thumbnail_path=thumbnail_path,
                uploaded_by=current_user,
                upload_date=datetime.utcnow(),
                tags=request.form.get('tags', '')
            )
            
            db.session.add(document)
            db.session.commit()
            
            flash('تم رفع المستند بنجاح', 'success')
            return redirect(url_for('document.view', id=document.id))
            
        flash('نوع الملف غير مسموح به', 'error')
        return redirect(request.url)
        
    return render_template('document/upload.html')

@bp.route('/<int:id>')
@login_required
def view(id):
    document = Document.query.get_or_404(id)
    return render_template('document/view.html', document=document)

@bp.route('/<int:id>/download')
@login_required
def download(id):
    document = Document.query.get_or_404(id)
    return send_file(document.file_path, as_attachment=True)

@bp.route('/edit/<int:id>', methods=['GET', 'POST'])
@login_required
@limiter.limit("30 per minute")
def edit(id):
    document = Document.query.get_or_404(id)
    
    # Check if user has permission to edit
    if document.uploaded_by_id != current_user.id and not current_user.is_admin:
        flash('ليس لديك صلاحية لتعديل هذا المستند', 'error')
        return redirect(url_for('document.view', id=id))
    
    if request.method == 'POST':
        document.title = request.form.get('title')
        document.description = request.form.get('description')
        document.tag_list = request.form.getlist('tags[]')
        
        db.session.commit()
        flash('تم تحديث المستند بنجاح', 'success')
        return redirect(url_for('document.view', id=id))
    
    return render_template('document/edit.html', document=document)

@bp.route('/delete/<int:id>', methods=['POST'])
@login_required
@limiter.limit("10 per minute", error_message="تم تجاوز الحد المسموح به من عمليات الحذف. يرجى المحاولة بعد دقيقة.")
def delete(id):
    document = Document.query.get_or_404(id)
    
    # Check if user has permission to delete
    if document.uploaded_by_id != current_user.id and not current_user.is_admin:
        flash('ليس لديك صلاحية لحذف هذا المستند', 'error')
        return redirect(url_for('document.view', id=id))
    
    try:
        # Delete physical files
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
        if document.thumbnail_path and os.path.exists(document.thumbnail_path):
            os.remove(document.thumbnail_path)
        
        # Delete database record
        db.session.delete(document)
        db.session.commit()
        
        flash('تم حذف المستند بنجاح', 'success')
        return redirect(url_for('document.index'))
        
    except Exception as e:
        flash('حدث خطأ أثناء حذف المستند', 'error')
        return redirect(url_for('document.view', id=id))

@bp.route('/permissions/<int:id>', methods=['GET', 'POST'])
@login_required
@limiter.limit("20 per minute")
def permissions(id):
    # Only admin can manage permissions
    if not current_user.is_admin:
        flash('ليس لديك صلاحية لإدارة صلاحيات المستندات', 'error')
        return redirect(url_for('document.index'))
    
    document = Document.query.get_or_404(id)
    documentation_users = User.query.filter_by(role='documentation').all()
    
    if request.method == 'POST':
        # Remove all existing permissions
        UserDocumentPermission.query.filter_by(document_id=id).delete()
        
        # Add new permissions
        allowed_user_ids = request.form.getlist('allowed_users[]')
        for user_id in allowed_user_ids:
            permission = UserDocumentPermission(
                user_id=user_id,
                document_id=id,
                created_by_id=current_user.id
            )
            db.session.add(permission)
        
        db.session.commit()
        flash('تم تحديث صلاحيات المستند بنجاح', 'success')
        return redirect(url_for('document.view', id=id))
    
    return render_template('document/permissions.html',
                          document=document,
                          documentation_users=documentation_users)

@bp.route('/get_tags')
@login_required
@limiter.limit("60 per minute")
def get_tags():
    """Get list of all unique tags for autocomplete."""
    tags = set()
    documents = Document.query.all()
    for doc in documents:
        tags.update(doc.tag_list)
    return jsonify(list(tags))

@bp.route('/search')
@login_required
@limiter.limit("30 per minute")
def search():
    """Search for documents by barcode."""
    barcode = request.args.get('barcode')
    
    if not barcode:
        return jsonify({'error': 'No barcode provided'}), 400
        
    document = Document.query.filter_by(barcode=barcode).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
        
    # Check if user has access to this document
    if not document.user_can_access(current_user):
        return jsonify({'error': 'Access denied'}), 403
        
    return jsonify({
        'success': True,
        'document_id': document.id,
        'title': document.title
    })