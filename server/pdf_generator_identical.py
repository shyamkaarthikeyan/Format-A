#!/usr/bin/env python3
"""
PDF generator that produces identical formatting to Word documents
Uses python-docx to generate Word first, then converts to PDF
"""

import sys
import json
import tempfile
import subprocess
from pathlib import Path

# Import the existing Word document generator
from document_generator import generate_ieee_document

def create_identical_pdf(form_data):
    """Generate PDF by creating Word document first, then converting to PDF"""
    try:
        # Generate Word document using existing generator
        word_buffer = generate_ieee_document(form_data)
        
        # Create temporary files
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_docx:
            temp_docx.write(word_buffer.getvalue())
            temp_docx_path = temp_docx.name
        
        temp_pdf_path = temp_docx_path.replace('.docx', '.pdf')
        
        try:
            # Convert Word to PDF using LibreOffice headless
            subprocess.run([
                'libreoffice', '--headless', '--convert-to', 'pdf', 
                '--outdir', str(Path(temp_pdf_path).parent),
                temp_docx_path
            ], check=True, capture_output=True)
            
            # Read the generated PDF
            with open(temp_pdf_path, 'rb') as pdf_file:
                pdf_data = pdf_file.read()
            
            return pdf_data
            
        except subprocess.CalledProcessError:
            # Fallback: return the Word document if conversion fails
            return word_buffer.getvalue()
            
        finally:
            # Clean up temporary files
            try:
                Path(temp_docx_path).unlink()
                Path(temp_pdf_path).unlink(missing_ok=True)
            except:
                pass
                
    except Exception as e:
        # If all else fails, generate a simple text-based PDF
        return create_fallback_pdf(form_data, str(e))

def create_fallback_pdf(form_data, error_msg):
    """Create a simple PDF as fallback"""
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet
    import io
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    
    story = []
    story.append(Paragraph(f"IEEE Document: {form_data.get('title', 'Untitled')}", styles['Title']))
    story.append(Paragraph(f"Error during conversion: {error_msg}", styles['Normal']))
    
    if form_data.get('abstract'):
        story.append(Paragraph(f"Abstract: {form_data['abstract']}", styles['Normal']))
    
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

def main():
    """Main function for command line execution"""
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        form_data = json.loads(input_data)
        
        # Generate PDF with identical formatting
        pdf_data = create_identical_pdf(form_data)
        
        # Write binary data to stdout
        sys.stdout.buffer.write(pdf_data)
        
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()