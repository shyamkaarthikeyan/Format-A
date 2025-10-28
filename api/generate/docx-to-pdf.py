import json
import sys
import os
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
            
            # Check if this is a preview request
            is_preview = self.headers.get('X-Preview') == 'true' or 'preview=true' in self.path
            
            # For preview requests, skip authentication
            # For actual downloads, we would check authentication here
            if not is_preview:
                # TODO: Add authentication check for actual downloads
                # For now, allow all requests to work
                pass
            
            # Generate DOCX document
            docx_buffer = generate_ieee_document(document_data)
            
            # Set response headers for DOCX file
            self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            if is_preview:
                # For preview, don't set attachment disposition to prevent auto-download
                self.send_header('Content-Disposition', 'inline; filename="ieee_paper_preview.docx"')
            else:
                # For actual downloads, use attachment to trigger download
                self.send_header('Content-Disposition', 'attachment; filename="ieee_paper.docx"')
            
            self.end_headers()
            
            # Send the DOCX file
            if isinstance(docx_buffer, bytes):
                self.wfile.write(docx_buffer)
            else:
                self.wfile.write(docx_buffer.encode())
            
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