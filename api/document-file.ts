import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Document ID required' });
    }

    // For demo purposes, we'll serve a sample document
    // In production, you would:
    // 1. Verify user authentication
    // 2. Get document from database
    // 3. Check user permissions
    // 4. Serve from storage (Vercel Blob, S3, etc.)
    
    // Create a sample document for demonstration
    const sampleDocument = {
      id: id,
      title: 'Sample IEEE Paper',
      abstract: 'This is a sample abstract for demonstration purposes. It shows how the client-side preview system works without server-side conversion limitations.',
      keywords: 'client-side, preview, IEEE, document, Vercel',
      authors: [
        {
          id: '1',
          name: 'John Doe',
          department: 'Computer Science',
          organization: 'University of Technology',
          city: 'Tech City',
          state: 'CA',
          email: 'john.doe@university.edu',
          customFields: []
        }
      ],
      sections: [
        {
          id: '1',
          title: 'Introduction',
          order: 1,
          contentBlocks: [
            {
              id: '1',
              type: 'text' as const,
              content: 'This document demonstrates the client-side preview functionality that eliminates Vercel serverless timeout issues.',
              order: 1
            }
          ],
          subsections: []
        },
        {
          id: '2',
          title: 'Methodology',
          order: 2,
          contentBlocks: [
            {
              id: '2',
              type: 'text' as const,
              content: 'The client-side approach uses PDF.js and Mammoth.js to render documents directly in the browser.',
              order: 1
            }
          ],
          subsections: []
        }
      ],
      references: [
        {
          id: '1',
          text: 'Mozilla PDF.js Documentation. Available: https://mozilla.github.io/pdf.js/',
          order: 1
        }
      ],
      figures: [],
      settings: {
        fontSize: '9.5pt',
        columns: 'double',
        exportFormat: 'docx' as const,
        includePageNumbers: true,
        includeCopyright: true
      }
    };

    // Import and use the document generator directly to avoid internal fetch issues
    const { Document: DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
    
    // Generate IEEE-formatted DOCX document using docx library directly
    const docxDoc = new DocxDocument({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch
              right: 720,  // 0.5 inch
              bottom: 720, // 0.5 inch
              left: 720,   // 0.5 inch
            },
          },
          column: {
            space: 720, // 0.5 inch between columns
            count: sampleDocument.settings?.columns === 'double' ? 2 : 1,
          },
        },
        children: [
          // IEEE Title - Times New Roman, 24pt, Bold, Centered
          new Paragraph({
            children: [
              new TextRun({
                text: sampleDocument.title,
                bold: true,
                size: 48, // 24pt (size is in half-points)
                font: 'Times New Roman',
              }),
            ],
            alignment: 'center',
            spacing: { after: 240 }, // 12pt spacing after
          }),
          
          // Authors - Times New Roman, 12pt, Centered
          new Paragraph({
            children: sampleDocument.authors.map((author, index) => {
              const authorText = index === 0 ? author.name : `, ${author.name}`;
              return new TextRun({
                text: authorText,
                size: 24, // 12pt
                font: 'Times New Roman',
              });
            }),
            alignment: 'center',
            spacing: { after: 120 }, // 6pt spacing after
          }),
          
          // Author affiliations
          ...sampleDocument.authors.map(author => 
            new Paragraph({
              children: [
                new TextRun({
                  text: `${author.department || ''}, ${author.organization || ''}, ${author.city || ''}, ${author.state || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ','),
                  size: 20, // 10pt
                  font: 'Times New Roman',
                  italics: true,
                }),
              ],
              alignment: 'center',
              spacing: { after: 60 }, // 3pt spacing after
            })
          ),
          
          // Abstract - Times New Roman, 9pt, Justified, Italic heading
          ...(sampleDocument.abstract ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Abstract',
                  bold: true,
                  italics: true,
                  size: 18, // 9pt
                  font: 'Times New Roman',
                }),
                new TextRun({
                  text: '—' + sampleDocument.abstract,
                  size: 18, // 9pt
                  font: 'Times New Roman',
                }),
              ],
              alignment: 'both', // Justified
              spacing: { before: 240, after: 120 }, // 12pt before, 6pt after
            }),
          ] : []),
          
          // Keywords - Times New Roman, 9pt, Italic
          ...(sampleDocument.keywords ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Index Terms',
                  bold: true,
                  italics: true,
                  size: 18, // 9pt
                  font: 'Times New Roman',
                }),
                new TextRun({
                  text: '—' + sampleDocument.keywords,
                  size: 18, // 9pt
                  font: 'Times New Roman',
                  italics: true,
                }),
              ],
              alignment: 'both', // Justified
              spacing: { after: 240 }, // 12pt spacing after
            }),
          ] : []),
          
          // Sections - IEEE format with Roman numerals
          ...sampleDocument.sections.flatMap((section, sectionIndex) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${toRomanNumeral(sectionIndex + 1)}. ${section.title.toUpperCase()}`,
                  bold: true,
                  size: 20, // 10pt
                  font: 'Times New Roman',
                }),
              ],
              spacing: { before: 240, after: 120 }, // 12pt before, 6pt after
            }),
            ...section.contentBlocks
              .filter(block => block.type === 'text' && block.content)
              .map(block => new Paragraph({
                children: [
                  new TextRun({
                    text: block.content || '',
                    size: 18, // 9pt
                    font: 'Times New Roman',
                  }),
                ],
                alignment: 'both', // Justified
                spacing: { after: 120 }, // 6pt spacing after
              })),
          ]),
          
          // References - IEEE format
          ...(sampleDocument.references && sampleDocument.references.length > 0 ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'REFERENCES',
                  bold: true,
                  size: 20, // 10pt
                  font: 'Times New Roman',
                }),
              ],
              spacing: { before: 240, after: 120 }, // 12pt before, 6pt after
            }),
            ...sampleDocument.references.map(ref => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: `[${ref.order}] ${ref.text}`,
                    size: 16, // 8pt
                    font: 'Times New Roman',
                  }),
                ],
                alignment: 'both', // Justified
                spacing: { after: 60 }, // 3pt spacing after
                indent: {
                  left: 360, // 0.25 inch hanging indent
                  hanging: 360,
                },
              })
            ),
          ] : []),
        ],
      }],
    });

    // Helper function to convert numbers to Roman numerals
    function toRomanNumeral(num: number): string {
      const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
      const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
      let result = '';
      
      for (let i = 0; i < values.length; i++) {
        while (num >= values[i]) {
          result += numerals[i];
          num -= values[i];
        }
      }
      
      return result;
    }

    // Generate the document buffer
    const buffer = await Packer.toBuffer(docxDoc);
    
    // Set content headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `inline; filename="sample-document.docx"`);
    res.setHeader('Content-Length', buffer.length.toString());
    
    res.send(buffer);
    
  } catch (error) {
    console.error('Document file serving error:', error);
    res.status(500).json({ error: 'Failed to serve document' });
  }
}