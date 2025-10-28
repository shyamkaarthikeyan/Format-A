import json
import sys
import os
import importlib.util
from io import BytesIO

def generate_ieee_document(document_data):
    """Generate IEEE document using the perfect IEEE generator"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        server_ieee_path = os.path.join(current_dir, '..', '..', 'server', 'ieee_generator_fixed.py')
        
        print(f"Looking for IEEE generator at: {server_ieee_path}", file=sys.stderr)
        
        if os.path.exists(server_ieee_path):
            spec = importlib.util.spec_from_file_location("ieee_generator_fixed", server_ieee_path)
            ieee_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(ieee_module)
            
            generator = ieee_module.IEEEDocumentGenerator()
            docx_buffer = generator.generate_document(document_data)
            print("Perfect IEEE DOCX generated successfully", file=sys.stderr)
            return docx_buffer
        else:
            raise Exception(f"Perfect IEEE generator not found at {server_ieee_path}")
    except Exception as e:
        print(f"Perfect IEEE document generation failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        raise e

def handler(req, res):
    """Vercel serverless function handler"""
    
    # Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Preview, X-Download')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    
    # Handle preflight requests
    if req.method == 'OPTIONS':
        return res.status(200).end()
    
    if req.method != 'POST':
        return res.status(405).json({'error': 'Method not allowed'})
    
    try:
        # Parse request body
        document_data = req.body
        
        # Check for preview or download mode
        is_preview = req.query.get('preview') == 'true' or req.headers.get('x-preview') == 'true'
        is_download = req.headers.get('x-download') == 'true'
        
        print(f"🔍 Request mode: preview={is_preview}, download={is_download}", file=sys.stderr)
        print(f"🔍 Document title: {document_data.get('title', 'NO_TITLE')}", file=sys.stderr)
        
        # Validate required fields
        if not document_data.get('title'):
            return res.status(400).json({
                'error': 'Missing document title',
                'message': 'Document title is required'
            })
        
        if not document_data.get('authors') or not any(author.get('name') for author in document_data.get('authors', [])):
            return res.status(400).json({
                'error': 'Missing authors',
                'message': 'At least one author is required'
            })
        
        # For Vercel deployment, prioritize DOCX generation over PDF
        # PDF generation has known issues on Vercel serverless environment
        
        # Generate perfect IEEE document first
        try:
            docx_buffer = generate_ieee_document(document_data)
            print(f"✅ Perfect IEEE DOCX generated successfully, size: {len(docx_buffer)} bytes", file=sys.stderr)
        except Exception as docx_error:
            print(f"❌ DOCX generation failed: {docx_error}", file=sys.stderr)
            return res.status(500).json({
                'error': 'Document generation failed',
                'message': f'DOCX generation error: {str(docx_error)}',
                'details': 'Check Vercel function logs for more information'
            })
        
        # Try PDF generation only if specifically requested and environment supports it
        pdf_data = None
        pdf_generation_available = False
        
        # Check if we're in a PDF-capable environment
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate
            pdf_generation_available = True
            print(f"✅ ReportLab available for PDF generation", file=sys.stderr)
        except ImportError as import_error:
            print(f"⚠️ ReportLab not available: {import_error}", file=sys.stderr)
            pdf_generation_available = False
        
        # Only attempt PDF generation if ReportLab is available and it's requested
        if pdf_generation_available and (is_preview or is_download):
            try:
                # Try to generate PDF using embedded generator
                pdf_data = generate_pdf_inline(document_data)
                if pdf_data:
                    print(f"✅ Inline PDF generated successfully, size: {len(pdf_data)} bytes", file=sys.stderr)
                else:
                    print(f"⚠️ Inline PDF generation returned empty data", file=sys.stderr)
            except Exception as pdf_error:
                print(f"⚠️ PDF generation failed (expected on Vercel): {pdf_error}", file=sys.stderr)
                pdf_data = None
        
        # Return appropriate response based on what was requested and what's available
        if pdf_data and is_preview:
            # Serve PDF for preview
            res.setHeader('Content-Type', 'application/pdf')
            res.setHeader('Content-Disposition', 'inline; filename="ieee_paper_preview.pdf"')
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
            return res.status(200).send(pdf_data)
            
        elif pdf_data and is_download:
            # Serve PDF for download
            res.setHeader('Content-Type', 'application/pdf')
            res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"')
            return res.status(200).send(pdf_data)
            
        elif is_preview:
            # Preview requested but PDF not available - return helpful message
            return res.status(503).json({
                'error': 'PDF preview not available on this deployment',
                'message': 'PDF generation is not supported in this serverless environment. Perfect IEEE formatting is available via Word download.',
                'suggestion': 'Use the Download Word button to get your perfectly formatted IEEE paper.',
                'workaround': 'The DOCX file contains identical formatting to what you see on localhost.',
                'available_formats': ['docx']
            })
            
        else:
            # Serve perfect IEEE DOCX for download (always works)
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"')
            if isinstance(docx_buffer, bytes):
                return res.status(200).send(docx_buffer)
            else:
                return res.status(200).send(docx_buffer.encode())
        
    except Exception as e:
        print(f"❌ Handler error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        
        return res.status(500).json({
            'error': 'Document generation failed',
            'message': str(e),
            'details': 'This may be due to Vercel serverless environment limitations. Try downloading Word format instead.',
            'suggestion': 'Word downloads should work perfectly on all deployments.'
        })

def generate_pdf_inline(document_data):
    """Generate PDF inline without external file dependencies"""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
        from io import BytesIO
        
        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=1*inch,
            bottomMargin=1*inch
        )
        
        # Create styles
        styles = getSampleStyleSheet()
        
        # IEEE Title style
        title_style = ParagraphStyle(
            name='IEEETitle',
            parent=styles['Title'],
            fontSize=14,
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Times-Bold'
        )
        
        # IEEE Author style
        author_style = ParagraphStyle(
            name='IEEEAuthor',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName='Times-Roman'
        )
        
        # IEEE Body style
        body_style = ParagraphStyle(
            name='IEEEBody',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            alignment=TA_JUSTIFY,
            fontName='Times-Roman'
        )
        
        # IEEE Heading style
        heading_style = ParagraphStyle(
            name='IEEEHeading',
            parent=styles['Heading1'],
            fontSize=12,
            spaceAfter=6,
            spaceBefore=12,
            alignment=TA_LEFT,
            fontName='Times-Bold'
        )
        
        story = []
        
        # Title
        if document_data.get('title'):
            title = Paragraph(document_data['title'], title_style)
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
                    authors_text.append(author_info)
            
            if authors_text:
                authors_para = Paragraph("; ".join(authors_text), author_style)
                story.append(authors_para)
                story.append(Spacer(1, 18))
        
        # Abstract
        if document_data.get('abstract'):
            abstract_title = Paragraph("<b>Abstract</b>", body_style)
            story.append(abstract_title)
            story.append(Spacer(1, 6))
            
            abstract_text = Paragraph(document_data['abstract'], body_style)
            story.append(abstract_text)
            story.append(Spacer(1, 12))
        
        # Keywords
        if document_data.get('keywords'):
            keywords_text = f"<b>Keywords:</b> {document_data['keywords']}"
            keywords_para = Paragraph(keywords_text, body_style)
            story.append(keywords_para)
            story.append(Spacer(1, 18))
        
        # Sections
        if document_data.get('sections'):
            for i, section in enumerate(document_data['sections']):
                if section.get('title'):
                    section_title = f"{i+1}. {section['title']}"
                    heading = Paragraph(section_title, heading_style)
                    story.append(heading)
                    story.append(Spacer(1, 6))
                
                if section.get('content'):
                    content_para = Paragraph(section['content'], body_style)
                    story.append(content_para)
                    story.append(Spacer(1, 12))
        
        # References
        if document_data.get('references'):
            ref_heading = Paragraph("References", heading_style)
            story.append(ref_heading)
            story.append(Spacer(1, 12))
            
            for i, reference in enumerate(document_data['references']):
                if reference.get('text'):
                    ref_text = f"[{i+1}] {reference['text']}"
                    ref_para = Paragraph(ref_text, body_style)
                    story.append(ref_para)
                    story.append(Spacer(1, 3))
        
        # Build PDF
        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()
        
        return pdf_data
        
    except Exception as e:
        print(f"❌ Inline PDF generation failed: {e}", file=sys.stderr)
        return None