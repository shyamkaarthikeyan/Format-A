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
  // Always use Python generator - it works perfectly for IEEE format
  return new Promise((resolve, reject) => {
    // Path to the Python IEEE generator script
    const scriptPath = path.join(process.cwd(), 'server', 'ieee_generator_fixed.py');

    // Try python3 first, fallback to python
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    console.log(`Using Python generator: ${pythonCmd} ${scriptPath}`);

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
        console.log(`Python generator completed successfully, generated ${outputBuffer.length} bytes`);
        resolve(outputBuffer);
      } else {
        console.error('Python script error:', errorOutput);
        reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
      }
    });

    // Handle process errors
    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
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