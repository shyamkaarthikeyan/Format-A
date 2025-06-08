import type { Express } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import { storage } from "./storage";
import { insertDocumentSchema, updateDocumentSchema } from "@shared/schema";
import multer from "multer";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Document generation routes
  app.post('/api/generate/docx', async (req, res) => {
    try {
      const documentData = req.body;
      
      // Call Python script to generate DOCX
      const python = spawn('python3', ['server/document_generator.py'], {
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
      });
      
      python.on('close', (code: number) => {
        if (code !== 0) {
          console.error('Python script error:', errorOutput);
          res.status(500).json({ error: 'Failed to generate document' });
          return;
        }
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
        res.send(outputBuffer);
      });
      
    } catch (error) {
      console.error('Document generation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/generate/latex', async (req, res) => {
    try {
      const documentData = req.body;
      
      // Call Python script to generate LaTeX
      const python = spawn('python3', ['server/document_generator.py', '--latex'], {
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
        if (code !== 0) {
          console.error('Python script error:', errorOutput);
          res.status(500).json({ error: 'Failed to generate document' });
          return;
        }
        
        res.setHeader('Content-Type', 'text/x-tex');
        res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.tex"');
        res.send(outputBuffer);
      });
      
    } catch (error) {
      console.error('LaTeX generation error:', error);
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

  // Generate PDF
  app.post("/api/generate/pdf", async (req, res) => {
    try {
      const document = req.body;
      
      // Generate LaTeX using Python backend
      const pythonLatex = spawn('python3', ['-c', `
import sys
import json
import tempfile
import os
import subprocess
sys.path.append('server')
from document_generator import generate_latex_document

# Read input from stdin
input_data = json.loads(sys.stdin.read())
latex_content = generate_latex_document(input_data)

# Write LaTeX to temporary file
with tempfile.NamedTemporaryFile(mode='w', suffix='.tex', delete=False) as f:
    f.write(latex_content)
    tex_file = f.name

# Compile to PDF using pdflatex
try:
    subprocess.run(['pdflatex', '-interaction=nonstopmode', '-output-directory', os.path.dirname(tex_file), tex_file], 
                   check=True, capture_output=True)
    pdf_file = tex_file.replace('.tex', '.pdf')
    
    # Read PDF content
    with open(pdf_file, 'rb') as f:
        pdf_content = f.read()
    
    # Output base64 encoded PDF
    import base64
    print(base64.b64encode(pdf_content).decode())
    
    # Cleanup
    os.unlink(tex_file)
    if os.path.exists(pdf_file):
        os.unlink(pdf_file)
    # Clean up auxiliary files
    for ext in ['.aux', '.log', '.out']:
        aux_file = tex_file.replace('.tex', ext)
        if os.path.exists(aux_file):
            os.unlink(aux_file)
            
except subprocess.CalledProcessError:
    # If pdflatex fails, just return the LaTeX content
    print("LATEX_FALLBACK:" + latex_content)
except FileNotFoundError:
    # If pdflatex is not installed, return LaTeX content
    print("LATEX_FALLBACK:" + latex_content)
`]);

      let output = '';
      let error = '';

      pythonLatex.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      pythonLatex.stderr.on('data', (data: Buffer) => {
        error += data.toString();
      });

      pythonLatex.stdin.write(JSON.stringify(document));
      pythonLatex.stdin.end();

      pythonLatex.on('close', (code) => {
        if (code === 0 && output.trim()) {
          const result = output.trim();
          
          if (result.startsWith('LATEX_FALLBACK:')) {
            // Return LaTeX file if PDF generation failed
            const latexContent = result.substring('LATEX_FALLBACK:'.length);
            res.setHeader('Content-Type', 'application/x-tex');
            res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.tex"');
            res.send(latexContent);
          } else {
            // Return PDF file
            try {
              const pdfBuffer = Buffer.from(result, 'base64');
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
              res.send(pdfBuffer);
            } catch (decodeError) {
              res.status(500).json({ error: 'Failed to decode PDF data' });
            }
          }
        } else {
          console.error('Python error:', error);
          res.status(500).json({ error: 'Failed to generate PDF: ' + error });
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Server error: ' + (error as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
