#!/usr/bin/env python3
"""
Convert DOCX to PDF using LibreOffice
Reads DOCX from stdin, outputs PDF to stdout
"""
import sys
import subprocess
import os
from pathlib import Path
from io import BytesIO

def convert_docx_to_pdf():
    """Convert DOCX from stdin to PDF on stdout"""
    try:
        # Read DOCX binary from stdin
        docx_data = sys.stdin.buffer.read()
        
        if not docx_data:
            sys.stderr.write("Error: No DOCX data received from stdin\n")
            sys.exit(1)
        
        # Create temp directory
        temp_dir = Path("/tmp/docx_convert")
        temp_dir.mkdir(exist_ok=True)
        
        # Write DOCX to temp file
        input_file = temp_dir / "input.docx"
        output_file = temp_dir / "input.pdf"
        
        with open(input_file, 'wb') as f:
            f.write(docx_data)
        
        # Convert using LibreOffice
        cmd = [
            'libreoffice',
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', str(temp_dir),
            str(input_file)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            sys.stderr.write(f"LibreOffice error: {result.stderr}\n")
            sys.exit(1)
        
        # Read PDF and output to stdout
        if output_file.exists():
            with open(output_file, 'rb') as f:
                pdf_data = f.read()
            sys.stdout.buffer.write(pdf_data)
            sys.stdout.buffer.flush()
            
            # Cleanup
            input_file.unlink()
            output_file.unlink()
        else:
            sys.stderr.write("Error: PDF file not created\n")
            sys.exit(1)
            
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    convert_docx_to_pdf()
