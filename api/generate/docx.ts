import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage.js';
import { spawn } from 'child_process';
import path from 'path';

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
    // Get user from session
    let sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        sessionId = authHeader.replace('Bearer ', '');
      }
    }

    if (!sessionId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required',
        message: 'Please sign in to download documents'
      });
    }

    const user = await storage.getUserBySessionId(sessionId);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session',
        message: 'Please sign in again'
      });
    }

    const documentData = req.body;
    
    if (!documentData.title) {
      return res.status(400).json({ 
        error: 'Missing document title',
        message: 'Document title is required'
      });
    }

    console.log('Generating DOCX for user:', user.email);
    console.log('Document title:', documentData.title);

    // Generate actual DOCX using Python IEEE generator
    const docxBuffer = await generateIEEEDocx(documentData);
    
    // Record download in storage
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
  // Check if we're in a serverless environment (Vercel)
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  if (isServerless) {
    console.log('Serverless environment detected, using JavaScript fallback');
    return generateIEEEDocxJS(documentData);
  }
  
  // Local environment - use Python generator
  return new Promise((resolve, reject) => {
    // Path to the Python IEEE generator script
    const scriptPath = path.join(process.cwd(), 'server', 'ieee_generator_fixed.py');
    
    // Try python3 first, fallback to python
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    
    // Spawn Python process
    const pythonProcess = spawn(pythonCmd, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let outputBuffer = Buffer.alloc(0);
    let errorOutput = '';

    // Send JSON data to Python script
    pythonProcess.stdin.write(JSON.stringify(documentData));
    pythonProcess.stdin.end();

    // Collect binary output (DOCX file)
    pythonProcess.stdout.on('data', (data) => {
      outputBuffer = Buffer.concat([outputBuffer, data]);
    });

    // Collect error output
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(outputBuffer);
      } else {
        console.error('Python script error:', errorOutput);
        reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
      }
    });

    // Handle process errors
    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      // Fallback to JS version if Python fails
      console.log('Falling back to JavaScript generator');
      generateIEEEDocxJS(documentData).then(resolve).catch(reject);
    });
  });
}

async function generateIEEEDocxJS(documentData: any): Promise<Buffer> {
  // JavaScript-based IEEE DOCX generator for serverless environments
  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, SectionType } = await import('docx');
    
    // Create header section (single column for title, authors, abstract, keywords)
    const headerChildren = [
      // Title
      new Paragraph({
        children: [
          new TextRun({ 
            text: documentData.title || 'Untitled Paper',
            bold: true,
            size: 48, // 24pt
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),
      
      // Authors
      ...(await createAuthors(documentData.authors || [])),
      
      // Abstract
      ...(documentData.abstract ? [
        new Paragraph({
          children: [
            new TextRun({ text: 'Abstract—', bold: true, font: 'Times New Roman', size: 19 }),
            new TextRun({ text: documentData.abstract, bold: true, font: 'Times New Roman', size: 19 }),
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120 },
        })
      ] : []),
      
      // Keywords
      ...(documentData.keywords ? [
        new Paragraph({
          children: [
            new TextRun({ text: 'Keywords—', bold: true, font: 'Times New Roman', size: 19 }),
            new TextRun({ text: documentData.keywords, bold: true, font: 'Times New Roman', size: 19 }),
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 240 },
        })
      ] : []),
    ];

    // Create body section (2-column for main content)
    const bodyChildren = [
      // Sections
      ...(await createSections(documentData.sections || [])),
      
      // References
      ...(await createReferences(documentData.references || [])),
    ];

    const doc = new Document({
      sections: [
        // Header section (single column)
        {
          properties: {
            page: {
              margin: {
                top: 1080,    // 0.75 inch in twips
                right: 1080,
                bottom: 1080,
                left: 1080,
              },
            },
          },
          children: headerChildren,
        },
        // Body section (2-column)
        {
          properties: {
            type: SectionType.CONTINUOUS,
            page: {
              margin: {
                top: 1080,
                right: 1080,
                bottom: 1080,
                left: 1080,
              },
            },
            column: {
              space: 360,     // 0.25 inch spacing
              count: 2,       // 2 columns
              separate: true,
              equalWidth: true,
            },
          },
          children: bodyChildren,
        }
      ],
    });

    return Buffer.from(await Packer.toBuffer(doc));
  } catch (error) {
    console.error('JavaScript DOCX generation failed:', error);
    throw new Error(`DOCX generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function createAuthors(authors: any[]): Promise<any[]> {
  if (!authors.length) return [];
  
  const { Paragraph, TextRun, AlignmentType } = await import('docx');
  
  return authors.map(author => 
    new Paragraph({
      children: [
        new TextRun({ 
          text: author.name || '', 
          bold: true, 
          font: 'Times New Roman', 
          size: 19 // 9.5pt
        }),
        ...(author.department ? [new TextRun({ 
          text: `\n${author.department}`, 
          italics: true, 
          font: 'Times New Roman', 
          size: 19 
        })] : []),
        ...(author.organization ? [new TextRun({ 
          text: `\n${author.organization}`, 
          italics: true, 
          font: 'Times New Roman', 
          size: 19 
        })] : []),
        ...(author.city && author.state ? [new TextRun({ 
          text: `\n${author.city}, ${author.state}`, 
          italics: true, 
          font: 'Times New Roman', 
          size: 19 
        })] : []),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    })
  );
}

async function createSections(sections: any[]): Promise<any[]> {
  const { Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
  
  const result: any[] = [];
  
  sections.forEach((section, index) => {
    // Section title
    if (section.title) {
      result.push(new Paragraph({
        children: [
          new TextRun({
            text: `${index + 1}. ${section.title.toUpperCase()}`,
            font: 'Times New Roman',
            size: 19, // 9.5pt
            bold: false, // IEEE sections are not bold
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 60 },
      }));
    }
    
    // Section content blocks
    const contentBlocks = section.contentBlocks || [];
    contentBlocks.forEach((block: any) => {
      if (block.type === 'text' && block.content) {
        result.push(new Paragraph({
          children: [
            new TextRun({
              text: block.content.replace(/<[^>]*>/g, ''), // Strip HTML tags
              font: 'Times New Roman',
              size: 19, // 9.5pt
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120 },
          indent: { left: 288 }, // 0.2 inch indent
        }));
      }
    });
    
    // Legacy content support
    if (!contentBlocks.length && section.content) {
      result.push(new Paragraph({
        children: [
          new TextRun({
            text: section.content,
            font: 'Times New Roman',
            size: 19, // 9.5pt
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120 },
        indent: { left: 288 },
      }));
    }
  });
  
  return result;
}

async function createReferences(references: any[]): Promise<any[]> {
  if (!references.length) return [];
  
  const { Paragraph, TextRun, AlignmentType } = await import('docx');
  
  const result = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'REFERENCES',
          font: 'Times New Roman',
          size: 19, // 9.5pt
          bold: false, // IEEE references title is not bold
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
    })
  ];
  
  references.forEach((ref, index) => {
    result.push(new Paragraph({
      children: [
        new TextRun({
          text: `[${index + 1}] ${ref.text || ref.title || 'Reference'}`,
          font: 'Times New Roman',
          size: 19, // 9.5pt
        })
      ],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 60 },
      indent: { left: 288, hanging: 144 }, // Hanging indent for references
    }));
  });
  
  return result;
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