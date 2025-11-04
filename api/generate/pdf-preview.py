#!/usr/bin/env python3
"""
Vercel Python Serverless Function for PDF Preview Generation
Uses ieee_generator_fixed.py for correct IEEE formatting
"""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler
from io import BytesIO
import subprocess

# Add the current directory to the path so we can import ieee_generator_fixed
sys.path.insert(0, os.path.dirname(__file__))

try:
    from ieee_generator_fixed import generate_ieee_document
    HAS_GENERATOR = True
except ImportError as e:
    HAS_GENERATOR = False
    print(f"Warning: Could not import ieee_generator_fixed: {e}", file=sys.stderr)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Read the request body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Parse the JSON document data
            document_data = json.loads(post_data.decode('utf-8'))
            
            # Validate required fields
            if not document_data.get('title'):
                self.send_error_response(400, 'Document title is required')
                return
            
            if not document_data.get('authors') or not any(author.get('name') for author in document_data.get('authors', [])):
                self.send_error_response(400, 'At least one author is required')
                return
            
            if not HAS_GENERATOR:
                self.send_error_response(500, 'PDF generator not available', 
                    'The ieee_generator_fixed module could not be loaded')
                return
            
            print(f"Generating PDF for: {document_data.get('title')}", file=sys.stderr)
            
            # Generate the DOCX document using ieee_generator_fixed
            docx_buffer = BytesIO()
            generate_ieee_document(document_data, docx_buffer)
            docx_data = docx_buffer.getvalue()
            
            if len(docx_data) == 0:
                self.send_error_response(500, 'Generated document is empty')
                return
            
            print(f"✓ Generated DOCX: {len(docx_data)} bytes", file=sys.stderr)
            
            # Try to convert DOCX to PDF using docx2pdf if available
            # If not available, just return the DOCX
            try:
                import docx2pdf
                from tempfile import NamedTemporaryFile
                import os
                
                # Create temporary files
                with NamedTemporaryFile(suffix='.docx', delete=False) as docx_file:
                    docx_file.write(docx_data)
                    docx_path = docx_file.name
                
                pdf_path = docx_path.replace('.docx', '.pdf')
                
                try:
                    # Convert DOCX to PDF
                    docx2pdf.convert(docx_path, pdf_path)
                    
                    # Read the PDF
                    with open(pdf_path, 'rb') as pdf_file:
                        pdf_data = pdf_file.read()
                    
                    print(f"✓ Converted to PDF: {len(pdf_data)} bytes", file=sys.stderr)
                    
                    # Clean up temp files
                    os.unlink(docx_path)
                    os.unlink(pdf_path)
                    
                    # Send PDF response
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/pdf')
                    self.send_header('Content-Disposition', 'inline; filename="ieee_paper_preview.pdf"')
                    self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                    self.send_header('Content-Length', str(len(pdf_data)))
                    self.end_headers()
                    self.wfile.write(pdf_data)
                    return
                    
                except Exception as pdf_error:
                    print(f"PDF conversion failed: {pdf_error}", file=sys.stderr)
                    # Clean up temp files
                    try:
                        os.unlink(docx_path)
                        if os.path.exists(pdf_path):
                            os.unlink(pdf_path)
                    except:
                        pass
                    # Fall through to return DOCX instead
                    
            except ImportError:
                print("docx2pdf not available, returning DOCX", file=sys.stderr)
            
            # Return DOCX if PDF conversion not available or failed
            self.send_response(200)
            self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            self.send_header('Content-Disposition', 'inline; filename="ieee_paper_preview.docx"')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('X-Format-Note', 'DOCX format - PDF conversion not available on Vercel')
            self.send_header('Content-Length', str(len(docx_data)))
            self.end_headers()
            self.wfile.write(docx_data)
            
        except json.JSONDecodeError as e:
            self.send_error_response(400, 'Invalid JSON', str(e))
        except Exception as e:
            print(f"Error generating document: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            self.send_error_response(500, 'Failed to generate document', str(e))
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Preview')
        self.end_headers()
    
    def send_error_response(self, code, error, details=None):
        """Send a JSON error response"""
        response = {
            'error': error
        }
        if details:
            response['details'] = details
        
        response_data = json.dumps(response).encode('utf-8')
        
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_data)))
        self.end_headers()
        self.wfile.write(response_data)
