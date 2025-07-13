import os
import cv2
import numpy as np
from pyzbar.pyzbar import decode
from barcode import Code128
from barcode.writer import ImageWriter
from typing import Optional, List, Dict, Any
from PIL import Image
import base64

def generate_barcode(data: str, output_path: str) -> str:
    """Generate a barcode image from the given data."""
    try:
        barcode = Code128(data, writer=ImageWriter())
        path = barcode.save(output_path)
        return path
    except Exception as e:
        print(f"Error generating barcode: {e}")
        return ""

def enhance_barcode_image(image: np.ndarray) -> np.ndarray:
    """Enhance image for better barcode detection."""
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    
    # Noise reduction
    denoised = cv2.fastNlMeansDenoising(thresh)
    
    # Edge enhancement
    kernel = np.array([[-1,-1,-1],
                      [-1, 9,-1],
                      [-1,-1,-1]])
    sharpened = cv2.filter2D(denoised, -1, kernel)
    
    return sharpened

def scan_barcode_from_image(image_path: str) -> List[Dict[str, Any]]:
    """Scan and decode barcodes from an image file."""
    try:
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Could not read image file")
        
        # Try different preprocessing techniques
        results = []
        
        # Try original image
        barcodes = decode(image)
        results.extend([{
            'data': b.data.decode('utf-8'),
            'type': b.type,
            'rect': {
                'left': b.rect.left,
                'top': b.rect.top,
                'width': b.rect.width,
                'height': b.rect.height
            },
            'quality': 'high'
        } for b in barcodes])
        
        if not results:
            # Try enhanced image
            enhanced = enhance_barcode_image(image)
            barcodes = decode(enhanced)
            results.extend([{
                'data': b.data.decode('utf-8'),
                'type': b.type,
                'rect': {
                    'left': b.rect.left,
                    'top': b.rect.top,
                    'width': b.rect.width,
                    'height': b.rect.height
                },
                'quality': 'medium'
            } for b in barcodes])
        
        return results
    except Exception as e:
        print(f"Error scanning barcode: {e}")
        return []

def scan_barcode_from_bytes(image_data: str) -> List[Dict[str, Any]]:
    """Scan and decode barcodes from base64 encoded image data."""
    try:
        # Remove data URL prefix if present
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
            
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Could not decode image data")
        
        # Try different preprocessing techniques
        results = []
        
        # Try original image
        barcodes = decode(image)
        if barcodes:
            results.extend([{
                'data': b.data.decode('utf-8'),
                'type': b.type,
                'rect': {
                    'left': b.rect.left,
                    'top': b.rect.top,
                    'width': b.rect.width,
                    'height': b.rect.height
                },
                'quality': 'high'
            } for b in barcodes])
        else:
            # Try enhanced image
            enhanced = enhance_barcode_image(image)
            barcodes = decode(enhanced)
            results.extend([{
                'data': b.data.decode('utf-8'),
                'type': b.type,
                'rect': {
                    'left': b.rect.left,
                    'top': b.rect.top,
                    'width': b.rect.width,
                    'height': b.rect.height
                },
                'quality': 'medium'
            } for b in barcodes])
        
        return results
    except Exception as e:
        print(f"Error scanning barcode from bytes: {e}")
        return []

def validate_barcode_data(barcode_data: str) -> bool:
    """Validate barcode data format."""
    try:
        # Check if data matches expected format (hash_timestamp)
        parts = barcode_data.split('_')
        if len(parts) != 2:
            return False
            
        # Validate hash part (8 characters)
        if len(parts[0]) != 8 or not all(c in '0123456789abcdef' for c in parts[0].lower()):
            return False
            
        # Validate timestamp part
        timestamp = int(parts[1])
        if timestamp <= 0:
            return False
            
        return True
    except:
        return False