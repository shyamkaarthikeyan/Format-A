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
        """Proxy email generation requests to Python backend"""
        try:
            print("=== Email Proxy Handler ===", file=sys.stderr)
            
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
            email_data = json.loads(post_data.decode('utf-8'))
            
            print(f"Received email request: {str(email_data)[:200]}...", file=sys.stderr)
            
            # Validate email data
            if not email_data.get('email'):
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_response = json.dumps({
                    'error': 'Missing email address',
                    'message': 'Email address is required'
                })
                self.wfile.write(error_response.encode())
                return
            
            # Try to proxy to Python backend first
            python_response = self._proxy_to_python_backend(email_data, 'email-generator')
            
            if python_response:
                print("Successfully proxied email request to Python backend", file=sys.stderr)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(python_response).encode())
                return
            
            # Fallback: Provide basic response
            print("Python backend failed, using local fallback", file=sys.stderr)
            fallback_response = self._local_fallback(email_data)
            
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
            print(f"Email proxy error: {e}", file=sys.stderr)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = json.dumps({
                'error': 'Email generation failed',
                'message': str(e)
            })
            self.wfile.write(error_response.encode())

    def _proxy_to_python_backend(self, email_data, endpoint_type):
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
                    request_data = json.dumps(email_data).encode('utf-8')
                    
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

    def _local_fallback(self, email_data):
        """Provide a fallback response when Python backend is unavailable"""
        print("Using local fallback for email generation", file=sys.stderr)
        
        return {
            'success': False,
            'error': 'Email service temporarily unavailable',
            'message': 'Email generation service is currently unavailable. Please try again later.',
            'fallback': True,
            'data': {
                'email': email_data.get('email', ''),
                'status': 'fallback_mode',
                'retry_suggestion': 'Please try again in a few minutes'
            }
        }