import json
import sys
import os
import importlib.util
from io import BytesIO

# Add the server directory to Python path to import the IEEE generator
current_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.join(current_dir, '..', '..', 'server')
sys.path.insert(0, server_dir)

try:
    # Import the generate function from the IEEE generator
    sys.path.append('/var/task/server')  # Vercel's task directory
    from ieee_generator_fixed import generate_ieee_document
except ImportError as e:
    print(f"Import error: {e}", file=sys.stderr)
    # Create a fallback function
    def generate_ieee_document(data):
        raise Exception(f"IEEE generator not available: {e}")

from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Preview')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.end_headers()

    def do_POST(self):
        """Handle POST requests for document generation"""
        try:
            # Set CORS headers first
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Preview')
            self.send_header('Access-Control-Allow-Credentials', 'true')
            
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_response = json.dumps({
                    'error': 'Empty request body',
                    'message': 'Request body is required'
                })
                self.wfile.write(error_response.encode())
                return
                
            post_data = self.rfile.read(content_length)
            document_data = json.loads(post_data.decode('utf-8'))
            
            # Validate required fields
            if not document_data.get('title'):
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_response = json.dumps({
                    'error': 'Missing document title',
                    'message': 'Document title is required'
                })
                self.wfile.write(error_response.encode())
                return
            
            # Check if this is a preview or download request
            is_preview = self.headers.get('X-Preview') == 'true' or 'preview=true' in self.path
            is_download = self.headers.get('X-Download') == 'true' or 'download=true' in self.path
            
            # For preview requests, skip authentication
            # For actual downloads, we would check authentication here
            if not is_preview and not is_download:
                # TODO: Add authentication check for actual downloads
                # For now, allow all requests to work
                pass
            
            # Use the same approach as localhost: ieee_generator_fixed.py first (perfect IEEE formatting)
            try:
                # Generate DOCX using the proven IEEE generator (same as localhost)
                docx_buffer = generate_ieee_document(document_data)
                
                # Try to convert DOCX to PDF for preview/download
                try:
                    # Import docx2pdf for conversion (if available)
                    import docx2pdf
                    from tempfile import NamedTemporaryFile
                    import os
                    
                    # Create temporary files for conversion
                    with NamedTemporaryFile(suffix='.docx', delete=False) as temp_docx:
                        if isinstance(docx_buffer, bytes):
                            temp_docx.write(docx_buffer)
                        else:
                            temp_docx.write(docx_buffer.encode())
                        temp_docx_path = temp_docx.name
                    
                    with NamedTemporaryFile(suffix='.pdf', delete=False) as temp_pdf:
                        temp_pdf_path = temp_pdf.name
                    
                    # Convert DOCX to PDF (preserves perfect IEEE formatting)
                    docx2pdf.convert(temp_docx_path, temp_pdf_path)
                    
                    # Read the generated PDF
                    with open(temp_pdf_path, 'rb') as pdf_file:
                        pdf_data = pdf_file.read()
                    
                    # Clean up temporary files
                    os.unlink(temp_docx_path)
                    os.unlink(temp_pdf_path)
                    
                    # Set response headers for PDF file (perfect IEEE format)
                    self.send_header('Content-Type', 'application/pdf')
                    if is_preview:
                        self.send_header('Content-Disposition', 'inline; filename="ieee_paper_preview.pdf"')
                        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                        self.send_header('Pragma', 'no-cache')
                        self.send_header('Expires', '0')
                    elif is_download:
                        self.send_header('Content-Disposition', 'attachment; filename="ieee_paper.pdf"')
                        self.send_header('Content-Length', str(len(pdf_data)))
                    else:
                        # Default to attachment for safety
                        self.send_header('Content-Disposition', 'attachment; filename="ieee_paper.pdf"')
                    
                    self.end_headers()
                    self.wfile.write(pdf_data)
                    
                except (ImportError, Exception) as pdf_error:
                    # If PDF conversion fails, serve DOCX directly (still perfect IEEE format)
                    print(f"PDF conversion failed, serving DOCX with perfect IEEE formatting: {pdf_error}", file=sys.stderr)
                    
                    self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
                    if is_preview:
                        self.send_header('Content-Disposition', 'inline; filename="ieee_paper_preview.docx"')
                    elif is_download:
                        self.send_header('Content-Disposition', 'attachment; filename="ieee_paper.docx"')
                        # Add content length for better download experience
                        content_length = len(docx_buffer) if isinstance(docx_buffer, bytes) else len(docx_buffer.encode())
                        self.send_header('Content-Length', str(content_length))
                    else:
                        self.send_header('Content-Disposition', 'attachment; filename="ieee_paper.docx"')
                    
                    self.end_headers()
                    
                    if isinstance(docx_buffer, bytes):
                        self.wfile.write(docx_buffer)
                    else:
                        self.wfile.write(docx_buffer.encode())
                        
            except Exception as docx_error:
                # If the correct IEEE generator fails, don't fall back to incorrect formatting
                print(f"IEEE generator failed: {docx_error}", file=sys.stderr)
                raise Exception(f"IEEE document generation failed: {docx_error}")
            
        except json.JSONDecodeError as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = json.dumps({
                'error': 'Invalid JSON',
                'message': f'Failed to parse request body: {str(e)}'
            })
            self.wfile.write(error_response.encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = json.dumps({
                'error': 'Document generation failed',
                'message': str(e)
            })
            self.wfile.write(error_response.encode())