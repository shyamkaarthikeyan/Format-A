#!/usr/bin/env python3
"""
IEEE PDF Generator using ReportLab with CORRECT formatting
Matches ieee_generator_fixed.py specifications EXACTLY

This generator creates PDFs directly using ReportLab with the exact same IEEE
formatting as the DOCX generator, ensuring consistent output across all platforms.
"""

import json
import sys
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether, Frame, PageTemplate
from reportlab.platypus.frames import Frame
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import re
import unicodedata

# IEEE Configuration - EXACT same as ieee_generator_fixed.py
IEEE_CONFIG = {
    'font_name': 'Times-Roman',  # ReportLab's Times New Roman equivalent
    'font_size_title': 24,
    'font_size_body': 9.5,
    'font_size_caption': 9,
    'margin_left': 0.75 * inch,
    'margin_right': 0.75 * inch,
    'margin_top': 0.75 * inch,
    'margin_bottom': 0.75 * inch,
    'column_spacing': 0.25 * inch,
    'column_width': 3.375 * inch,
    'line_spacing': 10,  # 10pt exact spacing
}

def sanitize_text(text):
    """Sanitize text to remove invalid Unicode characters - same as ieee_generator_fixed.py"""
    if not text:
        return ""
    text = str(text)
    text = text.encode('utf-8', 'ignore').decode('utf-8')
    text = unicodedata.normalize('NFKD', text)
    text = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', text)
    return text

def html_to_text(html_text):
    """Convert HTML to plain text, handling basic formatting"""
    if not html_text:
        return ""
    
    # Remove HTML tags but keep content
    text = re.sub(r'<br\s*/?>',  '\n', html_text)
    text = re.sub(r'<p[^>]*>', '\n\n', text)
    text = re.sub(r'</p>', '', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&lt;', '<', text)
    text = re.sub(r'&gt;', '>', text)
    
    return sanitize_text(text.strip())

def generate_ieee_pdf(document_data, output_buffer):
    """
    Generate IEEE-formatted PDF with EXACT specifications from ieee_generator_fixed.py
    
    Args:
        document_data: Dictionary containing document structure
        output_buffer: BytesIO object to write PDF to
    """
    
    # Create PDF document with IEEE specifications
    page_width, page_height = letter
    
    # Calculate column positions
    usable_width = page_width - IEEE_CONFIG['margin_left'] - IEEE_CONFIG['margin_right']
    col_width = (usable_width - IEEE_CONFIG['column_spacing']) / 2
    
    # Create custom page template with two columns
    doc = BaseDocTemplate(
        output_buffer,
        pagesize=letter,
        leftMargin=IEEE_CONFIG['margin_left'],
        rightMargin=IEEE_CONFIG['margin_right'],
        topMargin=IEEE_CONFIG['margin_top'],
        bottomMargin=IEEE_CONFIG['margin_bottom'],
    )
    
    # Define frames for two-column layout (for body text)
    frame1 = Frame(
        IEEE_CONFIG['margin_left'],
        IEEE_CONFIG['margin_bottom'],
        col_width,
        page_height - IEEE_CONFIG['margin_top'] - IEEE_CONFIG['margin_bottom'],
        id='col1'
    )
    
    frame2 = Frame(
        IEEE_CONFIG['margin_left'] + col_width + IEEE_CONFIG['column_spacing'],
        IEEE_CONFIG['margin_bottom'],
        col_width,
        page_height - IEEE_CONFIG['margin_top'] - IEEE_CONFIG['margin_bottom'],
        id='col2'
    )
    
    # Define frames for single-column layout (for title, authors, abstract)
    frame_full = Frame(
        IEEE_CONFIG['margin_left'],
        IEEE_CONFIG['margin_bottom'],
        usable_width,
        page_height - IEEE_CONFIG['margin_top'] - IEEE_CONFIG['margin_bottom'],
        id='single'
    )
    
    # Create page templates
    single_column_template = PageTemplate(id='Single', frames=[frame_full])
    two_column_template = PageTemplate(id='TwoColumn', frames=[frame1, frame2])
    
    doc.addPageTemplates([single_column_template, two_column_template])
    
    # Create styles - EXACT same as IEEE spec
    styles = getSampleStyleSheet()
    
    # Title style - 24pt, bold, centered
    title_style = ParagraphStyle(
        'IEEETitle',
        parent=styles['Heading1'],
        fontName='Times-Bold',
        fontSize=IEEE_CONFIG['font_size_title'],
        leading=IEEE_CONFIG['font_size_title'] * 1.2,
        alignment=TA_CENTER,
        spaceAfter=12,
        spaceBefore=0,
    )
    
    # Author style - 9.5pt, bold, centered
    author_name_style = ParagraphStyle(
        'AuthorName',
        fontName='Times-Bold',
        fontSize=IEEE_CONFIG['font_size_body'],
        leading=IEEE_CONFIG['line_spacing'],
        alignment=TA_CENTER,
        spaceAfter=2,
        spaceBefore=0,
    )
    
    # Author details style - 9.5pt, italic, centered
    author_detail_style = ParagraphStyle(
        'AuthorDetail',
        fontName='Times-Italic',
        fontSize=IEEE_CONFIG['font_size_body'],
        leading=IEEE_CONFIG['line_spacing'],
        alignment=TA_CENTER,
        spaceAfter=2,
        spaceBefore=0,
    )
    
    # Abstract style - 9.5pt, bold, justified
    abstract_style = ParagraphStyle(
        'AbstractText',
        fontName='Times-Bold',
        fontSize=IEEE_CONFIG['font_size_body'],
        leading=IEEE_CONFIG['line_spacing'],
        alignment=TA_JUSTIFY,
        spaceAfter=IEEE_CONFIG['line_spacing'],
        spaceBefore=0,
    )
    
    # Keywords style - 9.5pt, italic, justified
    keywords_style = ParagraphStyle(
        'Keywords',
        fontName='Times-Italic',
        fontSize=IEEE_CONFIG['font_size_body'],
        leading=IEEE_CONFIG['line_spacing'],
        alignment=TA_JUSTIFY,
        spaceAfter=12,
        spaceBefore=0,
    )
    
    # Body text style - 9.5pt, justified
    body_style = ParagraphStyle(
        'BodyText',
        fontName='Times-Roman',
        fontSize=IEEE_CONFIG['font_size_body'],
        leading=IEEE_CONFIG['line_spacing'],
        alignment=TA_JUSTIFY,
        spaceAfter=12,
        spaceBefore=0,
    )
    
    # Section heading style - 9.5pt, regular (NOT bold), left-aligned
    section_style = ParagraphStyle(
        'SectionHeading',
        fontName='Times-Roman',  # Regular weight, not bold
        fontSize=IEEE_CONFIG['font_size_body'],
        leading=IEEE_CONFIG['line_spacing'],
        alignment=TA_LEFT,
        spaceAfter=0,
        spaceBefore=6,
    )
    
    # Build content
    story = []
    
    # Add title
    if document_data.get('title'):
        title_para = Paragraph(sanitize_text(document_data['title']), title_style)
        story.append(title_para)
    
    # Add authors in table format (parallel layout)
    if document_data.get('authors'):
        author_data = []
        for author in document_data['authors']:
            if not author.get('name'):
                continue
            
            author_cell = []
            # Author name (bold)
            author_cell.append(Paragraph(sanitize_text(author['name']), author_name_style))
            
            # Author details (italic)
            for field in ['department', 'organization', 'city', 'state', 'tamilnadu']:
                if author.get(field):
                    author_cell.append(Paragraph(sanitize_text(author[field]), author_detail_style))
            
            # Custom fields
            for custom in author.get('custom_fields', []):
                if custom.get('value'):
                    author_cell.append(Paragraph(sanitize_text(custom['value']), author_detail_style))
            
            author_data.append(author_cell)
        
        if author_data:
            # Create table with equal column widths
            num_authors = len(author_data)
            col_widths = [usable_width / num_authors] * num_authors
            
            # Transpose data for table (columns are authors)
            max_rows = max(len(cell) for cell in author_data)
            table_data = []
            for row_idx in range(max_rows):
                row = []
                for author_cell in author_data:
                    if row_idx < len(author_cell):
                        row.append(author_cell[row_idx])
                    else:
                        row.append('')
                table_data.append(row)
            
            author_table = Table(table_data, colWidths=col_widths)
            author_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            story.append(author_table)
            story.append(Spacer(1, 12))
    
    # Add abstract with bold "Abstract—" prefix
    if document_data.get('abstract'):
        abstract_text = f"<b>Abstract—</b>{sanitize_text(document_data['abstract'])}"
        abstract_para = Paragraph(abstract_text, abstract_style)
        story.append(abstract_para)
    
    # Add keywords with italic "Keywords:" prefix
    if document_data.get('keywords'):
        keywords_text = f"<i>Keywords—{sanitize_text(document_data['keywords'])}</i>"
        keywords_para = Paragraph(keywords_text, keywords_style)
        story.append(keywords_para)
    
    # Switch to two-column layout
    story.append(PageBreak())  # This will trigger the two-column template
    
    # Add sections
    if document_data.get('sections'):
        for section in document_data['sections']:
            if section.get('heading'):
                # Section heading (uppercase, regular weight)
                heading_text = section['heading'].upper()
                section_para = Paragraph(heading_text, section_style)
                story.append(section_para)
            
            if section.get('content'):
                # Section content
                content_text = html_to_text(section['content'])
                content_para = Paragraph(content_text, body_style)
                story.append(content_para)
    
    # Add references
    if document_data.get('references'):
        story.append(Paragraph("REFERENCES", section_style))
        
        for idx, ref in enumerate(document_data['references'], 1):
            if ref.get('text'):
                ref_text = f"[{idx}] {sanitize_text(ref['text'])}"
                ref_para = Paragraph(ref_text, body_style)
                story.append(ref_para)
    
    # Build PDF
    doc.build(story)
    
    return output_buffer

def handler(event, context=None):
    """
    Main handler for serverless function or direct invocation
    """
    try:
        # Read document data
        if isinstance(event, dict):
            document_data = event
        else:
            document_data = json.loads(event)
        
        # Validate required fields
        if not document_data.get('title'):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Document title is required'})
            }
        
        if not document_data.get('authors') or not any(a.get('name') for a in document_data.get('authors', [])):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'At least one author is required'})
            }
        
        # Generate PDF
        output_buffer = BytesIO()
        generate_ieee_pdf(document_data, output_buffer)
        pdf_data = output_buffer.getvalue()
        
        if len(pdf_data) == 0:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Generated PDF is empty'})
            }
        
        print(f"✓ Generated IEEE PDF: {len(pdf_data)} bytes", file=sys.stderr)
        
        # Return PDF data
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="ieee_paper_preview.pdf"',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
            'body': pdf_data,
            'isBase64Encoded': False
        }
        
    except Exception as e:
        print(f"Error generating PDF: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Failed to generate PDF: {str(e)}'})
        }

# For direct invocation (command line or testing)
if __name__ == '__main__':
    if len(sys.argv) > 1:
        # Read from file
        with open(sys.argv[1], 'r') as f:
            document_data = json.load(f)
    else:
        # Read from stdin
        document_data = json.load(sys.stdin)
    
    # Generate PDF
    output_buffer = BytesIO()
    generate_ieee_pdf(document_data, output_buffer)
    
    # Write to stdout
    sys.stdout.buffer.write(output_buffer.getvalue())
