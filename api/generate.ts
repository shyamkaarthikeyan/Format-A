import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

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

// Python script (ieee_generator_fixed.py) handles all document generation with correct IEEE formatting

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

  // ✅ PYTHON DOCX GENERATOR (ieee_generator_fixed.py) - produces correct IEEE formatting
  const pythonPath = getPythonCommand();
  const scriptPath = path.join(process.cwd(), 'server', 'ieee_generator_fixed.py');
  
  try {
    await fs.promises.access(scriptPath);
    console.log('✓ Found Python script at:', scriptPath);
  } catch (err) {
    console.log('✗ Script not found at:', scriptPath);
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

  // ✅ PYTHON DOCX GENERATOR (ieee_generator_fixed.py) - produces correct IEEE formatting
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
      return res.status(500).json({
        error: 'IEEE generator script not available',
        message: 'ieee_generator_fixed.py is required for proper IEEE formatting',
        details: 'The script is not accessible in the expected location'
      });
    }
    
    console.log('Using Python DOCX generator:', { pythonPath, scriptPath });

    // Prepare document data for Python DOCX generator
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
    return res.status(500).json({
      error: 'Document generation failed',
      message: 'Could not generate DOCX',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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
    // Vercel uses python3 by default when runtime.txt specifies Python version
    console.log('Production environment - using python3');
    return 'python3';
  }
  
  // Local development (Windows)
  return 'C:/Users/shyam/AppData/Local/Programs/Python/Python39/python.exe';
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
