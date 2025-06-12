#!/usr/bin/env python3
"""
Direct PDF Generator - Creates IEEE-formatted PDF without Word conversion
Uses ReportLab to generate PDF directly with identical formatting to the Word version
"""

import json
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import StyleSheet1, ParagraphStyle
from reportlab.lib.units import inch, pt
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from io import BytesIO
import base64

# IEEE formatting configuration - matching the Word version exactly
IEEE_CONFIG = {
    'font_name': 'Times-Roman',
    'font_name_bold': 'Times-Bold',
    'font_name_italic': 'Times-Italic',
    'font_size_title': 24,
    'font_size_body': 9.5,
    'font_size_caption': 9,
    'margin_left': 0.75 * inch,
    'margin_right': 0.75 * inch,
    'margin_top': 0.75 * inch,
    'margin_bottom': 0.75 * inch,
    'column_spacing': 0.25 * inch,
    'line_spacing': 10 * pt,
    'figure_sizes': {
        'Very Small': 1.2 * inch,
        'Small': 1.8 * inch,
        'Medium': 2.5 * inch,
        'Large': 3.2 * inch
    },
    'max_figure_height': 4.0 * inch,
}

def create_ieee_styles():
    """Create paragraph styles matching IEEE format"""
    styles = StyleSheet1()
    
    # Title style
    styles.add(ParagraphStyle(
        name='Title',
        parent=styles['Normal'],
        fontName=IEEE_CONFIG['font_name_bold'],
        fontSize=IEEE_CONFIG['font_size_title'],
        alignment=TA_CENTER,
        spaceAfter=12 * pt,
        spaceBefore=0,
    ))
    
    # Author style
    styles.add(ParagraphStyle(
        name='Author',
        parent=styles['Normal'],
        fontName=IEEE_CONFIG['font_name_bold'],
        fontSize=IEEE_CONFIG['font_size_body'],
        alignment=TA_CENTER,
        spaceAfter=2 * pt,
        spaceBefore=0,
    ))
    
    # Author details style
    styles.add(ParagraphStyle(
        name='AuthorDetails',
        parent=styles['Normal'],
        fontName=IEEE_CONFIG['font_name_italic'],
        fontSize=IEEE_CONFIG['font_size_body'],
        alignment=TA_CENTER,
        spaceAfter=2 * pt,
        spaceBefore=0,
    ))
    
    # Body text style with justification
    styles.add(ParagraphStyle(
        name='Body',
        parent=styles['Normal'],
        fontName=IEEE_CONFIG['font_name'],
        fontSize=IEEE_CONFIG['font_size_body'],
        alignment=TA_JUSTIFY,
        spaceAfter=12 * pt,
        spaceBefore=0,
        leftIndent=0.2 * inch,
        rightIndent=0.2 * inch,
        leading=IEEE_CONFIG['line_spacing'],
    ))
    
    # Section heading style
    styles.add(ParagraphStyle(
        name='SectionHeading',
        parent=styles['Normal'],
        fontName=IEEE_CONFIG['font_name'],
        fontSize=IEEE_CONFIG['font_size_body'],
        alignment=TA_LEFT,
        spaceAfter=0,
        spaceBefore=IEEE_CONFIG['line_spacing'],
        leftIndent=0.2 * inch,
        leading=IEEE_CONFIG['line_spacing'],
    ))
    
    # Caption style
    styles.add(ParagraphStyle(
        name='Caption',
        parent=styles['Normal'],
        fontName=IEEE_CONFIG['font_name'],
        fontSize=IEEE_CONFIG['font_size_caption'],
        alignment=TA_CENTER,
        spaceAfter=12 * pt,
        spaceBefore=0,
    ))
    
    # Reference style
    styles.add(ParagraphStyle(
        name='Reference',
        parent=styles['Normal'],
        fontName=IEEE_CONFIG['font_name'],
        fontSize=IEEE_CONFIG['font_size_body'],
        alignment=TA_JUSTIFY,
        spaceAfter=12 * pt,
        spaceBefore=3 * pt,
        leftIndent=0.45 * inch,
        rightIndent=0.2 * inch,
        firstLineIndent=-0.25 * inch,
        leading=IEEE_CONFIG['line_spacing'],
    ))
    
    return styles

def add_authors_table(story, authors, styles):
    """Add authors in a table layout matching Word version"""
    if not authors:
        return
    
    # Create table data
    table_data = []
    author_cells = []
    
    for author in authors:
        if not author.get('name'):
            continue
            
        cell_content = []
        # Author name (bold)
        cell_content.append(Paragraph(author['name'], styles['Author']))
        
        # Author details (italic)
        fields = [
            ('department', 'Department'),
            ('organization', 'Organization'), 
            ('city', 'City'),
            ('state', 'State'),
            ('tamilnadu', 'Tamil Nadu')
        ]
        
        for field_key, field_name in fields:
            if author.get(field_key):
                cell_content.append(Paragraph(author[field_key], styles['AuthorDetails']))
        
        # Custom fields
        for custom_field in author.get('custom_fields', []):
            if custom_field['value']:
                cell_content.append(Paragraph(custom_field['value'], styles['AuthorDetails']))
        
        author_cells.append(cell_content)
    
    if author_cells:
        # Create table with equal column widths
        col_width = (letter[0] - IEEE_CONFIG['margin_left'] - IEEE_CONFIG['margin_right']) / len(author_cells)
        table_data = [author_cells]
        
        table = Table(table_data, colWidths=[col_width] * len(author_cells))
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        
        story.append(table)
        story.append(Spacer(1, 12 * pt))

def add_abstract_keywords(story, abstract, keywords, styles):
    """Add abstract and keywords with proper formatting"""
    if abstract:
        # Create abstract paragraph with italic "Abstract—" prefix
        abstract_text = f'<i>Abstract—</i>{abstract}'
        story.append(Paragraph(abstract_text, styles['Body']))
    
    if keywords:
        keywords_text = f'Keywords: {keywords}'
        story.append(Paragraph(keywords_text, styles['Body']))
        # Add small spacer after keywords
        story.append(Spacer(1, 6 * pt))

def process_image_block(block, section_idx, img_count, styles):
    """Process image block and return image and caption elements"""
    elements = []
    
    try:
        # Get image data
        image_data = block['data']
        
        # Handle base64 data - remove prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64 image data
        image_bytes = base64.b64decode(image_data)
        image_stream = BytesIO(image_bytes)
        
        # Get size configuration
        size = block.get('size', 'medium')
        size_mapping = {
            'very-small': 'Very Small',
            'small': 'Small',
            'medium': 'Medium', 
            'large': 'Large'
        }
        mapped_size = size_mapping.get(size, 'Medium')
        width = IEEE_CONFIG['figure_sizes'].get(mapped_size, IEEE_CONFIG['figure_sizes']['Medium'])
        
        # Create image
        img = Image(image_stream, width=width)
        
        # Constrain height if needed
        if hasattr(img, 'drawHeight') and img.drawHeight > IEEE_CONFIG['max_figure_height']:
            scale_factor = IEEE_CONFIG['max_figure_height'] / img.drawHeight
            img = Image(image_stream, width=width * scale_factor, height=IEEE_CONFIG['max_figure_height'])
        
        elements.append(Spacer(1, 6 * pt))
        elements.append(img)
        
        # Add caption
        caption_text = f"Fig. {section_idx}.{img_count}: {block['caption']}"
        elements.append(Paragraph(caption_text, styles['Caption']))
        
    except Exception as e:
        print(f"Error processing image: {e}", file=sys.stderr)
        # Add error placeholder
        error_text = f"[Image could not be loaded: {str(e)}]"
        elements.append(Paragraph(error_text, styles['Body']))
    
    return elements

def add_sections(story, sections, styles):
    """Add sections with content blocks"""
    for idx, section_data in enumerate(sections, 1):
        # Add section title
        if section_data.get('title'):
            title_text = f"{idx}. {section_data['title'].upper()}"
            story.append(Paragraph(title_text, styles['SectionHeading']))
        
        # Process content blocks
        content_blocks = section_data.get('contentBlocks', []) or section_data.get('content_blocks', [])
        img_count = 0
        
        for block in content_blocks:
            if block.get('type') == 'text' and block.get('content'):
                story.append(Paragraph(block['content'], styles['Body']))
            elif block.get('type') == 'image' and block.get('data') and block.get('caption'):
                img_count += 1
                image_elements = process_image_block(block, idx, img_count, styles)
                story.extend(image_elements)
        
        # Legacy support for old content field
        if not content_blocks and section_data.get('content'):
            story.append(Paragraph(section_data['content'], styles['Body']))
        
        # Add subsections
        for sub_idx, subsection in enumerate(section_data.get('subsections', []), 1):
            if subsection.get('title'):
                subtitle_text = f"{idx}.{sub_idx} {subsection['title']}"
                story.append(Paragraph(subtitle_text, styles['SectionHeading']))
            
            if subsection.get('content'):
                story.append(Paragraph(subsection['content'], styles['Body']))

def add_references(story, references, styles):
    """Add references section"""
    if references:
        # Add references heading
        story.append(Paragraph("REFERENCES", styles['SectionHeading']))
        
        # Add each reference
        for idx, ref in enumerate(references, 1):
            if ref.get('text'):
                ref_text = f"[{idx}] {ref['text']}"
                story.append(Paragraph(ref_text, styles['Reference']))

def generate_ieee_pdf(form_data):
    """Generate IEEE-formatted PDF document"""
    buffer = BytesIO()
    
    # Create document with IEEE margins
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=IEEE_CONFIG['margin_left'],
        rightMargin=IEEE_CONFIG['margin_right'],
        topMargin=IEEE_CONFIG['margin_top'],
        bottomMargin=IEEE_CONFIG['margin_bottom']
    )
    
    # Create styles
    styles = create_ieee_styles()
    
    # Build document content
    story = []
    
    # Add title
    if form_data.get('title'):
        story.append(Paragraph(form_data['title'], styles['Title']))
    
    # Add authors
    add_authors_table(story, form_data.get('authors', []), styles)
    
    # Add abstract and keywords
    add_abstract_keywords(story, form_data.get('abstract', ''), form_data.get('keywords', ''), styles)
    
    # Add sections
    add_sections(story, form_data.get('sections', []), styles)
    
    # Add references
    add_references(story, form_data.get('references', []), styles)
    
    # Build PDF
    doc.build(story)
    
    buffer.seek(0)
    return buffer.getvalue()

def main():
    """Main function for command line execution"""
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        form_data = json.loads(input_data)
        
        # Generate IEEE PDF document
        pdf_data = generate_ieee_pdf(form_data)
        
        # Write binary data to stdout
        sys.stdout.buffer.write(pdf_data)
        
    except Exception as e:
        import traceback
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.stderr.write(f"Traceback: {traceback.format_exc()}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()