from flask import Blueprint, render_template, request, jsonify, current_app, url_for
from flask_login import login_required
import cv2
from pyzbar.pyzbar import decode
import numpy as np
from app.models.document import Document
from app import db
import os
from app.utils.barcode_handler import scan_barcode_from_bytes, enhance_barcode_image
import base64
import re

bp = Blueprint('scanner', __name__, url_prefix='/scanner')

@bp.route('/')
@login_required
def index():
    """Show scanner interface."""
    return render_template('scanner/index.html')

@bp.route('/scan', methods=['POST'])
@login_required
def scan():
    """Handle barcode scanning from uploaded image."""
    try:
        # Get image data from POST request
        image_data = request.form.get('image')
        if not image_data:
            return jsonify({'error': 'لم يتم استلام صورة'}), 400
            
        # Clean up base64 data
        if 'data:image' in image_data:
            image_data = re.sub('^data:image/.+;base64,', '', image_data)
            
        # Convert base64 to bytes
        image_bytes = base64.b64decode(image_data)
        
        # Scan for barcodes
        barcodes = scan_barcode_from_bytes(image_bytes)
        
        if not barcodes:
            return jsonify({'error': 'لم يتم العثور على باركود'}), 404
            
        # Get documents for found barcodes
        results = []
        for barcode in barcodes:
            document = Document.query.filter_by(barcode=barcode['data']).first()
            if document:
                results.append({
                    'id': document.id,
                    'title': document.title,
                    'barcode': document.barcode,
                    'upload_date': document.upload_date.strftime('%Y-%m-%d'),
                    'file_type': document.file_type,
                    'url': url_for('document.view', id=document.id)
                })
                
        return jsonify({
            'success': True,
            'barcodes': barcodes,
            'documents': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/search')
@login_required
def search():
    """Search for document by barcode."""
    barcode = request.args.get('barcode')
    if not barcode:
        return jsonify({'error': 'الرجاء إدخال رقم الباركود'}), 400
        
    document = Document.query.filter_by(barcode=barcode).first()
    if not document:
        return jsonify({'error': 'لم يتم العثور على مستند بهذا الباركود'}), 404
        
    return jsonify({
        'id': document.id,
        'title': document.title,
        'barcode': document.barcode,
        'upload_date': document.upload_date.strftime('%Y-%m-%d'),
        'file_type': document.file_type,
        'url': url_for('document.view', id=document.id)
    })

@bp.route('/generate-barcode', methods=['POST'])
@login_required
def generate_barcode():
    from barcode import Code128
    from barcode.writer import ImageWriter
    import uuid
    
    document_id = request.form.get('document_id')
    if not document_id:
        return jsonify({'error': 'Document ID required'}), 400
        
    document = Document.query.get_or_404(document_id)
    
    if not document.barcode:
        # Generate unique barcode
        barcode_data = str(uuid.uuid4())
        document.barcode = barcode_data
        db.session.commit()
    else:
        barcode_data = document.barcode
    
    # Generate barcode image
    barcode_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f'barcode_{document_id}.png')
    Code128(barcode_data, writer=ImageWriter()).save(barcode_path)
    
    return jsonify({
        'barcode': barcode_data,
        'image_path': f'barcode_{document_id}.png'
    })