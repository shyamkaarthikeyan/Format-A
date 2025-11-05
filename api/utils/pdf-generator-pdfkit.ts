import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DocumentData {
  title: string;
  authors: Array<{ name: string; affiliation: string; email: string }>;
  abstract: string;
  keywords: string[];
  sections: Array<{ heading: string; content: string }>;
  references?: string[];
}

/**
 * Generate IEEE-formatted PDF using Python ReportLab
 * This calls the ieee_pdf_correct.py script which has exact IEEE formatting
 */
export async function generateIEEEPdf(documentData: DocumentData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Path to Python script - go up to project root, then into api/generate
    const scriptPath = path.resolve(__dirname, '../../api/generate/ieee_pdf_correct.py');
    
    // Get Python command based on environment
    const pythonCommand = process.env.NODE_ENV === 'production' 
      ? 'python3'
      : 'C:/Users/shyam/AppData/Local/Programs/Python/Python39/python.exe';

    console.log('Generating PDF with Python script:', scriptPath);
    console.log('Using Python command:', pythonCommand);

    // Spawn Python process
    const python = spawn(pythonCommand, [scriptPath]);

    let dataBuffer = Buffer.alloc(0);
    let errorBuffer = '';

    // Send document data to Python script via stdin
    python.stdin.write(JSON.stringify(documentData));
    python.stdin.end();

    // Collect PDF data from stdout
    python.stdout.on('data', (data: Buffer) => {
      dataBuffer = Buffer.concat([dataBuffer, data]);
    });

    // Collect error messages
    python.stderr.on('data', (data: Buffer) => {
      errorBuffer += data.toString();
      console.error('Python stderr:', data.toString());
    });

    // Handle process completion
    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python process exited with code:', code);
        console.error('Error output:', errorBuffer);
        reject(new Error(`PDF generation failed: ${errorBuffer || 'Unknown error'}`));
      } else if (dataBuffer.length === 0) {
        reject(new Error('No PDF data generated'));
      } else {
        console.log('PDF generated successfully, size:', dataBuffer.length, 'bytes');
        resolve(dataBuffer);
      }
    });

    // Handle process errors
    python.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}
