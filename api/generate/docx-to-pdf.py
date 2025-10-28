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

def generate_ieee_document(document_data):
    """Generate IEEE document using the fixed generator"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        server_ieee_path = os.path.join(current_dir, '..', '..', 'server', 'ieee_generator_fixed.py')
        
        if os.path.exists(server_ieee_path):
            import importlib.util
            spec = importlib.util.spec_from_file_location("ieee_generator_fixed", server_ieee_path)
            ieee_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(ieee_module)
            
            generator = ieee_module.IEEEDocumentGenerator()
            docx_buffer = generator.generate_document(document_data)
            return docx_buffer
        else:
            raise Exception("IEEE generator not found")
    except Exception as e:
        print(f"IEEE document generation failed: {e}", file=sys.stderr)
        raise e

def handler(req, res):
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
            
            # Priority 1: Use the perfect IEEE generator (same as localhost)
            try:
                # First try to generate perfect IEEE DOCX using ieee_generator_fixed.py
                docx_buffer = generate_ieee_document(document_data)
                print("Perfect IEEE DOCX generated successfully", file=sys.stderr)
                
                # Try to convert DOCX to PDF for preview/download
                try:
                    # Attempt PDF conversion using available methods
                    pdf_data = None
                    
                    # Method 1: Try ReportLab converter if available
                    server_ieee_path = os.path.join(current_dir, '..', '..', 'server', 'ieee_pdf_generator.py')
                    if os.path.exists(server_ieee_path):
                        import importlib.util
                        spec = importlib.util.spec_from_file_location("ieee_pdf_generator", server_ieee_path)
                        ieee_pdf_module = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(ieee_pdf_module)
                        
                        # Generate PDF using ReportLab (for Vercel compatibility)
                        generator = ieee_pdf_module.IEEEPDFGenerator()
                        pdf_data = generator.generate_pdf(document_data)
                        print("PDF conversion successful using ReportLab", file=sys.stderr)
                    
                    # If PDF generation succeeded, serve PDF
                    if pdf_data:
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
                            self.send_header('Content-Disposition', 'attachment; filename="ieee_paper.pdf"')
                        
                        self.end_headers()
                        self.wfile.write(pdf_data)
                        return
                        
                except Exception as pdf_error:
                    print(f"PDF conversion failed, serving perfect IEEE DOCX: {pdf_error}", file=sys.stderr)
                
                # If PDF conversion failed, serve the perfect IEEE DOCX
                if is_preview:
                    # For preview, we need PDF format - return helpful error
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    error_response = json.dumps({
                        'error': 'PDF preview temporarily unavailable',
                        'message': 'Perfect IEEE formatting available via download. DOCX contains identical layout to your localhost preview.',
                        'suggestion': 'Use Download Word button to get your perfect IEEE paper.'
                    })
                    self.wfile.write(error_response.encode())
                    return
                
                # For downloads, serve the perfect IEEE DOCX (same quality as localhost)
                self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
                if is_download:
                    self.send_header('Content-Disposition', 'attachment; filename="ieee_paper.docx"')
                    content_length = len(docx_buffer) if isinstance(docx_buffer, bytes) else len(docx_buffer.encode())
                    self.send_header('Content-Length', str(content_length))
                else:
                    self.send_header('Content-Disposition', 'attachment; filename="ieee_paper.docx"')
                
                self.end_headers()
                
                if isinstance(docx_buffer, bytes):
                    self.wfile.write(docx_buffer)
                else:
                    self.wfile.write(docx_buffer.encode())
                        
            except Exception as error:
                print(f"Perfect IEEE document generation failed: {error}", file=sys.stderr)
                raise Exception(f"IEEE document generation failed: {error}")
            
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