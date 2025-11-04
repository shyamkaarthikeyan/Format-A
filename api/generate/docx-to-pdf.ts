import { VercelRequest, VercelResponse } from '@vercel/node';
import { spawn } from 'child_process';
import * as path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const documentData = req.body;
    const isPreview = req.query.preview === 'true' || req.headers['x-preview'] === 'true';

    if (!documentData.title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    if (!documentData.authors || !documentData.authors.some((author: any) => author.name)) {
      return res.status(400).json({ error: 'At least one author is required' });
    }

    console.log('PDF generation requested for Vercel environment');
    console.log('Using ieee_generator_fixed.py - this ensures CORRECT IEEE formatting');
    console.log('Preview mode:', isPreview);
    
    // IMPORTANT: On Vercel, we ONLY use ieee_generator_fixed.py to maintain correct formatting
    // We do NOT use ieee_pdf_generator.py (ReportLab) because it has different/wrong formatting
    // We also skip DOCX-to-PDF conversion because it times out on Vercel serverless
    // The DOCX file from ieee_generator_fixed.py has the EXACT correct IEEE format
    
    const scriptPath = path.join(process.cwd(), 'server', 'ieee_generator_fixed.py');
    console.log('Script path:', scriptPath);
    
    const python = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 50000 // 50 second timeout (within Vercel's 60s limit)
    });

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
      console.log('Python process finished with code:', code);
      console.log('Output buffer length:', outputBuffer.length);
      
      if (code !== 0) {
        console.error('Python script error:', errorOutput);
        return res.status(500).json({
          error: 'Failed to generate document',
          details: errorOutput,
          pythonExitCode: code
        });
      }

      if (outputBuffer.length === 0) {
        console.error('No output from Python script');
        return res.status(500).json({
          error: 'No output from document generator',
          details: 'Python script ran but produced no output'
        });
      }

      // For Vercel, we return DOCX format (which has correct IEEE formatting from ieee_generator_fixed.py)
      // Users can convert to PDF locally if needed, or use Microsoft Word Online to view inline
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Cache-Control', 'no-cache');
      
      if (isPreview) {
        // For preview requests, return the DOCX with inline disposition
        // Browser will either download it or open in Word Online (if configured)
        res.setHeader('Content-Disposition', 'inline; filename="ieee_paper_preview.docx"');
        res.setHeader('X-Format-Note', 'DOCX format with correct IEEE formatting from ieee_generator_fixed.py');
        console.log('✓ Serving DOCX for preview (correct IEEE format)');
      } else {
        // For download requests, attachment disposition
        res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
        console.log('✓ Serving DOCX for download (correct IEEE format)');
      }
      
      res.send(outputBuffer);
    });

    python.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      res.status(500).json({
        error: 'Failed to start document generator',
        details: err.message
      });
    });

  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
