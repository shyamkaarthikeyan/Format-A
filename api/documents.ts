import { NextApiRequest, NextApiResponse } from 'next';

const PYTHON_BACKEND_URL = 'https://format-a-python-backend.vercel.app/api';

function createFallbackResponse(path: string, requestBody: any) {
  console.log(`Creating fallback response for path: ${path}`);
  
  switch (path) {
    case 'preview-images':
    case 'docx-to-pdf':
      // For preview requests, provide a basic HTML preview
      const isPreview = path === 'preview-images' || requestBody?.preview;
      
      if (isPreview) {
        const title = requestBody?.title || 'Untitled Document';
        const authors = requestBody?.authors || [];
        const abstract = requestBody?.abstract || '';
        
        const authorNames = authors.map((author: any) => author.name).filter(Boolean);
        const authorsText = authorNames.length > 0 ? authorNames.join(', ') : 'Anonymous';
        
        const fallbackHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: 'Times New Roman', serif;
                font-size: 10pt;
                line-height: 1.3;
                margin: 20px;
                background: white;
                color: black;
              }
              .fallback-notice {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 10px;
                margin: 10px 0;
                font-size: 9pt;
                color: #856404;
                text-align: center;
              }
              .title { font-size: 14pt; font-weight: bold; text-align: center; margin: 20px 0; }
              .authors { font-size: 10pt; text-align: center; margin: 15px 0; font-style: italic; }
              .abstract { margin: 15px 0; text-align: justify; }
            </style>
          </head>
          <body>
            <div class="fallback-notice">
              ⚠️ Fallback Preview - Python backend temporarily unavailable
            </div>
            <div class="title">${title}</div>
            <div class="authors">${authorsText}</div>
            ${abstract ? `<div class="abstract"><strong>Abstract—</strong>${abstract}</div>` : ''}
            <div class="fallback-notice">
              🔄 Full formatting will be available when service is restored
            </div>
          </body>
          </html>
        `;
        
        return {
          success: true,
          preview_type: 'html',
          html_content: fallbackHtml,
          message: 'Fallback preview generated - Python backend unavailable',
          fallback: true
        };
      }
      // Fall through to default case for non-preview requests
      
    case 'docx':
    case 'email':
    default:
      return {
        success: false,
        error: 'Service temporarily unavailable',
        message: `${path.toUpperCase()} generation service is currently unavailable. Please try again later.`,
        fallback: true,
        data: {
          endpoint: path,
          status: 'fallback_mode',
          retry_suggestion: 'Please try again in a few minutes'
        }
      };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Preview');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get the path from query parameters (set by vercel.json rewrites)
    const path = req.query.path as string;
    
    console.log(`=== Document Proxy Handler ===`);
    console.log(`Path: ${path}`);
    console.log(`Method: ${req.method}`);
    console.log(`Headers: ${JSON.stringify(req.headers)}`);
    console.log(`Body preview: ${JSON.stringify(req.body).substring(0, 200)}...`);
    
    if (!path) {
      console.log('Error: Missing path parameter');
      return res.status(400).json({
        error: 'Missing path parameter',
        message: 'Path parameter is required for document operations'
      });
    }

    // Map the paths to Python backend endpoints
    // All document generation requests go to the main document-generator endpoint
    let pythonEndpoint: string;
    
    switch (path) {
      case 'preview-images':
      case 'docx':
      case 'docx-to-pdf':
      case 'email':
        pythonEndpoint = 'document-generator';
        break;
      default:
        return res.status(404).json({
          error: 'Endpoint not found',
          message: `Document endpoint '${path}' is not available`
        });
    }

    // Try multiple Python backend URLs for reliability
    const backendUrls = [
      `${PYTHON_BACKEND_URL}/${pythonEndpoint}`,
      `https://format-a-python.vercel.app/api/${pythonEndpoint}`
    ];
    
    let lastError: Error | null = null;
    
    for (const pythonUrl of backendUrls) {
      try {
        console.log(`Attempting to proxy to: ${pythonUrl}`);
        
        // Forward the request to the Python backend with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(pythonUrl, {
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Format-A-Proxy/1.0',
            ...(req.headers.authorization && { 'Authorization': req.headers.authorization }),
            ...(req.headers['x-preview'] && { 'X-Preview': req.headers['x-preview'] as string }),
          },
          ...(req.method !== 'GET' && { body: JSON.stringify(req.body) }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        const responseData = await response.text();
        
        console.log(`Python backend response status: ${response.status}`);
        console.log(`Response preview: ${responseData.substring(0, 200)}...`);
        
        if (response.ok) {
          // Forward the response status and headers
          res.status(response.status);
          
          // Set content type based on response
          const contentType = response.headers.get('content-type');
          if (contentType) {
            res.setHeader('Content-Type', contentType);
          }
          
          // Handle different response types
          if (contentType?.includes('application/json')) {
            try {
              const jsonData = JSON.parse(responseData);
              console.log(`Successfully proxied to Python backend: ${pythonUrl}`);
              res.json(jsonData);
              return;
            } catch {
              res.send(responseData);
              return;
            }
          } else {
            res.send(responseData);
            return;
          }
        } else {
          console.log(`Python backend returned error status ${response.status}: ${responseData.substring(0, 200)}`);
          lastError = new Error(`Backend returned ${response.status}: ${responseData}`);
          continue; // Try next URL
        }
        
      } catch (error) {
        console.log(`Failed to connect to ${pythonUrl}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue; // Try next URL
      }
    }
    
    // All backend URLs failed, provide fallback response
    console.log('All Python backend URLs failed, providing fallback response');
    
    const fallbackResponse = createFallbackResponse(path, req.body);
    res.status(fallbackResponse.success ? 200 : 503).json(fallbackResponse);

  } catch (error) {
    console.error('Document proxy error:', error);
    
    res.status(500).json({
      error: 'Document service unavailable',
      message: 'Failed to connect to document processing service',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}