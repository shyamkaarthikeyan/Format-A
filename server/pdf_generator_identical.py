#!/usr/bin/env python3
"""
PDF Generator - Converts the perfect Word document to PDF
Uses the existing ieee_generator_fixed.py to create Word, then converts to PDF
"""

import json
import sys
import tempfile
import subprocess
from pathlib import Path
from io import BytesIO

# Import the existing perfect Word document generator
from ieee_generator_fixed import generate_ieee_document

def word_to_pdf_libreoffice(word_buffer):
    """Convert Word document to PDF using LibreOffice headless"""
    try:
        # Create temporary files
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_docx:
            temp_docx.write(word_buffer.getvalue())
            temp_docx_path = temp_docx.name
        
        temp_pdf_path = temp_docx_path.replace('.docx', '.pdf')
        
        # Convert Word to PDF using LibreOffice headless
        result = subprocess.run([
            'libreoffice', '--headless', '--convert-to', 'pdf', 
            '--outdir', str(Path(temp_pdf_path).parent),
            temp_docx_path
        ], check=True, capture_output=True, text=True)
        
        # Read the generated PDF
        with open(temp_pdf_path, 'rb') as pdf_file:
            pdf_data = pdf_file.read()
        
        # Clean up temporary files
        try:
            Path(temp_docx_path).unlink()
            Path(temp_pdf_path).unlink()
        except:
            pass
            
        return pdf_data
        
    except subprocess.CalledProcessError as e:
        raise Exception(f"LibreOffice conversion failed: {e.stderr}")
    except FileNotFoundError:
        raise Exception("LibreOffice not found. Please install LibreOffice.")
    except Exception as e:
        raise Exception(f"PDF conversion failed: {str(e)}")

def word_to_pdf_python_docx2pdf(word_buffer):
    """Convert Word document to PDF using docx2pdf (if available)"""
    try:
        import docx2pdf
        
        # Create temporary files
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_docx:
            temp_docx.write(word_buffer.getvalue())
            temp_docx_path = temp_docx.name
        
        temp_pdf_path = temp_docx_path.replace('.docx', '.pdf')
        
        # Convert using docx2pdf
        docx2pdf.convert(temp_docx_path, temp_pdf_path)
        
        # Read the generated PDF
        with open(temp_pdf_path, 'rb') as pdf_file:
            pdf_data = pdf_file.read()
        
        # Clean up temporary files
        try:
            Path(temp_docx_path).unlink()
            Path(temp_pdf_path).unlink()
        except:
            pass
            
        return pdf_data
        
    except ImportError:
        raise Exception("docx2pdf not available")
    except Exception as e:
        raise Exception(f"docx2pdf conversion failed: {str(e)}")

def word_to_pdf_comtypes(word_buffer):
    """Convert Word document to PDF using comtypes (Windows only)"""
    try:
        import comtypes.client
        
        # Create temporary files
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_docx:
            temp_docx.write(word_buffer.getvalue())
            temp_docx_path = temp_docx.name
        
        temp_pdf_path = temp_docx_path.replace('.docx', '.pdf')
        
        # Convert using Word COM automation
        word = comtypes.client.CreateObject('Word.Application')
        word.Visible = False
        
        doc = word.Documents.Open(temp_docx_path)
        doc.SaveAs(temp_pdf_path, FileFormat=17)  # 17 = PDF format
        doc.Close()
        word.Quit()
        
        # Read the generated PDF
        with open(temp_pdf_path, 'rb') as pdf_file:
            pdf_data = pdf_file.read()
        
        # Clean up temporary files
        try:
            Path(temp_docx_path).unlink()
            Path(temp_pdf_path).unlink()
        except:
            pass
            
        return pdf_data
        
    except ImportError:
        raise Exception("comtypes not available")
    except Exception as e:
        raise Exception(f"Word COM conversion failed: {str(e)}")

def generate_ieee_pdf(form_data):
    """Generate IEEE-formatted PDF by converting the perfect Word document"""
    
    # First, generate the perfect Word document using the existing generator
    try:
        word_bytes = generate_ieee_document(form_data)
        print(f"Word document generated successfully, size: {len(word_bytes)} bytes", file=sys.stderr)
    except Exception as e:
        raise Exception(f"Failed to generate Word document: {str(e)}")
    
    # Try multiple conversion methods in order of preference
    conversion_methods = [
        ("LibreOffice", word_to_pdf_libreoffice),
        ("comtypes (Windows Word)", word_to_pdf_comtypes),
        ("docx2pdf", word_to_pdf_python_docx2pdf)
    ]
    
    last_error = None
    
    for method_name, method_func in conversion_methods:
        try:
            print(f"Trying conversion method: {method_name}", file=sys.stderr)
            # Create BytesIO buffer from the word bytes
            word_buffer = BytesIO(word_bytes)
            pdf_data = method_func(word_buffer)
            print(f"PDF conversion successful using {method_name}, size: {len(pdf_data)} bytes", file=sys.stderr)
            return pdf_data
        except Exception as e:
            last_error = e
            print(f"{method_name} failed: {str(e)}", file=sys.stderr)
            continue
    
    # If all conversion methods fail, raise the last error
    raise Exception(f"All PDF conversion methods failed. Last error: {str(last_error)}")

def main():
    """Main function for command line execution"""
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        form_data = json.loads(input_data)
        
        # Generate IEEE PDF document by converting Word
        pdf_data = generate_ieee_pdf(form_data)
        
        # Write binary data to stdout
        sys.stdout.buffer.write(pdf_data)
        
    except Exception as e:
        import traceback
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.stderr.write(f"Traceback: {traceback.format_exc()}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()