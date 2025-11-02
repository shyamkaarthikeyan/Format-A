import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, convertInchesToTwip, Packer } from 'docx';

// ...existing code...

// Initialize SQL connection
let sql: any = null;
function getSql() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL!, {
      fullResults: true,
      arrayMode: false
    });
  }
  return sql;
}

// IEEE Document Generator - moved inline to avoid module resolution issues on Vercel
interface Author {
  name: string;
  affiliation?: string;
  email?: string;
}

interface Section {
  title: string;
  content: string;
}

interface Reference {
  text: string;
}

interface IEEEDocumentData {
  title: string;
  authors: Author[];
  abstract?: string;
  keywords?: string | string[];
  sections?: Section[];
  references?: Reference[];
}

function generateIEEEDocument(data: IEEEDocumentData): Document {
  const children: Paragraph[] = [];

  // IEEE Title - centered, bold, 24pt
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120, line: 360 },
      children: [
        new TextRun({
          text: data.title,
          bold: true,
          size: 48, // 24pt = 48 half-points
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // Authors - centered, 10pt
  const authorNames = data.authors.map(a => a.name).join(', ');
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80, line: 240 },
      children: [
        new TextRun({
          text: authorNames,
          size: 20, // 10pt
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // Affiliations - centered, italic, 9pt
  const affiliations = data.authors
    .map(a => a.affiliation)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');
  
  if (affiliations) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120, line: 240 },
        children: [
          new TextRun({
            text: affiliations,
            italics: true,
            size: 18, // 9pt
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  // Abstract - 10pt italic
  if (data.abstract) {
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 40, line: 240 },
        children: [
          new TextRun({
            text: 'Abstract—',
            bold: true,
            italics: true,
            size: 20, // 10pt
            font: 'Times New Roman',
          }),
          new TextRun({
            text: data.abstract,
            italics: true,
            size: 20,
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  // Keywords - italic
  if (data.keywords) {
    const keywordsText = Array.isArray(data.keywords)
      ? data.keywords.join(', ')
      : data.keywords;
    
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 120, line: 240 },
        children: [
          new TextRun({
            text: 'Keywords—',
            bold: true,
            italics: true,
            size: 20, // 10pt
            font: 'Times New Roman',
          }),
          new TextRun({
            text: keywordsText,
            italics: true,
            size: 20,
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  // Sections - IEEE format with proper spacing (9.5pt body font)
  if (data.sections && data.sections.length > 0) {
    data.sections.forEach((section, index) => {
      // Section heading - I. Title Format (not bold in IEEE)
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 80, line: 240 },
          children: [
            new TextRun({
              text: `${index + 1}. ${section.title}`,
              bold: false, // IEEE style: section titles not bold
              size: 19, // 9.5pt
              font: 'Times New Roman',
            }),
          ],
        })
      );

      // Section content - justified, 9.5pt
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120, line: 240 },
          children: [
            new TextRun({
              text: section.content,
              size: 19, // 9.5pt
              font: 'Times New Roman',
            }),
          ],
        })
      );
    });
  }

  // References section
  if (data.references && data.references.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 80, line: 240 },
        children: [
          new TextRun({
            text: 'References',
            bold: false,
            size: 19, // 9.5pt
            font: 'Times New Roman',
          }),
        ],
      })
    );

    data.references.forEach((ref, index) => {
      const refText = typeof ref === 'string' ? ref : ref.text;
      children.push(
        new Paragraph({
          spacing: { after: 80, line: 240 },
          children: [
            new TextRun({
              text: `[${index + 1}] ${refText}`,
              size: 18, // 9pt for references
              font: 'Times New Roman',
            }),
          ],
        })
      );
    });
  }

  // Create document with IEEE-style formatting
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
            },
          },
        },
        children,
      },
    ],
  });

  return doc;
}

// Helper function for JavaScript-based DOCX generation (Vercel-compatible)
async function generateDocxWithJavaScript(
  req: VercelRequest, 
  res: VercelResponse, 
  user: any, 
  documentData: any, 
  isPreview: boolean
) {
  try {
    console.log('✨ Generating DOCX with JavaScript docx library (Vercel-compatible)...');
    console.log('Document data:', {
      hasTitle: !!documentData.title,
      authorsCount: documentData.authors?.length || 0,
      hasAbstract: !!documentData.abstract,
      keywordsCount: documentData.keywords?.length || 0,
      sectionsCount: documentData.sections?.length || 0,
      referencesCount: documentData.references?.length || 0,
    });
    
    // Ensure required fields exist
    if (!documentData.title) {
      throw new Error('Document title is required');
    }
    if (!documentData.authors || !Array.isArray(documentData.authors)) {
      throw new Error('Authors array is required');
    }
    if (documentData.authors.length === 0 || !documentData.authors.some((a: any) => a?.name)) {
      throw new Error('At least one author with a name is required');
    }
    
    const doc = generateIEEEDocument({
      title: documentData.title || 'Untitled',
      authors: (documentData.authors || []).map((author: any) => ({
        name: author?.name || 'Unknown Author',
        affiliation: author?.affiliation || author?.institution || '',
        email: author?.email || ''
      })),
      abstract: documentData.abstract || '',
      keywords: Array.isArray(documentData.keywords) ? documentData.keywords : [],
      sections: Array.isArray(documentData.sections) ? documentData.sections : [],
      references: (documentData.references || []).map((ref: any) => {
        if (typeof ref === 'string') {
          return { text: ref };
        } else if (ref && ref.text) {
          return { text: ref.text };
        } else {
          return { text: String(ref) };
        }
      })
    });

    console.log('✅ IEEE document generated successfully from data');
    const docxBuffer = await Packer.toBuffer(doc);
    console.log('✅ JavaScript DOCX generated successfully, size:', docxBuffer.length);

    // Record download/preview
    if (user && user.id) {
      try {
        const filename = `ieee_js_${Date.now()}`;
        await recordDownload(
          user.id, 
          filename, 
          'docx', 
          docxBuffer.length, 
          isPreview ? 'preview' : 'download'
        );
        console.log('✅ Download recorded in database');
      } catch (dbError) {
        console.error('Failed to record download:', dbError);
      }
    }

    // Return the DOCX
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    // For preview mode, only set Content-Disposition if needed
    // Most browsers will download DOCX files, so we need to handle this client-side
    if (!isPreview) {
      res.setHeader('Content-Disposition', `attachment; filename="${documentData.title || 'ieee-paper'}.docx"`);
    }
    
    res.setHeader('Content-Length', docxBuffer.length.toString());
    res.setHeader('Cache-Control', 'no-cache');
    
    console.log('📤 Returning JavaScript-generated IEEE DOCX, size:', docxBuffer.length);
    return res.send(docxBuffer);
    
  } catch (jsError) {
    console.error('❌ JavaScript generation failed:', jsError);
    if (jsError instanceof Error) {
      console.error('Stack trace:', jsError.stack);
    }
    return res.status(500).json({
      error: 'Document generation failed',
      message: 'JavaScript DOCX generation failed',
      details: jsError instanceof Error ? jsError.message : String(jsError),
      stack: process.env.NODE_ENV === 'development' && jsError instanceof Error ? jsError.stack : undefined
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Preview, X-Download');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.query;

  try {
    // Get user from JWT token (if provided)
    let user = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        
        // Get user from database
        const sql = getSql();
        const result = await sql`SELECT * FROM users WHERE id = ${decoded.userId}`;
        const users = result.rows || result;
        user = users.length > 0 ? users[0] : null;
      } catch (error) {
        console.log('Invalid or expired token, proceeding as anonymous user');
      }
    }

    console.log(`Generation request: type=${type}, user=${user ? user.email : 'anonymous'}`);

    switch (type) {
      case 'docx':
        return await handleDocxGeneration(req, res, user);
      case 'pdf':
        return await handleDocxToPdfConversion(req, res, user);
      case 'docx-to-pdf':
        return await handleDocxToPdfConversion(req, res, user);
      case 'email':
        return await handleEmailGeneration(req, res, user);
      default:
        return res.status(400).json({ 
          error: 'Invalid generation type',
          message: 'Supported types: docx, pdf, email'
        });
    }
  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleDocxGeneration(req: VercelRequest, res: VercelResponse, user: any) {
  const documentData = req.body;

  // Validate document data
  if (!documentData.title) {
    return res.status(400).json({
      error: 'Missing document title',
      message: 'Document title is required'
    });
  }

  if (!documentData.authors || !documentData.authors.some((author: any) => author.name)) {
    return res.status(400).json({
      error: 'Missing authors',
      message: 'At least one author is required'
    });
  }

  // ✅ ALWAYS USE PYTHON DOCX GENERATOR (ieee_generator_fixed.py)
  // Falls back to JavaScript only if Python script not found
  try {
    // Use Python script for DOCX generation
    const pythonPath = getPythonCommand();
    
    // Use ieee_generator_fixed.py - the correct script
    const scriptPath = path.join(process.cwd(), 'server', 'ieee_generator_fixed.py');
    
    try {
      await fs.promises.access(scriptPath);
      console.log('✓ Found Python script at:', scriptPath);
    } catch (err) {
      console.log('✗ Script not found at:', scriptPath);
      console.error('❌ ieee_generator_fixed.py not found');
      return res.status(500).json({
        error: 'IEEE generator script not available',
        message: 'ieee_generator_fixed.py is required for proper IEEE formatting',
        details: 'The script is not accessible in the expected location'
      });
    }
    
    console.log('Generating DOCX with Python script...');
    console.log('Python path:', pythonPath);
    console.log('Script path:', scriptPath);

    const child = spawn(pythonPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    // Send document data to Python script
    child.stdin.write(JSON.stringify(documentData));
    child.stdin.end();

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    return new Promise((resolve) => {
      child.on('close', async (code) => {
        if (code !== 0) {
          console.error('Python script error:', errorOutput);
          resolve(res.status(500).json({
            error: 'Document generation failed',
            details: errorOutput
          }));
          return;
        }

        try {
          const result = JSON.parse(output);
          
          if (result.success && result.docx_base64) {
            // Track download if user is authenticated
            if (user) {
              try {
                const sql = getSql();
                await sql`
                  INSERT INTO downloads (id, user_id, file_type, file_name, downloaded_at)
                  VALUES (gen_random_uuid()::text, ${user.id}, 'docx', ${documentData.title || 'document'}, NOW())
                `;
              } catch (trackingError) {
                console.error('Failed to track download:', trackingError);
              }
            }

            resolve(res.status(200).json({
              success: true,
              file: result.docx_base64,
              filename: result.filename || `${documentData.title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`,
              message: 'DOCX generated successfully'
            }));
          } else {
            resolve(res.status(500).json({
              error: 'Document generation failed',
              message: result.error || 'Unknown error occurred'
            }));
          }
        } catch (parseError) {
          console.error('Failed to parse Python output:', parseError);
          console.error('Raw output:', output);
          resolve(res.status(500).json({
            error: 'Failed to parse generation result',
            details: parseError.message
          }));
        }
      });
    });
  } catch (error) {
    console.error('DOCX generation error:', error);
    return res.status(500).json({
      error: 'DOCX generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handlePdfGeneration(req: VercelRequest, res: VercelResponse, user: any) {
  // For now, redirect to DOCX generation and let client handle PDF conversion
  // This could be enhanced to use a proper PDF generation library
  return res.status(501).json({
    error: 'Direct PDF generation not implemented',
    message: 'Please generate DOCX first and convert to PDF'
  });
}

async function handleDocxToPdfConversion(req: VercelRequest, res: VercelResponse, user: any) {
  const documentData = req.body;
  const isPreview = req.query.preview === 'true';

  // Validate document data
  if (!documentData.title) {
    return res.status(400).json({
      error: 'Missing document title',
      message: 'Document title is required'
    });
  }

  if (!documentData.authors || !documentData.authors.some((author: any) => author.name)) {
    return res.status(400).json({
      error: 'Missing authors',
      message: 'At least one author is required'
    });
  }

  // ✅ ALWAYS USE PYTHON DOCX GENERATOR (ieee_generator_fixed.py)
  // This works on both local dev and Vercel
  // PDF.js will be used on client to display the DOCX as PDF

  // For local development, use Python DOCX generator
  try {
    console.log('=== IEEE DOCX Generation (for PDF.js preview) ===');
    console.log('User:', user ? user.email : 'anonymous');
    console.log('Document title:', documentData.title);

    const pythonPath = getPythonCommand();
    const scriptPath = path.join(process.cwd(), 'server', 'ieee_generator_fixed.py');
    
    try {
      await fs.promises.access(scriptPath);
      console.log('✓ IEEE generator found at:', scriptPath);
    } catch (err: any) {
      console.log('✗ IEEE generator not at:', scriptPath);
      console.error('❌ ieee_generator_fixed.py not found, falling back to JavaScript');
      return await generateDocxWithJavaScript(req, res, user, documentData, false);
    }
    
    console.log('Using Python DOCX generator:', { pythonPath, scriptPath });

    // Prepare document data for Python DOCX generator
    // DO NOT use output_path - let Python output to stdout and we'll capture as base64
    const docxData = {
      title: documentData.title,
      authors: documentData.authors.map((author: any) => ({
        name: author.name,
        affiliation: author.affiliation || author.institution || '',
        email: author.email || ''
      })),
      abstract: documentData.abstract || '',
      keywords: documentData.keywords || [],
      sections: documentData.sections || [],
      references: (documentData.references || []).map((ref: any) => {
        if (typeof ref === 'string') {
          return { text: ref };
        } else if (ref && ref.text) {
          return { text: ref.text };
        } else {
          return { text: String(ref) };
        }
      })
      // NOTE: No output_path specified - Python will write binary to stdout
    };

    console.log('Generating IEEE DOCX:', {
      title: docxData.title,
      authorsCount: docxData.authors.length,
      sectionsCount: docxData.sections.length
    });

    // Generate DOCX using Python script
    console.log('Spawning Python DOCX generator:', { pythonPath, scriptPath });
    const docxResult = await new Promise<Buffer>((resolve, reject) => {
      const child = spawn(pythonPath, [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: { ...process.env }
      });

      let stdoutBuffer = Buffer.alloc(0);
      let stderrOutput = '';

      try {
        child.stdin.write(JSON.stringify(docxData));
        child.stdin.end();
        console.log('✓ DOCX generation data sent to Python script');
      } catch (writeErr: any) {
        console.error('✗ Failed to write to Python stdin:', writeErr.message);
        reject(writeErr);
        return;
      }

      child.stdout.on('data', (data) => {
        // Capture binary DOCX data from stdout
        stdoutBuffer = Buffer.concat([stdoutBuffer, data]);
        console.log('Python stdout chunk received:', data.length, 'bytes');
      });

      child.stderr.on('data', (data) => {
        stderrOutput += data.toString();
        console.log('Python stderr:', data.toString());
      });

      child.on('close', (code) => {
        console.log(`DOCX generator exited with code: ${code}`);
        if (code === 0) {
          if (stdoutBuffer.length > 0) {
            console.log('✓ DOCX binary data received from Python, size:', stdoutBuffer.length);
            resolve(stdoutBuffer);
          } else {
            reject(new Error('Python script produced no output'));
          }
        } else {
          const errorMsg = `DOCX generation failed with code ${code}: ${stderrOutput}`;
          console.error(errorMsg);
          reject(new Error(errorMsg));
        }
      });

      child.on('error', (error) => {
        console.error('DOCX generator spawn error:', error);
        reject(error);
      });
    });

    console.log('DOCX generation completed successfully');
    const docxBuffer = docxResult;

    // Record download in database
    if (user && user.id) {
      try {
        const filename = `ieee_python_${Date.now()}`;
        await recordDownload(user.id, filename, 'docx', docxBuffer.length, 'download');
        console.log('✓ DOCX download recorded in database');
      } catch (dbError) {
        console.error('Failed to record DOCX download:', dbError);
      }
    }

    console.log('Returning DOCX file generated by Python script, size:', docxBuffer.length);
    
    // Return DOCX with appropriate headers for PDF.js
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${documentData.title || 'ieee-paper'}.docx"`);
    res.setHeader('Content-Length', docxBuffer.length.toString());
    res.setHeader('Cache-Control', 'no-cache');
    
    return res.send(docxBuffer);

  } catch (error) {
    console.error('DOCX generation failed:', error);
    console.log('Falling back to JavaScript DOCX generator');
    
    try {
      return await generateDocxWithJavaScript(req, res, user, documentData, false);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return res.status(500).json({
        error: 'Document generation failed',
        message: 'Could not generate DOCX',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

async function handleEmailGeneration(req: VercelRequest, res: VercelResponse, user: any) {
  const { email, subject, body } = req.body;

  if (!email || !subject || !body) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Email, subject, and body are required'
    });
  }

  try {
    // For now, just return success without actually sending email
    // In a real implementation, you would use a service like SendGrid, Nodemailer, etc.
    console.log('Email generation request:', { email, subject, user: user?.email });

    return res.status(200).json({
      success: true,
      message: 'Email would be sent (not implemented in consolidated version)',
      data: {
        recipient: email,
        subject,
        sender: user?.email || 'anonymous'
      }
    });

  } catch (error) {
    console.error('Email generation error:', error);
    return res.status(500).json({
      error: 'Email generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function getPythonCommand(): string {
  if (process.env.NODE_ENV === 'production') {
    // Vercel and other production environments
    const pythonPaths = [
      'python3.9',        // Try specific version first
      'python3',          // Fall back to python3
      'python',           // Generic python
      '/usr/bin/python3', // Unix absolute path
      '/usr/bin/python',  // Unix absolute path
      '/opt/render/project/.render/python/bin/python', // Render.com
      process.env.PYTHON_PATH || 'python3' // Environment variable or default
    ].filter(Boolean);
    
    console.log('Production environment - Python paths to try:', pythonPaths);
    return pythonPaths[0];
  }
  
  // Local development (Windows)
  return 'C:/Users/shyam/AppData/Local/Programs/Python/Python39/python.exe';
}

// JavaScript fallback for DOCX generation when Python is not available
async function generateDocxFallback(req: VercelRequest, res: VercelResponse, user: any, documentData: any) {
  try {
    console.log('Using JavaScript fallback for DOCX generation');
    
    // Create a basic IEEE-style document structure in text format
    const authors = documentData.authors.map((author: any) => author.name).join(', ');
    const affiliations = documentData.authors.map((author: any) => author.affiliation).filter(Boolean).join(', ');
    
    const ieeeDocument = `
IEEE CONFERENCE PAPER

Title: ${documentData.title}

Authors: ${authors}
${affiliations ? `Affiliations: ${affiliations}` : ''}

Abstract
${documentData.abstract || 'Abstract not provided'}

Keywords: ${documentData.keywords || 'Not specified'}

${documentData.sections ? documentData.sections.map((section: any, index: number) => `
${index + 1}. ${section.title || `Section ${index + 1}`}
${section.content || 'Content not provided'}
`).join('') : ''}

References
${documentData.references ? documentData.references.map((ref: any, index: number) => `
[${index + 1}] ${ref.text || ref}
`).join('') : '[1] References not provided'}

---
Generated by Format-A IEEE Paper Generator
User: ${user ? user.email : 'Anonymous'}
Generated: ${new Date().toISOString()}
`;

    // Record download in database if user is provided
    if (user) {
      try {
        const sql = getSql();
        await sql`
          INSERT INTO downloads (id, user_id, file_type, file_name, downloaded_at)
          VALUES (gen_random_uuid()::text, ${user.id}, 'docx', ${`${documentData.title}.docx`}, NOW())
        `;
        console.log('✓ Download recorded in database');
      } catch (dbError) {
        console.warn('⚠️ Failed to record download:', dbError);
      }
    }

    // Return the document as HTML that can be opened by Word
    const htmlDocument = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${documentData.title}</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 1in; line-height: 1.6; }
        .title { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 12pt; }
        .authors { text-align: center; font-size: 12pt; margin-bottom: 6pt; }
        .affiliations { text-align: center; font-size: 10pt; font-style: italic; margin-bottom: 18pt; }
        .section-title { font-size: 12pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
        .abstract { font-size: 11pt; margin-bottom: 12pt; }
        .keywords { font-size: 11pt; margin-bottom: 12pt; font-style: italic; }
        .content { font-size: 11pt; text-align: justify; }
        .references { font-size: 10pt; }
    </style>
</head>
<body>
    <div class="title">${documentData.title}</div>
    <div class="authors">${authors}</div>
    ${affiliations ? `<div class="affiliations">${affiliations}</div>` : ''}
    
    <div class="section-title">Abstract</div>
    <div class="abstract">${documentData.abstract || 'Abstract not provided'}</div>
    
    <div class="keywords"><strong>Keywords:</strong> ${documentData.keywords || 'Not specified'}</div>
    
    ${documentData.sections ? documentData.sections.map((section: any, index: number) => `
    <div class="section-title">${index + 1}. ${section.title || `Section ${index + 1}`}</div>
    <div class="content">${section.content || 'Content not provided'}</div>
    `).join('') : ''}
    
    <div class="section-title">References</div>
    <div class="references">
    ${documentData.references ? documentData.references.map((ref: any, index: number) => `
    [${index + 1}] ${ref.text || ref}<br>
    `).join('') : '[1] References not provided'}
    </div>
    
    <hr>
    <small>Generated by Format-A IEEE Paper Generator<br>
    User: ${user ? user.email : 'Anonymous'}<br>
    Generated: ${new Date().toISOString()}</small>
</body>
</html>`;

    // Return as HTML file that Word can open and convert to DOCX
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${documentData.title || 'ieee-paper'}.html"`);
    
    return res.status(200).send(htmlDocument);

  } catch (error) {
    console.error('JavaScript fallback error:', error);
    return res.status(500).json({
      error: 'Document generation failed',
      message: 'Both Python script and JavaScript fallback failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Function to record downloads in the database
async function recordDownload(userId: string, filename: string, fileType: 'docx' | 'pdf', fileSize: number, action: 'download' | 'preview') {
  try {
    const sql = getSql();
    
    console.log(`Recording ${action} for user ${userId}: ${filename} (${fileType}, ${fileSize} bytes)`);
    
    // Insert into downloads table - matching schema from auth.ts
    const result = await sql`
      INSERT INTO downloads (id, user_id, file_type, file_name, file_size, downloaded_at)
      VALUES (gen_random_uuid()::text, ${userId}, ${fileType}, ${filename}, ${fileSize}, NOW())
      RETURNING id, downloaded_at
    `;
    
    const rows = result.rows || result;
    if (rows && rows.length > 0) {
      console.log(`✓ ${action} recorded with ID: ${rows[0].id} at ${rows[0].downloaded_at}`);
      return rows[0];
    } else {
      console.error(`Failed to record ${action}: No result returned`);
      return null;
    }
    
  } catch (error) {
    console.error(`Error recording ${action}:`, error);
    // Don't throw - just log the error so document generation can continue
    return null;
  }
}
