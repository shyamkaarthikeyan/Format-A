#!/usr/bin/env python3
"""
HTML to PDF Converter for Vercel
Uses WeasyPrint which works in serverless environments
"""

import sys
import json
from io import BytesIO

try:
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration
except ImportError:
    print("Error: WeasyPrint not installed", file=sys.stderr)
    print("Install with: pip install weasyprint", file=sys.stderr)
    sys.exit(1)

def generate_ieee_html(document_data):
    """Generate IEEE-formatted HTML that can be converted to PDF"""
    
    title = document_data.get('title', 'Untitled Paper')
    authors = document_data.get('authors', [])
    abstract = document_data.get('abstract', '')
    keywords = document_data.get('keywords', [])
    sections = document_data.get('sections', [])
    references = document_data.get('references', [])
    
    # Format authors
    author_list = []
    for author in authors:
        if isinstance(author, dict):
            author_str = author.get('name', '')
            if author.get('affiliation'):
                author_str += f", {author['affiliation']}"
            author_list.append(author_str)
        elif isinstance(author, str):
            author_list.append(author)
    
    authors_html = '<br>'.join(author_list)
    
    # Format keywords
    if isinstance(keywords, list):
        keywords_str = ', '.join(keywords)
    else:
        keywords_str = str(keywords)
    
    # Format sections
    sections_html = ''
    for i, section in enumerate(sections, 1):
        if isinstance(section, dict):
            section_title = section.get('title', f'Section {i}')
            section_content = section.get('content', '')
            sections_html += f'''
            <h2>{i}. {section_title}</h2>
            <p>{section_content}</p>
            '''
        elif isinstance(section, str):
            sections_html += f'<p>{section}</p>'
    
    # Format references
    references_html = ''
    for i, ref in enumerate(references, 1):
        if isinstance(ref, dict):
            ref_text = ref.get('text', str(ref))
        else:
            ref_text = str(ref)
        references_html += f'<p class="reference">[{i}] {ref_text}</p>'
    
    # Create IEEE-styled HTML
    html_content = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {{
            size: letter;
            margin: 1in 0.75in;
        }}
        
        body {{
            font-family: 'Times New Roman', Times, serif;
            font-size: 10pt;
            line-height: 1.2;
            color: #000;
            margin: 0;
            padding: 0;
        }}
        
        .container {{
            column-count: 2;
            column-gap: 0.25in;
            text-align: justify;
        }}
        
        .header {{
            text-align: center;
            margin-bottom: 24pt;
            column-span: all;
        }}
        
        h1 {{
            font-size: 14pt;
            font-weight: bold;
            margin: 12pt 0;
        }}
        
        .authors {{
            font-size: 10pt;
            margin: 12pt 0;
        }}
        
        .abstract-section {{
            column-span: all;
            margin: 12pt 0;
        }}
        
        .abstract-title {{
            font-weight: bold;
            font-style: italic;
        }}
        
        .keywords {{
            font-style: italic;
            margin: 6pt 0;
        }}
        
        h2 {{
            font-size: 10pt;
            font-weight: bold;
            margin: 12pt 0 6pt 0;
            break-after: avoid;
        }}
        
        p {{
            margin: 0 0 6pt 0;
            text-indent: 0.125in;
        }}
        
        .references {{
            margin-top: 12pt;
        }}
        
        .reference {{
            font-size: 9pt;
            text-indent: -0.25in;
            padding-left: 0.25in;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{title}</h1>
            <div class="authors">{authors_html}</div>
        </div>
        
        <div class="abstract-section">
            <p><span class="abstract-title">Abstract—</span>{abstract}</p>
            <p class="keywords"><strong>Keywords:</strong> {keywords_str}</p>
        </div>
        
        {sections_html}
        
        <div class="references">
            <h2>References</h2>
            {references_html}
        </div>
    </div>
</body>
</html>
    '''
    
    return html_content

def html_to_pdf(html_content, output_path=None):
    """Convert HTML to PDF using WeasyPrint"""
    
    # Configure fonts
    font_config = FontConfiguration()
    
    # Create PDF
    html = HTML(string=html_content)
    
    if output_path:
        # Write to file
        html.write_pdf(output_path, font_config=font_config)
        with open(output_path, 'rb') as f:
            return f.read()
    else:
        # Return as bytes
        pdf_bytes = html.write_pdf(font_config=font_config)
        return pdf_bytes

def main():
    """Main function for command line execution"""
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        
        if not input_data.strip():
            print("Error: No input data received", file=sys.stderr)
            sys.exit(1)
        
        document_data = json.loads(input_data)
        
        # Generate IEEE HTML
        html_content = generate_ieee_html(document_data)
        
        # Convert to PDF
        output_path = document_data.get('output_path')
        pdf_bytes = html_to_pdf(html_content, output_path)
        
        if output_path:
            print(f"PDF generated successfully at: {output_path}")
        else:
            # Write PDF to stdout
            sys.stdout.buffer.write(pdf_bytes)
        
        sys.exit(0)
        
    except Exception as e:
        import traceback
        print(f"Error: {str(e)}", file=sys.stderr)
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
