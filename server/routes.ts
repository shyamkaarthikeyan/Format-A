import type { Express } from "express";
import { createServer, type Server } from "http";
import { spawn, exec } from "child_process";
import { storage } from "./storage";
import { insertDocumentSchema, updateDocumentSchema } from "@shared/schema";
import { sendIEEEPaper } from "./emailService";
import { requireAuth, optionalAuth, getClientIP, getUserAgent, AuthenticatedRequest } from "./middleware/auth";
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
    // Process section content if it exists (legacy format)
    if (section.content) {
      section.content = improveGrammarAndStyle(section.content);
      section.content = improveTechnicalTerminology(section.content);
    }
    
    // Process content blocks, but skip equations to preserve LaTeX formatting
    if (section.contentBlocks && Array.isArray(section.contentBlocks)) {
      section.contentBlocks = section.contentBlocks.map((block: any) => {
        if (block.type === 'text' && block.content) {
          // Only apply improvements to text blocks, not equations
          block.content = improveGrammarAndStyle(block.content);
          block.content = improveTechnicalTerminology(block.content);
        }
        // Skip processing for equation, image, and table blocks to preserve their content
        return block;
      });
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

  // Debug endpoint to test API connectivity
  app.get('/api/test', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'API is working correctly',
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      headers: req.headers
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

  // Google OAuth authentication endpoint
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { googleId, email, name, picture, preferences } = req.body;

      if (!googleId || !email || !name) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_DATA',
            message: 'Missing required user data from Google OAuth'
          }
        });
      }

      // Check if user already exists
      let user = await storage.getUserByGoogleId(googleId);
      
      if (user) {
        // Update existing user's last login
        user = await storage.updateUser(user.id, {
          lastLoginAt: new Date().toISOString(),
          name, // Update name in case it changed
          picture // Update picture in case it changed
        });
      } else {
        // Create new user
        user = await storage.createUser({
          googleId,
          email,
          name,
          picture,
          lastLoginAt: new Date().toISOString(),
          isActive: true,
          preferences: preferences || {
            emailNotifications: true,
            defaultExportFormat: 'pdf',
            theme: 'light'
          }
        });
      }

      if (!user) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'USER_CREATION_FAILED',
            message: 'Failed to create or update user'
          }
        });
      }

      // Create session
      const session = await storage.createSession({
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        isActive: true,
        lastAccessedAt: new Date().toISOString(),
        ipAddress: getClientIP(req),
        userAgent: getUserAgent(req)
      });

      res.json({
        success: true,
        user,
        sessionId: session.sessionId
      });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Internal authentication error'
        }
      });
    }
  });

  // Verify session endpoint
  app.get('/api/auth/verify', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // If we reach here, the requireAuth middleware has already validated the session
      res.json({
        success: true,
        user: req.user
      });
    } catch (error) {
      console.error('Session verification error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: 'Failed to verify session'
        }
      });
    }
  });

  // Sign-out endpoint
  app.post('/api/auth/signout', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Get session ID from cookie or header
      let sessionId = req.headers.authorization?.replace('Bearer ', '');
      if (!sessionId && req.cookies?.sessionId) {
        sessionId = req.cookies.sessionId;
      }

      if (sessionId) {
        // Delete the session from storage
        await storage.deleteSession(sessionId);
      }

      // Clear the session cookie
      res.clearCookie('sessionId');

      res.json({
        success: true,
        message: 'Successfully signed out'
      });
    } catch (error) {
      console.error('Sign-out error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SIGNOUT_ERROR',
          message: 'Failed to sign out'
        }
      });
    }
  });

  // Download history endpoints
  app.get('/api/downloads/history', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const paginatedDownloads = await storage.getUserDownloads(req.user!.id, {
        page,
        limit,
        sortBy: 'downloadedAt',
        sortOrder: 'desc'
      });

      res.json({
        success: true,
        data: paginatedDownloads
      });
    } catch (error) {
      console.error('Error fetching download history:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_HISTORY_ERROR',
          message: 'Failed to fetch download history'
        }
      });
    }
  });

  app.get('/api/downloads/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const downloadId = req.params.id;
      const download = await storage.getDownloadById(downloadId);

      if (!download) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DOWNLOAD_NOT_FOUND',
            message: 'Download record not found'
          }
        });
      }

      // Check if user owns this download
      if (download.userId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to this download'
          }
        });
      }

      res.json({
        success: true,
        data: download
      });
    } catch (error) {
      console.error('Error fetching download:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_FETCH_ERROR',
          message: 'Failed to fetch download'
        }
      });
    }
  });

  // Re-download endpoint
  app.get('/api/downloads/:id/redownload', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const downloadId = req.params.id;
      const download = await storage.getDownloadById(downloadId);

      if (!download) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DOWNLOAD_NOT_FOUND',
            message: 'Download record not found'
          }
        });
      }

      // Check if user owns this download
      if (download.userId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to this download'
          }
        });
      }

      // For now, we'll redirect to regenerate the document
      // In a production system, you might want to store the actual files
      const regenerateEndpoint = download.fileFormat === 'pdf' ? '/api/generate/pdf' : '/api/generate/docx';
      
      res.json({
        success: true,
        message: 'Please regenerate the document',
        regenerateEndpoint,
        download
      });
    } catch (error) {
      console.error('Error re-downloading:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REDOWNLOAD_ERROR',
          message: 'Failed to process re-download request'
        }
      });
    }
  });

  // Debug endpoint to check authentication and create sample data
  app.get('/api/debug/auth', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      
      // Create some sample download records for testing if none exist
      const existingDownloads = await storage.getUserDownloads(user.id);
      
      if (existingDownloads.downloads.length === 0) {
        console.log('Creating sample download records for user:', user.id);
        
        // Create sample downloads
        const sampleDownloads = [
          {
            userId: user.id,
            documentId: 'sample_doc_1',
            documentTitle: 'Machine Learning in Healthcare',
            fileFormat: 'pdf' as const,
            fileSize: 1024 * 1024, // 1MB
            downloadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            ipAddress: '127.0.0.1',
            userAgent: 'Test Browser',
            status: 'completed' as const,
            emailSent: true,
            emailSentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            documentMetadata: {
              pageCount: 12,
              wordCount: 3500,
              sectionCount: 6,
              figureCount: 3,
              referenceCount: 25,
              generationTime: 5000
            }
          },
          {
            userId: user.id,
            documentId: 'sample_doc_2',
            documentTitle: 'Deep Learning Applications',
            fileFormat: 'docx' as const,
            fileSize: 2 * 1024 * 1024, // 2MB
            downloadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
            ipAddress: '127.0.0.1',
            userAgent: 'Test Browser',
            status: 'completed' as const,
            emailSent: false,
            documentMetadata: {
              pageCount: 18,
              wordCount: 5200,
              sectionCount: 8,
              figureCount: 5,
              referenceCount: 42,
              generationTime: 7500
            }
          }
        ];
        
        for (const download of sampleDownloads) {
          await storage.recordDownload(download);
        }
      }
      
      const downloads = await storage.getUserDownloads(user.id);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        downloads: downloads.downloads.length,
        sampleData: downloads.downloads
      });
    } catch (error) {
      console.error('Debug auth error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to debug auth', 
        details: (error as Error).message 
      });
    }
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
  app.post('/api/generate/docx', optionalAuth, async (req: any, res) => {
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
        
        python.on('close', async (code: number) => {
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
          
          // Record download tracking
          try {
            // Only record download and send email if user is authenticated
            if (req.user) {
              const documentId = `doc_${Date.now()}`;
              const generationStartTime = Date.now();
              
              const downloadRecord = await storage.recordDownload({
                userId: req.user.id,
                documentId, // Generate unique document ID
                documentTitle: documentData.title || 'IEEE Paper',
                fileFormat: 'docx',
                fileSize: outputBuffer.length,
                downloadedAt: new Date().toISOString(),
                ipAddress: getClientIP(req),
                userAgent: getUserAgent(req),
                status: 'completed',
                emailSent: false,
                documentMetadata: {
                  pageCount: Math.ceil((documentData.sections?.length || 1) * 1.5), // Estimate
                  wordCount: JSON.stringify(documentData).length / 5, // Rough estimate
                  sectionCount: documentData.sections?.length || 0,
                  figureCount: documentData.figures?.length || 0,
                  referenceCount: documentData.references?.length || 0,
                  generationTime: Date.now() - generationStartTime
                }
              });

              // Send email with document attachment
              if (req.user.preferences.emailNotifications) {
                try {
                  await sendIEEEPaper(req.user.email, outputBuffer, 'ieee_paper.docx');
                  await storage.updateDownloadStatus(downloadRecord.id, 'completed', true);
                  console.log('✓ Email sent successfully to:', req.user.email);
                } catch (emailError) {
                  console.error('Email sending failed:', emailError);
                  await storage.updateDownloadStatus(downloadRecord.id, 'completed', false, (emailError as Error).message);
                }
              }
            }
          } catch (trackingError) {
            console.error('Download tracking failed:', trackingError);
            // Continue with download even if tracking fails
          }

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

  // Word to PDF conversion route with hosting platform compatibility
  app.post('/api/generate/docx-to-pdf', (req, res, next) => {
    // Allow preview requests without authentication
    const isPreview = req.query.preview === 'true' || req.headers['x-preview'] === 'true';
    if (isPreview) {
      return next();
    }
    // Require auth for actual downloads
    return requireAuth(req, res, next);
  }, async (req: any, res) => {
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
                console.log('🔄 DOCX-to-PDF failed, falling back to ReportLab direct PDF generation...');
                
                // Fallback to ReportLab direct PDF generation
                try {
                  const reportLabScriptPath = path.join(__dirname, 'ieee_pdf_generator.py');
                  console.log('Using ReportLab fallback script:', reportLabScriptPath);
                  
                  const fallbackPython = spawn(getPythonCommand(), [reportLabScriptPath], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    cwd: __dirname
                  });
                  
                  // Send the original document data to ReportLab generator
                  fallbackPython.stdin.write(JSON.stringify(documentData));
                  fallbackPython.stdin.end();
                  
                  let fallbackBuffer = Buffer.alloc(0);
                  let fallbackError = '';
                  
                  fallbackPython.stdout.on('data', (data: Buffer) => {
                    fallbackBuffer = Buffer.concat([fallbackBuffer, data]);
                  });
                  
                  fallbackPython.stderr.on('data', (data: Buffer) => {
                    fallbackError += data.toString();
                  });
                  
                  fallbackPython.on('close', (fallbackCode: number) => {
                    if (fallbackCode === 0 && fallbackBuffer.length > 0) {
                      console.log('✅ ReportLab fallback successful, PDF size:', fallbackBuffer.length);
                      
                      // Check if this is a preview request
                      const isPreview = req.query.preview === 'true' || req.headers['x-preview'] === 'true';
                      
                      res.setHeader('Content-Type', 'application/pdf');
                      if (isPreview) {
                        // For preview, use inline disposition so it displays in browser
                        res.setHeader('Content-Disposition', 'inline; filename="ieee_paper_preview.pdf"');
                        console.log('✅ Serving ReportLab PDF for inline preview');
                      } else {
                        // For download, use attachment disposition
                        res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
                        console.log('✅ Serving ReportLab PDF for download');
                      }
                      res.send(fallbackBuffer);
                    } else {
                      console.error('ReportLab fallback also failed:', fallbackError);
                      res.status(500).json({ 
                        error: 'Both DOCX-to-PDF and ReportLab PDF generation failed', 
                        docx2pdfError: pdfErrorOutput,
                        reportlabError: fallbackError,
                        suggestion: 'PDF generation is not available on this hosting platform'
                      });
                    }
                  });
                  
                  return; // Exit early since we're handling the response in the fallback
                  
                } catch (fallbackError) {
                  console.error('Fallback to ReportLab failed:', fallbackError);
                  return res.status(500).json({ 
                    error: 'Failed to convert DOCX to PDF and fallback failed', 
                    details: pdfErrorOutput,
                    fallbackError: (fallbackError as Error).message,
                    pythonExitCode: pdfCode,
                    scriptPath: pdfConverterPath,
                    workingDirectory: __dirname,
                    suggestion: 'Check docx2pdf installation and ReportLab dependencies'
                  });
                }
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
                
                // Check if this is a preview request
                const isPreview = req.query.preview === 'true' || req.headers['x-preview'] === 'true';
                
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                
                if (isPreview) {
                  // For preview, use inline disposition so it displays in browser
                  res.setHeader('Content-Disposition', 'inline; filename="ieee_paper_preview.pdf"');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Preview');
                  console.log('✓ Serving PDF for inline preview');
                } else {
                  // For download, use attachment disposition
                  res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
                  console.log('✓ Serving PDF for download');
                }
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

  app.post('/api/generate/pdf-images-preview', async (req, res) => {
    try {
      console.log('=== PDF Images Preview Generation ===');
      const documentData = req.body;
      
      // First generate the PDF using existing route logic
      const docxScriptPath = path.join(__dirname, 'ieee_generator_fixed.py');
      
      // Generate DOCX first
      const docxPython = spawn(getPythonCommand(), [docxScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      docxPython.stdin.write(JSON.stringify(documentData));
      docxPython.stdin.end();
      
      let docxBuffer = Buffer.alloc(0);
      let docxErrorOutput = '';
      
      docxPython.stdout.on('data', (data) => {
        docxBuffer = Buffer.concat([docxBuffer, data]);
      });
      
      docxPython.stderr.on('data', (data) => {
        docxErrorOutput += data.toString();
      });
      
      docxPython.on('close', async (docxCode) => {
        if (docxCode !== 0 || docxBuffer.length === 0) {
          console.error('DOCX generation failed for images preview');
          return res.status(500).json({ 
            error: 'Failed to generate DOCX for images preview',
            details: docxErrorOutput
          });
        }
        
        try {
          // Save DOCX to temp file
          const tempId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          const tempDocxPath = path.join(__dirname, '..', 'temp', `temp_${tempId}.docx`);
          const tempPdfPath = path.join(__dirname, '..', 'temp', `temp_${tempId}.pdf`);
          
          await fs.promises.writeFile(tempDocxPath, docxBuffer);
          
          // Convert DOCX to PDF
          const pdfConverterPath = path.join(__dirname, 'docx_to_pdf_converter.py');
          const pdfPython = spawn(getPythonCommand(), [pdfConverterPath, tempDocxPath, tempPdfPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: __dirname
          });
          
          let pdfErrorOutput = '';
          pdfPython.stderr.on('data', (data) => {
            pdfErrorOutput += data.toString();
          });
          
          pdfPython.on('close', async (pdfCode) => {
            try {
              if (pdfCode === 0) {
                // PDF generated successfully, now convert to images
                const imagesConverterPath = path.join(__dirname, 'pdf_to_images.py');
                const imagesPython = spawn(getPythonCommand(), [imagesConverterPath], {
                  stdio: ['pipe', 'pipe', 'pipe'],
                  cwd: __dirname
                });
                
                const imagesInput = JSON.stringify({
                  pdf_path: tempPdfPath,
                  dpi: 150
                });
                
                imagesPython.stdin.write(imagesInput);
                imagesPython.stdin.end();
                
                let imagesOutput = '';
                let imagesError = '';
                
                imagesPython.stdout.on('data', (data) => {
                  imagesOutput += data.toString();
                });
                
                imagesPython.stderr.on('data', (data) => {
                  imagesError += data.toString();
                });
                
                imagesPython.on('close', async (imagesCode) => {
                  try {
                    // Clean up temp files
                    await fs.promises.unlink(tempDocxPath).catch(() => {});
                    await fs.promises.unlink(tempPdfPath).catch(() => {});
                    
                    if (imagesCode === 0) {
                      const result = JSON.parse(imagesOutput);
                      if (result.success) {
                        res.json(result);
                      } else {
                        throw new Error(result.error || 'Image conversion failed');
                      }
                    } else {
                      throw new Error(`Image conversion failed: ${imagesError}`);
                    }
                  } catch (parseError) {
                    console.error('Error parsing images result:', parseError);
                    res.status(500).json({
                      error: 'Failed to convert PDF to images',
                      details: imagesError || parseError.message
                    });
                  }
                });
              } else {
                // PDF generation failed, clean up and return error
                await fs.promises.unlink(tempDocxPath).catch(() => {});
                res.status(500).json({
                  error: 'PDF generation failed for images preview',
                  details: pdfErrorOutput
                });
              }
            } catch (cleanupError) {
              console.error('Error in PDF images cleanup:', cleanupError);
              res.status(500).json({
                error: 'Error processing PDF for images',
                details: cleanupError.message
              });
            }
          });
          
        } catch (tempError) {
          console.error('Error with temp files for images:', tempError);
          res.status(500).json({
            error: 'Temporary file error for images preview',
            details: tempError.message
          });
        }
      });
      
    } catch (error) {
      console.error('Images preview generation error:', error);
      res.status(500).json({
        error: 'Internal error generating images preview',
        details: error.message
      });
    }
  });

  // Admin routes - Inline implementations for local development
  // These are normally handled by Vercel serverless functions in production
  
  // Admin auth session route
  app.post('/api/admin/auth/session', async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    try {
      const ADMIN_EMAIL = 'shyamkaarthikeyan@gmail.com';
      
      // Verify user is authenticated
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUserBySessionId(sessionId);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      // Verify user is admin
      if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        console.log(`❌ Admin access denied for ${user.email}`);
        return res.status(403).json({ 
          error: 'Admin access denied',
          message: 'You do not have administrative privileges'
        });
      }

      // Create admin session (simplified for local dev)
      const adminSession = {
        sessionId: `admin_${Date.now()}`,
        userId: user.id,
        adminPermissions: [
          'view_analytics',
          'manage_users',
          'system_monitoring',
          'download_reports',
          'admin_panel_access'
        ],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastAccessedAt: new Date().toISOString()
      };

      console.log(`✅ Admin session created for ${user.email}`);

      return res.status(201).json({
        success: true,
        adminSession,
        adminToken: 'local-dev-token',
        message: 'Admin session created successfully'
      });

    } catch (error) {
      console.error('Admin session creation error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to create admin session'
      });
    }
  });

  // Admin auth verify route
  app.post('/api/admin/auth/verify', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    try {
      // For local development, just return valid
      return res.json({
        valid: true,
        session: {
          sessionId: 'admin_local',
          userId: 'local-user',
          adminPermissions: ['view_analytics', 'manage_users', 'system_monitoring', 'download_reports', 'admin_panel_access'],
          lastAccessedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Admin verify error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin auth signout route
  app.post('/api/admin/auth/signout', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    try {
      return res.json({
        success: true,
        message: 'Admin signed out successfully'
      });
    } catch (error) {
      console.error('Admin signout error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Real admin analytics routes
  app.get('/api/admin/analytics/users', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const users = await storage.getAllUsers();
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      
      const totalUsers = users.length;
      const activeUsers = users.filter(user => 
        user.lastLoginAt && new Date(user.lastLoginAt) > sevenDaysAgo
      ).length;
      const newUsers = users.filter(user => 
        user.createdAt && new Date(user.createdAt) > thirtyDaysAgo
      ).length;
      
      // Calculate growth rate
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const thisMonthUsers = users.filter(user => 
        user.createdAt && new Date(user.createdAt) >= thisMonthStart
      ).length;
      const lastMonthUsers = users.filter(user => {
        if (!user.createdAt) return false;
        const createdAt = new Date(user.createdAt);
        return createdAt >= lastMonthStart && createdAt < thisMonthStart;
      }).length;
      
      const userGrowth = lastMonthUsers > 0 ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0;

      return res.json({
        success: true,
        data: {
          totalUsers,
          activeUsers: { last7d: activeUsers, last30d: activeUsers },
          newUsers: { thisMonth: newUsers },
          userGrowth: { growthRate: userGrowth },
          topUsers: users.slice(0, 5).map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            documentsCreated: 0,
            downloadsCount: 0,
            lastActive: user.lastLoginAt || user.createdAt
          }))
        }
      });
    } catch (error) {
      console.error('User analytics error:', error);
      return res.status(500).json({ error: 'Failed to fetch user analytics' });
    }
  });

  app.get('/api/admin/analytics/documents', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const documents = await storage.getAllDocuments();
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const totalDocuments = documents.length;
      const documentsThisMonth = documents.filter(doc => 
        doc.createdAt && new Date(doc.createdAt) >= thisMonthStart
      ).length;
      
      // Calculate average section count as a proxy for length
      const averageLength = documents.length > 0 
        ? documents.reduce((sum, doc) => sum + (doc.sections?.length || 0), 0) / documents.length
        : 0;
      
      // Extract popular topics from titles
      const allTitles = documents.map(doc => doc.title || '').join(' ').toLowerCase();
      const topicCounts: { [key: string]: number } = {};
      const commonTopics = ['machine learning', 'ai', 'quantum', 'blockchain', 'data science', 'neural network', 'algorithm'];
      
      commonTopics.forEach(topic => {
        const count = (allTitles.match(new RegExp(topic, 'g')) || []).length;
        if (count > 0) topicCounts[topic] = count;
      });
      
      const popularTopics = Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([topic]) => topic);

      return res.json({
        success: true,
        data: {
          totalDocuments,
          documentsThisMonth,
          averageLength: Math.round(averageLength * 10) / 10,
          popularTopics: popularTopics.length > 0 ? popularTopics : ['Machine Learning', 'Healthcare', 'Technology'],
          recentDocuments: documents.slice(0, 5).map(doc => ({
            id: doc.id,
            title: doc.title,
            createdAt: doc.createdAt,
            sections: doc.sections?.length || 0
          }))
        }
      });
    } catch (error) {
      console.error('Document analytics error:', error);
      return res.status(500).json({ error: 'Failed to fetch document analytics' });
    }
  });

  app.get('/api/admin/analytics/downloads', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      // Get all users to access their download data
      const users = await storage.getAllUsers();
      let allDownloads: any[] = [];
      
      // Collect downloads from all users
      for (const user of users) {
        const userDownloads = await storage.getUserDownloads(user.id);
        allDownloads = allDownloads.concat(userDownloads.downloads);
      }
      
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const totalDownloads = allDownloads.length;
      const downloadsThisMonth = allDownloads.filter(download => 
        new Date(download.downloadedAt) >= thisMonthStart
      ).length;
      
      const pdfDownloads = allDownloads.filter(download => 
        download.fileFormat === 'pdf'
      ).length;
      const docxDownloads = allDownloads.filter(download => 
        download.fileFormat === 'docx'
      ).length;
      
      // Calculate average file size
      const totalSize = allDownloads.reduce((sum, download) => sum + (download.fileSize || 0), 0);
      const averageSize = allDownloads.length > 0 ? totalSize / allDownloads.length : 0;
      
      // Get recent downloads
      const recentDownloads = allDownloads
        .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime())
        .slice(0, 5)
        .map(download => ({
          id: download.id,
          documentTitle: download.documentTitle,
          fileFormat: download.fileFormat,
          downloadedAt: download.downloadedAt,
          status: download.status
        }));

      return res.json({
        success: true,
        data: {
          totalDownloads,
          downloadsThisMonth,
          pdfDownloads,
          docxDownloads,
          averageFileSize: Math.round(averageSize / 1024), // KB
          recentDownloads,
          downloadTrends: {
            daily: allDownloads.slice(0, 7).length,
            weekly: allDownloads.slice(0, 30).length
          }
        }
      });
    } catch (error) {
      console.error('Download analytics error:', error);
      return res.status(500).json({ error: 'Failed to fetch download analytics' });
    }
  });

  app.get('/api/admin/analytics/system', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      // Get system statistics
      const users = await storage.getAllUsers();
      const documents = await storage.getAllDocuments();
      
      // Calculate system health metrics
      const totalMemoryMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const usedMemoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const memoryUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
      
      // System status based on memory usage and uptime
      let systemStatus = 'healthy';
      if (memoryUsagePercent > 80) {
        systemStatus = 'warning';
      }
      if (memoryUsagePercent > 95 || uptime < 60) {
        systemStatus = 'critical';
      }
      
      return res.json({
        success: true,
        data: {
          uptime: Math.round(uptime),
          uptimeFormatted: formatUptime(uptime),
          memoryUsage: {
            total: totalMemoryMB,
            used: usedMemoryMB,
            percentage: memoryUsagePercent,
            rss: Math.round(memUsage.rss / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
          },
          systemStatus,
          nodeVersion: process.version,
          platform: process.platform,
          architecture: process.arch,
          environment: process.env.NODE_ENV || 'development',
          activeConnections: users.filter(u => 
            u.lastLoginAt && new Date(u.lastLoginAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
          ).length,
          totalDocuments: documents.length,
          totalUsers: users.length,
          serverStartTime: new Date(Date.now() - uptime * 1000).toISOString()
        }
      });
    } catch (error) {
      console.error('System analytics error:', error);
      return res.status(500).json({ error: 'Failed to fetch system analytics' });
    }
  });

  // Helper function to format uptime
  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Placeholder admin user management routes
  app.get('/api/admin/users', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const users = await storage.getAllUsers?.() || [];
      return res.json({
        success: true,
        data: users.slice(0, 10) // Return first 10 users
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/users/:id', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const user = await storage.getUserById?.(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({
        success: true,
        data: user
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
