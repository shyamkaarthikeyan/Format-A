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
      
      // Call Python script to generate Word document first
      const python = spawn('python3', ['server/document_generator.py'], {
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
      
      python.on('close', async (code: number) => {
        if (code !== 0) {
          console.error('Python script error:', errorOutput);
          res.status(500).json({ error: 'Failed to generate document' });
          return;
        }
        
        try {
          const fs = require('fs');
          const path = require('path');
          
          const tempDir = '/tmp';
          const docxPath = path.join(tempDir, `ieee_paper_${Date.now()}.docx`);
          const pdfPath = docxPath.replace('.docx', '.pdf');
          
          // Write DOCX to temp file
          fs.writeFileSync(docxPath, outputBuffer);
          
          // Convert to PDF using LibreOffice with better error handling
          const { spawn } = require('child_process');
          const libreoffice = spawn('libreoffice', [
            '--headless', 
            '--convert-to', 
            'pdf', 
            '--outdir', 
            tempDir, 
            docxPath
          ], {
            stdio: ['pipe', 'pipe', 'pipe']
          });
          
          let conversionError = '';
          
          libreoffice.stderr.on('data', (data: Buffer) => {
            conversionError += data.toString();
          });
          
          libreoffice.on('close', (code: number) => {
            try {
              // Wait longer for LibreOffice to complete conversion
              setTimeout(() => {
                console.log(`LibreOffice exit code: ${code}`);
                console.log(`PDF file exists: ${fs.existsSync(pdfPath)}`);
                console.log(`DOCX file exists: ${fs.existsSync(docxPath)}`);
                
                if (code === 0 && fs.existsSync(pdfPath)) {
                  const stats = fs.statSync(pdfPath);
                  console.log(`PDF file size: ${stats.size} bytes`);
                  
                  if (stats.size > 1000) { // PDF should be at least 1KB
                    const pdfBuffer = fs.readFileSync(pdfPath);
                    
                    // Verify it's actually a PDF
                    if (pdfBuffer.subarray(0, 4).toString() === '%PDF') {
                      res.setHeader('Content-Type', 'application/pdf');
                      res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
                      res.send(pdfBuffer);
                      
                      // Clean up temp files
                      fs.unlinkSync(docxPath);
                      fs.unlinkSync(pdfPath);
                      return;
                    } else {
                      console.error('Generated file is not a valid PDF');
                    }
                  } else {
                    console.error(`Generated PDF is too small: ${stats.size} bytes`);
                  }
                } else {
                  console.error('PDF conversion failed or file not found');
                  if (conversionError) console.error('Conversion error:', conversionError);
                }
                
                // Fallback to DOCX
                console.log('Falling back to DOCX download');
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
                res.send(outputBuffer);
                
                // Clean up temp files
                try {
                  if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath);
                  if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
                } catch (cleanupErr) {
                  console.error('Cleanup error:', cleanupErr);
                }
              }, 2000); // Increased wait time
            } catch (error) {
              console.error('Error during PDF processing:', error);
              res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
              res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
              res.send(outputBuffer);
              try {
                if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath);
                if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
              } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
              }
            }
          });
          
          libreoffice.on('error', (error) => {
            console.error('LibreOffice process error:', error);
            // Return DOCX as fallback
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
            res.send(outputBuffer);
            if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath);
          });
        } catch (error) {
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
          res.send(outputBuffer);
        }
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

  const httpServer = createServer(app);
  return httpServer;
}
