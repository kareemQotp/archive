import os
import cv2
import numpy as np
from pyzbar.pyzbar import decode
from barcode import Code128
from barcode.writer import ImageWriter
from typing import Optional, List, Dict, Any
from PIL import Image

def generate_barcode(data: str, output_path: str) -> str:
    """Generate a barcode image from the given data."""
    try:
        barcode = Code128(data, writer=ImageWriter())
        path = barcode.save(output_path)
        return path
    except Exception as e:
        print(f"Error generating barcode: {e}")
        return ""

def scan_barcode_from_image(image_path: str) -> List[Dict[str, Any]]:
    """Scan and decode barcodes from an image file."""
    try:
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Could not read image file")
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Decode barcodes
        barcodes = decode(gray)
        
        results = []
        for barcode in barcodes:
            result = {
                'data': barcode.data.decode('utf-8'),
                'type': barcode.type,
                'rect': {
                    'left': barcode.rect.left,
                    'top': barcode.rect.top,
                    'width': barcode.rect.width,
                    'height': barcode.rect.height
                }
            }
            results.append(result)
        
        return results
    except Exception as e:
        print(f"Error scanning barcode: {e}")
        return []

def scan_barcode_from_bytes(image_bytes: bytes) -> List[Dict[str, Any]]:
    """Scan and decode barcodes from image bytes."""
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode image bytes")
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Decode barcodes
        barcodes = decode(gray)
        
        results = []
        for barcode in barcodes:
            result = {
                'data': barcode.data.decode('utf-8'),
                'type': barcode.type,
                'rect': {
                    'left': barcode.rect.left,
                    'top': barcode.rect.top,
                    'width': barcode.rect.width,
                    'height': barcode.rect.height
                }
            }
            results.append(result)
        
        return results
    except Exception as e:
        print(f"Error scanning barcode: {e}")
        return []

def enhance_barcode_image(image_path: str, output_path: Optional[str] = None) -> Optional[str]:
    """Enhance image for better barcode detection."""
    try:
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Could not read image file")
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Apply morphological operations
        kernel = np.ones((3,3), np.uint8)
        morph = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        # Save enhanced image
        if output_path is None:
            path, ext = os.path.splitext(image_path)
            output_path = f"{path}_enhanced{ext}"
            
        cv2.imwrite(output_path, morph)
        return output_path
        
    except Exception as e:
        print(f"Error enhancing image: {e}")
        return None

def validate_barcode(barcode_data: str) -> bool:
    """Validate barcode data format and checksum."""
    try:
        # Remove any whitespace
        barcode_data = barcode_data.strip()
        
        # Check length
        if len(barcode_data) < 6:
            return False
            
        # Check if alphanumeric
        if not barcode_data.isalnum():
            return False
            
        # Validate Code128 checksum if present
        if len(barcode_data) > 6 and barcode_data[-1].isdigit():
            code = Code128(barcode_data[:-1])
            return code.validate()
            
        return True
        
    except Exception:
        return False