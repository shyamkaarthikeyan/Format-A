"""
IEEE Document Generator - Exact formatting matching test.py specifications
"""

import json
import sys
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION_START
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from io import BytesIO

# IEEE formatting configuration - exact specifications
IEEE_CONFIG = {
    'font_name': 'Times New Roman',
    'font_size_title': Pt(24),
    'font_size_body': Pt(9.5),
    'font_size_caption': Pt(9),
    'margin_left': Inches(0.75),
    'margin_right': Inches(0.75),
    'margin_top': Inches(0.75),
    'margin_bottom': Inches(0.75),
    'column_width': Inches(3.375),
    'column_spacing': Inches(0.25),
    'column_indent': Inches(0.2),
    'line_spacing': Pt(10),  # Exact 10pt spacing
    'references_indent': Inches(0.45),
}

def set_document_defaults(doc):
    """Set document-wide defaults with Word 2002 compatibility."""
    # Set page margins
    for section in doc.sections:
        section.top_margin = IEEE_CONFIG['margin_top']
        section.bottom_margin = IEEE_CONFIG['margin_bottom']
        section.left_margin = IEEE_CONFIG['margin_left']
        section.right_margin = IEEE_CONFIG['margin_right']

    # Configure styles for exact formatting
    styles = doc.styles
    
    # Normal style - 9.5pt Times New Roman, justified, exact 10pt line spacing
    if 'Normal' in styles:
        normal = styles['Normal']
        normal.font.name = IEEE_CONFIG['font_name']
        normal.font.size = IEEE_CONFIG['font_size_body']
        normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        normal.paragraph_format.space_before = Pt(0)
        normal.paragraph_format.space_after = Pt(0)
        normal.paragraph_format.line_spacing = IEEE_CONFIG['line_spacing']
        normal.paragraph_format.line_spacing_rule = 0  # Exact spacing
        normal.paragraph_format.widow_control = False
        normal.paragraph_format.first_line_indent = Pt(0)

    # Heading 1 - section headings
    if 'Heading 1' in styles:
        heading1 = styles['Heading 1']
        heading1.font.name = IEEE_CONFIG['font_name']
        heading1.font.size = IEEE_CONFIG['font_size_body']
        heading1.font.bold = True
        heading1.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
        heading1.paragraph_format.space_before = Pt(0)
        heading1.paragraph_format.space_after = Pt(0)
        heading1.paragraph_format.line_spacing = IEEE_CONFIG['line_spacing']
        heading1.paragraph_format.line_spacing_rule = 0
        heading1.paragraph_format.keep_with_next = False
        heading1.paragraph_format.page_break_before = False

    # Heading 2 - subsection headings
    if 'Heading 2' in styles:
        heading2 = styles['Heading 2']
        heading2.font.name = IEEE_CONFIG['font_name']
        heading2.font.size = IEEE_CONFIG['font_size_body']
        heading2.font.bold = True
        heading2.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
        heading2.paragraph_format.space_before = Pt(0)
        heading2.paragraph_format.space_after = Pt(0)
        heading2.paragraph_format.line_spacing = IEEE_CONFIG['line_spacing']
        heading2.paragraph_format.line_spacing_rule = 0

def add_title(doc, title):
    """Add centered title with 24pt bold Times New Roman."""
    para = doc.add_paragraph()
    run = para.add_run(title)
    run.font.name = IEEE_CONFIG['font_name']
    run.font.size = IEEE_CONFIG['font_size_title']
    run.bold = True
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para.paragraph_format.space_before = Pt(0)
    para.paragraph_format.space_after = Pt(12)

def add_authors(doc, authors):
    """Add author information in centered table format."""
    if not authors:
        return
    
    # Create table with one row and columns for each author
    num_authors = len([a for a in authors if a.get('name')])
    if num_authors == 0:
        return
        
    table = doc.add_table(rows=1, cols=num_authors)
    table.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    col_idx = 0
    for author in authors:
        if not author.get('name'):
            continue
            
        cell = table.cell(0, col_idx)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
        
        # Author name - bold, centered
        para = cell.add_paragraph()
        run = para.add_run(author['name'])
        run.font.name = IEEE_CONFIG['font_name']
        run.font.size = IEEE_CONFIG['font_size_body']
        run.bold = True
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        para.paragraph_format.space_before = Pt(0)
        para.paragraph_format.space_after = Pt(2)
        
        # Author details - italic, centered
        details = []
        if author.get('department'):
            details.append(author['department'])
        if author.get('organization'):
            details.append(author['organization'])
        if author.get('city') and author.get('state'):
            details.append(f"{author['city']}, {author['state']}")
        elif author.get('city'):
            details.append(author['city'])
        elif author.get('state'):
            details.append(author['state'])
        
        for detail in details:
            para = cell.add_paragraph()
            run = para.add_run(detail)
            run.font.name = IEEE_CONFIG['font_name']
            run.font.size = IEEE_CONFIG['font_size_body']
            run.italic = True
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            para.paragraph_format.space_before = Pt(0)
            para.paragraph_format.space_after = Pt(2)
        
        # Custom fields
        for custom_field in author.get('customFields', []):
            if custom_field.get('value'):
                para = cell.add_paragraph()
                run = para.add_run(custom_field['value'])
                run.font.name = IEEE_CONFIG['font_name']
                run.font.size = IEEE_CONFIG['font_size_body']
                run.italic = True
                para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                para.paragraph_format.space_before = Pt(0)
                para.paragraph_format.space_after = Pt(2)
        
        col_idx += 1
    
    # Add spacing after authors
    doc.add_paragraph().paragraph_format.space_after = Pt(12)

def add_abstract(doc, abstract):
    """Add abstract with 'Abstract—' prefix, justified, single column."""
    if not abstract:
        return
        
    para = doc.add_paragraph()
    
    # Add "Abstract—" in italic
    run = para.add_run("Abstract—")
    run.font.name = IEEE_CONFIG['font_name']
    run.font.size = IEEE_CONFIG['font_size_body']
    run.italic = True
    
    # Add abstract text
    run = para.add_run(abstract)
    run.font.name = IEEE_CONFIG['font_name']
    run.font.size = IEEE_CONFIG['font_size_body']
    
    # Format paragraph - justified with exact spacing
    para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    para.paragraph_format.space_before = Pt(0)
    para.paragraph_format.space_after = Pt(12)
    para.paragraph_format.line_spacing = IEEE_CONFIG['line_spacing']
    para.paragraph_format.line_spacing_rule = 0
    para.paragraph_format.widow_control = False

def add_keywords(doc, keywords):
    """Add keywords with 'Index Terms—' prefix, justified, single column."""
    if not keywords:
        return
        
    para = doc.add_paragraph()
    
    # Add "Index Terms—" in italic  
    run = para.add_run("Index Terms—")
    run.font.name = IEEE_CONFIG['font_name']
    run.font.size = IEEE_CONFIG['font_size_body']
    run.italic = True
    
    # Add keywords text
    run = para.add_run(keywords)
    run.font.name = IEEE_CONFIG['font_name']
    run.font.size = IEEE_CONFIG['font_size_body']
    
    # Format paragraph - justified with exact spacing
    para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    para.paragraph_format.space_before = Pt(0)
    para.paragraph_format.space_after = Pt(12)
    para.paragraph_format.line_spacing = IEEE_CONFIG['line_spacing']
    para.paragraph_format.line_spacing_rule = 0
    para.paragraph_format.widow_control = False

def create_two_column_section(doc):
    """Create new section with two-column layout."""
    # Add continuous section break
    new_section = doc.add_section(WD_SECTION_START.CONTINUOUS)
    
    # Configure two-column layout
    sectPr = new_section._sectPr
    
    # Create columns element
    cols = OxmlElement('w:cols')
    cols.set(qn('w:num'), '2')
    cols.set(qn('w:space'), str(int(IEEE_CONFIG['column_spacing'].pt * 20)))  # Convert to twips
    
    # Add individual column specifications
    for i in range(2):
        col = OxmlElement('w:col')
        col.set(qn('w:w'), str(int(IEEE_CONFIG['column_width'].pt * 20)))  # Convert to twips
        cols.append(col)
    
    sectPr.append(cols)
    return new_section

def add_justified_paragraph(doc, text, indent=None, space_before=None, space_after=None):
    """Add justified paragraph with exact IEEE formatting."""
    para = doc.add_paragraph()
    run = para.add_run(text)
    run.font.name = IEEE_CONFIG['font_name']
    run.font.size = IEEE_CONFIG['font_size_body']
    
    # Apply justification
    para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    para.paragraph_format.line_spacing = IEEE_CONFIG['line_spacing']
    para.paragraph_format.line_spacing_rule = 0  # Exact spacing
    para.paragraph_format.widow_control = False
    para.paragraph_format.keep_with_next = False
    
    # Set spacing and indentation
    if indent:
        para.paragraph_format.first_line_indent = indent
    if space_before:
        para.paragraph_format.space_before = space_before
    else:
        para.paragraph_format.space_before = Pt(0)
    if space_after:
        para.paragraph_format.space_after = space_after
    else:
        para.paragraph_format.space_after = Pt(12)
    
    return para

def add_section(doc, section_data, section_idx):
    """Add section with IEEE formatting."""
    if not section_data.get('title'):
        return
        
    # Section heading - uppercase, no space before/after
    para = doc.add_heading(f"{section_idx}. {section_data['title'].upper()}", level=1)
    
    # Add content blocks
    for block in section_data.get('contentBlocks', []):
        if block['type'] == 'text' and block.get('content'):
            add_justified_paragraph(
                doc, 
                block['content'],
                indent=IEEE_CONFIG['column_indent'],
                space_before=Pt(0),
                space_after=Pt(12)
            )
    
    # Add subsections
    for sub_idx, subsection in enumerate(section_data.get('subsections', []), 1):
        if subsection.get('title'):
            para = doc.add_heading(f"{section_idx}.{sub_idx} {subsection['title']}", level=2)
            
        if subsection.get('content'):
            add_justified_paragraph(
                doc,
                subsection['content'],
                indent=IEEE_CONFIG['column_indent'],
                space_before=Pt(0),
                space_after=Pt(12)
            )

def add_references(doc, references):
    """Add references with hanging indent and IEEE numbering."""
    if not references:
        return
        
    # References heading
    para = doc.add_heading("REFERENCES", level=1)
    
    # Add each reference with hanging indent
    for idx, ref in enumerate(references, 1):
        para = doc.add_paragraph()
        run = para.add_run(f"[{idx}] {ref.get('text', '')}")
        run.font.name = IEEE_CONFIG['font_name']
        run.font.size = IEEE_CONFIG['font_size_body']
        
        # Hanging indent formatting
        para.paragraph_format.left_indent = IEEE_CONFIG['references_indent']
        para.paragraph_format.first_line_indent = -IEEE_CONFIG['references_indent']
        para.paragraph_format.space_before = Pt(0)
        para.paragraph_format.space_after = Pt(6)
        para.paragraph_format.line_spacing = IEEE_CONFIG['line_spacing']
        para.paragraph_format.line_spacing_rule = 0
        para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

def generate_ieee_document(form_data):
    """Generate IEEE-formatted Word document with exact specifications."""
    doc = Document()
    
    # Set document defaults and compatibility
    set_document_defaults(doc)
    
    # Single-column section for title, authors, abstract, keywords
    add_title(doc, form_data.get('title', 'Untitled'))
    add_authors(doc, form_data.get('authors', []))
    add_abstract(doc, form_data.get('abstract'))
    add_keywords(doc, form_data.get('keywords'))
    
    # Create two-column section for body content
    create_two_column_section(doc)
    
    # Add sections in two-column format
    sections = form_data.get('sections', [])
    for idx, section in enumerate(sections, 1):
        add_section(doc, section, idx)
    
    # Add references
    add_references(doc, form_data.get('references', []))
    
    # Save to BytesIO
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()

def main():
    """Main function for command line execution."""
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        form_data = json.loads(input_data)
        
        # Generate IEEE document
        doc_data = generate_ieee_document(form_data)
        
        # Write binary data to stdout
        sys.stdout.buffer.write(doc_data)
        
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()