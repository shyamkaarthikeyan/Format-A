import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from session (optional for downloads)
    let sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        sessionId = authHeader.replace('Bearer ', '');
      }
    }

    let user = null;
    if (sessionId) {
      user = await storage.getUserBySessionId(sessionId);
    }

    // Allow downloads without authentication for better UX
    // Authentication is optional - we'll track anonymous downloads
    console.log('Generating DOCX for:', user ? `user: ${user.email}` : 'anonymous user');

    const documentData = req.body;

    if (!documentData.title) {
      return res.status(400).json({
        error: 'Missing document title',
        message: 'Document title is required'
      });
    }

    console.log('Document title:', documentData.title);

    // Generate actual DOCX using Node.js IEEE generator
    const docxBuffer = await generateIEEEDocx(documentData);

    // Record download in storage (only if user is authenticated)
    if (user) {
      try {
        const downloadRecord = await storage.recordDownload({
          userId: user.id,
          documentId: `doc_${Date.now()}`,
          documentTitle: documentData.title,
          fileFormat: 'docx',
          fileSize: docxBuffer.length,
          downloadedAt: new Date().toISOString(),
          ipAddress: (req.headers['x-forwarded-for'] as string) || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          status: 'completed',
          emailSent: false,
          documentMetadata: {
            pageCount: Math.ceil(documentData.sections?.length || 1),
            wordCount: estimateWordCount(documentData),
            sectionCount: documentData.sections?.length || 1,
            figureCount: 0,
            referenceCount: documentData.references?.length || 0,
            generationTime: 2.5
          }
        });
        console.log('Download recorded:', downloadRecord.id);
      } catch (recordError) {
        console.warn('Failed to record download:', recordError);
        // Continue with download even if recording fails
      }
    } else {
      console.log('Anonymous download - not recording in database');
    }

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');

    return res.send(docxBuffer);

  } catch (error) {
    console.error('DOCX generation error:', error);
    return res.status(500).json({
      error: 'Document generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function generateIEEEDocx(documentData: any): Promise<Buffer> {
  // Use Node.js docx library for Vercel compatibility
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } = await import('docx');

  // Create a new document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: documentData.title || 'Untitled Document',
              bold: true,
              size: 28, // 14pt
              font: 'Times New Roman'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 }
        }),

        // Authors
        ...(documentData.authors && documentData.authors.length > 0 ? [
          new Paragraph({
            children: [
              new TextRun({
                text: documentData.authors
                  .filter((author: any) => author.name)
                  .map((author: any) => {
                    let authorText = author.name;
                    if (author.department) authorText += `, ${author.department}`;
                    if (author.organization) authorText += `, ${author.organization}`;
                    if (author.city) authorText += `, ${author.city}`;
                    if (author.email) authorText += ` (${author.email})`;
                    return authorText;
                  })
                  .join('; '),
                size: 20, // 10pt
                font: 'Times New Roman'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 }
          })
        ] : []),

        // Abstract
        ...(documentData.abstract ? [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Abstract—',
                bold: true,
                size: 19, // 9.5pt
                font: 'Times New Roman'
              }),
              new TextRun({
                text: documentData.abstract,
                size: 19, // 9.5pt
                font: 'Times New Roman'
              })
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 240 }
          })
        ] : []),

        // Keywords
        ...(documentData.keywords ? [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Keywords—',
                bold: true,
                size: 19, // 9.5pt
                font: 'Times New Roman'
              }),
              new TextRun({
                text: documentData.keywords,
                italics: true,
                size: 19, // 9.5pt
                font: 'Times New Roman'
              })
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 360 }
          })
        ] : []),

        // Sections
        ...(documentData.sections ? documentData.sections.flatMap((section: any, index: number) => [
          // Section heading
          ...(section.title ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${index + 1}. ${section.title}`,
                  size: 19, // 9.5pt
                  font: 'Times New Roman'
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 }
            })
          ] : []),
          
          // Section content
          ...(section.content ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: section.content,
                  size: 19, // 9.5pt
                  font: 'Times New Roman'
                })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 240 }
            })
          ] : []),

          // Content blocks
          ...(section.content_blocks ? section.content_blocks
            .filter((block: any) => block.type === 'text' && block.content)
            .map((block: any) => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: block.content,
                    size: 19, // 9.5pt
                    font: 'Times New Roman'
                  })
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 120 }
              })
            ) : [])
        ]) : []),

        // References
        ...(documentData.references && documentData.references.length > 0 ? [
          new Paragraph({
            children: [
              new TextRun({
                text: 'References',
                size: 19, // 9.5pt
                font: 'Times New Roman'
              })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 360, after: 240 }
          }),
          ...documentData.references.map((reference: any, index: number) => 
            new Paragraph({
              children: [
                new TextRun({
                  text: `[${index + 1}] ${reference.text || reference}`,
                  size: 18, // 9pt
                  font: 'Times New Roman'
                })
              ],
              alignment: AlignmentType.LEFT,
              spacing: { after: 60 }
            })
          )
        ] : [])
      ]
    }]
  });

  // Generate the document buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}



function estimateWordCount(documentData: any): number {
  let wordCount = 0;

  if (documentData.abstract) {
    wordCount += documentData.abstract.split(' ').length;
  }

  if (documentData.sections) {
    documentData.sections.forEach((section: any) => {
      if (section.content) {
        wordCount += section.content.split(' ').length;
      }
      // Count words in content blocks
      if (section.contentBlocks) {
        section.contentBlocks.forEach((block: any) => {
          if (block.type === 'text' && block.content) {
            wordCount += block.content.split(' ').length;
          }
        });
      }
    });
  }

  return wordCount;
}