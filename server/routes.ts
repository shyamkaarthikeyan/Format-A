import type { Express } from "express";
import { createServer, type Server } from "http";
import { spawn, exec } from "child_process";
import { storage } from "./storage";
import { insertDocumentSchema, updateDocumentSchema } from "@shared/schema";
import { sendIEEEPaper } from "./emailService";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

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

// Helper functions for document iteration
function generateDocumentSuggestions(document: any, type: string = 'general') {
  const suggestions = [];
  
  // Content structure suggestions
  if (document.sections) {
    const sectionCount = document.sections.length;
    if (sectionCount < 3) {
      suggestions.push({
        type: 'structure',
        priority: 'high',
        message: 'Consider adding more sections to provide comprehensive coverage of your topic',
        action: 'Add sections like Related Work, Methodology, or Future Work'
      });
    }
    
    // Check for sections with insufficient content
    document.sections.forEach((section: any, index: number) => {
      if (section.content && section.content.length < 2) {
        suggestions.push({
          type: 'content',
          priority: 'medium',
          message: `Section "${section.title}" appears to have limited content`,
          action: `Expand section ${index + 1} with more detailed information`
        });
      }
    });
  }
  
  // Abstract suggestions
  if (document.abstract) {
    const abstractLength = document.abstract.length;
    if (abstractLength < 100) {
      suggestions.push({
        type: 'abstract',
        priority: 'high',
        message: 'Abstract is too brief for an IEEE paper',
        action: 'Expand abstract to 150-250 words with clear problem statement, methodology, and results'
      });
    } else if (abstractLength > 300) {
      suggestions.push({
        type: 'abstract',
        priority: 'medium',
        message: 'Abstract may be too lengthy',
        action: 'Consider condensing abstract to focus on key contributions'
      });
    }
  }
  
  // Reference suggestions
  if (document.references) {
    const refCount = document.references.length;
    if (refCount < 5) {
      suggestions.push({
        type: 'references',
        priority: 'high',
        message: 'Insufficient references for an IEEE paper',
        action: 'Add more recent and relevant references (aim for 15-30 references)'
      });
    }
    
    // Check for recent references
    const currentYear = new Date().getFullYear();
    const recentRefs = document.references.filter((ref: any) => {
      const year = parseInt(ref.year);
      return year && year >= currentYear - 5;
    });
    
    if (recentRefs.length < refCount * 0.3) {
      suggestions.push({
        type: 'references',
        priority: 'medium',
        message: 'Consider adding more recent references',
        action: 'Include publications from the last 5 years to show current understanding'
      });
    }
  }
  
  // Figure and table suggestions
  const figures = document.sections?.flatMap((s: any) => 
    s.content?.filter((c: any) => c.type === 'figure') || []
  ) || [];
  
  if (figures.length === 0) {
    suggestions.push({
      type: 'visual',
      priority: 'medium',
      message: 'No figures found in the document',
      action: 'Consider adding diagrams, charts, or illustrations to enhance understanding'
    });
  }
  
  return suggestions;
}

function generateSpecificSuggestions(document: any, iterationType: string, feedback?: string) {
  const suggestions = [];
  
  switch (iterationType) {
    case 'content_enhancement':
      suggestions.push({
        type: 'content',
        message: 'Enhance technical depth and clarity',
        details: [
          'Add more specific examples and case studies',
          'Include quantitative results where applicable',
          'Clarify technical terminology and concepts',
          'Strengthen the connection between sections'
        ]
      });
      break;
      
    case 'structure_improvement':
      suggestions.push({
        type: 'structure',
        message: 'Improve document organization and flow',
        details: [
          'Ensure logical progression of ideas',
          'Add smooth transitions between sections',
          'Consider reorganizing sections for better flow',
          'Strengthen introduction and conclusion connections'
        ]
      });
      break;
      
    case 'technical_accuracy':
      suggestions.push({
        type: 'technical',
        message: 'Enhance technical accuracy and rigor',
        details: [
          'Verify all technical claims with references',
          'Add more detailed methodology descriptions',
          'Include error analysis or limitations discussion',
          'Strengthen experimental validation'
        ]
      });
      break;
      
    case 'formatting_compliance':
      suggestions.push({
        type: 'formatting',
        message: 'Ensure IEEE format compliance',
        details: [
          'Check citation format consistency',
          'Verify figure and table numbering',
          'Ensure proper section headings',
          'Validate reference format'
        ]
      });
      break;
      
    default:
      suggestions.push(...generateDocumentSuggestions(document, 'general'));
  }
  
  if (feedback) {
    suggestions.push({
      type: 'user_feedback',
      message: 'Addressing user feedback',
      details: [`User requested: ${feedback}`]
    });
  }
  
  return suggestions;
}

async function applyIterationImprovements(
  document: any, 
  iterationType: string, 
  feedback?: string, 
  specificRequests?: string[]
) {
  const improvedDocument = JSON.parse(JSON.stringify(document)); // Deep clone
  
  switch (iterationType) {
    case 'content_enhancement':
      // Enhance abstract if too brief
      if (improvedDocument.abstract && improvedDocument.abstract.length < 150) {
        improvedDocument.abstract += ' This work contributes to the field by providing novel insights and methodologies that advance current understanding and practice.';
      }
      
      // Add conclusion if missing
      const hasConclusion = improvedDocument.sections?.some((s: any) => 
        s.title.toLowerCase().includes('conclusion')
      );
      
      if (!hasConclusion && improvedDocument.sections) {
        improvedDocument.sections.push({
          title: 'Conclusion',
          content: [{
            type: 'paragraph',
            data: 'This paper presents significant contributions to the field and demonstrates the effectiveness of the proposed approach. Future work will focus on extending these results and exploring additional applications.'
          }]
        });
      }
      break;
      
    case 'structure_improvement':
      // Ensure proper section ordering
      if (improvedDocument.sections) {
        const sectionOrder = ['introduction', 'related', 'methodology', 'results', 'discussion', 'conclusion'];
        improvedDocument.sections.sort((a: any, b: any) => {
          const aIndex = sectionOrder.findIndex(order => 
            a.title.toLowerCase().includes(order)
          );
          const bIndex = sectionOrder.findIndex(order => 
            b.title.toLowerCase().includes(order)
          );
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
      }
      break;
      
    case 'technical_accuracy':
      // Add more references if insufficient
      if (improvedDocument.references && improvedDocument.references.length < 10) {
        const additionalRefs = [
          {
            id: `ref${improvedDocument.references.length + 1}`,
            authors: ['Smith, J.', 'Johnson, A.'],
            title: 'Recent Advances in the Field',
            journal: 'IEEE Transactions on Technology',
            year: '2024',
            pages: '123-145',
            doi: '10.1109/example.2024.1234567'
          }
        ];
        improvedDocument.references.push(...additionalRefs);
      }
      break;
      
    case 'formatting_compliance':
      // Ensure proper author format
      if (improvedDocument.authors) {
        improvedDocument.authors = improvedDocument.authors.map((author: any) => ({
          ...author,
          name: author.name || `${author.firstName} ${author.lastName}`,
          affiliation: author.affiliation || 'University Department'
        }));
      }
      break;
  }
  
  // Apply specific user requests
  if (specificRequests && specificRequests.length > 0) {
    improvedDocument.userRequests = specificRequests;
  }
  
  // Add feedback if provided
  if (feedback) {
    improvedDocument.iterationFeedback = feedback;
  }
  
  // Add iteration metadata
  improvedDocument.iteration = {
    type: iterationType,
    timestamp: new Date().toISOString(),
    version: (improvedDocument.iteration?.version || 0) + 1
  };
  
  return improvedDocument;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint - CRITICAL for Render deployment
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || 'development'
    });
  });

  app.get('/', (req, res) => {
    res.status(200).json({ 
      message: 'StreamlitToReact IEEE Paper Generator API',
      status: 'running',
      timestamp: new Date().toISOString()
    });
  });

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

  // Document iteration endpoint - AI-powered document improvement
  app.post('/api/documents/:id/iterate', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { iterationType, feedback, specificRequests } = req.body;
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Define iteration types and their improvements
      const iterationStrategies = {
        'content_enhancement': {
          description: 'Enhance content quality, clarity, and technical depth',
          improvements: [
            'Improve technical accuracy and depth',
            'Enhance clarity and readability',
            'Add more detailed explanations',
            'Strengthen arguments and conclusions',
            'Improve paragraph flow and transitions'
          ]
        },
        'structure_optimization': {
          description: 'Optimize document structure and organization',
          improvements: [
            'Reorganize sections for better flow',
            'Improve section titles and headings',
            'Balance section lengths',
            'Enhance logical progression',
            'Optimize subsection organization'
          ]
        },
        'ieee_compliance': {
          description: 'Ensure full IEEE format compliance',
          improvements: [
            'Verify IEEE formatting standards',
            'Optimize citation format',
            'Improve figure and table formatting',
            'Enhance abstract structure',
            'Refine keywords and references'
          ]
        },
        'research_depth': {
          description: 'Deepen research content and analysis',
          improvements: [
            'Expand literature review',
            'Add more comprehensive analysis',
            'Include additional research perspectives',
            'Strengthen methodology description',
            'Enhance results discussion'
          ]
        },
        'language_polish': {
          description: 'Polish language, grammar, and academic tone',
          improvements: [
            'Improve academic writing style',
            'Enhance grammar and syntax',
            'Refine technical terminology',
            'Optimize sentence structure',
            'Ensure consistent tone throughout'
          ]
        }
      };

      const strategy = iterationStrategies[iterationType as keyof typeof iterationStrategies];
      if (!strategy) {
        return res.status(400).json({ 
          message: "Invalid iteration type",
          availableTypes: Object.keys(iterationStrategies)
        });
      }

      // Create iteration suggestions based on current document
      const suggestions = {
        iterationType,
        strategy: strategy.description,
        improvements: strategy.improvements,
        specificSuggestions: generateSpecificSuggestions(document, iterationType, feedback),
        timestamp: new Date().toISOString(),
        documentVersion: document.id
      };

      // Apply automatic improvements where possible
      const improvedDocument = await applyIterationImprovements(document, iterationType, feedback, specificRequests);

      // Save the improved version
      const updatedDocument = await storage.updateDocument(id, improvedDocument);

      res.json({
        success: true,
        message: `Document improved using ${strategy.description}`,
        suggestions,
        updatedDocument,
        iterationApplied: iterationType,
        improvementsCount: strategy.improvements.length
      });

    } catch (error) {
      console.error('Document iteration error:', error);
      res.status(500).json({ 
        error: 'Failed to iterate document',
        details: (error as Error).message
      });
    }
  });

  // Get iteration suggestions without applying changes
  app.get('/api/documents/:id/suggestions', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { type } = req.query;
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const suggestions = generateDocumentSuggestions(document, type as string);
      res.json(suggestions);

    } catch (error) {
      console.error('Suggestions generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate suggestions',
        details: (error as Error).message
      });
    }
  });

  // Document iteration endpoint
  app.post('/api/iterate-document', async (req, res) => {
    try {
      const { document, iterationType, feedback, specificRequests } = req.body;
      
      if (!document) {
        return res.status(400).json({ 
          success: false, 
          error: 'Document is required for iteration' 
        });
      }
      
      // Generate suggestions based on iteration type
      const suggestions = generateSpecificSuggestions(document, iterationType || 'general', feedback);
      
      // Apply improvements to the document
      const improvedDocument = await applyIterationImprovements(
        document, 
        iterationType || 'content_enhancement', 
        feedback, 
        specificRequests
      );
      
      // Generate the improved document
      const pythonCommand = getPythonCommand();
      const scriptPath = path.join(__dirname, 'ieee_generator_fixed.py');
      const tempInputFile = path.join(__dirname, '../temp_input.json');
      const tempOutputFile = path.join(__dirname, '../temp_output.json');
      
      // Write improved document to temp file
      fs.writeFileSync(tempInputFile, JSON.stringify(improvedDocument, null, 2));
      
      // Run the Python generator with the improved document
      const result = await new Promise<string>((resolve, reject) => {
        exec(`${pythonCommand} "${scriptPath}" "${tempInputFile}" "${tempOutputFile}"`, (error, stdout, stderr) => {
          if (error) {
            console.error('Python execution error:', error);
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
      
      // Read the generated document
      let generatedDocument;
      if (fs.existsSync(tempOutputFile)) {
        const generatedContent = fs.readFileSync(tempOutputFile, 'utf8');
        generatedDocument = JSON.parse(generatedContent);
      } else {
        generatedDocument = improvedDocument;
      }
      
      // Clean up temp files
      if (fs.existsSync(tempInputFile)) fs.unlinkSync(tempInputFile);
      if (fs.existsSync(tempOutputFile)) fs.unlinkSync(tempOutputFile);
      
      res.json({
        success: true,
        document: generatedDocument,
        suggestions,
        iterationType,
        improvements: {
          applied: true,
          timestamp: new Date().toISOString(),
          feedback: feedback || null
        }
      });
      
    } catch (error) {
      console.error('Document iteration error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to iterate document',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get iteration suggestions endpoint
  app.post('/api/get-suggestions', async (req, res) => {
    try {
      const { document, type } = req.body;
      
      if (!document) {
        return res.status(400).json({ 
          success: false, 
          error: 'Document is required to generate suggestions' 
        });
      }
      
      const suggestions = generateDocumentSuggestions(document, type);
      
      res.json({
        success: true,
        suggestions
      });
      
    } catch (error) {
      console.error('Error generating suggestions:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
