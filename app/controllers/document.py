from flask import Blueprint, render_template, request, flash, redirect, url_for, send_file, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from app.models.document import Document
from app.models.user import User, UserDocumentPermission
from app.utils.file_handler import allowed_file, get_file_info, generate_unique_filename, organize_files, create_thumbnail
from app.utils.barcode_handler import generate_barcode
import os
from werkzeug.utils import secure_filename
import time

bp = Blueprint('document', __name__, url_prefix='/documents')

@bp.route('/')
@login_required
def index():
    page = request.args.get('page', 1, type=int)
    per_page = 12
    
    # Build query based on filters
    if current_user.is_admin or current_user.is_archive_manager:
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
    
    return render_template('document/index.html', documents=documents)

@bp.route('/permissions/<int:doc_id>', methods=['GET', 'POST'])
@login_required
def manage_permissions(doc_id):
    # Only admin can manage permissions
    if not current_user.is_admin:
        flash('ليس لديك صلاحية لإدارة صلاحيات المستندات', 'error')
        return redirect(url_for('document.index'))
    
    document = Document.query.get_or_404(doc_id)
    documentation_users = User.query.filter_by(role='documentation').all()
    
    if request.method == 'POST':
        # Remove all existing permissions
        UserDocumentPermission.query.filter_by(document_id=doc_id).delete()
        
        # Add new permissions
        allowed_user_ids = request.form.getlist('allowed_users[]')
        for user_id in allowed_user_ids:
            permission = UserDocumentPermission(
                user_id=user_id,
                document_id=doc_id,
                created_by_id=current_user.id
            )
            db.session.add(permission)
        
        db.session.commit()
        flash('تم تحديث صلاحيات المستند بنجاح', 'success')
        return redirect(url_for('document.view', id=doc_id))
    
    return render_template('document/permissions.html',
                          document=document,
                          documentation_users=documentation_users)

@bp.route('/upload', methods=['GET', 'POST'])
@login_required
def upload():
    # Only admin and archive managers can upload documents
    if not (current_user.is_admin or current_user.is_archive_manager):
        flash('ليس لديك صلاحية لرفع المستندات', 'error')
        return redirect(url_for('document.index'))
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
            unique_filename = generate_unique_filename(filename)
            
            # Save file
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            
            # Get file info
            file_type, file_size, file_hash = get_file_info(file_path)
            
            # Generate barcode
            barcode_data = f"{file_hash[:8]}_{int(time.time())}"
            barcode_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'barcodes', f"{barcode_data}.png")
            generate_barcode(barcode_data, barcode_path)
            
            # Create thumbnail if image
            thumbnail_path = None
            if file_type.startswith('image/'):
                thumbnail_path = create_thumbnail(file_path)
            
            # Create document record
            document = Document(
                title=request.form.get('title', filename),
                description=request.form.get('description', ''),
                filename=unique_filename,
                file_path=file_path,
                file_type=file_type,
                file_size=file_size,
                file_hash=file_hash,
                barcode=barcode_data,
                thumbnail_path=thumbnail_path,
                tags=request.form.getlist('tags[]'),
                uploaded_by_id=current_user.id
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

@bp.route('/<int:id>/edit', methods=['GET', 'POST'])
@login_required
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

@bp.route('/<int:id>/delete', methods=['POST'])
@login_required
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

@bp.route('/tags')
@login_required
def get_tags():
    """Get list of all unique tags for autocomplete."""
    tags = set()
    documents = Document.query.all()
    for doc in documents:
        tags.update(doc.tag_list)
    return jsonify(list(tags))