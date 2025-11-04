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

    // Check if Python and required packages are available
    // On Vercel, PDF conversion (docx2pdf) requires system dependencies that aren't available
    // So we'll return a fallback to DOCX format
    
    console.log('PDF generation requested, checking environment...');
    
    // Test if docx2pdf is available
    const testPython = spawn('python3', ['-c', 'import docx2pdf'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let canGeneratePDF = false;

    testPython.on('close', async (code: number) => {
      canGeneratePDF = code === 0;

      if (!canGeneratePDF) {
        console.log('docx2pdf not available, falling back to DOCX');
        
        if (isPreview) {
          // For preview requests, return 503 with helpful message
          return res.status(503).json({
            error: 'PDF preview not available',
            message: 'PDF preview is not available on this deployment due to serverless limitations.',
            suggestion: 'Perfect IEEE formatting is available via Word download - the DOCX file contains identical formatting to what you see on localhost! Use the Download Word button above.',
            fallbackAvailable: true,
            fallbackFormat: 'docx'
          });
        }

        // For download requests, generate DOCX instead
        try {
          const scriptPath = path.join(process.cwd(), 'server', 'ieee_generator_fixed.py');
          
          const python = spawn('python3', [scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe']
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
          });

          python.on('close', (code: number) => {
            if (code !== 0 || outputBuffer.length === 0) {
              return res.status(500).json({
                error: 'Failed to generate document',
                details: errorOutput
              });
            }

            // Return DOCX instead of PDF
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
            res.send(outputBuffer);
          });

        } catch (error) {
          res.status(500).json({
            error: 'Failed to generate fallback document',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        // PDF generation is available, proceed
        console.log('PDF generation available, proceeding...');
        
        try {
          // First generate DOCX, then convert to PDF
          const scriptPath = path.join(process.cwd(), 'server', 'ieee_generator_fixed.py');
          
          const python = spawn('python3', [scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe']
          });

          python.stdin.write(JSON.stringify(documentData));
          python.stdin.end();

          let docxBuffer = Buffer.alloc(0);
          let errorOutput = '';

          python.stdout.on('data', (data: Buffer) => {
            docxBuffer = Buffer.concat([docxBuffer, data]);
          });

          python.stderr.on('data', (data: Buffer) => {
            errorOutput += data.toString();
          });

          python.on('close', async (code: number) => {
            if (code !== 0 || docxBuffer.length === 0) {
              return res.status(500).json({
                error: 'Failed to generate document',
                details: errorOutput
              });
            }

            // Convert DOCX to PDF using docx2pdf
            const fs = require('fs');
            const os = require('os');
            const tmpDir = os.tmpdir();
            const docxPath = path.join(tmpDir, `ieee_paper_${Date.now()}.docx`);
            const pdfPath = path.join(tmpDir, `ieee_paper_${Date.now()}.pdf`);

            try {
              // Write DOCX to temp file
              fs.writeFileSync(docxPath, docxBuffer);

              // Convert to PDF
              const convertPython = spawn('python3', ['-c', `
from docx2pdf import convert
convert('${docxPath}', '${pdfPath}')
              `], {
                stdio: ['pipe', 'pipe', 'pipe']
              });

              let convertError = '';

              convertPython.stderr.on('data', (data: Buffer) => {
                convertError += data.toString();
              });

              convertPython.on('close', (convertCode: number) => {
                if (convertCode !== 0) {
                  // Cleanup and fallback to DOCX
                  try { fs.unlinkSync(docxPath); } catch (e) {}
                  
                  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                  res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
                  return res.send(docxBuffer);
                }

                // Read PDF and send
                try {
                  const pdfBuffer = fs.readFileSync(pdfPath);
                  
                  // Cleanup temp files
                  try { fs.unlinkSync(docxPath); } catch (e) {}
                  try { fs.unlinkSync(pdfPath); } catch (e) {}

                  res.setHeader('Content-Type', 'application/pdf');
                  res.setHeader('Content-Disposition', isPreview ? 'inline; filename="ieee_paper.pdf"' : 'attachment; filename="ieee_paper.pdf"');
                  res.send(pdfBuffer);
                } catch (error) {
                  // Cleanup and fallback to DOCX
                  try { fs.unlinkSync(docxPath); } catch (e) {}
                  try { fs.unlinkSync(pdfPath); } catch (e) {}
                  
                  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                  res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
                  res.send(docxBuffer);
                }
              });

            } catch (error) {
              // Cleanup and fallback to DOCX
              try { fs.unlinkSync(docxPath); } catch (e) {}
              
              res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
              res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
              res.send(docxBuffer);
            }
          });

        } catch (error) {
          res.status(500).json({
            error: 'Failed to generate PDF',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
