import os
import magic
import hashlib
from werkzeug.utils import secure_filename
from datetime import datetime
from typing import Optional, Tuple

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx', 'txt'}

def allowed_file(filename: str) -> bool:
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_info(file_path: str) -> Tuple[str, int, str]:
    """Get file type, size, and hash."""
    mime = magic.Magic(mime=True)
    file_type = mime.from_file(file_path)
    file_size = os.path.getsize(file_path)
    
    # Calculate file hash
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    
    return file_type, file_size, sha256_hash.hexdigest()

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

def create_thumbnail(image_path: str, size: Tuple[int, int] = (200, 200)) -> Optional[str]:
    """Create a thumbnail for image files."""
    try:
        from PIL import Image
        
        # Check if file is an image
        mime = magic.Magic(mime=True)
        if not mime.from_file(image_path).startswith('image/'):
            return None
            
        # Generate thumbnail path
        path, filename = os.path.split(image_path)
        name, ext = os.path.splitext(filename)
        thumbnail_path = os.path.join(path, f"{name}_thumb{ext}")
        
        # Create and save thumbnail
        with Image.open(image_path) as img:
            img.thumbnail(size)
            img.save(thumbnail_path)
            
        return thumbnail_path
    except Exception as e:
        print(f"Error creating thumbnail: {e}")
        return None