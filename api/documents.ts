import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Documents API - Routes document generation requests to Python serverless functions
 * 
 * This API replaces child_process.spawn calls with HTTP requests to Python functions
 * for Vercel serverless compatibility.
 */

interface DocumentRequest {
  title: string;
  authors: Array<{
    name: string;
    affiliation?: string;
    email?: string;
    department?: string;
    organization?: string;
    city?: string;
    state?: string;
    tamilnadu?: string;
    custom_fields?: Array<{ value: string }>;
  }>;
  abstract?: string;
  keywords?: string;
  sections?: Array<{
    title: string;
    content?: string;
    contentBlocks?: Array<{
      type: 'text' | 'image';
      content?: string;
      data?: string;
      caption?: string;
      size?: string;
    }>;
    subsections?: Array<{
      id: string;
      title: string;
      content: string;
      level?: number;
      parentId?: string;
    }>;
  }>;
  references?: Array<{
    authors?: string;
    title?: string;
    journal?: string;
    year?: string;
    pages?: string;
  }>;
}

interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: string;
  suggestion?: string;
  timestamp: string;
}

interface SuccessResponse {
  success: true;
  message: string;
  data?: any;
  metadata?: any;
}

/**
 * Validate document request data
 */
function validateDocumentRequest(data: any): { isValid: boolean; error?: string } {
  if (!data) {
    return { isValid: false, error: 'Request body is required' };
  }

  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    return { isValid: false, error: 'Document title is required' };
  }

  if (!data.authors || !Array.isArray(data.authors) || data.authors.length === 0) {
    return { isValid: false, error: 'At least one author is required' };
  }

  const hasValidAuthor = data.authors.some((author: any) => 
    author && typeof author.name === 'string' && author.name.trim()
  );

  if (!hasValidAuthor) {
    return { isValid: false, error: 'At least one author must have a valid name' };
  }

  return { isValid: true };
}

/**
 * Create error response with consistent format
 */
function createErrorResponse(
  status: number,
  code: string,
  message: string,
  details?: string,
  suggestion?: string
): { status: number; response: ErrorResponse } {
  return {
    status,
    response: {
      success: false,
      error: message,
      code,
      details,
      suggestion,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Call Python serverless function via HTTP
 */
async function callPythonFunction(
  endpoint: string,
  data: any,
  options: {
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<Response> {
  const { method = 'POST', headers = {}, timeout = 30000 } = options;
  
  // Get the base URL for internal function calls
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://format-a.vercel.app';

  const url = `${baseUrl}/api/${endpoint}`;
  
  console.log(`Calling Python function: ${method} ${url}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Format-A-Internal',
        ...headers
      },
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    
    throw error;
  }
}

/**
 * Handle authentication and request validation
 */
function validateRequest(req: NextApiRequest): { isValid: boolean; error?: { status: number; response: ErrorResponse } } {
  // Check request method
  if (req.method !== 'POST' && req.method !== 'GET') {
    return {
      isValid: false,
      error: createErrorResponse(405, 'METHOD_NOT_ALLOWED', 'Only POST and GET methods are allowed')
    };
  }

  // For POST requests, check content type and validate document data
  if (req.method === 'POST') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return {
        isValid: false,
        error: createErrorResponse(400, 'INVALID_CONTENT_TYPE', 'Content-Type must be application/json')
      };
    }

    // Validate document data
    const validation = validateDocumentRequest(req.body);
    if (!validation.isValid) {
      return {
        isValid: false,
        error: createErrorResponse(400, 'INVALID_DOCUMENT_DATA', validation.error!)
      };
    }
  }

  return { isValid: true };
}

/**
 * Main document generation handler
 */
export async function handleDocumentGeneration(req: NextApiRequest, res: NextApiResponse) {
  const requestId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] Document API request: ${req.method} ${req.url}`);
  
  try {
    // Validate request
    const validation = validateRequest(req);
    if (!validation.isValid) {
      const { status, response } = validation.error!;
      console.log(`[${requestId}] Request validation failed: ${response.error}`);
      return res.status(status).json(response);
    }

    // Extract query parameters
    const { preview, download, format } = req.query;
    const isPreview = preview === 'true';
    const isDownload = download === 'true';
    const outputFormat = format as string || 'pdf';

    console.log(`[${requestId}] Processing document request - Preview: ${isPreview}, Download: ${isDownload}, Format: ${outputFormat}`);

    // Route to appropriate Python function based on request type
    let pythonEndpoint: string;
    let queryParams = '';

    if (outputFormat === 'docx' || req.url?.includes('/docx')) {
      // Generate DOCX using Python function
      pythonEndpoint = 'generate-pdf.py';
      queryParams = '?format=docx';
    } else {
      // Generate PDF using Python function
      pythonEndpoint = 'generate-pdf.py';
      if (isPreview) {
        queryParams = '?preview=true';
      }
    }

    // Call Python serverless function
    try {
      console.log(`[${requestId}] Calling Python function: ${pythonEndpoint}${queryParams}`);
      
      const pythonResponse = await callPythonFunction(
        `${pythonEndpoint}${queryParams}`,
        req.body,
        {
          headers: {
            'X-Request-ID': requestId,
            'X-Preview': isPreview ? 'true' : 'false',
            'X-Download': isDownload ? 'true' : 'false'
          },
          timeout: 45000 // 45 second timeout for document generation
        }
      );

      console.log(`[${requestId}] Python function response: ${pythonResponse.status} ${pythonResponse.statusText}`);

      // Handle Python function response
      if (!pythonResponse.ok) {
        // Try to get error details from Python function
        let errorMessage = `Python function failed: ${pythonResponse.statusText}`;
        let errorCode = 'PYTHON_FUNCTION_ERROR';
        let suggestion = 'Please try again or contact support if the issue persists.';

        try {
          const errorData = await pythonResponse.json();
          if (errorData.error) {
            errorMessage = errorData.error.message || errorData.error;
            errorCode = errorData.error.code || errorCode;
            suggestion = errorData.error.suggestion || suggestion;
          }
        } catch (e) {
          console.warn(`[${requestId}] Could not parse Python function error response`);
        }

        const { status, response } = createErrorResponse(
          pythonResponse.status,
          errorCode,
          errorMessage,
          `Python function returned ${pythonResponse.status}`,
          suggestion
        );

        return res.status(status).json(response);
      }

      // Handle successful response from Python function
      const contentType = pythonResponse.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // JSON response (likely for preview or error)
        const jsonData = await pythonResponse.json();
        
        if (isPreview && jsonData.success && jsonData.data) {
          // Return preview data as JSON
          console.log(`[${requestId}] Returning preview data`);
          return res.status(200).json(jsonData);
        } else {
          // Handle other JSON responses
          return res.status(200).json(jsonData);
        }
      } else {
        // Binary response (PDF or DOCX file)
        const buffer = await pythonResponse.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        console.log(`[${requestId}] Returning binary file: ${uint8Array.length} bytes, type: ${contentType}`);

        // Set appropriate headers for file download
        if (contentType?.includes('application/pdf')) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
        } else if (contentType?.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
        } else {
          res.setHeader('Content-Type', contentType || 'application/octet-stream');
        }

        res.setHeader('Content-Length', uint8Array.length);
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        return res.status(200).send(Buffer.from(uint8Array));
      }

    } catch (pythonError) {
      console.error(`[${requestId}] Python function call failed:`, pythonError);
      
      let errorMessage = 'Failed to generate document';
      let suggestion = 'Please try again. If the issue persists, the document generation service may be temporarily unavailable.';
      
      if (pythonError instanceof Error) {
        if (pythonError.message.includes('timeout')) {
          errorMessage = 'Document generation timed out';
          suggestion = 'The document may be too complex. Try reducing content or splitting into smaller sections.';
        } else if (pythonError.message.includes('fetch')) {
          errorMessage = 'Could not connect to document generation service';
          suggestion = 'Please check your internet connection and try again.';
        } else {
          errorMessage = pythonError.message;
        }
      }

      const { status, response } = createErrorResponse(
        500,
        'DOCUMENT_GENERATION_FAILED',
        errorMessage,
        pythonError instanceof Error ? pythonError.stack : String(pythonError),
        suggestion
      );

      return res.status(status).json(response);
    }

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    
    const { status, response } = createErrorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred while processing your request',
      error instanceof Error ? error.stack : String(error),
      'Please try again. If the issue persists, contact support.'
    );

    return res.status(status).json(response);
  }
}

/**
 * Diagnostic endpoint for Python function troubleshooting
 */
export async function diagnosticsPythonFunctions(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  functions: Record<string, any>;
  timestamp: string;
  details: string;
}> {
  const diagnostics: Record<string, any> = {};
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  const issues: string[] = [];

  try {
    // Test Python health endpoint
    try {
      const healthResponse = await callPythonFunction('health-python.py', {}, { method: 'GET', timeout: 10000 });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        diagnostics.health = {
          status: 'healthy',
          data: healthData,
          response_time: 'OK'
        };
      } else {
        diagnostics.health = {
          status: 'unhealthy',
          error: `Health check failed: ${healthResponse.statusText}`,
          response_time: 'FAILED'
        };
        overallStatus = 'unhealthy';
        issues.push('Python health check failed');
      }
    } catch (error) {
      diagnostics.health = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
        response_time: 'TIMEOUT'
      };
      overallStatus = 'unhealthy';
      issues.push('Python health check timeout');
    }

    // Test PDF generation function
    try {
      const testDoc = {
        title: 'Test Document',
        authors: [{ name: 'Test Author' }],
        abstract: 'Test abstract',
        sections: [{ title: 'Test Section', content: 'Test content' }]
      };

      const pdfResponse = await callPythonFunction('generate-pdf.py?preview=true', testDoc, { timeout: 15000 });
      
      if (pdfResponse.ok) {
        diagnostics.pdf_generation = {
          status: 'healthy',
          response_time: 'OK'
        };
      } else {
        diagnostics.pdf_generation = {
          status: 'degraded',
          error: `PDF generation test failed: ${pdfResponse.statusText}`,
          response_time: 'FAILED'
        };
        if (overallStatus === 'healthy') overallStatus = 'degraded';
        issues.push('PDF generation test failed');
      }
    } catch (error) {
      diagnostics.pdf_generation = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
        response_time: 'TIMEOUT'
      };
      overallStatus = 'unhealthy';
      issues.push('PDF generation timeout');
    }

    // Test DOCX to PDF conversion function
    try {
      const convertResponse = await callPythonFunction('convert-docx-pdf.py', {}, { method: 'GET', timeout: 10000 });
      
      if (convertResponse.ok || convertResponse.status === 400) { // 400 is expected for empty request
        diagnostics.docx_conversion = {
          status: 'healthy',
          response_time: 'OK'
        };
      } else {
        diagnostics.docx_conversion = {
          status: 'degraded',
          error: `DOCX conversion test failed: ${convertResponse.statusText}`,
          response_time: 'FAILED'
        };
        if (overallStatus === 'healthy') overallStatus = 'degraded';
        issues.push('DOCX conversion test failed');
      }
    } catch (error) {
      diagnostics.docx_conversion = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
        response_time: 'TIMEOUT'
      };
      overallStatus = 'unhealthy';
      issues.push('DOCX conversion timeout');
    }

    return {
      status: overallStatus,
      functions: diagnostics,
      timestamp: new Date().toISOString(),
      details: issues.length > 0 ? `Issues found: ${issues.join(', ')}` : 'All functions operational'
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      functions: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString(),
      details: 'Diagnostic check failed'
    };
  }
}

/**
 * Health check endpoint for document generation
 */
export async function checkDocumentHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  python_functions: any;
  timestamp: string;
}> {
  try {
    const healthResponse = await callPythonFunction('health-python.py', {}, { method: 'GET', timeout: 10000 });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      return {
        status: healthData.status || 'healthy',
        python_functions: healthData,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        status: 'unhealthy',
        python_functions: { error: `Health check failed: ${healthResponse.statusText}` },
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      python_functions: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Set CORS headers for API responses
 */
function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token, X-Request-ID');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * Handle authentication for document generation requests
 */
function authenticateRequest(req: NextApiRequest): { isAuthenticated: boolean; error?: string } {
  // For now, we'll allow all requests but log them for monitoring
  // In production, you might want to add proper authentication here
  
  const userAgent = req.headers['user-agent'];
  const origin = req.headers.origin;
  
  // Log request for monitoring
  console.log(`Document API access - Origin: ${origin}, User-Agent: ${userAgent}`);
  
  // Block obvious bot requests
  if (userAgent && (
    userAgent.includes('bot') || 
    userAgent.includes('crawler') || 
    userAgent.includes('spider')
  )) {
    return { 
      isAuthenticated: false, 
      error: 'Bot requests are not allowed for document generation' 
    };
  }
  
  return { isAuthenticated: true };
}

/**
 * Main API handler - routes requests based on path and method
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all requests
  setCorsHeaders(res);
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { path } = req.query;
  const requestPath = Array.isArray(path) ? path.join('/') : path || '';
  
  console.log(`Documents API: ${req.method} ${req.url} - Path: ${requestPath}`);
  
  try {
    // Route based on path
    switch (requestPath) {
      case 'health':
        // Health check endpoint
        if (req.method !== 'GET') {
          return res.status(405).json(createErrorResponse(405, 'METHOD_NOT_ALLOWED', 'Only GET method allowed for health check').response);
        }
        
        const healthStatus = await checkDocumentHealth();
        return res.status(200).json({
          success: true,
          data: healthStatus,
          timestamp: new Date().toISOString()
        });
      
      case 'diagnostics':
        // Diagnostic endpoint
        if (req.method !== 'GET') {
          return res.status(405).json(createErrorResponse(405, 'METHOD_NOT_ALLOWED', 'Only GET method allowed for diagnostics').response);
        }
        
        const diagnostics = await diagnosticsPythonFunctions();
        return res.status(200).json({
          success: true,
          data: diagnostics,
          timestamp: new Date().toISOString()
        });
      
      case 'generate':
      case 'docx-to-pdf':
      case 'docx':
      case '':
        // Document generation endpoints
        
        // Authenticate request
        const auth = authenticateRequest(req);
        if (!auth.isAuthenticated) {
          return res.status(401).json(createErrorResponse(401, 'UNAUTHORIZED', auth.error!).response);
        }
        
        // Handle document generation
        return await handleDocumentGeneration(req, res);
      
      default:
        // Unknown path
        return res.status(404).json(createErrorResponse(404, 'NOT_FOUND', `Path '${requestPath}' not found`).response);
    }
    
  } catch (error) {
    console.error('Documents API error:', error);
    
    const { status, response } = createErrorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      error instanceof Error ? error.stack : String(error),
      'Please try again. If the issue persists, contact support.'
    );
    
    return res.status(status).json(response);
  }
}/**
 * Set
 CORS headers for API responses
 */
function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token, X-Request-ID');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * Handle authentication for document generation requests
 */
function authenticateRequest(req: NextApiRequest): { isAuthenticated: boolean; error?: string } {
  // For now, we'll allow all requests but log them for monitoring
  // In production, you might want to add proper authentication here
  
  const userAgent = req.headers['user-agent'];
  const origin = req.headers.origin;
  
  // Log request for monitoring
  console.log(`Document API access - Origin: ${origin}, User-Agent: ${userAgent}`);
  
  // Block obvious bot requests
  if (userAgent && (
    userAgent.includes('bot') || 
    userAgent.includes('crawler') || 
    userAgent.includes('spider')
  )) {
    return { 
      isAuthenticated: false, 
      error: 'Bot requests are not allowed for document generation' 
    };
  }
  
  return { isAuthenticated: true };
}

/**
 * Main API handler - routes requests based on path and method
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all requests
  setCorsHeaders(res);
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { path } = req.query;
  const requestPath = Array.isArray(path) ? path.join('/') : path || '';
  
  console.log(`Documents API: ${req.method} ${req.url} - Path: ${requestPath}`);
  
  try {
    // Route based on path
    switch (requestPath) {
      case 'health':
        // Health check endpoint
        if (req.method !== 'GET') {
          return res.status(405).json(createErrorResponse(405, 'METHOD_NOT_ALLOWED', 'Only GET method allowed for health check').response);
        }
        
        const healthStatus = await checkDocumentHealth();
        return res.status(200).json({
          success: true,
          data: healthStatus,
          timestamp: new Date().toISOString()
        });
      
      case 'diagnostics':
        // Diagnostic endpoint
        if (req.method !== 'GET') {
          return res.status(405).json(createErrorResponse(405, 'METHOD_NOT_ALLOWED', 'Only GET method allowed for diagnostics').response);
        }
        
        const diagnostics = await diagnosticsPythonFunctions();
        return res.status(200).json({
          success: true,
          data: diagnostics,
          timestamp: new Date().toISOString()
        });
      
      case 'generate':
      case 'docx-to-pdf':
      case 'docx':
      case '':
        // Document generation endpoints
        
        // Authenticate request
        const auth = authenticateRequest(req);
        if (!auth.isAuthenticated) {
          return res.status(401).json(createErrorResponse(401, 'UNAUTHORIZED', auth.error!).response);
        }
        
        // Handle document generation
        return await handleDocumentGeneration(req, res);
      
      default:
        // Unknown path
        return res.status(404).json(createErrorResponse(404, 'NOT_FOUND', `Path '${requestPath}' not found`).response);
    }
    
  } catch (error) {
    console.error('Documents API error:', error);
    
    const { status, response } = createErrorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      error instanceof Error ? error.stack : String(error),
      'Please try again. If the issue persists, contact support.'
    );
    
    return res.status(status).json(response);
  }
}