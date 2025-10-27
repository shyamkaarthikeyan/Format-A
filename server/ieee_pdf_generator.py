#!/usr/bin/env python3
"""
IEEE PDF Generator using ReportLab
Direct PDF generation for IEEE-formatted academic papers
"""

import sys
import json
import logging
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, pt
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.lib import colors

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class IEEEPDFGenerator:
    def __init__(self):
        self.buffer = BytesIO()
        self.doc = SimpleDocTemplate(
            self.buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=1*inch,
            bottomMargin=1*inch
        )
        
        # Create custom styles for IEEE format
        self.styles = getSampleStyleSheet()
        self._create_ieee_styles()
        
    def _create_ieee_styles(self):
        """Create IEEE-specific paragraph styles"""
        
        # Title style
        self.styles.add(ParagraphStyle(
            name='IEEETitle',
            parent=self.styles['Title'],
            fontSize=14,
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Times-Bold'
        ))
        
        # Author style
        self.styles.add(ParagraphStyle(
            name='IEEEAuthor',
            parent=self.styles['Normal'],
            fontSize=12,
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName='Times-Roman'
        ))
        
        # Abstract style
        self.styles.add(ParagraphStyle(
            name='IEEEAbstract',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=12,
            alignment=TA_JUSTIFY,
            fontName='Times-Roman',
            leftIndent=0.5*inch,
            rightIndent=0.5*inch
        ))
        
        # Section heading style
        self.styles.add(ParagraphStyle(
            name='IEEEHeading',
            parent=self.styles['Heading1'],
            fontSize=12,
            spaceAfter=6,
            spaceBefore=12,
            alignment=TA_LEFT,
            fontName='Times-Bold'
        ))
        
        # Body text style
        self.styles.add(ParagraphStyle(
            name='IEEEBody',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            alignment=TA_JUSTIFY,
            fontName='Times-Roman'
        ))
        
        # Keywords style
        self.styles.add(ParagraphStyle(
            name='IEEEKeywords',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=12,
            alignment=TA_JUSTIFY,
            fontName='Times-Italic'
        ))
        
        # Reference style
        self.styles.add(ParagraphStyle(
            name='IEEEReference',
            parent=self.styles['Normal'],
            fontSize=9,
            spaceAfter=3,
            alignment=TA_LEFT,
            fontName='Times-Roman',
            leftIndent=0.25*inch,
            firstLineIndent=-0.25*inch
        ))

    def generate_pdf(self, document_data):
        """Generate IEEE-formatted PDF from document data"""
        try:
            logger.info("Starting IEEE PDF generation with ReportLab")
            
            story = []
            
            # Title
            if document_data.get('title'):
                title = Paragraph(document_data['title'], self.styles['IEEETitle'])
                story.append(title)
                story.append(Spacer(1, 12))
            
            # Authors
            if document_data.get('authors'):
                authors_text = []
                for author in document_data['authors']:
                    if author.get('name'):
                        author_info = author['name']
                        if author.get('affiliation'):
                            author_info += f", {author['affiliation']}"
                        if author.get('email'):
                            author_info += f" ({author['email']})"
                        authors_text.append(author_info)
                
                if authors_text:
                    authors_para = Paragraph("; ".join(authors_text), self.styles['IEEEAuthor'])
                    story.append(authors_para)
                    story.append(Spacer(1, 18))
            
            # Abstract
            if document_data.get('abstract'):
                abstract_title = Paragraph("<b>Abstract</b>", self.styles['IEEEBody'])
                story.append(abstract_title)
                story.append(Spacer(1, 6))
                
                abstract_text = Paragraph(document_data['abstract'], self.styles['IEEEAbstract'])
                story.append(abstract_text)
                story.append(Spacer(1, 12))
            
            # Keywords
            if document_data.get('keywords'):
                keywords_text = f"<b>Keywords:</b> {document_data['keywords']}"
                keywords_para = Paragraph(keywords_text, self.styles['IEEEKeywords'])
                story.append(keywords_para)
                story.append(Spacer(1, 18))
            
            # Sections
            if document_data.get('sections'):
                for i, section in enumerate(document_data['sections']):
                    if section.get('title'):
                        # Section heading
                        section_title = f"{i+1}. {section['title']}"
                        heading = Paragraph(section_title, self.styles['IEEEHeading'])
                        story.append(heading)
                        story.append(Spacer(1, 6))
                    
                    # Section content
                    if section.get('content'):
                        content_para = Paragraph(section['content'], self.styles['IEEEBody'])
                        story.append(content_para)
                        story.append(Spacer(1, 12))
                    
                    # Handle content blocks if present
                    if section.get('content_blocks'):
                        for block in section['content_blocks']:
                            if block.get('type') == 'text' and block.get('content'):
                                block_para = Paragraph(block['content'], self.styles['IEEEBody'])
                                story.append(block_para)
                                story.append(Spacer(1, 6))
            
            # References
            if document_data.get('references'):
                # References heading
                ref_heading = Paragraph("References", self.styles['IEEEHeading'])
                story.append(ref_heading)
                story.append(Spacer(1, 12))
                
                # Reference list
                for i, reference in enumerate(document_data['references']):
                    if reference.get('text'):
                        ref_text = f"[{i+1}] {reference['text']}"
                        ref_para = Paragraph(ref_text, self.styles['IEEEReference'])
                        story.append(ref_para)
                        story.append(Spacer(1, 3))
            
            # Build the PDF
            logger.info("Building PDF document...")
            self.doc.build(story)
            
            # Get the PDF data
            pdf_data = self.buffer.getvalue()
            logger.info(f"PDF generated successfully, size: {len(pdf_data)} bytes")
            
            return pdf_data
            
        except Exception as e:
            logger.error(f"PDF generation failed: {e}")
            raise

def main():
    """Main function to handle PDF generation"""
    try:
        logger.info("IEEE PDF generator started")
        
        # Read document data from stdin
        input_data = sys.stdin.read()
        logger.info(f"Read {len(input_data)} characters from stdin")
        
        if not input_data.strip():
            logger.error("No input data received")
            sys.stderr.write("Error: No document data received\n")
            sys.exit(1)
        
        # Parse JSON data
        try:
            document_data = json.loads(input_data)
            logger.info("Document data parsed successfully")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            sys.stderr.write(f"Error: Invalid JSON data - {e}\n")
            sys.exit(1)
        
        # Generate PDF
        generator = IEEEPDFGenerator()
        pdf_data = generator.generate_pdf(document_data)
        
        if len(pdf_data) == 0:
            logger.error("PDF generation resulted in empty file")
            sys.stderr.write("Error: PDF generation resulted in empty file\n")
            sys.exit(1)
        
        # Write PDF data to stdout
        sys.stdout.buffer.write(pdf_data)
        sys.stdout.buffer.flush()
        
        logger.info("PDF generation completed successfully")
        
    except Exception as e:
        logger.error(f"PDF generation error: {e}")
        sys.stderr.write(f"Error: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()