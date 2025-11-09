import json
import sys
import os
import urllib.request
import urllib.parse
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
        """Proxy DOCX generation requests to Python backend"""
        try:
            print("=== DOCX Proxy Handler ===", file=sys.stderr)
            
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
            
            print(f"Received DOCX request: {str(document_data)[:200]}...", file=sys.stderr)
            
            # Try to proxy to Python backend first
            python_response = self._proxy_to_python_backend(document_data, 'docx-generator')
            
            if python_response:
                print("Successfully proxied DOCX request to Python backend", file=sys.stderr)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(python_response).encode())
                return
            
            # Fallback: Try to use local IEEE generator
            print("Python backend failed, trying local fallback", file=sys.stderr)
            fallback_response = self._local_fallback(document_data, 'docx')
            
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(fallback_response).encode())
            
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
            print(f"DOCX proxy error: {e}", file=sys.stderr)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = json.dumps({
                'error': 'DOCX generation failed',
                'message': str(e)
            })
            self.wfile.write(error_response.encode())

    def _proxy_to_python_backend(self, document_data, endpoint_type):
        """Proxy the request to the Python backend"""
        try:
            # Try multiple Python backend URLs for reliability
            backend_urls = [
                f"https://format-a-python-backend.vercel.app/api/{endpoint_type}",
                f"https://format-a-python.vercel.app/api/{endpoint_type}",
                "https://format-a-python-backend.vercel.app/api/document-generator"  # fallback to main endpoint
            ]
            
            for backend_url in backend_urls:
                try:
                    print(f"Attempting to proxy to: {backend_url}", file=sys.stderr)
                    
                    # Prepare the request data
                    request_data = json.dumps(document_data).encode('utf-8')
                    
                    # Create the request with proper headers
                    req = urllib.request.Request(
                        backend_url,
                        data=request_data,
                        headers={
                            'Content-Type': 'application/json',
                            'Content-Length': str(len(request_data)),
                            'User-Agent': 'Format-A-Proxy/1.0'
                        },
                        method='POST'
                    )
                    
                    # Make the request with timeout
                    with urllib.request.urlopen(req, timeout=30) as response:
                        response_body = response.read().decode('utf-8')
                        
                        if response.status == 200:
                            response_data = json.loads(response_body)
                            print(f"Successfully proxied to Python backend: {backend_url}", file=sys.stderr)
                            return response_data
                        else:
                            print(f"Python backend returned status {response.status}: {response_body[:200]}", file=sys.stderr)
                            continue
                            
                except urllib.error.HTTPError as http_err:
                    print(f"HTTP error for {backend_url}: {http_err.code} - {http_err.reason}", file=sys.stderr)
                    continue
                except urllib.error.URLError as url_err:
                    print(f"URL error for {backend_url}: {url_err.reason}", file=sys.stderr)
                    continue
                except Exception as req_err:
                    print(f"Request error for {backend_url}: {req_err}", file=sys.stderr)
                    continue
            
            print("All Python backend URLs failed", file=sys.stderr)
            return None
                    
        except Exception as e:
            print(f"Failed to proxy to Python backend: {e}", file=sys.stderr)
            return None

    def _local_fallback(self, document_data, format_type):
        """Generate document using local IEEE generator when Python backend is unavailable"""
        print(f"Using local IEEE generator fallback for {format_type} generation", file=sys.stderr)
        
        try:
            # Import the local IEEE generator
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from ieee_generator_fixed import generate_ieee_document
            
            print("Successfully imported local IEEE generator", file=sys.stderr)
            
            # Generate the document using local generator
            document_bytes = generate_ieee_document(document_data)
            
            # Convert to base64 for JSON response
            import base64
            document_base64 = base64.b64encode(document_bytes).decode('utf-8')
            
            print(f"Successfully generated {format_type} document locally", file=sys.stderr)
            
            return {
                'success': True,
                'message': f'{format_type.upper()} document generated successfully using local generator',
                'fallback': True,
                'data': {
                    'title': document_data.get('title', 'Document'),
                    'status': 'generated_locally',
                    'document': document_base64,
                    'filename': f"{document_data.get('title', 'document').replace(' ', '_')}.docx",
                    'content_type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                }
            }
            
        except ImportError as e:
            print(f"Failed to import local IEEE generator: {e}", file=sys.stderr)
            return {
                'success': False,
                'error': 'Local generator unavailable',
                'message': f'Both Python backend and local {format_type} generator are unavailable.',
                'fallback': True,
                'data': {
                    'title': document_data.get('title', 'Document'),
                    'status': 'fallback_failed'
                }
            }
        except Exception as e:
            print(f"Local generator error: {e}", file=sys.stderr)
            return {
                'success': False,
                'error': 'Local generation failed',
                'message': f'Local {format_type} generation failed: {str(e)}',
                'fallback': True,
                'data': {
                    'title': document_data.get('title', 'Document'),
                    'status': 'generation_error'
                }
            }