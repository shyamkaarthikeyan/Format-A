import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Preview, X-Retry-Attempt, X-Source, User-Agent');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const path = req.query.path as string;
  console.log(`Frontend API proxy - routing ${path} to Python backend with ieee_generator_fixed.py`);

  // Always route to Python backend using ieee_generator_fixed.py
  // Auto-detect environment and use appropriate backend URL
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let backendUrl;
  if (process.env.PYTHON_BACKEND_URL) {
    // Explicit override
    backendUrl = process.env.PYTHON_BACKEND_URL;
  } else if (process.env.VITE_PYTHON_BACKEND_URL) {
    // Frontend environment variable
    backendUrl = process.env.VITE_PYTHON_BACKEND_URL;
  } else if (isProduction) {
    // Production: use Vercel deployment
    backendUrl = 'https://format-a-python-backend.vercel.app';
  } else {
    // Development: use local server
    backendUrl = 'http://localhost:3001';
  }
  
  console.log(`Environment: ${isProduction ? 'production' : 'development'}, Backend URL: ${backendUrl}`);
  
  let endpoint = '';
  switch (path) {
    case 'preview-images':
    case 'docx-to-pdf':
      endpoint = '/api/document-generator'; // Uses ieee_generator_fixed.py for previews
      break;
    case 'docx':
      endpoint = '/api/docx-generator';
      break;
    case 'email':
      endpoint = '/api/email-generator';
      break;
    case 'pdf':
      endpoint = '/api/pdf-generator';
      break;
    default:
      endpoint = '/api/document-generator'; // Default to ieee_generator_fixed.py
  }

  try {

    const targetUrl = `${backendUrl}${endpoint}`;
    console.log(`Proxying ${path} request to: ${targetUrl} (using ieee_generator_fixed.py)`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'frontend-proxy',
        'X-Original-Path': path,
        'X-Generator': 'ieee_generator_fixed.py',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      console.error(`Backend request failed: ${response.status} ${response.statusText}`);
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Backend response received for ${path} using ieee_generator_fixed.py:`, data.success ? 'Success' : 'Failed');
    
    res.status(200).json(data);

  } catch (error) {
    console.error(`Proxy error for ${path}:`, error);
    
    // In development, if local backend fails, try production backend as fallback
    if (!isProduction && backendUrl.includes('localhost')) {
      console.log('Local backend failed, trying production backend as fallback...');
      try {
        const productionBackendUrl = 'https://format-a-python-backend.vercel.app';
        const productionTargetUrl = `${productionBackendUrl}${endpoint}`;
        
        console.log(`Fallback: Proxying ${path} request to: ${productionTargetUrl}`);
        
        const fallbackResponse = await fetch(productionTargetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Source': 'frontend-proxy-fallback',
            'X-Original-Path': path,
            'X-Generator': 'ieee_generator_fixed.py',
          },
          body: JSON.stringify(req.body),
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log(`Fallback successful for ${path}`);
          res.status(200).json(fallbackData);
          return;
        }
      } catch (fallbackError) {
        console.error('Production fallback also failed:', fallbackError);
      }
    }
    
    // Only provide fallback for preview requests
    if (path === 'preview-images' || path === 'docx-to-pdf') {
      console.log('Providing basic fallback preview (ieee_generator_fixed.py unavailable)');
      const fallbackResponse = createBasicFallback(req.body);
      res.status(200).json(fallbackResponse);
    } else {
      res.status(500).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: `${path.toUpperCase()} generation service is currently unavailable. Please try again later.`,
        fallback: true,
        generator: 'ieee_generator_fixed.py'
      });
    }
  }
}

function createBasicFallback(requestBody: any) {
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
        ⚠️ Basic Fallback Preview - ieee_generator_fixed.py temporarily unavailable
      </div>
      <div class="title">${title}</div>
      <div class="authors">${authorsText}</div>
      ${abstract ? `<div class="abstract"><strong>Abstract—</strong>${abstract}</div>` : ''}
      <div class="fallback-notice">
        🔄 Full IEEE formatting via ieee_generator_fixed.py will be restored shortly
      </div>
    </body>
    </html>
  `;
  
  return {
    success: true,
    preview_type: 'html',
    html_content: fallbackHtml,
    message: 'Basic fallback preview - ieee_generator_fixed.py temporarily unavailable',
    fallback: true,
    generator: 'fallback_mode'
  };
}
