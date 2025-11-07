import json
import sys
import os
import base64
from io import BytesIO
from http.server import BaseHTTPRequestHandler
import urllib.request
import urllib.parse

# Add the server directory to Python path to import the IEEE generator
current_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.join(current_dir, '..', '..', 'server')
sys.path.insert(0, server_dir)

# Try multiple import paths for Vercel deployment
def get_ieee_generator():
    """Get the IEEE generator function with multiple fallback paths"""
    try:
        # Try importing from api directory (local copy)
        api_dir = os.path.join(current_dir, '..', '..')
        sys.path.insert(0, api_dir)
        from ieee_generator_fixed import generate_ieee_document
        return generate_ieee_document
    except ImportError:
        try:
            # Try importing from server directory
            sys.path.append('/var/task/server')
            from ieee_generator_fixed import generate_ieee_document
            return generate_ieee_document
        except ImportError:
            try:
                # Try importing from current directory
                sys.path.append('/var/task')
                from server.ieee_generator_fixed import generate_ieee_document
                return generate_ieee_document
            except ImportError:
                try:
                    # Try importing from api directory (Vercel path)
                    sys.path.append('/var/task/api')
                    from ieee_generator_fixed import generate_ieee_document
                    return generate_ieee_document
                except ImportError:
                    # Return None if all imports fail
                    return None

# Get the generator function
generate_ieee_document = get_ieee_generator()

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
        """Handle POST requests for preview image generation"""
        try:
            # Set CORS headers first
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Preview')
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.send_header('Content-Type', 'application/json')
            
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
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
                self.end_headers()
                error_response = json.dumps({
                    'error': 'Missing document title',
                    'message': 'Document title is required'
                })
                self.wfile.write(error_response.encode())
                return
            
            # ALWAYS try Python backend first in production (Vercel environment)
            # This ensures consistent behavior and leverages the dedicated Python service
            print("Attempting to proxy to Python backend for preview generation", file=sys.stderr)
            
            try:
                # Try to proxy to the Python backend
                python_response = self._proxy_to_python_backend(document_data)
                if python_response:
                    print("✅ Successfully proxied to Python backend", file=sys.stderr)
                    self.end_headers()
                    self.wfile.write(json.dumps(python_response).encode())
                    return
            except Exception as proxy_error:
                print(f"⚠️ Python backend proxy failed: {proxy_error}", file=sys.stderr)
            
            # Fallback: Try local IEEE generator only if Python backend fails
            if generate_ieee_document is not None:
                try:
                    print("Falling back to local IEEE generator", file=sys.stderr)
                    docx_buffer = generate_ieee_document(document_data)
                    print("DOCX generated successfully with local generator", file=sys.stderr)
                    
                    # Create a simple HTML preview instead of images (more reliable)
                    preview_html = self._create_html_preview(document_data)
                    
                    self.end_headers()
                    response = json.dumps({
                        'success': True,
                        'preview_type': 'html',
                        'html_content': preview_html,
                        'message': 'Preview generated successfully (local fallback)'
                    })
                    self.wfile.write(response.encode())
                    return
                    
                except Exception as docx_error:
                    print(f"Local DOCX generation failed: {docx_error}", file=sys.stderr)
            else:
                print("Local IEEE generator not available", file=sys.stderr)
            
            # Final fallback: Basic HTML preview
            print("Using basic HTML preview as final fallback", file=sys.stderr)
            preview_html = self._create_html_preview(document_data)
            
            self.end_headers()
            response = json.dumps({
                'success': True,
                'preview_type': 'html',
                'html_content': preview_html,
                'message': 'Basic preview generated (Python backend unavailable - downloads will have full IEEE formatting)',
                'fallback': True
            })
            self.wfile.write(response.encode())
            
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
                'error': 'Preview generation failed',
                'message': str(e)
            })
            self.wfile.write(error_response.encode())

    def _create_html_preview(self, document_data):
        """Create an HTML preview that mimics IEEE formatting"""
        
        # Extract document data
        title = document_data.get('title', 'Untitled Document')
        authors = document_data.get('authors', [])
        abstract = document_data.get('abstract', '')
        keywords = document_data.get('keywords', '')
        sections = document_data.get('sections', [])
        references = document_data.get('references', [])
        
        # Format authors
        author_names = []
        for author in authors:
            if author.get('name'):
                author_names.append(author['name'])
        authors_text = ', '.join(author_names) if author_names else 'Anonymous'
        
        # Create HTML with IEEE-like styling
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: 'Times New Roman', serif;
                    font-size: 9.5pt;
                    line-height: 1.2;
                    margin: 20px;
                    background: white;
                    color: black;
                }}
                .ieee-title {{
                    font-size: 14pt;
                    font-weight: bold;
                    text-align: center;
                    margin: 20px 0;
                    line-height: 1.3;
                }}
                .ieee-authors {{
                    font-size: 10pt;
                    text-align: center;
                    margin: 15px 0;
                    font-style: italic;
                }}
                .ieee-section {{
                    margin: 15px 0;
                    text-align: justify;
                }}
                .ieee-abstract-title {{
                    font-weight: bold;
                    display: inline;
                }}
                .ieee-keywords-title {{
                    font-weight: bold;
                    display: inline;
                }}
                .ieee-heading {{
                    font-weight: bold;
                    margin: 15px 0 5px 0;
                    text-transform: uppercase;
                }}
                .ieee-reference {{
                    margin: 3px 0;
                    padding-left: 15px;
                    text-indent: -15px;
                }}
                .preview-note {{
                    background: #f0f8ff;
                    border: 1px solid #d0e7ff;
                    padding: 10px;
                    margin: 10px 0;
                    font-size: 8pt;
                    color: #666;
                    text-align: center;
                }}
            </style>
        </head>
        <body>
            <div class="preview-note">
                📄 Live IEEE Preview - Download buttons provide full formatting
            </div>
            
            <div class="ieee-title">{title}</div>
            <div class="ieee-authors">{authors_text}</div>
        """
        
        # Add abstract
        if abstract:
            html += f"""
            <div class="ieee-section">
                <span class="ieee-abstract-title">Abstract—</span>{abstract}
            </div>
            """
        
        # Add keywords
        if keywords:
            html += f"""
            <div class="ieee-section">
                <span class="ieee-keywords-title">Keywords—</span>{keywords}
            </div>
            """
        
        # Add sections
        for i, section in enumerate(sections):
            if section.get('title') and section.get('content'):
                html += f"""
                <div class="ieee-heading">{i+1}. {section['title']}</div>
                <div class="ieee-section">{section['content']}</div>
                """
        
        # Add references
        if references:
            html += '<div class="ieee-heading">References</div>'
            for i, ref in enumerate(references):
                if ref.get('text'):
                    html += f'<div class="ieee-reference">[{i+1}] {ref["text"]}</div>'
        
        html += """
            <div class="preview-note">
                ✨ Perfect IEEE formatting available via Download Word/PDF buttons
            </div>
        </body>
        </html>
        """
        
        return html

    def _proxy_to_python_backend(self, document_data):
        """Proxy the request to the Python backend with comprehensive retry logic"""
        try:
            # Try multiple Python backend URLs for reliability
            backend_urls = [
                "https://format-a-python-backend.vercel.app/api/document-generator",
                "https://format-a-python.vercel.app/api/document-generator"
            ]
            
            # Retry configuration
            max_retries = 3
            base_delay = 1.0  # seconds
            backoff_multiplier = 2
            
            for backend_url in backend_urls:
                print(f"Attempting to proxy to: {backend_url}", file=sys.stderr)
                
                # Try each URL with retry logic
                for attempt in range(max_retries + 1):
                    try:
                        # Calculate delay for exponential backoff
                        if attempt > 0:
                            delay = base_delay * (backoff_multiplier ** (attempt - 1))
                            print(f"Retrying {backend_url} after {delay}s delay (attempt {attempt + 1})", file=sys.stderr)
                            import time
                            time.sleep(delay)
                        
                        # Prepare the request data
                        request_data = json.dumps(document_data).encode('utf-8')
                        
                        # Create the request with proper headers
                        req = urllib.request.Request(
                            backend_url,
                            data=request_data,
                            headers={
                                'Content-Type': 'application/json',
                                'Content-Length': str(len(request_data)),
                                'User-Agent': 'Format-A-Proxy/1.0',
                                'X-Retry-Attempt': str(attempt + 1),
                                'X-Source': 'format-a-main-app'
                            },
                            method='POST'
                        )
                        
                        # Make the request with timeout
                        timeout = 30 + (attempt * 10)  # Increase timeout with retries
                        with urllib.request.urlopen(req, timeout=timeout) as response:
                            response_body = response.read().decode('utf-8')
                            
                            if response.status == 200:
                                response_data = json.loads(response_body)
                                print(f"✅ Successfully proxied to Python backend: {backend_url} (attempt {attempt + 1})", file=sys.stderr)
                                print(f"Response preview: {str(response_data)[:200]}...", file=sys.stderr)
                                return response_data
                            elif response.status in [500, 502, 503, 504]:
                                # Server errors - retry
                                print(f"⚠️ Server error {response.status} from {backend_url}, will retry", file=sys.stderr)
                                if attempt == max_retries:
                                    print(f"❌ Max retries reached for {backend_url}", file=sys.stderr)
                                continue
                            else:
                                # Client errors - don't retry
                                print(f"❌ Client error {response.status} from {backend_url}: {response_body[:200]}", file=sys.stderr)
                                break
                                
                    except urllib.error.HTTPError as http_err:
                        if http_err.code in [500, 502, 503, 504] and attempt < max_retries:
                            print(f"⚠️ HTTP error {http_err.code} for {backend_url}, retrying...", file=sys.stderr)
                            continue
                        else:
                            print(f"❌ HTTP error for {backend_url}: {http_err.code} - {http_err.reason}", file=sys.stderr)
                            break
                    except urllib.error.URLError as url_err:
                        if attempt < max_retries:
                            print(f"⚠️ URL error for {backend_url}, retrying: {url_err.reason}", file=sys.stderr)
                            continue
                        else:
                            print(f"❌ URL error for {backend_url}: {url_err.reason}", file=sys.stderr)
                            break
                    except Exception as req_err:
                        if attempt < max_retries and ('timeout' in str(req_err).lower() or 'network' in str(req_err).lower()):
                            print(f"⚠️ Network error for {backend_url}, retrying: {req_err}", file=sys.stderr)
                            continue
                        else:
                            print(f"❌ Request error for {backend_url}: {req_err}", file=sys.stderr)
                            break
            
            print("❌ All Python backend URLs failed after retries", file=sys.stderr)
            return None
                    
        except Exception as e:
            print(f"❌ Failed to proxy to Python backend: {e}", file=sys.stderr)
            return None
