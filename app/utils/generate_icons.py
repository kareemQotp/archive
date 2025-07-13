from PIL import Image, ImageDraw, ImageFont
import os

def generate_app_icons():
    """Generate PWA icons in required sizes with app initial."""
    # Get the absolute path to the images directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    images_dir = os.path.join(os.path.dirname(os.path.dirname(current_dir)), 'app', 'static', 'images')
    os.makedirs(images_dir, exist_ok=True)
    
    sizes = [(192, 192), (512, 512)]
    background_color = "#0d6efd"  # Bootstrap primary color
    text_color = "#ffffff"
    
    for width, height in sizes:
        # Create a new image with a blue background
        image = Image.new('RGB', (width, height), background_color)
        draw = ImageDraw.Draw(image)
        
        # Calculate font size (approximately 50% of the smallest dimension)
        font_size = min(width, height) // 2
        
        try:
            # Try to use Arial font, fallback to default if not available
            font = ImageFont.truetype("arial.ttf", font_size)
        except IOError:
            font = ImageFont.load_default()
        
        # Add text "أ" (Arabic letter Alef for Archive)
        text = "أ"
        # Get text size
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        
        # Calculate text position (center)
        x = (width - text_width) // 2
        y = (height - text_height) // 2
        
        # Draw the text
        draw.text((x, y), text, fill=text_color, font=font)
        
        # Save the image
        filename = f"icon-{width}.png"
        filepath = os.path.join(images_dir, filename)
        image.save(filepath)
        print(f"Generated icon: {filepath}")

if __name__ == "__main__":
    generate_app_icons()
