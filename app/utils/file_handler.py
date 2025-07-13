import os
import mimetypes
import hashlib
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
from typing import Optional, Tuple
from PIL import Image
import fitz  # PyMuPDF for PDF thumbnails
import io
import qrcode
from qrcode.image.pil import PilImage

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx', 'txt'}
THUMBNAIL_SIZE = (200, 200)

def allowed_file(filename: str) -> bool:
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_info(file_path: str) -> Tuple[str, int, str]:
    """Get file type, size, and hash."""
    mime_type, _ = mimetypes.guess_type(file_path)
    file_size = os.path.getsize(file_path)
    
    # Calculate file hash
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    
    return mime_type or 'application/octet-stream', file_size, sha256_hash.hexdigest()

def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename with timestamp."""    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    secure_name = secure_filename(original_filename)
    name, ext = os.path.splitext(secure_name)
    return f"{name}_{timestamp}{ext}"

def organize_files(base_path: str, file_path: str) -> str:
    """Organize files into subdirectories based on file type."""
    file_type = magic.Magic(mime=True).from_file(file_path)
    category = file_type.split('/')[0]
    
    # Create category directory if it doesn't exist
    category_path = os.path.join(base_path, category)
    os.makedirs(category_path, exist_ok=True)
    
    # Generate new path
    filename = os.path.basename(file_path)
    new_path = os.path.join(category_path, filename)
    
    # Move file
    os.rename(file_path, new_path)
    return new_path

def create_thumbnail(file_path: str) -> Optional[str]:
    """Create a thumbnail for the given file."""
    file_type = magic.Magic(mime=True).from_file(file_path)
    thumbnail_dir = os.path.join(os.path.dirname(os.path.dirname(file_path)), 'thumbnails')
    os.makedirs(thumbnail_dir, exist_ok=True)
    
    thumbnail_path = os.path.join(
        thumbnail_dir,
        f"thumb_{os.path.basename(file_path)}.png"
    )
    
    try:
        if file_type == 'application/pdf':
            # Create thumbnail from first page of PDF
            pdf_document = fitz.open(file_path)
            first_page = pdf_document[0]
            pix = first_page.get_pixmap()
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            pdf_document.close()
        elif file_type.startswith('image/'):
            # Create thumbnail from image
            img = Image.open(file_path)
        else:
            # For other file types, use a default icon
            return None
            
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Create thumbnail
        img.thumbnail(THUMBNAIL_SIZE)
        img.save(thumbnail_path, 'PNG')
        return thumbnail_path
        
    except Exception as e:
        print(f"Error creating thumbnail: {e}")
        return None

def generate_barcode(data: str) -> Optional[str]:
    """Generate a QR code for the given data."""
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        # Create QR code image
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Save QR code
        barcode_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'barcodes')
        os.makedirs(barcode_dir, exist_ok=True)
        
        barcode_path = os.path.join(
            barcode_dir,
            f"barcode_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        )
        qr_img.save(barcode_path)
        
        return barcode_path
    except Exception as e:
        print(f"Error generating barcode: {e}")
        return None

def clean_old_files(directory: str, max_age_days: int = 7) -> None:
    """Clean up old temporary files."""
    cutoff = datetime.now() - timedelta(days=max_age_days)
    
    for root, _, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            if datetime.fromtimestamp(os.path.getctime(file_path)) < cutoff:
                try:
                    os.remove(file_path)
                except OSError:
                    continue