#!/usr/bin/env python3
"""
Robust PDF Generator with Fallback Support
Works on both local development and hosting platforms like Vercel
"""

import json
import sys
import os
from io import BytesIO
import base64

def try_docx2pdf_conversion(docx_data):
    """
    Try to convert DOCX to PDF using docx2pdf (works locally)
    Returns PDF data if successful, None if failed
    """
    try:
        from docx2pdf import convert
        import tempfile
        
        # Create temporary files
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_docx:
            temp_docx.write(docx_data)
            temp_docx_path = temp_docx.name
        
        temp_pdf_path = temp_docx_path.replace('.docx', '.pdf')
        
        try:
            # Convert DOCX to PDF
            convert(temp_docx_path, temp_pdf_path)
            
            # Read the generated PDF
            with open(temp_pdf_path, 'rb') as pdf_file:
                pdf_data = pdf_file.read()
            
            return pdf_data
            
        finally:
            # Clean up temporary files
            try:
                if os.path.exists(temp_docx_path):
                    os.unlink(temp_docx_path)
                if os.path.exists(temp_pdf_path):
                    os.unlink(temp_pdf_path)
            except:
                pass
                
    except ImportError:
        print("docx2pdf not available, will use ReportLab fallback", file=sys.stderr)
        return None
    except Exception as e:
        print(f"docx2pdf conversion failed: {e}", file=sys.stderr)
        return None

def generate_reportlab_pdf(document_data):
    """
    Generate PDF directly using ReportLab (works on hosting platforms)
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image as RLImage
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
        from reportlab.lib import colors
        
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
        
        # Create styles
        styles = getSampleStyleSheet()
        
        # IEEE Title style
        ieee_title = ParagraphStyle(
            'IEEETitle',
            parent=styles['Title'],
            fontSize=24,
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Times-Bold'
        )
        
        # IEEE Author style
        ieee_author = ParagraphStyle(
            'IEEEAuthor',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Times-Roman'
        )
        
        # IEEE Abstract style - full width like Word documents
        ieee_abstract = ParagraphStyle(
            'IEEEAbstract',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=12,
            alignment=TA_JUSTIFY,
            fontName='Times-Roman'
            # No indents - full width formatting like Word
        )
        
        # IEEE Body style
        ieee_body = ParagraphStyle(
            'IEEEBody',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            alignment=TA_JUSTIFY,
            fontName='Times-Roman'
        )
        
        # IEEE Section Header style
        ieee_section = ParagraphStyle(
            'IEEESection',
            parent=styles['Heading1'],
            fontSize=12,
            spaceAfter=6,
            spaceBefore=12,
            alignment=TA_CENTER,  # Center section titles
            fontName='Times-Bold'
        )
        
        story = []
        
        # Title
        if document_data.get('title'):
            story.append(Paragraph(document_data['title'], ieee_title))
            story.append(Spacer(1, 12))
        
        # Authors
        if document_data.get('authors'):
            author_text = ', '.join([author.get('name', '') for author in document_data['authors']])
            story.append(Paragraph(author_text, ieee_author))
            story.append(Spacer(1, 12))
        
        # Abstract
        if document_data.get('abstract'):
            # Abstract with bold title followed by bold content in same paragraph
            abstract_text = f"<b>Abstract—{document_data['abstract']}</b>"
            story.append(Paragraph(abstract_text, ieee_abstract))
            story.append(Spacer(1, 12))
        
        # Keywords
        if document_data.get('keywords'):
            # Keywords with bold title followed by bold content in same paragraph
            keywords_text = f"<b>Keywords—{document_data['keywords']}</b>"
            story.append(Paragraph(keywords_text, ieee_abstract))
            story.append(Spacer(1, 12))
        
        # Sections
        if document_data.get('sections'):
            for i, section in enumerate(document_data['sections']):
                # Section title
                section_title = f"{i+1}. {section.get('title', '').upper()}"
                story.append(Paragraph(section_title, ieee_section))
                
                # Section content blocks
                if section.get('contentBlocks'):
                    for block in section['contentBlocks']:
                        if block.get('type') == 'text' and block.get('content'):
                            # Clean HTML tags for ReportLab
                            content = block['content']
                            content = content.replace('<p>', '').replace('</p>', '<br/>')
                            content = content.replace('<br>', '<br/>').replace('<BR>', '<br/>')
                            story.append(Paragraph(content, ieee_body))
                            story.append(Spacer(1, 6))
                        
                        elif block.get('type') == 'equation' and block.get('content'):
                            # Center equations
                            eq_style = ParagraphStyle(
                                'Equation',
                                parent=ieee_body,
                                alignment=TA_CENTER,
                                fontName='Times-Italic'
                            )
                            story.append(Paragraph(block['content'], eq_style))
                            story.append(Spacer(1, 6))
                        
                        elif block.get('type') == 'image' and block.get('data'):
                            try:
                                # Add image from base64 data
                                image_data = base64.b64decode(block['data'])
                                image_buffer = BytesIO(image_data)
                                img = RLImage(image_buffer, width=4*inch, height=3*inch)
                                story.append(img)
                                if block.get('caption'):
                                    caption_style = ParagraphStyle(
                                        'Caption',
                                        parent=ieee_body,
                                        fontSize=9,
                                        alignment=TA_CENTER,
                                        fontName='Times-Roman'
                                    )
                                    story.append(Paragraph(f"Fig. {i+1}. {block['caption']}", caption_style))
                                story.append(Spacer(1, 12))
                            except Exception as e:
                                print(f"Error adding image: {e}", file=sys.stderr)
                
                # Subsections with multi-level support
                if section.get('subsections'):
                    def add_subsections_recursive(subsections, section_num, parent_numbering="", level=1):
                        # Get subsections for current level without parent (top-level) or with specific parent
                        if level == 1:
                            current_level_subs = [s for s in subsections if s.get('level', 1) == 1 and not s.get('parentId')]
                        else:
                            parent_id = parent_numbering.split('_')[-1] if '_' in parent_numbering else None
                            current_level_subs = [s for s in subsections if s.get('parentId') == parent_id and s.get('level', 1) == level]
                        
                        for j, subsection in enumerate(current_level_subs, 1):
                            if subsection.get('title'):
                                if level == 1:
                                    subsection_number = f"{section_num}.{j}"
                                else:
                                    base_number = parent_numbering.split('_')[0] if '_' in parent_numbering else parent_numbering
                                    subsection_number = f"{base_number}.{j}"
                                
                                subsection_title = f"{subsection_number}. {subsection['title']}"
                                
                                # Create style based on level
                                subsection_style = ParagraphStyle(
                                    f'Subsection_Level_{level}',
                                    parent=ieee_section,
                                    fontSize=max(11 - level, 9),  # Decrease font size with level
                                    fontName='Times-Bold',
                                    leftIndent=level * 0.2 * inch  # Indent based on level
                                )
                                story.append(Paragraph(subsection_title, subsection_style))
                            
                            if subsection.get('content'):
                                # Create body style with appropriate indentation
                                body_style = ParagraphStyle(
                                    f'SubsectionBody_Level_{level}',
                                    parent=ieee_body,
                                    leftIndent=level * 0.2 * inch,
                                    rightIndent=0.2 * inch
                                )
                                story.append(Paragraph(subsection['content'], body_style))
                                story.append(Spacer(1, 6))
                            
                            # Recursively handle child subsections
                            child_subsections = [s for s in subsections if s.get('parentId') == subsection['id']]
                            if child_subsections and level < 5:  # Limit nesting depth
                                add_subsections_recursive(subsections, section_num, f"{subsection_number}_{subsection['id']}", level + 1)
                    
                    # Start recursive subsection processing
                    add_subsections_recursive(section['subsections'], i+1)
        
        # References
        if document_data.get('references'):
            story.append(Paragraph('REFERENCES', ieee_section))
            for i, ref in enumerate(document_data['references']):
                ref_text = f"[{i+1}] {ref.get('text', '')}"
                story.append(Paragraph(ref_text, ieee_body))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
        
    except ImportError as e:
        raise Exception(f"ReportLab not available: {e}")
    except Exception as e:
        raise Exception(f"ReportLab PDF generation failed: {e}")

def main():
    """
    Main function with smart fallback logic
    """
    try:
        # Read document data from stdin
        input_data = sys.stdin.read()
        document_data = json.loads(input_data)
        
        # Check if we should skip docx2pdf (for hosting platforms)
        skip_docx2pdf = os.environ.get('SKIP_DOCX2PDF', '').lower() == 'true'
        
        pdf_data = None
        
        if not skip_docx2pdf:
            # Try docx2pdf first (works locally)
            print("Attempting docx2pdf conversion...", file=sys.stderr)
            # For this approach, we'd need the DOCX data, but we have document_data
            # So we'll skip this and go directly to ReportLab
        
        # Use ReportLab direct generation (works on hosting platforms)
        print("Using ReportLab direct PDF generation...", file=sys.stderr)
        pdf_data = generate_reportlab_pdf(document_data)
        
        if pdf_data and len(pdf_data) > 0:
            # Write PDF data to stdout
            sys.stdout.buffer.write(pdf_data)
            sys.stdout.buffer.flush()
            print(f"PDF generated successfully, size: {len(pdf_data)} bytes", file=sys.stderr)
        else:
            raise Exception("PDF generation failed - no data generated")
            
    except Exception as e:
        print(f"PDF generation error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()