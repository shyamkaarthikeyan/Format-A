import { VercelRequest, VercelResponse } from '@vercel/node';
import { neonDb } from './_lib/neon-database';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    // Initialize database
    await neonDb.initialize();

    // Get user from JWT token (if provided)
    let user = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        user = await neonDb.getUserById(decoded.userId);
      } catch (error) {
        console.log('Invalid or expired token, proceeding as anonymous user');
      }
    }

    console.log(`Generation request: type=${type}, user=${user ? user.email : 'anonymous'}`);

    switch (type) {
      case 'docx':
        return await handleDocxGeneration(req, res, user);
      case 'pdf':
        return await handlePdfGeneration(req, res, user);
      case 'docx-to-pdf':
        return await handleDocxToPdfConversion(req, res, user);
      default:
        return res.status(400).json({ 
          error: 'Invalid generation type',
          message: 'Supported types: docx, pdf, docx-to-pdf'
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

  try {
    // Use Python script for DOCX generation
    const pythonPath = getPythonCommand();
    const scriptPath = path.join(__dirname, '..', 'server', 'ieee_generator_fixed.py');
    
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
                await neonDb.recordDownload({
                  user_id: user.id,
                  document_title: documentData.title,
                  file_format: 'docx',
                  file_size: Buffer.from(result.docx_base64, 'base64').length,
                  ip_address: req.headers['x-forwarded-for'] as string || '127.0.0.1',
                  user_agent: req.headers['user-agent'] || 'Unknown'
                });
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
  // This would handle DOCX to PDF conversion
  // For now, return not implemented
  return res.status(501).json({
    error: 'DOCX to PDF conversion not implemented',
    message: 'Feature not available in consolidated version'
  });
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
