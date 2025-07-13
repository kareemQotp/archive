from flask import Blueprint, render_template, request, jsonify, current_app
from flask_login import login_required
import cv2
import numpy as np
from app.models.document import Document
from app import db, limiter
import os
import mimetypes
from app.utils.barcode_handler import scan_barcode_from_bytes, enhance_barcode_image
import base64
import re
from io import BytesIO

bp = Blueprint('scanner', __name__, url_prefix='/scanner')

def is_valid_image(image_data):
    """Validate image data."""
    try:
        # Check if the size is within limits
        if len(image_data) > current_app.config['SCAN_MAX_SIZE']:
            return False
        
        # Check if it's a valid image by trying to decode it with OpenCV
        img_array = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        return img is not None
    except Exception:
        return False

@bp.route('/')
@login_required
def index():
    """Show scanner interface."""
    return render_template('scanner/index.html')

@bp.route('/scan', methods=['POST'])
@login_required
@limiter.limit("30 per minute", error_message="تم تجاوز الحد المسموح به من محاولات المسح. يرجى المحاولة بعد دقيقة.")
def scan():
    """Handle barcode scanning from uploaded image."""
    try:
        # Get image data from POST request
        image_data = request.json.get('image')
        if not image_data:
            return jsonify({'error': 'لم يتم استلام صورة'}), 400
            
        # Clean up base64 data
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
            
        # Decode base64 image
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception:
            return jsonify({'error': 'صيغة الصورة غير صالحة'}), 400
            
        # Validate image
        if not is_valid_image(image_bytes):
            return jsonify({'error': 'نوع الملف غير مدعوم أو حجم الملف كبير جداً'}), 400
            
        # Convert to numpy array for OpenCV
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'error': 'فشل في معالجة الصورة'}), 400
            
        # Try to scan barcode from original image
        results = scan_barcode_from_bytes(image)
        
        if not results:
            # Try with enhanced image
            enhanced_image = enhance_barcode_image(image)
            results = scan_barcode_from_bytes(enhanced_image)
            
        if not results:
            return jsonify({
                'success': False,
                'error': 'لم يتم العثور على باركود في الصورة'
            }), 404
            
        # Validate barcode format
        barcode = results[0]['data']
        if not re.match(r'^[a-f0-9]{8}_\d+$', barcode):
            return jsonify({
                'success': False,
                'error': 'تنسيق الباركود غير صالح'
            }), 400
            
        return jsonify({
            'success': True,
            'barcode': barcode,
            'type': results[0]['type']
        })
        
    except Exception as e:
        current_app.logger.error(f'Error in scanner: {str(e)}')
        return jsonify({
            'success': False,
            'error': 'حدث خطأ أثناء معالجة الصورة'
        }), 500