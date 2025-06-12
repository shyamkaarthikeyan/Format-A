import type { Express } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import { storage } from "./storage";
import { insertDocumentSchema, updateDocumentSchema } from "@shared/schema";
import { sendIEEEPaper } from "./emailService";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to get the correct Python command for the platform
const getPythonCommand = () => {
  return process.platform === 'win32' ? 'python' : 'python3';
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Debug endpoint to check Python environment
  app.get('/api/debug/python', async (req, res) => {
    try {
      const python = spawn(getPythonCommand(), ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      python.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      
      python.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
      
      python.on('close', (code: number) => {
        res.json({
          pythonVersion: output || errorOutput,
          pythonCommand: getPythonCommand(),
          platform: process.platform,
          workingDirectory: __dirname,
          scriptPath: path.join(__dirname, 'ieee_generator_fixed.py'),
          exitCode: code
        });
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check Python environment', details: (error as Error).message });
    }
  });

  // Document generation routes
  app.post('/api/generate/docx', async (req, res) => {
    try {
      console.log('=== DOCX Generation Debug Info ===');
      console.log('Request body keys:', Object.keys(req.body));
      console.log('Working directory:', __dirname);
      console.log('Platform:', process.platform);
      console.log('Python command:', getPythonCommand());
      
      const documentData = req.body;
      
      // Use absolute path for Python script
      const scriptPath = path.join(__dirname, 'ieee_generator_fixed.py');
      console.log('Script path:', scriptPath);
      
      // Check if script file exists
      const fs = await import('fs');
      try {
        await fs.promises.access(scriptPath);
        console.log('✓ Python script file exists');
      } catch (err) {
        console.error('✗ Python script file NOT found:', err);
        return res.status(500).json({ 
          error: 'Python script not found', 
          details: `Script path: ${scriptPath}`,
          suggestion: 'The Python script file may not have been deployed correctly'
        });
      }
      
      // Test Python availability first
      console.log('Testing Python availability...');
      const testPython = spawn(getPythonCommand(), ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let pythonTestOutput = '';
      let pythonTestError = '';
      
      testPython.stdout.on('data', (data: Buffer) => {
        pythonTestOutput += data.toString();
      });
      
      testPython.stderr.on('data', (data: Buffer) => {
        pythonTestError += data.toString();
      });
      
      testPython.on('close', (testCode: number) => {
        console.log('Python test result:', testCode, pythonTestOutput || pythonTestError);
        
        if (testCode !== 0) {
          console.error('Python not available!');
          return res.status(500).json({ 
            error: 'Python not available', 
            details: pythonTestError || 'Python command failed',
            pythonCommand: getPythonCommand(),
            suggestion: 'Python may not be installed or accessible on the server'
          });
        }
        
        // Python is available, now try to run the script
        console.log('Python is available, running document generation script...');
        
        const python = spawn(getPythonCommand(), [scriptPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: __dirname
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
          console.log('Python stderr:', data.toString());
        });
        
        python.on('close', (code: number) => {
          console.log('Python script finished with code:', code);
          console.log('Output buffer length:', outputBuffer.length);
          console.log('Error output:', errorOutput);
          
          if (code !== 0) {
            console.error('Python script error:', errorOutput);
            console.error('Python script path:', scriptPath);
            console.error('Working directory:', __dirname);
            return res.status(500).json({ 
              error: 'Failed to generate document', 
              details: errorOutput,
              pythonExitCode: code,
              scriptPath: scriptPath,
              workingDirectory: __dirname,
              suggestion: 'Check Python script dependencies and syntax'
            });
          }
          
          if (outputBuffer.length === 0) {
            console.error('No output from Python script');
            return res.status(500).json({ 
              error: 'No output from document generator', 
              details: 'Python script ran successfully but produced no output',
              suggestion: 'Check if the document data is valid'
            });
          }
          
          console.log('✓ Document generated successfully');
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
          res.send(outputBuffer);
        });
        
        python.on('error', (err) => {
          console.error('Failed to start Python process:', err);
          res.status(500).json({ 
            error: 'Failed to start Python process', 
            details: err.message,
            suggestion: 'Python may not be installed or the script path is incorrect'
          });
        });
      });
      
      testPython.on('error', (err) => {
        console.error('Failed to test Python:', err);
        res.status(500).json({ 
          error: 'Failed to test Python availability', 
          details: err.message,
          pythonCommand: getPythonCommand(),
          suggestion: 'Python may not be installed on the server'
        });
      });
      
    } catch (error) {
      console.error('Document generation error:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        details: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  });

  app.post('/api/generate/latex', async (req, res) => {
    try {
      const documentData = req.body;
      
      // Temporarily use the simple test script to diagnose PDF issues
      const scriptPath = path.join(__dirname, 'pdf_test.py');
      
      console.log('=== PDF Generation Debug Info ===');
      console.log('Script path:', scriptPath);
      console.log('Working directory:', __dirname);
      
      // Check if test script exists
      const fs = await import('fs');
      try {
        await fs.promises.access(scriptPath);
        console.log('✓ PDF test script file exists');
      } catch (err) {
        console.error('✗ PDF test script file NOT found:', err);
        return res.status(500).json({ 
          error: 'PDF test script not found', 
          details: `Script path: ${scriptPath}`,
          suggestion: 'The PDF test script file may not have been deployed correctly'
        });
      }
      
      // Call Python test script to diagnose PDF generation
      const python = spawn(getPythonCommand(), [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
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
        console.log('PDF test stderr:', data.toString());
      });
      
      python.on('close', (code: number) => {
        console.log('PDF test script finished with code:', code);
        console.log('Output buffer length:', outputBuffer.length);
        console.log('Error output:', errorOutput);
        
        if (code !== 0) {
          console.error('PDF test script error:', errorOutput);
          return res.status(500).json({ 
            error: 'Failed to generate test PDF', 
            details: errorOutput,
            pythonExitCode: code,
            scriptPath: scriptPath,
            workingDirectory: __dirname,
            suggestion: 'Check ReportLab installation and dependencies'
          });
        }
        
        // Verify it's a valid PDF
        if (outputBuffer.length > 1000 && outputBuffer.subarray(0, 4).toString() === '%PDF') {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="test_paper.pdf"');
          res.send(outputBuffer);
        } else {
          console.error('Generated PDF is invalid or too small, length:', outputBuffer.length);
          console.error('Buffer start:', outputBuffer.subarray(0, 10).toString());
          res.status(500).json({ 
            error: 'Failed to generate valid PDF document',
            details: `Output length: ${outputBuffer.length}, Buffer start: ${outputBuffer.subarray(0, 10).toString()}`,
            suggestion: 'ReportLab may not be properly installed'
          });
        }
      });
      
      python.on('error', (err) => {
        console.error('Failed to start PDF test process:', err);
        res.status(500).json({ 
          error: 'Failed to start PDF test process', 
          details: err.message,
          suggestion: 'Python may not be installed or the script path is incorrect'
        });
      });
      
    } catch (error) {
      console.error('PDF test generation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Get single document
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // Create new document
  app.post("/api/documents", async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      res.status(400).json({ message: "Invalid document data", error: error });
    }
  });

  // Update document
  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log("PATCH request body:", JSON.stringify(req.body, null, 2));
      const validatedData = updateDocumentSchema.parse(req.body);
      const document = await storage.updateDocument(id, validatedData);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Document update validation error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
      res.status(400).json({ message: "Invalid document data", error: error });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDocument(id);
      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Upload figure
  app.post("/api/documents/:id/figures", upload.single("figure"), async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const figureId = `fig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const figure = {
        id: figureId,
        fileName: `${figureId}.${req.file.originalname.split('.').pop()}`,
        originalName: req.file.originalname,
        caption: req.body.caption || "",
        size: req.body.size || "medium",
        position: req.body.position || "here",
        sectionId: req.body.sectionId,
        order: document.figures?.length || 0,
        mimeType: req.file.mimetype,
        data: req.file.buffer.toString('base64')
      };

      const updatedFigures = [...(document.figures || []), figure];
      await storage.updateDocument(documentId, { figures: updatedFigures });

      res.status(201).json(figure);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload figure" });
    }
  });

  // Generate DOCX
  app.post("/api/documents/:id/generate/docx", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // In a real implementation, this would use the docx library to generate the document
      // For now, we'll return a placeholder response
      res.json({ 
        message: "DOCX generation would be implemented here",
        downloadUrl: `/api/documents/${id}/download/docx`,
        document: document
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate DOCX" });
    }
  });

  // Generate LaTeX
  app.post("/api/documents/:id/generate/latex", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // In a real implementation, this would use the LaTeX template from the Python code
      res.json({ 
        message: "LaTeX generation would be implemented here",
        downloadUrl: `/api/documents/${id}/download/latex`,
        document: document
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate LaTeX" });
    }
  });

  // Email PDF endpoint
  app.post('/api/generate/email', async (req, res) => {
    try {
      const { email, documentData } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
      }
      
      if (!documentData) {
        return res.status(400).json({ error: 'Document data is required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Use the same diagnostic test script as the PDF download
      const scriptPath = path.join(__dirname, 'pdf_test.py');

      console.log('=== Email PDF Generation Debug Info ===');
      console.log('Script path:', scriptPath);
      console.log('Working directory:', __dirname);
      console.log('Email:', email);

      // Check if test script exists
      const fs = await import('fs');
      try {
        await fs.promises.access(scriptPath);
        console.log('✓ PDF test script file exists for email');
      } catch (err) {
        console.error('✗ PDF test script file NOT found for email:', err);
        return res.status(500).json({ 
          error: 'PDF test script not found for email', 
          details: `Script path: ${scriptPath}`,
          suggestion: 'The PDF test script file may not have been deployed correctly'
        });
      }

      // Generate PDF using the same test script
      const python = spawn(getPythonCommand(), [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
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
        console.log('Email PDF test stderr:', data.toString());
      });
      
      python.on('close', async (code: number) => {
        console.log('Email PDF test script finished with code:', code);
        console.log('Email PDF output buffer length:', outputBuffer.length);
        console.log('Email PDF error output:', errorOutput);

        if (code !== 0) {
          console.error('Email PDF generation error:', errorOutput);
          return res.status(500).json({ 
            error: 'Failed to generate PDF for email', 
            details: errorOutput,
            pythonExitCode: code,
            scriptPath: scriptPath,
            workingDirectory: __dirname,
            suggestion: 'Check ReportLab installation and dependencies for email PDF generation'
          });
        }
        
        // Verify it's a valid PDF
        if (outputBuffer.length > 1000 && outputBuffer.subarray(0, 4).toString() === '%PDF') {
          try {
            // Send email with PDF attachment
            const filename = `ieee-paper-test-${Date.now()}.pdf`;
            const result = await sendIEEEPaper(email, outputBuffer, filename);
            
            console.log('✓ Email sent successfully to:', email);
            res.json({
              success: true,
              message: `Test IEEE paper sent successfully to ${email}`,
              messageId: result.messageId
            });
          } catch (emailError) {
            console.error('Email sending error:', emailError);
            res.status(500).json({ 
              error: 'PDF generated successfully but failed to send email',
              details: (emailError as Error).message
            });
          }
        } else {
          console.error('Generated email PDF is invalid or too small, length:', outputBuffer.length);
          console.error('Email PDF buffer start:', outputBuffer.subarray(0, 10).toString());
          res.status(500).json({ 
            error: 'Failed to generate valid PDF document for email',
            details: `Output length: ${outputBuffer.length}, Buffer start: ${outputBuffer.subarray(0, 10).toString()}`,
            suggestion: 'ReportLab may not be properly installed for email PDF generation'
          });
        }
      });

      python.on('error', (err) => {
        console.error('Failed to start email PDF test process:', err);
        res.status(500).json({ 
          error: 'Failed to start email PDF test process', 
          details: err.message,
          suggestion: 'Python may not be installed or the script path is incorrect for email'
        });
      });
      
    } catch (error) {
      console.error('Email PDF generation error:', error);
      res.status(500).json({ error: 'Internal server error during email PDF generation' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
