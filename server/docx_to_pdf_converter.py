#!/usr/bin/env python3
"""
DOCX to PDF Converter
Converts Word documents to PDF format using docx2pdf library
"""

import sys
import os
from docx2pdf import convert
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def convert_docx_file_to_pdf(input_docx_path, output_pdf_path):
    """
    Convert DOCX file to PDF file
    
    Args:
        input_docx_path: Path to input DOCX file
        output_pdf_path: Path to output PDF file
    """
    try:
        logger.info(f"Starting DOCX to PDF conversion: {input_docx_path} -> {output_pdf_path}")
        
        # Check if input file exists
        if not os.path.exists(input_docx_path):
            raise FileNotFoundError(f"Input DOCX file not found: {input_docx_path}")
        
        # Get file size for logging
        file_size = os.path.getsize(input_docx_path)
        logger.info(f"Input DOCX file size: {file_size} bytes")
        
        if file_size == 0:
            raise ValueError("Input DOCX file is empty")
        
        # Convert DOCX to PDF
        logger.info(f"Converting {input_docx_path} to {output_pdf_path}")
        convert(input_docx_path, output_pdf_path)
        
        # Check if output file was created
        if not os.path.exists(output_pdf_path):
            raise RuntimeError("PDF file was not created")
        
        # Check output file size
        output_size = os.path.getsize(output_pdf_path)
        logger.info(f"PDF conversion successful, output size: {output_size} bytes")
        
        if output_size == 0:
            raise RuntimeError("Generated PDF file is empty")
            
    except Exception as e:
        logger.error(f"DOCX to PDF conversion failed: {e}")
        raise

def convert_docx_to_pdf(docx_data):
    """
    Convert DOCX data to PDF (legacy function for backward compatibility)
    
    Args:
        docx_data: Binary data of the DOCX file
    
    Returns:
        Binary PDF data
    """
    try:
        logger.info("Starting DOCX to PDF conversion from binary data")
        
        # Create temporary files for input and output
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_docx:
            # Write DOCX data to temporary file
            temp_docx.write(docx_data)
            temp_docx_path = temp_docx.name
            logger.info(f"Temporary DOCX file created: {temp_docx_path}")
        
        # Create temporary PDF file path
        temp_pdf_path = temp_docx_path.replace('.docx', '.pdf')
        
        try:
            # Convert using the file-based function
            convert_docx_file_to_pdf(temp_docx_path, temp_pdf_path)
            
            # Read the generated PDF
            with open(temp_pdf_path, 'rb') as pdf_file:
                pdf_data = pdf_file.read()
                logger.info(f"PDF data read, size: {len(pdf_data)} bytes")
            
            return pdf_data
            
        finally:
            # Clean up temporary files
            try:
                if os.path.exists(temp_docx_path):
                    os.unlink(temp_docx_path)
                    logger.info(f"Cleaned up temporary DOCX file: {temp_docx_path}")
            except Exception as e:
                logger.warning(f"Failed to clean up DOCX file: {e}")
                
            try:
                if os.path.exists(temp_pdf_path):
                    os.unlink(temp_pdf_path)
                    logger.info(f"Cleaned up temporary PDF file: {temp_pdf_path}")
            except Exception as e:
                logger.warning(f"Failed to clean up PDF file: {e}")
                
    except Exception as e:
        logger.error(f"DOCX to PDF conversion failed: {e}")
        raise

def main():
    """
    Main function to handle conversion
    Can work in two modes:
    1. File paths as command line arguments: python converter.py input.docx output.pdf
    2. Legacy stdin mode (for backward compatibility)
    """
    try:
        logger.info("DOCX to PDF converter started")
        
        # Check if file paths are provided as arguments
        if len(sys.argv) == 3:
            # File path mode
            input_docx_path = sys.argv[1]
            output_pdf_path = sys.argv[2]
            
            logger.info(f"File path mode: {input_docx_path} -> {output_pdf_path}")
            convert_docx_file_to_pdf(input_docx_path, output_pdf_path)
            logger.info("DOCX to PDF conversion completed successfully")
            
        elif len(sys.argv) == 1:
            # Legacy stdin mode
            logger.info("Legacy stdin mode")
            
            # Read DOCX data from stdin
            docx_data = sys.stdin.buffer.read()
            logger.info(f"Read {len(docx_data)} bytes of DOCX data from stdin")
            
            if len(docx_data) == 0:
                logger.error("No DOCX data received from stdin")
                sys.stderr.write("Error: No DOCX data received\n")
                sys.exit(1)
            
            # Convert to PDF
            pdf_data = convert_docx_to_pdf(docx_data)
            
            if len(pdf_data) == 0:
                logger.error("PDF conversion resulted in empty file")
                sys.stderr.write("Error: PDF conversion resulted in empty file\n")
                sys.exit(1)
            
            # Write PDF data to stdout
            sys.stdout.buffer.write(pdf_data)
            sys.stdout.buffer.flush()
            
            logger.info("DOCX to PDF conversion completed successfully")
            
        else:
            logger.error("Invalid number of arguments")
            sys.stderr.write("Usage: python converter.py [input.docx output.pdf] or pipe DOCX data to stdin\n")
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"Conversion error: {e}")
        sys.stderr.write(f"Error: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()