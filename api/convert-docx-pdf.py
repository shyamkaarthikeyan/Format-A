from http.server import BaseHTTPRequestHandler
import json
import sys
import traceback
import tempfile
import os
import base64
import time
from io import BytesIO

# Import utility functions for error handling and logging
try:
    from python_utils import (
        ServerlessLogger, ServerlessErrorHandler, PDFMetadataExtractor,
        DocumentValidator, TempFileManager, MemoryMonitor, TimeoutHandler,
        ProductionErrorHandler, VercelDiagnostics,
        create_success_response, send_json_response, send_binary_response
    )
except ImportError:
    # Fallback if utils not available
    class ServerlessLogger:
        @staticmethod
        def info(msg, **kwargs): print(f"INFO: {msg}", file=sys.stderr)
        @staticmethod
        def error(msg, **kwargs): print(f"ERROR: {msg}", file=sys.stderr)
        @staticmethod
        def warning(msg, **kwargs): print(f"WARNING: {msg}", file=sys.stderr)
    
    class ServerlessErrorHandler:
        @staticmethod
        def handle_exception(e, context="Operation"):
            return 500, {'success': False, 'error': str(e)}
        @staticmethod
        def create_error_response(status, code, msg, details=None, request_id=None):
            return status, {'success': False, 'error': {'code': code, 'message': msg}}
    
    class PDFMetadataExtractor:
        @staticmethod
        def extract_basic_metadata(data):
            return {'size_bytes': len(data), 'generated_at': 'unknown'}
        @staticmethod
        def is_valid_pdf(data):
            return data.startswith(b'%PDF-') if data else False
    
    class DocumentValidator:
        @staticmethod
        def validate_base64_data(data, max_size_mb=50):
            return base64.b64decode(data.split(',')[1] if ',' in data else data)
    
    class TempFileManager:
        @staticmethod
        def create_temp_file(suffix='', content=None):
            fd, path = tempfile.mkstemp(suffix=suffix, dir='/tmp' if os.path.exists('/tmp') else None)
            if content: os.write(fd, content)
            os.close(fd)
            return path
        @staticmethod
        def cleanup_temp_file(path):
            try: os.unlink(path)
            except: pass
    
    class MemoryMonitor:
        @staticmethod
        def check_memory_limit(): return True
        @staticmethod
        def get_memory_usage(): return {}
        @staticmethod
        def implement_graceful_degradation(info, op): return {'strategy': 'continue'}
    
    class TimeoutHandler:
        @staticmethod
        def check_timeout_risk(start, op): return {'at_risk': False}
        @staticmethod
        def create_timeout_response(elapsed, op): return {'error': 'timeout'}
    
    class ProductionErrorHandler:
        @staticmethod
        def create_production_error_response(e, ctx, req_id=None, debug=None):
            return {'success': False, 'error': str(e)}
    
    def create_success_response(data, message="Success", metadata=None):
        return {'success': True, 'data': data, 'message': message}
    
    def send_json_response(handler, status, data):
        handler.send_response(status)
        handler.send_header('Content-Type', 'application/json')
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.end_headers()
        handler.wfile.write(json.dumps(data).encode())

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        request_id = f"docx_convert_{id(self)}"
        start_time = time.time()
        
        ServerlessLogger.info("Starting DOCX to PDF conversion request", request_id=request_id)
        
        try:
            # Initial memory and timeout checks
            if not MemoryMonitor.check_memory_limit():
                error_response = ProductionErrorHandler.create_production_error_response(
                    MemoryError("Memory usage too high to start operation"),
                    "DOCX conversion initialization",
                    request_id=request_id
                )
                send_json_response(self, 507, error_response)
                return
            
            # Read request body with size validation
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 100 * 1024 * 1024:  # 100MB limit for DOCX files
                error_response = ProductionErrorHandler.create_production_error_response(
                    ValueError(f'Request size ({content_length / (1024*1024):.2f} MB) exceeds limit (100 MB)'),
                    "Request size validation",
                    request_id=request_id,
                    debug_info={'content_length': content_length, 'limit_mb': 100}
                )
                send_json_response(self, 413, error_response)
                return
            
            post_data = self.rfile.read(content_length)
            ServerlessLogger.info(f"Read request data: {len(post_data)} bytes", request_id=request_id)
            
            # Check timeout risk after reading data
            timeout_check = TimeoutHandler.check_timeout_risk(start_time, "docx_conversion")
            if timeout_check['at_risk'] and timeout_check['strategy'] == 'abort_gracefully':
                timeout_response = TimeoutHandler.create_timeout_response(
                    timeout_check['elapsed_seconds'], "docx_conversion"
                )
                send_json_response(self, 408, timeout_response)
                return
            
            # Parse JSON data
            try:
                request_data = json.loads(post_data.decode('utf-8'))
                ServerlessLogger.info("Successfully parsed JSON request", request_id=request_id)
            except json.JSONDecodeError as e:
                error_response = ProductionErrorHandler.create_production_error_response(
                    e, "JSON parsing", request_id=request_id,
                    debug_info={'data_length': len(post_data), 'data_preview': post_data[:100].decode('utf-8', errors='ignore')}
                )
                send_json_response(self, 400, error_response)
                return
            
            # Get and validate DOCX data from request
            docx_data_b64 = request_data.get('docx_data')
            if not docx_data_b64:
                error_response = ProductionErrorHandler.create_production_error_response(
                    ValueError('Missing docx_data in request'),
                    "Request validation",
                    request_id=request_id,
                    debug_info={'request_keys': list(request_data.keys()) if isinstance(request_data, dict) else 'not_dict'}
                )
                send_json_response(self, 400, error_response)
                return
            
            # Decode and validate base64 DOCX data
            try:
                docx_data = DocumentValidator.validate_base64_data(docx_data_b64, max_size_mb=50)
                ServerlessLogger.info(f"Successfully decoded DOCX data: {len(docx_data)} bytes", request_id=request_id)
            except ValueError as e:
                error_response = ProductionErrorHandler.create_production_error_response(
                    e, "Base64 validation", request_id=request_id,
                    debug_info={'base64_length': len(docx_data_b64) if docx_data_b64 else 0}
                )
                send_json_response(self, 400, error_response)
                return
            
            # Check memory before conversion
            memory_info = MemoryMonitor.get_memory_usage()
            degradation_strategy = MemoryMonitor.implement_graceful_degradation(memory_info, "docx_conversion")
            
            if degradation_strategy['strategy'] == 'abort':
                error_response = ProductionErrorHandler.create_production_error_response(
                    MemoryError(degradation_strategy['message']),
                    "Memory limit check",
                    request_id=request_id,
                    debug_info={'memory_info': memory_info, 'degradation_strategy': degradation_strategy}
                )
                send_json_response(self, 507, error_response)
                return
            elif degradation_strategy['strategy'] in ['reduce_quality', 'optimize']:
                ServerlessLogger.warning(
                    f"Applying degradation strategy: {degradation_strategy['strategy']}",
                    request_id=request_id,
                    strategy=degradation_strategy
                )
            
            # Convert DOCX to PDF with timeout monitoring
            try:
                ServerlessLogger.info("Starting DOCX to PDF conversion", request_id=request_id)
                
                # Check timeout before starting conversion
                timeout_check = TimeoutHandler.check_timeout_risk(start_time, "docx_conversion")
                if timeout_check['at_risk'] and timeout_check['strategy'] == 'expedite_operation':
                    ServerlessLogger.warning("Expediting operation due to timeout risk", request_id=request_id)
                
                pdf_data = self.convert_docx_to_pdf(docx_data, request_id, start_time)
                
                # Check timeout after conversion
                timeout_check = TimeoutHandler.check_timeout_risk(start_time, "docx_conversion")
                if timeout_check['at_risk']:
                    ServerlessLogger.warning("Operation completed but close to timeout", 
                                           request_id=request_id, timeout_info=timeout_check)
                
                ServerlessLogger.info(f"Conversion successful: {len(pdf_data)} bytes", request_id=request_id)
                
                # Extract PDF metadata with performance info
                metadata = PDFMetadataExtractor.extract_basic_metadata(pdf_data)
                metadata['request_id'] = request_id
                metadata['input_size_bytes'] = len(docx_data)
                metadata['conversion_time_seconds'] = round(time.time() - start_time, 2)
                metadata['memory_usage'] = MemoryMonitor.get_memory_usage()
                
                # Log final memory usage
                final_memory = MemoryMonitor.get_memory_usage()
                if 'rss_mb' in final_memory:
                    ServerlessLogger.info(f"Memory usage after conversion: {final_memory['rss_mb']} MB", request_id=request_id)
                
                # Determine response format based on query parameters
                query_params = self.path.split('?', 1)
                is_preview = False
                if len(query_params) > 1:
                    import urllib.parse
                    params = urllib.parse.parse_qs(query_params[1])
                    is_preview = params.get('preview', ['false'])[0].lower() == 'true'
                
                if is_preview:
                    # Return base64 encoded PDF data for preview
                    pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
                    response = create_success_response(
                        pdf_base64,
                        'DOCX to PDF conversion successful for preview',
                        metadata
                    )
                    response['format'] = 'pdf'
                    
                    ServerlessLogger.info("Sending preview response", request_id=request_id)
                    send_json_response(self, 200, response)
                else:
                    # Return binary PDF data for download
                    ServerlessLogger.info("Sending binary download response", request_id=request_id)
                    send_binary_response(self, pdf_data, 'application/pdf', 'converted_document.pdf')
                    
            except Exception as e:
                # Enhanced error handling with production debugging
                elapsed_time = time.time() - start_time
                debug_info = {
                    'elapsed_seconds': elapsed_time,
                    'memory_info': MemoryMonitor.get_memory_usage(),
                    'timeout_info': TimeoutHandler.check_timeout_risk(start_time, "docx_conversion"),
                    'input_size_bytes': len(docx_data) if 'docx_data' in locals() else 0
                }
                
                error_response = ProductionErrorHandler.create_production_error_response(
                    e, "DOCX to PDF conversion", request_id=request_id, debug_info=debug_info
                )
                send_json_response(self, 500, error_response)
                
        except Exception as e:
            # Top-level error handling with full diagnostics
            elapsed_time = time.time() - start_time
            debug_info = {
                'elapsed_seconds': elapsed_time,
                'memory_info': MemoryMonitor.get_memory_usage(),
                'diagnostics': VercelDiagnostics.get_function_diagnostics()
            }
            
            error_response = ProductionErrorHandler.create_production_error_response(
                e, "DOCX conversion request processing", request_id=request_id, debug_info=debug_info
            )
            send_json_response(self, 500, error_response)
    
    def convert_docx_to_pdf(self, docx_data, request_id=None, start_time=None):
        """
        Convert DOCX data to PDF using docx2pdf library with enhanced error handling
        
        Args:
            docx_data: Binary data of the DOCX file
            request_id: Optional request ID for logging
        
        Returns:
            Binary PDF data
        """
        try:
            # Try to import docx2pdf
            try:
                from docx2pdf import convert
                ServerlessLogger.info("docx2pdf library loaded successfully", request_id=request_id)
            except ImportError:
                ServerlessLogger.warning("docx2pdf library not available, using fallback", request_id=request_id)
                return self.create_fallback_pdf("docx2pdf library not available in serverless environment")
            
            ServerlessLogger.info(f"Starting DOCX to PDF conversion, input size: {len(docx_data)} bytes", request_id=request_id)
            
            # Create temporary DOCX file using utility
            temp_docx_path = TempFileManager.create_temp_file(suffix='.docx', content=docx_data)
            ServerlessLogger.info(f"Temporary DOCX file created: {temp_docx_path}", request_id=request_id)
            
            # Create temporary PDF file path
            temp_pdf_path = temp_docx_path.replace('.docx', '.pdf')
            
            try:
                # Verify DOCX file was written correctly
                if not os.path.exists(temp_docx_path):
                    raise RuntimeError("Failed to create temporary DOCX file")
                
                file_size = os.path.getsize(temp_docx_path)
                if file_size == 0:
                    raise RuntimeError("Temporary DOCX file is empty")
                
                if file_size != len(docx_data):
                    ServerlessLogger.warning(f"File size mismatch: expected {len(docx_data)}, got {file_size}", request_id=request_id)
                
                ServerlessLogger.info(f"Converting DOCX to PDF: {temp_docx_path} -> {temp_pdf_path}", request_id=request_id)
                
                # Check memory before conversion
                memory_before = MemoryMonitor.get_memory_usage()
                if 'rss_mb' in memory_before:
                    ServerlessLogger.info(f"Memory before conversion: {memory_before['rss_mb']} MB", request_id=request_id)
                
                # Convert DOCX to PDF using docx2pdf
                convert(temp_docx_path, temp_pdf_path)
                
                # Check memory after conversion
                memory_after = MemoryMonitor.get_memory_usage()
                if 'rss_mb' in memory_after:
                    ServerlessLogger.info(f"Memory after conversion: {memory_after['rss_mb']} MB", request_id=request_id)
                
                # Check if PDF was created
                if not os.path.exists(temp_pdf_path):
                    raise RuntimeError("PDF file was not created by docx2pdf")
                
                # Read the generated PDF
                with open(temp_pdf_path, 'rb') as pdf_file:
                    pdf_data = pdf_file.read()
                    ServerlessLogger.info(f"PDF conversion successful, output size: {len(pdf_data)} bytes", request_id=request_id)
                
                if len(pdf_data) == 0:
                    raise RuntimeError("Generated PDF file is empty")
                
                # Validate the PDF
                if not PDFMetadataExtractor.is_valid_pdf(pdf_data):
                    ServerlessLogger.warning("Generated PDF may be invalid", request_id=request_id)
                
                return pdf_data
                
            finally:
                # Clean up temporary files using utility
                TempFileManager.cleanup_temp_file(temp_docx_path)
                TempFileManager.cleanup_temp_file(temp_pdf_path)
                    
        except Exception as e:
            ServerlessLogger.error(f"DOCX to PDF conversion error: {e}", request_id=request_id, error=str(e))
            # Try fallback PDF generation
            return self.create_fallback_pdf(f"Conversion failed: {str(e)}")
    
    def create_fallback_pdf(self, error_message):
        """
        Create a fallback PDF with error message using reportlab
        
        Args:
            error_message: Error message to include in PDF
        
        Returns:
            Binary PDF data
        """
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter
            from io import BytesIO
            
            buffer = BytesIO()
            c = canvas.Canvas(buffer, pagesize=letter)
            
            # Add title
            c.setFont("Helvetica-Bold", 16)
            c.drawString(100, 750, "DOCX to PDF Conversion Error")
            
            # Add error message
            c.setFont("Helvetica", 12)
            c.drawString(100, 700, "The DOCX to PDF conversion could not be completed.")
            c.drawString(100, 680, f"Error: {error_message}")
            
            # Add instructions
            c.drawString(100, 640, "Please try one of the following:")
            c.drawString(120, 620, "1. Download the DOCX file and convert it manually")
            c.drawString(120, 600, "2. Use an online DOCX to PDF converter")
            c.drawString(120, 580, "3. Open the DOCX file and save/export as PDF")
            
            # Add footer
            c.setFont("Helvetica", 10)
            c.drawString(100, 100, "Generated by Format-A IEEE Document Generator")
            c.drawString(100, 85, "This is a fallback PDF due to conversion limitations in the serverless environment.")
            
            c.save()
            buffer.seek(0)
            return buffer.getvalue()
            
        except Exception as fallback_error:
            print(f"Fallback PDF creation failed: {fallback_error}", file=sys.stderr)
            # Return minimal PDF as last resort
            return self.create_minimal_pdf(error_message)
    
    def create_minimal_pdf(self, error_message):
        """
        Create a minimal PDF with just the error message
        
        Args:
            error_message: Error message to include
        
        Returns:
            Binary PDF data (minimal)
        """
        # Create a very basic PDF structure manually
        pdf_content = f"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 150
>>
stream
BT
/F1 12 Tf
100 700 Td
(DOCX to PDF Conversion Error) Tj
0 -20 Td
(Error: {error_message[:50]}...) Tj
0 -20 Td
(Please convert the DOCX file manually.) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000100 00000 n 
0000000178 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
380
%%EOF"""
        
        return pdf_content.encode('utf-8')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def send_error_response(self, status_code, error_code, message, details=None):
        """Send a structured error response."""
        response = {
            'success': False,
            'error': {
                'code': error_code,
                'message': message,
                'timestamp': sys.version,
                'environment': 'vercel_serverless'
            }
        }
        
        if details:
            response['error']['details'] = details
            # Log detailed error to stderr for Vercel logs
            print(f"ERROR: {message}", file=sys.stderr)
            print(f"DETAILS: {details}", file=sys.stderr)
        
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(response, indent=2).encode())