import { VercelRequest, VercelResponse } from '@vercel/node';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import type { Document } from '@shared/schema';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const document: Document = req.body;
    const { format = 'docx' } = req.query;

    if (!document.title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    if (!document.authors || document.authors.length === 0) {
      return res.status(400).json({ error: 'At least one author is required' });
    }

    // Generate IEEE-formatted DOCX document
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
            count: document.settings?.columns === 'double' ? 2 : 1,
          },
        },
        children: [
          // IEEE Title - Times New Roman, 24pt, Bold, Centered
          new Paragraph({
            children: [
              new TextRun({
                text: document.title,
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
            children: document.authors.map((author, index) => {
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
          ...document.authors.map(author => 
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
          ...(document.abstract ? [
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
                  text: '—' + document.abstract,
                  size: 18, // 9pt
                  font: 'Times New Roman',
                }),
              ],
              alignment: 'both', // Justified
              spacing: { before: 240, after: 120 }, // 12pt before, 6pt after
            }),
          ] : []),
          
          // Keywords - Times New Roman, 9pt, Italic
          ...(document.keywords ? [
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
                  text: '—' + document.keywords,
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
          ...document.sections.flatMap((section, sectionIndex) => [
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
            ...section.subsections.flatMap(subsection => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: subsection.title,
                    bold: true,
                    size: 18, // 9pt
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { before: 120, after: 60 }, // 6pt before, 3pt after
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: subsection.content,
                    size: 18, // 9pt
                    font: 'Times New Roman',
                  }),
                ],
                alignment: 'both', // Justified
                spacing: { after: 120 }, // 6pt spacing after
              }),
            ]),
          ]),
          
          // References - IEEE format
          ...(document.references && document.references.length > 0 ? [
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
            ...document.references.map(ref => 
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

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.docx"`);
    res.setHeader('Content-Length', buffer.length.toString());
    
    // Enable CORS for client-side access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    res.send(buffer);

  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}