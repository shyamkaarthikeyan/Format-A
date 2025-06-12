#!/usr/bin/env python3
"""
Simple PDF test generator - Tests basic PDF creation
"""

import json
import sys
from io import BytesIO

def test_pdf_generation():
    """Test basic PDF generation with minimal dependencies"""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph
        from reportlab.lib.styles import getSampleStyleSheet
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        
        story = [
            Paragraph("PDF Generation Test", styles['Title']),
            Paragraph("This is a test PDF to verify ReportLab is working correctly.", styles['Normal'])
        ]
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
        
    except ImportError as e:
        raise Exception(f"ReportLab not available: {e}")
    except Exception as e:
        raise Exception(f"PDF generation failed: {e}")

def main():
    """Main function for command line execution"""
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        
        # For testing, just generate a simple PDF
        pdf_data = test_pdf_generation()
        
        # Write binary data to stdout
        sys.stdout.buffer.write(pdf_data)
        
    except Exception as e:
        import traceback
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.stderr.write(f"Traceback: {traceback.format_exc()}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()