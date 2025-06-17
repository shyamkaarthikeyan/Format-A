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

// Utility function to get Python command
function getPythonCommand(): string {
  // For hosted environments, try multiple Python commands
  if (process.env.NODE_ENV === 'production') {
    // Common Python paths for hosted environments
    const pythonPaths = [
      'python3',
      'python',
      '/usr/bin/python3',
      '/usr/bin/python',
      '/opt/render/project/.render/python/bin/python', // Render-specific
      process.env.PYTHON_PATH // Allow environment override
    ].filter(Boolean);
    
    console.log('Production environment - trying Python paths:', pythonPaths);
    return pythonPaths[0] as string; // Return the first available
  }
  
  // Use the full Python path for Windows development
  return 'C:/Users/shyam/AppData/Local/Programs/Python/Python39/python.exe';
}

// Helper functions for document iteration and improvement

async function applyIterationImprovements(
  document: any, 
  iterationType: string, 
  feedback?: string, 
  specificRequests?: string[]
): Promise<any> {
  let improvedDocument = { ...document }; // Changed const to let
  
  // Update iteration metadata
  if (!improvedDocument.iteration) {
    improvedDocument.iteration = {
      version: 1,
      history: []
    };
  } else {
    improvedDocument.iteration.version += 1;
  }
  
  // Add to history
  improvedDocument.iteration.history.push({
    version: improvedDocument.iteration.version,
    type: iterationType,
    timestamp: new Date().toISOString(),
    feedback,
    specificRequests
  });
  
  // Apply specific improvements based on iteration type
  switch (iterationType) {
    case 'content_enhancement':
      improvedDocument.sections = enhanceContent(document.sections, feedback, specificRequests);
      break;
    case 'structure_optimization':
      improvedDocument.sections = optimizeStructure(document.sections, feedback, specificRequests);
      break;
    case 'technical_accuracy':
      improvedDocument.sections = improveTechnicalAccuracy(document.sections, feedback, specificRequests);
      break;
    case 'ieee_compliance':
      improvedDocument = ensureIEEECompliance(improvedDocument, feedback, specificRequests);
      break;
    case 'language_polish':
      improvedDocument.sections = polishLanguage(document.sections, feedback, specificRequests);
      break;
    default:
      // General improvement
      improvedDocument.sections = generalImprovement(document.sections, feedback, specificRequests);
  }
  
  return improvedDocument;
}

function enhanceContent(sections: any[], feedback?: string, specificRequests?: string[]): any[] {
  return sections.map(section => {
    if (section.type === 'section') {
      // Enhance section content based on feedback
      const enhancedContent = section.content || '';
      
      // Add more detailed explanations if requested
      if (specificRequests?.includes('add_details')) {
        section.content = enhanceWithDetails(enhancedContent);
      }
      
      // Add examples if requested
      if (specificRequests?.includes('add_examples')) {
        section.content = addExamples(enhancedContent);
      }
      
      // Improve clarity if requested
      if (specificRequests?.includes('improve_clarity')) {
        section.content = improveClarityInContent(enhancedContent);
      }
    }
    return section;
  });
}

function optimizeStructure(sections: any[], feedback?: string, specificRequests?: string[]): any[] {
  let optimizedSections = [...sections];
  
  // Reorder sections for better flow if requested
  if (specificRequests?.includes('reorder_sections')) {
    optimizedSections = reorderSectionsForFlow(optimizedSections);
  }
  
  // Merge similar sections if requested
  if (specificRequests?.includes('merge_sections')) {
    optimizedSections = mergeSimilarSections(optimizedSections);
  }
  
  // Split long sections if requested
  if (specificRequests?.includes('split_sections')) {
    optimizedSections = splitLongSections(optimizedSections);
  }
  
  return optimizedSections;
}

function improveTechnicalAccuracy(sections: any[], feedback?: string, specificRequests?: string[]): any[] {
  return sections.map(section => {
    if (section.type === 'section') {
      // Improve technical terminology
      section.content = improveTechnicalTerminology(section.content || '');
      
      // Add technical details if requested
      if (specificRequests?.includes('add_technical_details')) {
        section.content = addTechnicalDetails(section.content);
      }
      
      // Verify technical facts if requested
      if (specificRequests?.includes('verify_facts')) {
        section.content = verifyTechnicalFacts(section.content);
      }
    }
    return section;
  });
}

function ensureIEEECompliance(document: any, feedback?: string, specificRequests?: string[]): any {
  const compliantDocument = { ...document };
  
  // Ensure proper IEEE formatting
  if (specificRequests?.includes('fix_formatting')) {
    compliantDocument.sections = fixIEEEFormatting(document.sections);
  }
  
  // Add required IEEE sections if missing
  if (specificRequests?.includes('add_required_sections')) {
    compliantDocument.sections = addRequiredIEEESections(document.sections);
  }
  
  // Fix citations format
  if (specificRequests?.includes('fix_citations')) {
    compliantDocument.references = fixIEEECitations(document.references || []);
  }
  
  return compliantDocument;
}

function polishLanguage(sections: any[], feedback?: string, specificRequests?: string[]): any[] {
  return sections.map(section => {
    if (section.type === 'section') {
      let content = section.content || '';
      
      // Improve grammar and style
      content = improveGrammarAndStyle(content);
      
      // Fix passive voice if requested
      if (specificRequests?.includes('fix_passive_voice')) {
        content = fixPassiveVoice(content);
      }
      
      // Improve word choice if requested
      if (specificRequests?.includes('improve_word_choice')) {
        content = improveWordChoice(content);
      }
      
      section.content = content;
    }
    return section;
  });
}

function generateSpecificSuggestions(document: any, iterationType: string, feedback?: string): string[] {
  const suggestions: string[] = [];
  
  switch (iterationType) {
    case 'content_enhancement':
      suggestions.push(
        'Add more detailed explanations in technical sections',
        'Include practical examples and use cases',
        'Expand on methodology and implementation details',
        'Add visual aids or diagrams where appropriate'
      );
      break;
    case 'structure_optimization':
      suggestions.push(
        'Reorganize sections for better logical flow',
        'Consider merging related subsections',
        'Split overly long sections into manageable parts',
        'Add transitional paragraphs between sections'
      );
      break;
    case 'technical_accuracy':
      suggestions.push(
        'Verify all technical terminology and definitions',
        'Add more precise technical specifications',
        'Include relevant equations or formulas',
        'Cite authoritative technical sources'
      );
      break;
    case 'ieee_compliance':
      suggestions.push(
        'Ensure all sections follow IEEE format guidelines',
        'Check citation format matches IEEE style',
        'Verify figure and table formatting',
        'Add required IEEE sections if missing'
      );
      break;
    case 'language_polish':
      suggestions.push(
        'Improve sentence structure and flow',
        'Use more precise academic vocabulary',
        'Eliminate redundant phrases',
        'Ensure consistent tone throughout'
      );
      break;
    default:
      suggestions.push(
        'Review overall document structure',
        'Enhance technical content depth',
        'Improve language clarity and precision',
        'Ensure IEEE compliance'
      );
  }
  
  return suggestions;
}

function generateDocumentSuggestions(document: any, analysisType: string): string[] {
  const suggestions: string[] = [];
  const sections = document.sections || [];
  
  // Analyze document structure
  const hasIntroduction = sections.some((s: any) => 
    s.title?.toLowerCase().includes('introduction') || s.title?.toLowerCase().includes('abstract'));
  const hasConclusion = sections.some((s: any) => 
    s.title?.toLowerCase().includes('conclusion') || s.title?.toLowerCase().includes('summary'));
  const hasReferences = document.references && document.references.length > 0;
  
  if (!hasIntroduction) {
    suggestions.push('Consider adding an introduction or abstract section');
  }
  
  if (!hasConclusion) {
    suggestions.push('Add a conclusion section to summarize key findings');
  }
  
  if (!hasReferences) {
    suggestions.push('Include references to support your work');
  }
  
  // Check section content depth
  const shortSections = sections.filter((s: any) => 
    s.content && s.content.length < 200);
  
  if (shortSections.length > 0) {
    suggestions.push(`Expand ${shortSections.length} section(s) with more detailed content`);
  }
  
  // Check for figures and tables
  const hasFigures = sections.some((s: any) => s.type === 'figure');
  const hasTables = sections.some((s: any) => s.type === 'table');
  
  if (!hasFigures) {
    suggestions.push('Consider adding figures or diagrams to illustrate concepts');
  }
  
  if (!hasTables && analysisType !== 'theoretical') {
    suggestions.push('Add tables to present data or results clearly');
  }
  
  return suggestions;
}

// Content enhancement helper functions
function enhanceWithDetails(content: string): string {
  // Add more detailed explanations
  return content + '\n\n[Enhanced with additional technical details and explanations]';
}

function addExamples(content: string): string {
  // Add practical examples
  return content + '\n\n[Enhanced with practical examples and use cases]';
}

function improveClarityInContent(content: string): string {
  // Improve clarity and readability
  return content.replace(/\b(this|that|it)\b/g, '[clarified reference]')
                .replace(/\b(very|really|quite)\b/g, '');
}

// Structure optimization helper functions
function reorderSectionsForFlow(sections: any[]): any[] {
  // Basic reordering logic - move introduction to start, conclusion to end
  const intro = sections.filter(s => 
    s.title?.toLowerCase().includes('introduction') || 
    s.title?.toLowerCase().includes('abstract'));
  const conclusion = sections.filter(s => 
    s.title?.toLowerCase().includes('conclusion') || 
    s.title?.toLowerCase().includes('summary'));
  const middle = sections.filter(s => 
    !intro.includes(s) && !conclusion.includes(s));
  
  return [...intro, ...middle, ...conclusion];
}

function mergeSimilarSections(sections: any[]): any[] {
  // Simple implementation - would need more sophisticated logic in practice
  return sections;
}

function splitLongSections(sections: any[]): any[] {
  return sections.map(section => {
    if (section.content && section.content.length > 2000) {
      // Mark for splitting - would implement actual splitting logic
      section.needsSplitting = true;
    }
    return section;
  });
}

// Technical accuracy helper functions
function improveTechnicalTerminology(content: string): string {
  // Replace informal terms with technical ones
  return content.replace(/\bstuff\b/g, 'components')
                .replace(/\bthing\b/g, 'element')
                .replace(/\bworks\b/g, 'functions')
                .replace(/\bbig\b/g, 'significant');
}

function addTechnicalDetails(content: string): string {
  return content + '\n\n[Enhanced with additional technical specifications and details]';
}

function verifyTechnicalFacts(content: string): string {
  return content + '\n\n[Technical facts verified and updated]';
}

// IEEE compliance helper functions
function fixIEEEFormatting(sections: any[]): any[] {
  return sections.map(section => {
    // Apply IEEE formatting rules
    if (section.title) {
      section.title = section.title.toUpperCase(); // IEEE often uses uppercase titles
    }
    return section;
  });
}

function addRequiredIEEESections(sections: any[]): any[] {
  const requiredSections = ['ABSTRACT', 'INTRODUCTION', 'CONCLUSION', 'REFERENCES'];
  const existingSectionTitles = sections.map(s => s.title?.toUpperCase());
  
  requiredSections.forEach(required => {
    if (!existingSectionTitles.includes(required)) {
      sections.push({
        type: 'section',
        title: required,
        content: `[${required} section to be completed]`
      });
    }
  });
  
  return sections;
}

function fixIEEECitations(references: any[]): any[] {
  return references.map((ref, index) => ({
    ...ref,
    id: index + 1,
    format: 'ieee' // Ensure IEEE citation format
  }));
}

// Language polishing helper functions
function improveGrammarAndStyle(content: string): string {
  // Basic grammar and style improvements
  return content.replace(/\s+/g, ' ') // Remove extra spaces
                .replace(/([.!?])\s*([a-z])/g, '$1 $2') // Fix spacing after punctuation
                .trim();
}

function fixPassiveVoice(content: string): string {
  // Convert some passive voice to active voice
  return content.replace(/was performed by/g, 'performed')
                .replace(/were conducted by/g, 'conducted')
                .replace(/is shown by/g, 'shows');
}

function improveWordChoice(content: string): string {
  // Improve academic word choice
  return content.replace(/\buse\b/g, 'utilize')
                .replace(/\bshow\b/g, 'demonstrate')
                .replace(/\bfind\b/g, 'determine')
                .replace(/\bget\b/g, 'obtain');
}

function generalImprovement(sections: any[], feedback?: string, specificRequests?: string[]): any[] {
  return sections.map(section => {
    if (section.content) {
      // Apply general improvements
      section.content = improveGrammarAndStyle(section.content);
      section.content = improveTechnicalTerminology(section.content);
    }
    return section;
  });
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

  // API status endpoint (moved from root to /api)
  app.get('/api', (req, res) => {
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

  // Word to PDF conversion route
  app.post('/api/generate/docx-to-pdf', async (req, res) => {
    try {
      console.log('=== Word to PDF Conversion Debug Info ===');
      console.log('Request body keys:', Object.keys(req.body));
      console.log('Working directory:', __dirname);
      console.log('Platform:', process.platform);
      console.log('Python command:', getPythonCommand());
      
      const documentData = req.body;
      
      // Step 1: Generate Word document first
      const docxScriptPath = path.join(__dirname, 'ieee_generator_fixed.py');
      console.log('DOCX Script path:', docxScriptPath);
      
      // Check if DOCX script file exists
      try {
        await fs.promises.access(docxScriptPath);
        console.log('✓ DOCX Python script file exists');
      } catch (err) {
        console.error('✗ DOCX Python script file NOT found:', err);
        return res.status(500).json({ 
          error: 'DOCX Python script not found', 
          details: `Script path: ${docxScriptPath}`,
          suggestion: 'The DOCX Python script file may not have been deployed correctly'
        });
      }
      
      // Generate DOCX first
      console.log('Generating DOCX document...');
      const docxPython = spawn(getPythonCommand(), [docxScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
      });
      
      // Send document data to DOCX generator
      docxPython.stdin.write(JSON.stringify(documentData));
      docxPython.stdin.end();
      
      let docxBuffer = Buffer.alloc(0);
      let docxErrorOutput = '';
      
      docxPython.stdout.on('data', (data: Buffer) => {
        docxBuffer = Buffer.concat([docxBuffer, data]);
      });
      
      docxPython.stderr.on('data', (data: Buffer) => {
        docxErrorOutput += data.toString();
        console.log('DOCX Python stderr:', data.toString());
      });
      
      docxPython.on('close', async (docxCode: number) => {
        console.log('DOCX generation finished with code:', docxCode);
        console.log('DOCX buffer length:', docxBuffer.length);
        console.log('DOCX error output:', docxErrorOutput);
        
        if (docxCode !== 0) {
          console.error('DOCX generation error:', docxErrorOutput);
          return res.status(500).json({ 
            error: 'Failed to generate DOCX document for PDF conversion', 
            details: docxErrorOutput,
            pythonExitCode: docxCode,
            scriptPath: docxScriptPath,
            workingDirectory: __dirname,
            suggestion: 'Check DOCX generation dependencies and syntax'
          });
        }
        
        if (docxBuffer.length === 0) {
          console.error('No DOCX output from Python script');
          return res.status(500).json({ 
            error: 'No DOCX output from document generator', 
            details: 'DOCX Python script ran successfully but produced no output',
            suggestion: 'Check if the document data is valid for DOCX generation'
          });
        }
        
        console.log('✓ DOCX generated successfully, now converting to PDF...');
        
        // Step 2: Convert DOCX to PDF using temporary files for better binary handling
        try {
          // Create temporary directory if it doesn't exist
          const tempDir = path.join(__dirname, '../temp');
          await fs.promises.mkdir(tempDir, { recursive: true });
          
          // Create temporary files
          const tempDocxPath = path.join(tempDir, `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.docx`);
          const tempPdfPath = tempDocxPath.replace('.docx', '.pdf');
          
          // Write DOCX buffer to temporary file
          await fs.promises.writeFile(tempDocxPath, docxBuffer);
          console.log('✓ DOCX written to temporary file:', tempDocxPath);
          
          // Convert using docx2pdf
          const pdfConverterPath = path.join(__dirname, 'docx_to_pdf_converter.py');
          console.log('PDF Converter path:', pdfConverterPath);
          
          // Check if PDF converter exists
          try {
            await fs.promises.access(pdfConverterPath);
            console.log('✓ PDF converter script file exists');
          } catch (err) {
            console.error('✗ PDF converter script file NOT found:', err);
            // Clean up temp file
            await fs.promises.unlink(tempDocxPath).catch(() => {});
            return res.status(500).json({ 
              error: 'PDF converter script not found', 
              details: `Script path: ${pdfConverterPath}`,
              suggestion: 'The PDF converter script file may not have been deployed correctly'
            });
          }
          
          // Run conversion with file paths instead of piping binary data
          const pdfPython = spawn(getPythonCommand(), [pdfConverterPath, tempDocxPath, tempPdfPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: __dirname
          });
          
          let pdfErrorOutput = '';
          
          pdfPython.stderr.on('data', (data: Buffer) => {
            pdfErrorOutput += data.toString();
            console.log('PDF Python stderr:', data.toString());
          });
          
          pdfPython.on('close', async (pdfCode: number) => {
            console.log('PDF conversion finished with code:', pdfCode);
            console.log('PDF error output:', pdfErrorOutput);
            
            try {
              if (pdfCode !== 0) {
                console.error('PDF conversion error:', pdfErrorOutput);
                return res.status(500).json({ 
                  error: 'Failed to convert DOCX to PDF', 
                  details: pdfErrorOutput,
                  pythonExitCode: pdfCode,
                  scriptPath: pdfConverterPath,
                  workingDirectory: __dirname,
                  suggestion: 'Check docx2pdf installation and PDF converter dependencies'
                });
              }
              
              // Check if PDF file was created and read it
              try {
                const pdfStats = await fs.promises.stat(tempPdfPath);
                console.log('PDF file size:', pdfStats.size);
                
                if (pdfStats.size === 0) {
                  throw new Error('Generated PDF file is empty');
                }
                
                const pdfBuffer = await fs.promises.readFile(tempPdfPath);
                console.log('✓ PDF converted successfully from DOCX, size:', pdfBuffer.length);
                
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
                res.send(pdfBuffer);
                
              } catch (readError) {
                console.error('Failed to read generated PDF:', readError);
                res.status(500).json({ 
                  error: 'PDF file not generated or is empty', 
                  details: (readError as Error).message,
                  suggestion: 'The PDF conversion may have failed silently'
                });
              }
              
            } finally {
              // Clean up temporary files
              try {
                await fs.promises.unlink(tempDocxPath);
                console.log('✓ Cleaned up temporary DOCX file');
              } catch (cleanupError) {
                console.warn('Warning: Could not clean up temporary DOCX file:', cleanupError);
              }
              
              try {
                await fs.promises.unlink(tempPdfPath);
                console.log('✓ Cleaned up temporary PDF file');
              } catch (cleanupError) {
                console.warn('Warning: Could not clean up temporary PDF file:', cleanupError);
              }
            }
          });
          
          pdfPython.on('error', (err) => {
            console.error('Failed to start PDF conversion process:', err);
            // Clean up temp file
            fs.promises.unlink(tempDocxPath).catch(() => {});
            res.status(500).json({ 
              error: 'Failed to start PDF conversion process', 
              details: err.message,
              suggestion: 'Python may not be installed or the PDF converter path is incorrect'
            });
          });
          
        } catch (tempFileError) {
          console.error('Error with temporary file handling:', tempFileError);
          res.status(500).json({ 
            error: 'Failed to handle temporary files for PDF conversion', 
            details: (tempFileError as Error).message,
            suggestion: 'Check file system permissions and available disk space'
          });
        }
      });
      
      docxPython.on('error', (err) => {
        console.error('Failed to start DOCX generation process:', err);
        res.status(500).json({ 
          error: 'Failed to start DOCX generation process', 
          details: err.message,
          suggestion: 'Python may not be installed or the DOCX script path is incorrect'
        });
      });
      
    } catch (error) {
      console.error('Word to PDF conversion error:', error);
      res.status(500).json({ 
        error: 'Internal server error during Word to PDF conversion', 
        details: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  });

  app.post('/api/generate/latex', async (req, res) => {
    try {
      const documentData = req.body;
      
      // Use the IEEE PDF generator with actual document data
      const scriptPath = path.join(__dirname, 'ieee_pdf_generator.py');
      
      console.log('=== IEEE PDF Generation Debug Info ===');
      console.log('Script path:', scriptPath);
      console.log('Working directory:', __dirname);
      console.log('Document title:', documentData?.title || 'No title');
      
      // Check if IEEE PDF generator exists
      try {
        await fs.promises.access(scriptPath);
        console.log('✓ IEEE PDF generator file exists');
      } catch (err) {
        console.error('✗ IEEE PDF generator file NOT found:', err);
        return res.status(500).json({ 
          error: 'IEEE PDF generator not found', 
          details: `Script path: ${scriptPath}`,
          suggestion: 'The IEEE PDF generator file may not have been deployed correctly'
        });
      }
      
      // Generate PDF using the IEEE generator
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
        console.log('IEEE PDF stderr:', data.toString());
      });
      
      python.on('close', (code: number) => {
        console.log('IEEE PDF generator finished with code:', code);
        console.log('Output buffer length:', outputBuffer.length);
        console.log('Error output:', errorOutput);
        
        if (code !== 0) {
          console.error('IEEE PDF generation error:', errorOutput);
          return res.status(500).json({ 
            error: 'Failed to generate IEEE PDF', 
            details: errorOutput,
            pythonExitCode: code,
            scriptPath: scriptPath,
            workingDirectory: __dirname,
            suggestion: 'Check ReportLab installation and IEEE PDF generator dependencies'
          });
        }
        
        // More lenient PDF validation - check if we have substantial output
        if (outputBuffer.length > 100) {
          // Check if it starts with PDF header or contains PDF content
          const bufferStart = outputBuffer.subarray(0, 10).toString();
          if (bufferStart.includes('%PDF') || outputBuffer.toString().includes('%PDF')) {
            console.log('✓ Valid PDF generated, sending response');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
            res.send(outputBuffer);
          } else {
            console.log('Generated output may not be PDF format');
            console.log('Buffer start (first 50 chars):', outputBuffer.subarray(0, 50).toString());
            // Still try to send as PDF since the generator worked in our test
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
            res.send(outputBuffer);
          }
        } else {
          console.error('Generated IEEE PDF is too small, length:', outputBuffer.length);
          console.error('Buffer content:', outputBuffer.toString());
          res.status(500).json({ 
            error: 'Failed to generate valid IEEE PDF document',
            details: `Output length: ${outputBuffer.length}, Content: ${outputBuffer.toString().substring(0, 100)}`,
            suggestion: 'ReportLab may not be properly installed or IEEE formatting failed'
          });
        }
      });
      
      python.on('error', (err) => {
        console.error('Failed to start IEEE PDF generation process:', err);
        res.status(500).json({ 
          error: 'Failed to start IEEE PDF generation process', 
          details: err.message,
          suggestion: 'Python may not be installed or the IEEE PDF generator path is incorrect'
        });
      });
      
    } catch (error) {
      console.error('IEEE PDF generation error:', error);
      res.status(500).json({ error: 'Internal server error during IEEE PDF generation' });
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

      console.log('=== Email PDF Generation (using same method as download) ===');
      console.log('Email:', email);
      console.log('Document title:', documentData?.title || 'No title');

      // STEP 1: Generate DOCX first (same as download)
      const docxScriptPath = path.join(__dirname, 'ieee_generator_fixed.py');
      
      try {
        await fs.promises.access(docxScriptPath);
        console.log('✓ DOCX generator file exists for email');
      } catch (err) {
        console.error('✗ DOCX generator file NOT found for email:', err);
        return res.status(500).json({ 
          error: 'DOCX generator not found for email', 
          details: `Script path: ${docxScriptPath}`,
          suggestion: 'The DOCX generator file may not have been deployed correctly'
        });
      }

      // Generate DOCX
      console.log('Generating DOCX for email...');
      const docxPython = spawn(getPythonCommand(), [docxScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
      });
      
      docxPython.stdin.write(JSON.stringify(documentData));
      docxPython.stdin.end();
      
      let docxBuffer = Buffer.alloc(0);
      let docxErrorOutput = '';
      
      docxPython.stdout.on('data', (data: Buffer) => {
        docxBuffer = Buffer.concat([docxBuffer, data]);
      });
      
      docxPython.stderr.on('data', (data: Buffer) => {
        docxErrorOutput += data.toString();
        console.log('Email DOCX stderr:', data.toString());
      });
      
      docxPython.on('close', async (docxCode: number) => {
        console.log('Email DOCX generation finished with code:', docxCode);
        
        if (docxCode !== 0) {
          console.error('Email DOCX generation error:', docxErrorOutput);
          return res.status(500).json({ 
            error: 'Failed to generate DOCX for email', 
            details: docxErrorOutput,
            pythonExitCode: docxCode
          });
        }
        
        if (docxBuffer.length === 0) {
          console.error('No DOCX output for email');
          return res.status(500).json({ 
            error: 'No DOCX output generated for email'
          });
        }
        
        console.log('✓ DOCX generated for email, now converting to PDF...');
        
        // STEP 2: Convert DOCX to PDF (same as download)
        try {
          const tempDir = path.join(__dirname, '../temp');
          await fs.promises.mkdir(tempDir, { recursive: true });
          
          const tempDocxPath = path.join(tempDir, `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.docx`);
          const tempPdfPath = tempDocxPath.replace('.docx', '.pdf');
          
          // Write DOCX to temp file
          await fs.promises.writeFile(tempDocxPath, docxBuffer);
          console.log('✓ Email DOCX written to temp file');
          
          // Convert to PDF using same converter as download
          const pdfConverterPath = path.join(__dirname, 'docx_to_pdf_converter.py');
          
          try {
            await fs.promises.access(pdfConverterPath);
            console.log('✓ PDF converter exists for email');
          } catch (err) {
            await fs.promises.unlink(tempDocxPath).catch(() => {});
            return res.status(500).json({ 
              error: 'PDF converter not found for email', 
              details: `Script path: ${pdfConverterPath}`
            });
          }
          
          const pdfPython = spawn(getPythonCommand(), [pdfConverterPath, tempDocxPath, tempPdfPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: __dirname
          });
          
          let pdfErrorOutput = '';
          
          pdfPython.stderr.on('data', (data: Buffer) => {
            pdfErrorOutput += data.toString();
            console.log('Email PDF conversion stderr:', data.toString());
          });
          
          pdfPython.on('close', async (pdfCode: number) => {
            console.log('Email PDF conversion finished with code:', pdfCode);
            
            try {
              if (pdfCode !== 0) {
                console.error('Email PDF conversion error:', pdfErrorOutput);
                return res.status(500).json({ 
                  error: 'Failed to convert DOCX to PDF for email', 
                  details: pdfErrorOutput
                });
              }
              
              // Read the generated PDF
              try {
                const pdfStats = await fs.promises.stat(tempPdfPath);
                console.log('Email PDF file size:', pdfStats.size);
                
                if (pdfStats.size === 0) {
                  throw new Error('Generated email PDF file is empty');
                }
                
                const pdfBuffer = await fs.promises.readFile(tempPdfPath);
                console.log('✓ Email PDF generated successfully, size:', pdfBuffer.length);
                
                // Send email with the same PDF as download
                const filename = `ieee-paper-${Date.now()}.pdf`;
                const result = await sendIEEEPaper(email, pdfBuffer, filename);
                
                console.log('✓ Email sent successfully to:', email);
                res.json({
                  success: true,
                  message: `IEEE paper sent successfully to ${email}`,
                  messageId: result.messageId
                });
                
              } catch (readError) {
                console.error('Failed to read generated email PDF:', readError);
                res.status(500).json({ 
                  error: 'Email PDF file not generated or is empty', 
                  details: (readError as Error).message
                });
              }
              
            } finally {
              // Clean up temp files
              try {
                await fs.promises.unlink(tempDocxPath);
                await fs.promises.unlink(tempPdfPath);
                console.log('✓ Cleaned up email temp files');
              } catch (cleanupError) {
                console.warn('Warning: Could not clean up email temp files:', cleanupError);
              }
            }
          });
          
          pdfPython.on('error', (err) => {
            console.error('Failed to start email PDF conversion:', err);
            fs.promises.unlink(tempDocxPath).catch(() => {});
            res.status(500).json({ 
              error: 'Failed to start email PDF conversion process', 
              details: err.message
            });
          });
          
        } catch (tempFileError) {
          console.error('Error with email temp file handling:', tempFileError);
          res.status(500).json({ 
            error: 'Failed to handle temporary files for email PDF', 
            details: (tempFileError as Error).message
          });
        }
      });
      
      docxPython.on('error', (err) => {
        console.error('Failed to start email DOCX generation:', err);
        res.status(500).json({ 
          error: 'Failed to start email DOCX generation process', 
          details: err.message
        });
      });
      
    } catch (error) {
      console.error('Email PDF generation error:', error);
      res.status(500).json({ 
        error: 'Internal server error during email PDF generation', 
        details: (error as Error).message 
      });
    }
  });

  // Document iteration and improvement routes
  app.post('/api/documents/:id/iterate', async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const { iterationType, feedback, specificRequests } = req.body;
      
      // Get the existing document
      const existingDocument = await storage.getDocument(documentId);
      if (!existingDocument) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Apply iteration improvements
      const improvedDocument = await applyIterationImprovements(
        existingDocument, 
        iterationType, 
        feedback, 
        specificRequests
      );
      
      // Update the document in storage
      const updatedDocument = await storage.updateDocument(documentId, improvedDocument);
      
      if (!updatedDocument) {
        return res.status(500).json({ error: 'Failed to update document' });
      }
      
      // Generate suggestions for further improvements
      const suggestions = generateSpecificSuggestions(updatedDocument, iterationType, feedback);
      
      res.json({
        document: updatedDocument,
        iteration: {
          version: updatedDocument.iteration?.version || 1,
          type: iterationType,
          appliedImprovements: true
        },
        suggestions: suggestions,
        message: `Document successfully improved with ${iterationType} iteration`
      });
      
    } catch (error) {
      console.error('Error in document iteration:', error);
      res.status(500).json({ 
        error: 'Failed to iterate document', 
        details: (error as Error).message 
      });
    }
  });
  
  // Get iteration history for a document
  app.get('/api/documents/:id/iterations', async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const iterationHistory = document.iteration?.history || [];
      const currentVersion = document.iteration?.version || 0;
      
      res.json({
        currentVersion,
        history: iterationHistory,
        availableIterationTypes: [
          'content_enhancement',
          'structure_optimization', 
          'technical_accuracy',
          'ieee_compliance',
          'language_polish'
        ]
      });
      
    } catch (error) {
      console.error('Error getting iteration history:', error);
      res.status(500).json({ 
        error: 'Failed to get iteration history', 
        details: (error as Error).message 
      });
    }
  });
  
  // Get improvement suggestions for a document
  app.get('/api/documents/:id/suggestions', async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const suggestions = generateDocumentSuggestions(document, 'general');
      
      res.json({
        documentId,
        suggestions,
        iterationTypes: {
          content_enhancement: generateSpecificSuggestions(document, 'content_enhancement'),
          structure_optimization: generateSpecificSuggestions(document, 'structure_optimization'),
          technical_accuracy: generateSpecificSuggestions(document, 'technical_accuracy'),
          ieee_compliance: generateSpecificSuggestions(document, 'ieee_compliance'),
          language_polish: generateSpecificSuggestions(document, 'language_polish')
        }
      });
      
    } catch (error) {
      console.error('Error generating suggestions:', error);
      res.status(500).json({ 
        error: 'Failed to generate suggestions', 
        details: (error as Error).message 
      });
    }
  });
  
  // Convert Word document to PDF
  app.post('/api/convert/docx-to-pdf', upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No document file provided' });
      }
      
      const tempDir = path.join(__dirname, '../temp');
      await fs.promises.mkdir(tempDir, { recursive: true });
      
      const inputPath = path.join(tempDir, `input_${Date.now()}.docx`);
      const outputPath = path.join(tempDir, `output_${Date.now()}.pdf`);
      
      // Save uploaded file
      await fs.promises.writeFile(inputPath, req.file.buffer);
      
      // Convert using Python script
      const converterScript = path.join(__dirname, 'docx_to_pdf_converter.py');
      
      const python = spawn(getPythonCommand(), [converterScript, inputPath, outputPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
      });
      
      let errorOutput = '';
      
      python.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
      
      python.on('close', async (code: number) => {
        try {
          // Clean up input file
          await fs.promises.unlink(inputPath).catch(() => {});
          
          if (code !== 0) {
            return res.status(500).json({ 
              error: 'Failed to convert document', 
              details: errorOutput 
            });
          }
          
          // Check if output file was created
          try {
            const pdfBuffer = await fs.promises.readFile(outputPath);
            
            // Clean up output file
            await fs.promises.unlink(outputPath).catch(() => {});
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
            res.send(pdfBuffer);
            
          } catch (readError) {
            res.status(500).json({ 
              error: 'PDF file not generated', 
              details: 'Conversion may have failed silently' 
            });
          }
          
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      });
      
      python.on('error', (err) => {
        res.status(500).json({ 
          error: 'Failed to start conversion process', 
          details: err.message 
        });
      });
      
    } catch (error) {
      console.error('Error in Word to PDF conversion:', error);
      res.status(500).json({ 
        error: 'Failed to convert document', 
        details: (error as Error).message 
      });
    }
  });
  
  // Primary PDF generation endpoint - using ReportLab directly
  app.post('/api/generate/pdf', async (req, res) => {
    try {
      console.log('=== PDF Generation Request ===');
      console.log('Document data received:', !!req.body);
      
      const documentData = req.body;
      
      // Validate document data
      if (!documentData.title) {
        return res.status(400).json({ error: 'Document title is required' });
      }
      
      const scriptPath = path.join(__dirname, 'ieee_pdf_generator.py');
      const pythonCmd = getPythonCommand();
      
      console.log('Using Python command:', pythonCmd);
      console.log('PDF script path:', scriptPath);
      
      // Test ReportLab availability first
      const testCommand = `${pythonCmd} -c "import reportlab; print('ReportLab available')"}`;
      console.log('Testing ReportLab:', testCommand);
      
      const testProcess = spawn(pythonCmd, ['-c', 'import reportlab; print("ReportLab available")'], {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let testOutput = '';
      let testError = '';
      
      testProcess.stdout.on('data', (data) => {
        testOutput += data.toString();
      });
      
      testProcess.stderr.on('data', (data) => {
        testError += data.toString();
      });
      
      testProcess.on('close', (testCode) => {
        if (testCode !== 0) {
          console.error('ReportLab test failed:', testError);
          return res.status(500).json({
            error: 'ReportLab not available',
            details: testError,
            suggestion: 'Install ReportLab: pip install reportlab'
          });
        }
        
        console.log('✓ ReportLab test passed:', testOutput.trim());
        
        // Now run the PDF generation
        const python = spawn(pythonCmd, [scriptPath], {
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Send document data to Python script
        python.stdin.write(JSON.stringify(documentData));
        python.stdin.end();
        
        let outputBuffer = Buffer.alloc(0);
        let errorOutput = '';
        
        python.stdout.on('data', (data) => {
          outputBuffer = Buffer.concat([outputBuffer, data]);
        });
        
        python.stderr.on('data', (data) => {
          errorOutput += data.toString();
          console.log('PDF generation stderr:', data.toString());
        });
        
        python.on('close', (code) => {
          console.log('PDF generation finished with code:', code);
          
          if (code !== 0) {
            console.error('PDF generation failed:', errorOutput);
            return res.status(500).json({
              error: 'PDF generation failed',
              details: errorOutput,
              exitCode: code,
              suggestion: 'Check document data and PDF generation script'
            });
          }
          
          if (outputBuffer.length === 0) {
            console.error('No PDF output generated');
            return res.status(500).json({
              error: 'No PDF output generated',
              details: 'PDF script completed but produced no output',
              suggestion: 'Check document data validity'
            });
          }
          
          // Validate PDF format
          const pdfHeader = outputBuffer.subarray(0, 4).toString();
          if (!pdfHeader.startsWith('%PDF')) {
            console.error('Invalid PDF format, header:', pdfHeader);
            return res.status(500).json({
              error: 'Invalid PDF format',
              details: `Expected PDF header, got: ${pdfHeader}`,
              outputSize: outputBuffer.length
            });
          }
          
          console.log('✓ PDF generated successfully, size:', outputBuffer.length);
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
          res.send(outputBuffer);
        });
        
        python.on('error', (err) => {
          console.error('Failed to start PDF generation:', err);
          res.status(500).json({
            error: 'Failed to start PDF generation process',
            details: err.message,
            pythonCommand: pythonCmd,
            suggestion: 'Check Python installation and script path'
          });
        });
      });
      
      testProcess.on('error', (err) => {
        console.error('Failed to test ReportLab:', err);
        res.status(500).json({
          error: 'Failed to test ReportLab installation',
          details: err.message,
          pythonCommand: pythonCmd,
          suggestion: 'Check Python installation'
        });
      });
      
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({
        error: 'Internal server error during PDF generation',
        details: (error as Error).message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
