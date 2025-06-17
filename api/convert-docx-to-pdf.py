import json
import sys
import os
from http.server import BaseHTTPRequestHandler
import io
import tempfile

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            docx_data = self.rfile.read(content_length)
            
            # Create temporary files
            with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_docx:
                temp_docx.write(docx_data)
                temp_docx_path = temp_docx.name
            
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_pdf:
                temp_pdf_path = temp_pdf.name
            
            try:
                # Convert DOCX to PDF using docx2pdf
                from docx2pdf import convert
                convert(temp_docx_path, temp_pdf_path)
                
                # Read the generated PDF
                with open(temp_pdf_path, 'rb') as pdf_file:
                    pdf_data = pdf_file.read()
                
                # Send response
                self.send_response(200)
                self.send_header('Content-Type', 'application/pdf')
                self.send_header('Content-Disposition', 'attachment; filename="converted.pdf"')
                self.end_headers()
                self.wfile.write(pdf_data)
                
            finally:
                # Clean up temporary files
                if os.path.exists(temp_docx_path):
                    os.unlink(temp_docx_path)
                if os.path.exists(temp_pdf_path):
                    os.unlink(temp_pdf_path)
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = json.dumps({'error': str(e)}).encode('utf-8')
            self.wfile.write(error_response)