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
    if (!process.env.DATABASE_URL) {
      console.error('[FATAL] DATABASE_URL is not set!');
      throw new Error('DATABASE_URL environment variable is not configured');
    }
    try {
      sql = neon(process.env.DATABASE_URL, {
        fullResults: true,
        arrayMode: false
      });
    } catch (err) {
      console.error('[FATAL] Failed to initialize database connection:', err);
      throw err;
    }
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
  // Enable CORS - CRITICAL: Must allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Preview, X-Download');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow GET for health check
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ok',
      message: 'API endpoint is running',
      environment: process.env.NODE_ENV,
      hasDatabase: !!process.env.DATABASE_URL,
      endpoint: '/api/generate'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  }

  const { type } = req.query;

  try {
    // ⚠️ Parse JSON body if it's a string (Vercel sometimes doesn't auto-parse)
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (parseErr) {
        console.error('[API/GENERATE] Failed to parse JSON body:', parseErr);
        return res.status(400).json({
          error: 'Invalid JSON in request body',
          message: 'Could not parse request body as JSON'
        });
      }
    }

    // ⚠️ DEBUGGING: Log full request details
    console.log('[API/GENERATE] =================================');
    console.log('[API/GENERATE] Incoming request');
    console.log('[API/GENERATE] Type:', type);
    console.log('[API/GENERATE] Method:', req.method);
    console.log('[API/GENERATE] Body type:', typeof body);
    console.log('[API/GENERATE] Body is null?:', body === null);
    console.log('[API/GENERATE] Body is undefined?:', body === undefined);
    
    // ⚠️ IMPORTANT: Check if body exists and is valid
    if (!body || typeof body !== 'object') {
      console.error('[API/GENERATE] ERROR: Invalid request body!');
      console.error('[API/GENERATE] Body:', body);
      return res.status(400).json({
        error: 'Invalid request body',
        message: 'Request body must be a JSON object',
        receivedType: typeof body
      });
    }

    // Attach parsed body back to req for handlers
    req.body = body;

    // Get user from JWT token (if provided)
    let user = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        
        // Get user from database - skip if DATABASE_URL not available
        if (process.env.DATABASE_URL) {
          try {
            const sql = getSql();
            const result = await sql`SELECT * FROM users WHERE id = ${decoded.userId}`;
            const users = result.rows || result;
            user = users.length > 0 ? users[0] : null;
          } catch (dbErr) {
            console.log('[API/GENERATE] Warning: Could not fetch user from DB:', dbErr);
          }
        }
      } catch (error) {
        console.log('[API/GENERATE] Invalid or expired token, proceeding as anonymous user');
      }
    }

    console.log(`[API/GENERATE] Generation request: type=${type}, user=${user ? user.email : 'anonymous'}`);

    switch (type) {
      case 'test':
        // Simple test endpoint to verify API is working
        return res.status(200).json({ 
          status: 'ok',
          message: 'API test endpoint successful',
          timestamp: new Date().toISOString()
        });
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
          message: 'Supported types: test, docx, pdf, email'
        });
    }
  } catch (error) {
    console.error('[API/GENERATE] FATAL ERROR:', error);
    console.error('[API/GENERATE] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[API/GENERATE] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[API/GENERATE] Stack:', error instanceof Error ? error.stack : 'No stack');
    
    // IMPORTANT: Always return explicit status codes, never 401
    return res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
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

  try {
    console.log('=== DOCX Generation via Python ===');
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
        child.stdin.write(JSON.stringify(documentData));
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
    
    // Return DOCX with appropriate headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${documentData.title || 'ieee-paper'}.docx"`);
    res.setHeader('Content-Length', docxBuffer.length.toString());
    res.setHeader('Cache-Control', 'no-cache');
    
    return res.send(docxBuffer);

  } catch (error) {
    console.error('DOCX generation failed:', error);
    return res.status(500).json({
      error: 'Document generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handlePdfGeneration(req: VercelRequest, res: VercelResponse, user: any) {
  // Delegates to handleDocxToPdfConversion which does the actual work
  return await handleDocxToPdfConversion(req, res, user);
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

    // Now convert DOCX to PDF using LibreOffice
    console.log('Converting DOCX to PDF...');
    const convertScriptPath = path.join(process.cwd(), 'server', 'convert-docx-pdf.py');
    
    try {
      await fs.promises.access(convertScriptPath);
      console.log('✓ Found PDF converter at:', convertScriptPath);
    } catch (err: any) {
      console.log('⚠ PDF converter not found, returning DOCX instead');
      // If converter not available, just return the DOCX
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${documentData.title || 'ieee-paper'}.docx"`);
      res.setHeader('Content-Length', docxBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(docxBuffer);
    }

    const pdfResult = await new Promise<Buffer>((resolve, reject) => {
      const converter = spawn(pythonPath, [convertScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: { ...process.env }
      });

      let pdfBuffer = Buffer.alloc(0);
      let conversionError = '';

      try {
        converter.stdin.write(docxBuffer);
        converter.stdin.end();
        console.log('✓ DOCX sent to PDF converter');
      } catch (writeErr: any) {
        console.error('✗ Failed to write DOCX to converter:', writeErr.message);
        reject(writeErr);
        return;
      }

      converter.stdout.on('data', (data) => {
        pdfBuffer = Buffer.concat([pdfBuffer, data]);
        console.log('Converter stdout chunk received:', data.length, 'bytes');
      });

      converter.stderr.on('data', (data) => {
        conversionError += data.toString();
        console.log('Converter stderr:', data.toString());
      });

      converter.on('close', (code) => {
        console.log(`PDF converter exited with code: ${code}`);
        if (code === 0) {
          if (pdfBuffer.length > 0) {
            console.log('✓ PDF binary data received, size:', pdfBuffer.length);
            resolve(pdfBuffer);
          } else {
            reject(new Error('PDF converter produced no output'));
          }
        } else {
          reject(new Error(`PDF conversion failed: ${conversionError}`));
        }
      });

      converter.on('error', (error) => {
        console.error('PDF converter spawn error:', error);
        reject(error);
      });
    });

    console.log('PDF conversion completed successfully, size:', pdfResult.length);

    // Record download in database
    if (user && user.id) {
      try {
        const filename = `ieee_python_${Date.now()}`;
        await recordDownload(user.id, filename, 'pdf', pdfResult.length, 'download');
        console.log('✓ PDF download recorded in database');
      } catch (dbError) {
        console.error('Failed to record PDF download:', dbError);
      }
    }

    // Return PDF with appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${documentData.title || 'ieee-paper'}.pdf"`);
    res.setHeader('Content-Length', pdfResult.length.toString());
    res.setHeader('Cache-Control', 'no-cache');
    
    return res.send(pdfResult);

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
