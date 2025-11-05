import { VercelRequest, VercelResponse } from '@vercel/node';
import { spawn } from 'child_process';
import * as path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const documentData = req.body;

    if (!documentData.title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    if (!documentData.authors || !documentData.authors.some((author: any) => author.name)) {
      return res.status(400).json({ error: 'At least one author is required' });
    }

    // Path to Python script in the server directory
    const scriptPath = path.join(process.cwd(), 'server', 'ieee_generator_fixed.py');
    
    console.log('Generating DOCX with Python script:', scriptPath);

    // Spawn Python process
    const python = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Send document data to Python script
    python.stdin.write(JSON.stringify(documentData));
    python.stdin.end();

    let outputBuffer = Buffer.alloc(0);
    let errorOutput = '';

    python.stdout.on('data', (data: Buffer) => {
      outputBuffer = Buffer.concat([outputBuffer, data]);
    });

    python.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString();
      console.error('Python stderr:', data.toString());
    });

    python.on('close', (code: number) => {
      if (code !== 0) {
        console.error('Python script error:', errorOutput);
        return res.status(500).json({
          error: 'Failed to generate document',
          details: errorOutput,
          suggestion: 'Please try the Word download or contact support'
        });
      }

      if (outputBuffer.length === 0) {
        return res.status(500).json({
          error: 'No output from document generator',
          suggestion: 'Please try again or contact support'
        });
      }

      // Send the generated DOCX file
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
      res.send(outputBuffer);
    });

    python.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      res.status(500).json({
        error: 'Failed to start document generator',
        details: err.message,
        suggestion: 'Server configuration issue. Please contact support.'
      });
    });

  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Please try again or contact support'
    });
  }
}
