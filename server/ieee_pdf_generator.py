#!/usr/bin/env python3
"""
IEEE PDF Generator - Converts document data to IEEE-formatted PDF
"""

import json
import sys
from io import BytesIO
import base64
import re
from html.parser import HTMLParser

def create_ieee_pdf(form_data):
    """Generate an IEEE-formatted PDF document using the same data as Word generator."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image as RLImage
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
        from reportlab.pdfgen import canvas
        from reportlab.lib import colors
        
        # Define pt manually since it's not available in this ReportLab version
        pt = 1
        
        buffer = BytesIO()
        
        # IEEE page setup
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=0.75*inch,
            rightMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )
        
        # Create IEEE styles
        styles = getSampleStyleSheet()
        
        # IEEE Title style
        ieee_title = ParagraphStyle(
            'IEEETitle',
            parent=styles['Title'],
            fontSize=24,
            spaceAfter=12*pt,
            alignment=TA_CENTER,
            fontName='Times-Bold'
        )
        
        # IEEE Author style  
        ieee_author = ParagraphStyle(
            'IEEEAuthor',
            parent=styles['Normal'],
            fontSize=9.5,
            spaceAfter=2*pt,
            alignment=TA_CENTER,
            fontName='Times-Roman'
        )
        
        # IEEE Author details style
        ieee_author_detail = ParagraphStyle(
            'IEEEAuthorDetail',
            parent=styles['Normal'],
            fontSize=9,
            spaceAfter=2*pt,
            alignment=TA_CENTER,
            fontName='Times-Italic'
        )
        
        # IEEE Abstract style - full width like Word documents
        ieee_abstract = ParagraphStyle(
            'IEEEAbstract',
            parent=styles['Normal'],
            fontSize=9.5,
            spaceAfter=12*pt,
            alignment=TA_JUSTIFY,
            fontName='Times-Roman'
            # No indents - full width formatting like Word
        )
        
        # IEEE Body text style
        ieee_body = ParagraphStyle(
            'IEEEBody',
            parent=styles['Normal'],
            fontSize=9.5,
            spaceAfter=12*pt,
            alignment=TA_JUSTIFY,
            fontName='Times-Roman',
            leftIndent=0.2*inch,
            rightIndent=0.2*inch
        )
        
        # IEEE Section heading style
        ieee_section = ParagraphStyle(
            'IEEESection',
            parent=styles['Heading1'],
            fontSize=9.5,
            spaceAfter=0*pt,
            spaceBefore=10*pt,
            alignment=TA_CENTER,  # Center section titles
            fontName='Times-Bold',
            leftIndent=0.2*inch
        )
        
        # IEEE Subsection heading style
        ieee_subsection = ParagraphStyle(
            'IEEESubsection',
            parent=styles['Heading2'],
            fontSize=9.5,
            spaceAfter=0*pt,
            spaceBefore=6*pt,
            alignment=TA_LEFT,
            fontName='Times-Bold',
            leftIndent=0.2*inch
        )
        
        # IEEE Caption style
        ieee_caption = ParagraphStyle(
            'IEEECaption',
            parent=styles['Normal'],
            fontSize=9,
            spaceAfter=12*pt,
            alignment=TA_CENTER,
            fontName='Times-Roman'
        )
        
        # IEEE Reference style
        ieee_reference = ParagraphStyle(
            'IEEEReference',
            parent=styles['Normal'],
            fontSize=9.5,
            spaceAfter=12*pt,
            alignment=TA_JUSTIFY,
            fontName='Times-Roman',
            leftIndent=0.45*inch,
            firstLineIndent=-0.25*inch,
            rightIndent=0.2*inch
        )
        
        story = []
        
        # Title
        if form_data.get('title'):
            story.append(Paragraph(form_data['title'], ieee_title))
        
        # Authors
        if form_data.get('authors'):
            for author in form_data['authors']:
                if author.get('name'):
                    story.append(Paragraph(f"<b>{author['name']}</b>", ieee_author))
                    
                    # Author details
                    if author.get('department'):
                        story.append(Paragraph(author['department'], ieee_author_detail))
                    if author.get('organization'):
                        story.append(Paragraph(author['organization'], ieee_author_detail))
                    
                    location_parts = []
                    if author.get('city'):
                        location_parts.append(author['city'])
                    if author.get('state'):
                        location_parts.append(author['state'])
                    if location_parts:
                        story.append(Paragraph(', '.join(location_parts), ieee_author_detail))
                    
                    # Custom fields
                    for field in author.get('customFields', []):
                        if field.get('value'):
                            story.append(Paragraph(field['value'], ieee_author_detail))
            
            story.append(Spacer(1, 12*pt))
        
        # Abstract
        if form_data.get('abstract'):
            # Abstract with bold title followed by bold content in same paragraph
            abstract_text = f"<b>Abstract—{form_data['abstract']}</b>"
            story.append(Paragraph(abstract_text, ieee_abstract))
        
        # Keywords
        if form_data.get('keywords'):
            # Keywords with bold title followed by bold content in same paragraph
            keywords_text = f"<b>Keywords—{form_data['keywords']}</b>"
            story.append(Paragraph(keywords_text, ieee_abstract))
            story.append(Spacer(1, 12*pt))
        
        # Sections
        figure_counter = 0
        for idx, section in enumerate(form_data.get('sections', []), 1):
            if section.get('title'):
                section_title = f"{idx}. {section['title'].upper()}"
                story.append(Paragraph(section_title, ieee_section))
            
            # Process content blocks
            for block in section.get('contentBlocks', []):
                if block.get('type') == 'text' and block.get('content'):
                    # Handle HTML formatting in content
                    content = process_html_formatting(block['content'])
                    story.append(Paragraph(content, ieee_body))
                    
                    # Check for attached image
                    if block.get('data') and block.get('caption'):
                        figure_counter += 1
                        try:
                            # Process image
                            image_data = block['data']
                            if ',' in image_data:
                                image_data = image_data.split(',')[1]
                            
                            image_bytes = base64.b64decode(image_data)
                            image_stream = BytesIO(image_bytes)
                            
                            # Size mapping
                            size_mapping = {
                                'very-small': 1.2*inch,
                                'small': 1.8*inch,
                                'medium': 2.5*inch,
                                'large': 3.2*inch
                            }
                            width = size_mapping.get(block.get('size', 'medium'), 2.5*inch)
                            
                            # Add image
                            img = RLImage(image_stream, width=width)
                            img.hAlign = 'CENTER'
                            story.append(Spacer(1, 6*pt))
                            story.append(img)
                            
                            # Add caption
                            caption_text = f"Fig. {idx}.{figure_counter}: {block['caption']}"
                            story.append(Paragraph(caption_text, ieee_caption))
                            
                        except Exception as e:
                            print(f"Error processing image: {e}", file=sys.stderr)
                
                elif block.get('type') == 'image' and block.get('data') and block.get('caption'):
                    figure_counter += 1
                    try:
                        # Process standalone image
                        image_data = block['data']
                        if ',' in image_data:
                            image_data = image_data.split(',')[1]
                        
                        image_bytes = base64.b64decode(image_data)
                        image_stream = BytesIO(image_bytes)
                        
                        # Size mapping
                        size_mapping = {
                            'very-small': 1.2*inch,
                            'small': 1.8*inch,
                            'medium': 2.5*inch,
                            'large': 3.2*inch
                        }
                        width = size_mapping.get(block.get('size', 'medium'), 2.5*inch)
                        
                        # Add image
                        img = RLImage(image_stream, width=width)
                        img.hAlign = 'CENTER'
                        story.append(Spacer(1, 6*pt))
                        story.append(img)
                        
                        # Add caption
                        caption_text = f"Fig. {idx}.{figure_counter}: {block['caption']}"
                        story.append(Paragraph(caption_text, ieee_caption))
                        
                    except Exception as e:
                        print(f"Error processing image: {e}", file=sys.stderr)
            
            # Legacy content support
            if not section.get('contentBlocks') and section.get('content'):
                content = process_html_formatting(section['content'])
                story.append(Paragraph(content, ieee_body))
            
            # Subsections
            for sub_idx, subsection in enumerate(section.get('subsections', []), 1):
                if subsection.get('title'):
                    subsection_title = f"{idx}.{sub_idx} {subsection['title']}"
                    story.append(Paragraph(subsection_title, ieee_subsection))
                
                if subsection.get('content'):
                    content = process_html_formatting(subsection['content'])
                    story.append(Paragraph(content, ieee_body))
        
        # References
        if form_data.get('references'):
            story.append(Paragraph("REFERENCES", ieee_section))
            for idx, ref in enumerate(form_data['references'], 1):
                if ref.get('text'):
                    ref_text = f"[{idx}] {ref['text']}"
                    story.append(Paragraph(ref_text, ieee_reference))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
        
    except ImportError as e:
        raise Exception(f"ReportLab not available: {e}")
    except Exception as e:
        raise Exception(f"PDF generation failed: {e}")

def process_html_formatting(html_content):
    """Convert HTML formatting to ReportLab markup with proper sanitization."""
    if not html_content:
        return ""
    
    # Convert to string if it's not already
    content = str(html_content)
    
    # If no HTML tags, return as-is
    if '<' not in content:
        return content
    
    try:
        # Escape special XML characters first
        content = content.replace('&', '&amp;')
        
        # Handle common HTML entities
        content = content.replace('&lt;', '&amp;lt;')
        content = content.replace('&gt;', '&amp;gt;')
        content = content.replace('&quot;', '&amp;quot;')
        
        # Convert HTML formatting to ReportLab markup
        # Bold tags
        content = re.sub(r'<b\s*/?>', '<b>', content, flags=re.IGNORECASE)
        content = re.sub(r'</b\s*>', '</b>', content, flags=re.IGNORECASE)
        content = re.sub(r'<strong\s*/?>', '<b>', content, flags=re.IGNORECASE)
        content = re.sub(r'</strong\s*>', '</b>', content, flags=re.IGNORECASE)
        
        # Italic tags
        content = re.sub(r'<i\s*/?>', '<i>', content, flags=re.IGNORECASE)
        content = re.sub(r'</i\s*>', '</i>', content, flags=re.IGNORECASE)
        content = re.sub(r'<em\s*/?>', '<i>', content, flags=re.IGNORECASE)
        content = re.sub(r'</em\s*>', '</i>', content, flags=re.IGNORECASE)
        
        # Underline tags
        content = re.sub(r'<u\s*/?>', '<u>', content, flags=re.IGNORECASE)
        content = re.sub(r'</u\s*>', '</u>', content, flags=re.IGNORECASE)
        
        # Remove paragraph tags and replace with line breaks
        content = re.sub(r'<p\s*/?>', '', content, flags=re.IGNORECASE)
        content = re.sub(r'</p\s*>', '<br/>', content, flags=re.IGNORECASE)
        
        # Convert line breaks
        content = re.sub(r'<br\s*/?>', '<br/>', content, flags=re.IGNORECASE)
        
        # Remove any remaining unsupported HTML tags
        content = re.sub(r'<(?!/?[biu]|br/?)([^>]*)>', '', content, flags=re.IGNORECASE)
        
        # Fix any unclosed tags by ensuring proper pairing
        content = fix_unclosed_tags(content)
        
        # Clean up multiple spaces and normalize whitespace
        content = re.sub(r'\s+', ' ', content)
        content = content.strip()
        
        return content
        
    except Exception as e:
        print(f"Error processing HTML formatting: {e}", file=sys.stderr)
        # Fallback: strip all HTML tags and return plain text
        plain_text = re.sub(r'<[^>]*>', '', str(html_content))
        return plain_text.strip()

def fix_unclosed_tags(content):
    """Fix unclosed HTML tags to prevent ReportLab parsing errors."""
    try:
        # Stack to track open tags
        open_tags = []
        result = ""
        
        # Find all tags
        tag_pattern = r'<(/?)([biu]|br/?)(?:\s[^>]*)?>|([^<]+)'
        
        for match in re.finditer(tag_pattern, content, re.IGNORECASE):
            is_closing = match.group(1) == '/'
            tag_name = match.group(2)
            text_content = match.group(3)
            
            if text_content:
                # Regular text content
                result += text_content
            elif tag_name:
                tag_name = tag_name.lower()
                
                if tag_name == 'br/':
                    # Self-closing break tag
                    result += '<br/>'
                elif is_closing:
                    # Closing tag
                    if open_tags and open_tags[-1] == tag_name:
                        open_tags.pop()
                        result += f'</{tag_name}>'
                    # Ignore orphaned closing tags
                else:
                    # Opening tag
                    open_tags.append(tag_name)
                    result += f'<{tag_name}>'
        # Close any remaining open tags
        while open_tags:
            tag = open_tags.pop()
            result += f'</{tag}>'
        
        return result
        
    except Exception as e:
        print(f"Error fixing unclosed tags: {e}", file=sys.stderr)
        # Fallback: strip all tags
        return re.sub(r'<[^>]*>', '', content)

def main():
    """Main function for command line execution."""
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        form_data = json.loads(input_data)
        
        # Generate IEEE PDF
        pdf_data = create_ieee_pdf(form_data)
        
        # Write binary data to stdout
        sys.stdout.buffer.write(pdf_data)
        
    except Exception as e:
        import traceback
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.stderr.write(f"Traceback: {traceback.format_exc()}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()