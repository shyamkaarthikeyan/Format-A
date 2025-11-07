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
        """Proxy PDF generation requests to Python backend"""
        try:
            print("=== PDF Proxy Handler ===", file=sys.stderr)
            
            # Check if this is a preview request
            is_preview = (
                self.path.find('preview=true') != -1 or 
                self.headers.get('X-Preview') == 'true'
            )
            
            print(f"Preview mode: {is_preview}", file=sys.stderr)
            
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
            
            print(f"Received PDF request: {str(document_data)[:200]}...", file=sys.stderr)
            
            # For preview requests, try the preview-images endpoint first
            if is_preview:
                print("Handling as preview request", file=sys.stderr)
                python_response = self._proxy_to_python_backend(document_data, 'document-generator')
            else:
                print("Handling as download request", file=sys.stderr)
                python_response = self._proxy_to_python_backend(document_data, 'pdf-generator')
            
            if python_response:
                print("Successfully proxied PDF request to Python backend", file=sys.stderr)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(python_response).encode())
                return
            
            # Fallback: Try to use local IEEE generator or provide preview
            print("Python backend failed, trying local fallback", file=sys.stderr)
            fallback_response = self._local_fallback(document_data, 'pdf', is_preview)
            
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
            print(f"PDF proxy error: {e}", file=sys.stderr)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = json.dumps({
                'error': 'PDF generation failed',
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

    def _local_fallback(self, document_data, format_type, is_preview):
        """Provide a fallback response when Python backend is unavailable"""
        print(f"Using local fallback for {format_type} generation (preview: {is_preview})", file=sys.stderr)
        
        if is_preview:
            # For preview requests, provide a basic HTML preview
            preview_html = self._create_basic_preview(document_data)
            return {
                'success': True,
                'preview_type': 'html',
                'html_content': preview_html,
                'message': 'Basic preview generated (Python backend unavailable)',
                'fallback': True
            }
        else:
            # For download requests, return error
            return {
                'success': False,
                'error': 'Service temporarily unavailable',
                'message': f'{format_type.upper()} generation service is currently unavailable. Please try again later.',
                'fallback': True,
                'data': {
                    'title': document_data.get('title', 'Document'),
                    'status': 'fallback_mode'
                }
            }

    def _create_basic_preview(self, document_data):
        """Create a basic HTML preview when Python backend is unavailable"""
        title = document_data.get('title', 'Untitled Document')
        authors = document_data.get('authors', [])
        abstract = document_data.get('abstract', '')
        
        # Format authors
        author_names = []
        for author in authors:
            if author.get('name'):
                author_names.append(author['name'])
        authors_text = ', '.join(author_names) if author_names else 'Anonymous'
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: 'Times New Roman', serif;
                    font-size: 10pt;
                    line-height: 1.3;
                    margin: 20px;
                    background: white;
                    color: black;
                }}
                .fallback-notice {{
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    padding: 10px;
                    margin: 10px 0;
                    font-size: 9pt;
                    color: #856404;
                    text-align: center;
                }}
                .title {{ font-size: 14pt; font-weight: bold; text-align: center; margin: 20px 0; }}
                .authors {{ font-size: 10pt; text-align: center; margin: 15px 0; font-style: italic; }}
                .abstract {{ margin: 15px 0; text-align: justify; }}
            </style>
        </head>
        <body>
            <div class="fallback-notice">
                ⚠️ Fallback Preview - Full formatting available when service is restored
            </div>
            <div class="title">{title}</div>
            <div class="authors">{authors_text}</div>
            {f'<div class="abstract"><strong>Abstract—</strong>{abstract}</div>' if abstract else ''}
        </body>
        </html>
        """
        
        return html