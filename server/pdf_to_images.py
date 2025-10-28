#!/usr/bin/env python3
"""
PDF to Images Converter
Converts PDF pages to images for clean preview display
"""

import sys
import json
import base64
import io
import logging
from PIL import Image

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

def pdf_to_images(pdf_path, dpi=150):
    """Convert PDF to list of base64-encoded images"""
    if not fitz:
        raise ImportError("PyMuPDF (fitz) not available")
    
    images = []
    try:
        # Open PDF
        pdf_document = fitz.open(pdf_path)
        
        for page_num in range(len(pdf_document)):
            # Get page
            page = pdf_document[page_num]
            
            # Create transformation matrix for DPI
            zoom = dpi / 72.0  # 72 DPI is default
            mat = fitz.Matrix(zoom, zoom)
            
            # Render page to image
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            
            # Convert to base64
            img_base64 = base64.b64encode(img_data).decode('utf-8')
            images.append({
                'page': page_num + 1,
                'data': f"data:image/png;base64,{img_base64}",
                'width': pix.width,
                'height': pix.height
            })
            
        pdf_document.close()
        return images
        
    except Exception as e:
        logging.error(f"Error converting PDF to images: {e}")
        raise

def main():
    try:
        # Read input from stdin
        input_data = sys.stdin.read().strip()
        
        if not input_data:
            raise ValueError("No input data received")
            
        data = json.loads(input_data)
        pdf_path = data.get('pdf_path')
        dpi = data.get('dpi', 150)
        
        if not pdf_path:
            raise ValueError("PDF path not provided")
            
        # Convert PDF to images
        images = pdf_to_images(pdf_path, dpi)
        
        # Return result
        result = {
            'success': True,
            'images': images,
            'total_pages': len(images)
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
