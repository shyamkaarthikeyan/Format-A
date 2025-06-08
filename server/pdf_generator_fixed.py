#!/usr/bin/env python3
"""
Direct PDF generation for IEEE documents using ReportLab
"""

import sys
import json
import io
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT

def create_ieee_pdf(form_data):
    """Generate IEEE-formatted PDF document"""
    buffer = io.BytesIO()
    
    # Create PDF document with IEEE margins
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=1*inch,
        bottomMargin=1*inch
    )
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Custom IEEE styles
    title_style = ParagraphStyle(
        'IEEETitle',
        parent=styles['Title'],
        fontSize=14,
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Times-Bold'
    )
    
    author_style = ParagraphStyle(
        'IEEEAuthor',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Times-Roman'
    )
    
    abstract_style = ParagraphStyle(
        'IEEEAbstract',
        parent=styles['Normal'],
        fontSize=9,
        spaceAfter=12,
        alignment=TA_JUSTIFY,
        leftIndent=0.5*inch,
        rightIndent=0.5*inch,
        fontName='Times-Roman'
    )
    
    body_style = ParagraphStyle(
        'IEEEBody',
        parent=styles['Normal'],
        fontSize=9,
        spaceAfter=6,
        alignment=TA_JUSTIFY,
        fontName='Times-Roman',
        firstLineIndent=0.125*inch
    )
    
    heading_style = ParagraphStyle(
        'IEEEHeading',
        parent=styles['Heading2'],
        fontSize=10,
        spaceAfter=6,
        alignment=TA_LEFT,
        fontName='Times-Bold'
    )
    
    # Build content
    story = []
    
    # Title
    if form_data.get('title'):
        title_para = Paragraph(form_data['title'], title_style)
        story.append(title_para)
        story.append(Spacer(1, 12))
    
    # Authors
    if form_data.get('authors'):
        for author in form_data['authors']:
            if author.get('name'):
                author_text = author['name']
                if author.get('department'):
                    author_text += f", {author['department']}"
                if author.get('organization'):
                    author_text += f", {author['organization']}"
                if author.get('email'):
                    author_text += f", {author['email']}"
                
                author_para = Paragraph(author_text, author_style)
                story.append(author_para)
        
        story.append(Spacer(1, 12))
    
    # Abstract
    if form_data.get('abstract'):
        abstract_text = f"<b><i>Abstract—</i></b>{form_data['abstract']}"
        abstract_para = Paragraph(abstract_text, abstract_style)
        story.append(abstract_para)
        story.append(Spacer(1, 12))
    
    # Keywords
    if form_data.get('keywords'):
        keywords_text = f"<b>Keywords:</b> {form_data['keywords']}"
        keywords_para = Paragraph(keywords_text, abstract_style)
        story.append(keywords_para)
        story.append(Spacer(1, 18))
    
    # Sections
    if form_data.get('sections'):
        for idx, section in enumerate(form_data['sections']):
            if section.get('title'):
                section_title = f"{idx + 1}. {section['title'].upper()}"
                heading_para = Paragraph(section_title, heading_style)
                story.append(heading_para)
            
            # Content blocks
            if section.get('contentBlocks'):
                for block in section['contentBlocks']:
                    if block.get('type') == 'text' and block.get('content'):
                        content_para = Paragraph(block['content'], body_style)
                        story.append(content_para)
            
            # Subsections
            if section.get('subsections'):
                for sub_idx, subsection in enumerate(section['subsections']):
                    if subsection.get('title'):
                        sub_title = f"{idx + 1}.{sub_idx + 1} {subsection['title']}"
                        sub_heading_para = Paragraph(sub_title, heading_style)
                        story.append(sub_heading_para)
                    
                    if subsection.get('content'):
                        sub_content_para = Paragraph(subsection['content'], body_style)
                        story.append(sub_content_para)
            
            story.append(Spacer(1, 12))
    
    # References
    if form_data.get('references'):
        ref_heading = Paragraph("REFERENCES", heading_style)
        story.append(ref_heading)
        
        for idx, ref in enumerate(form_data['references']):
            if ref.get('text'):
                ref_text = f"[{idx + 1}] {ref['text']}"
                ref_para = Paragraph(ref_text, body_style)
                story.append(ref_para)
    
    # Build PDF
    doc.build(story)
    
    # Return buffer
    buffer.seek(0)
    return buffer

def main():
    """Main function for command line execution"""
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        form_data = json.loads(input_data)
        
        # Generate PDF
        buffer = create_ieee_pdf(form_data)
        
        # Write binary data to stdout
        sys.stdout.buffer.write(buffer.getvalue())
        
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()