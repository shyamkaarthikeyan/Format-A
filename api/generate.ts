import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Packer } from 'docx';
import { generateIEEEDocument } from './_lib/ieee-docx-generator';

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
    res.setHeader('Content-Disposition', isPreview 
      ? `inline; filename="ieee_${Date.now()}.docx"`
      : `attachment; filename="${documentData.title || 'ieee-paper'}.docx"`
    );
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

  // Check if we're in Vercel environment (Python not available)
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
  
  // If in Vercel, skip Python and use JavaScript generator
  if (isVercel) {
    console.log('🚀 Detected Vercel environment - using JavaScript DOCX generator');
    return await generateDocxWithJavaScript(req, res, user, documentData, false);
  }

  try {
    // Use Python script for DOCX generation
    const pythonPath = getPythonCommand();
    
    // Try different script paths for different environments
    const possibleScriptPaths = [
      path.join(process.cwd(), 'server', 'ieee_generator_fixed.py'), // Development
      path.join(process.cwd(), 'api', '_lib', 'ieee_generator.py'), // Alternative
      path.join(process.cwd(), 'server', 'ieee_generator.py'), // Fallback
    ];
    
    let scriptPath = '';
    for (const testPath of possibleScriptPaths) {
      try {
        await fs.promises.access(testPath);
        scriptPath = testPath;
        console.log('✓ Found Python script at:', scriptPath);
        break;
      } catch (err) {
        console.log('✗ Script not found at:', testPath);
      }
    }
    
    if (!scriptPath) {
      console.error('❌ No Python script found in any location');
      return res.status(500).json({
        error: 'IEEE generator script not available',
        message: 'Python script required for proper IEEE formatting is not accessible',
        details: 'The IEEE document generator requires Python dependencies that may not be available in the current environment'
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

  // ✅ CHECK VERCEL ENVIRONMENT FIRST - BEFORE ANY PYTHON OPERATIONS
  // This prevents timeout issues when Python is not available
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
  
  if (isVercel) {
    console.log('🚀 Detected Vercel environment - using JavaScript DOCX generator (skip Python entirely)');
    return await generateDocxWithJavaScript(req, res, user, documentData, isPreview);
  }

  try {
    console.log('=== IEEE DOCX to PDF Generation ===');
    console.log('Preview mode:', isPreview);
    console.log('User:', user ? user.email : 'anonymous');
    console.log('Document title:', documentData.title);

    const pythonPath = getPythonCommand();
    
    console.log('🔍 Environment check:', {
      cwd: process.cwd(),
      dirname: __dirname,
      nodeEnv: process.env.NODE_ENV,
      pythonPath: pythonPath
    });
    
    // Try different script paths for Vercel vs local development
    const possiblePaths = [
      path.join(process.cwd(), 'api', '_lib', 'ieee_generator.py'), // Vercel
      path.join(__dirname, '_lib', 'ieee_generator.py'), // Vercel alternative
      path.join(process.cwd(), 'server', 'ieee_generator_fixed.py'), // Local development
    ];
    
    let ieeeScriptPath = '';
    for (const testPath of possiblePaths) {
      try {
        await fs.promises.access(testPath);
        ieeeScriptPath = testPath;
        console.log('✓ IEEE generator found at:', testPath);
        break;
      } catch (err: any) {
        console.log('✗ IEEE generator not at:', testPath, 'Error:', err.message);
      }
    }
    
    if (!ieeeScriptPath) {
      console.error('❌ IEEE generator not found in any location');
      console.error('Checked paths:', possiblePaths);
      console.error('Current directory contents:');
      try {
        const cwdFiles = await fs.promises.readdir(process.cwd());
        console.error('CWD files:', cwdFiles);
        const apiPath = path.join(process.cwd(), 'api');
        if (cwdFiles.includes('api')) {
          const apiFiles = await fs.promises.readdir(apiPath);
          console.error('API files:', apiFiles);
          if (apiFiles.includes('_lib')) {
            const libFiles = await fs.promises.readdir(path.join(apiPath, '_lib'));
            console.error('_lib files:', libFiles);
          }
        }
      } catch (dirErr: any) {
        console.error('Failed to list directories:', dirErr.message);
      }
      return res.status(500).json({
        error: 'IEEE generator not found',
        message: 'ieee_generator.py script is not available in any expected location',
        details: {
          checkedPaths: possiblePaths,
          cwd: process.cwd(),
          dirname: __dirname
        }
      });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `ieee_${timestamp}_${randomString}`;
    
    // Use /tmp in production (Vercel), local temp/ in development
    const tempDir = process.env.NODE_ENV === 'production' 
      ? '/tmp' 
      : path.join(process.cwd(), 'temp');
    
    const docxPath = path.join(tempDir, `${filename}.docx`);
    const pdfPath = path.join(tempDir, `${filename}.pdf`);

    // Ensure temp directory exists (only needed for local development)
    if (process.env.NODE_ENV !== 'production') {
      try {
        await fs.promises.mkdir(tempDir, { recursive: true });
        console.log('✓ Temp directory ready');
      } catch (err) {
        console.error('Failed to create temp directory:', err);
      }
    }
    
    console.log('Using temp directory:', tempDir);

    // Prepare document data for IEEE Python script
    const ieeeData = {
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
      }),
      output_path: docxPath  // Generate DOCX first
    };

    console.log('Generating IEEE DOCX with proper formatting:', {
      title: ieeeData.title,
      authorsCount: ieeeData.authors.length,
      sectionsCount: ieeeData.sections.length,
      outputPath: docxPath
    });

    // Use the already-validated ieeeScriptPath from above
    console.log('Using IEEE generator script at:', ieeeScriptPath);

    // Generate DOCX first using your proper IEEE formatter
    console.log('Spawning Python process:', { pythonPath, ieeeScriptPath });
    const docxResult = await new Promise<{stdout: Buffer, stderr: string}>((resolve, reject) => {
      const child = spawn(pythonPath, [ieeeScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: { ...process.env }
      });

      let stdout = Buffer.alloc(0);
      let stderr = '';

      // Send document data to Python script via stdin
      try {
        child.stdin.write(JSON.stringify(ieeeData));
        child.stdin.end();
        console.log('✓ Document data sent to Python script');
      } catch (writeErr: any) {
        console.error('✗ Failed to write to Python stdin:', writeErr.message);
        reject(writeErr);
        return;
      }

      child.stdout.on('data', (data) => {
        stdout = Buffer.concat([stdout, data]);
        console.log('Python stdout chunk:', data.length, 'bytes');
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('Python stderr:', data.toString());
      });

      child.on('close', (code) => {
        console.log(`IEEE DOCX generator exited with code: ${code}`);
        console.log(`Stdout size: ${stdout.length} bytes`);
        console.log(`Stderr: ${stderr || '(empty)'}`);
        if (code === 0) {
          resolve({stdout, stderr});
        } else {
          const errorMsg = `IEEE DOCX generation failed with code ${code}: ${stderr}`;
          console.error(errorMsg);
          reject(new Error(errorMsg));
        }
      });

      child.on('error', (error) => {
        console.error('IEEE DOCX generator spawn error:', error);
        console.error('Error details:', {
          code: (error as any).code,
          errno: (error as any).errno,
          syscall: (error as any).syscall,
          path: (error as any).path
        });
        reject(error);
      });
    });

    console.log('IEEE DOCX generation completed');
    if (docxResult.stderr) {
      console.log('Python stderr:', docxResult.stderr);
    }

    // Check if DOCX file was created
    try {
      await fs.promises.access(docxPath);
      const stats = await fs.promises.stat(docxPath);
      console.log('✓ IEEE DOCX file created successfully, size:', stats.size);
    } catch (err) {
      console.error('✗ IEEE DOCX file not found after generation:', err);
      return res.status(500).json({
        error: 'DOCX generation failed',
        message: 'IEEE DOCX file was not created successfully'
      });
    }

    // For Vercel compatibility, we return the DOCX file
    // PDF conversion requires system libraries not available in serverless environment
    console.log('Returning IEEE DOCX file (PDF conversion not available in Vercel)');
    
    // Read the generated DOCX file from disk
    const docxBuffer = await fs.promises.readFile(docxPath);
    console.log('✓ DOCX file read successfully, size:', docxBuffer.length);
    
    if (isPreview) {
      // Return the DOCX file for preview with proper IEEE formatting
      // Record download in database if user is authenticated
      if (user && user.id) {
        try {
          await recordDownload(user.id, filename, 'docx', docxBuffer.length, 'preview');
          console.log('✓ DOCX preview recorded in database');
        } catch (dbError) {
          console.error('Failed to record DOCX preview:', dbError);
        }
      }

      // Clean up temp file after a delay
      setTimeout(async () => {
        try {
          await fs.promises.unlink(docxPath);
          console.log('✓ Temp DOCX file cleaned up');
        } catch (cleanupError) {
          console.error('Failed to cleanup temp DOCX file:', cleanupError);
        }
      }, 30000);

      console.log('Returning properly formatted IEEE DOCX for preview, size:', docxBuffer.length);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `inline; filename="${filename}.docx"`);
      res.setHeader('Content-Length', docxBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache');
      
      return res.send(docxBuffer);
    }
    
    // For download, return DOCX since it's properly formatted
    if (user && user.id) {
      try {
        await recordDownload(user.id, filename, 'docx', docxBuffer.length, 'download');
        console.log('✓ DOCX download recorded in database');
      } catch (dbError) {
        console.error('Failed to record DOCX download:', dbError);
      }
    }

    setTimeout(async () => {
      try {
        await fs.promises.unlink(docxPath);
        console.log('✓ Temp DOCX file cleaned up');
      } catch (cleanupError) {
        console.error('Failed to cleanup temp DOCX file:', cleanupError);
      }
    }, 5000);

    console.log('Returning properly formatted IEEE DOCX for download, size:', docxBuffer.length);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${documentData.title || 'ieee-paper'}.docx"`);
    res.setHeader('Content-Length', docxBuffer.length.toString());
    
    return res.send(docxBuffer);

  } catch (error) {
    // If Python generation fails (e.g., Python not available in Vercel), fall back to JavaScript generation
    console.log('⚠️ Python DOCX generation failed, using JavaScript fallback');
    console.error('Python error:', error);
    
    try {
      // Generate using JavaScript docx library
      console.log('Generating DOCX with JavaScript docx library...');
      const doc = generateIEEEDocument({
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
      });

      const docxBuffer = await Packer.toBuffer(doc);
      console.log('✓ JavaScript DOCX generated successfully, size:', docxBuffer.length);

      // Record download/preview
      if (user && user.id) {
        try {
          await recordDownload(
            user.id, 
            `ieee_js_${Date.now()}`, 
            'docx', 
            docxBuffer.length, 
            isPreview ? 'preview' : 'download'
          );
          console.log('✓ Download recorded in database');
        } catch (dbError) {
          console.error('Failed to record download:', dbError);
        }
      }

      // Return the DOCX
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', isPreview 
        ? `inline; filename="ieee_${Date.now()}.docx"`
        : `attachment; filename="${documentData.title || 'ieee-paper'}.docx"`
      );
      res.setHeader('Content-Length', docxBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache');
      
      console.log('Returning JavaScript-generated IEEE DOCX, size:', docxBuffer.length);
      return res.send(docxBuffer);
      
    } catch (jsError) {
      console.error('JavaScript generation also failed:', jsError);
      return res.status(500).json({
        error: 'Document generation failed',
        message: 'Both Python and JavaScript generation failed',
        details: jsError instanceof Error ? jsError.message : 'Unknown error'
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
    const pythonPaths = [
      'python3',
      'python',
      '/usr/bin/python3',
      '/usr/bin/python',
      '/opt/render/project/.render/python/bin/python',
      process.env.PYTHON_PATH
    ].filter(Boolean);
    
    console.log('Production environment - trying Python paths:', pythonPaths);
    return pythonPaths[0] as string;
  }
  
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
