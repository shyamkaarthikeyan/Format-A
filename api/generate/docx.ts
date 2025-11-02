import { NextApiRequest, NextApiResponse } from 'next';

/**
 * DOCX Generation Endpoint
 * Routes DOCX generation requests to Python serverless function
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = `docx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] DOCX generation request: ${req.method}`);
  
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Get the base URL for internal function calls
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://format-a.vercel.app';

    const pythonUrl = `${baseUrl}/api/generate-pdf.py?format=docx`;
    
    console.log(`[${requestId}] Calling Python function: ${pythonUrl}`);
    
    // Call Python serverless function for DOCX generation
    const pythonResponse = await fetch(pythonUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Format': 'docx'
      },
      body: JSON.stringify(req.body)
    });

    console.log(`[${requestId}] Python response: ${pythonResponse.status} ${pythonResponse.statusText}`);

    if (!pythonResponse.ok) {
      let errorMessage = `DOCX generation failed: ${pythonResponse.statusText}`;
      
      try {
        const errorData = await pythonResponse.json();
        errorMessage = errorData.error?.message || errorData.error || errorMessage;
      } catch (e) {
        console.warn(`[${requestId}] Could not parse error response`);
      }

      return res.status(pythonResponse.status).json({
        success: false,
        error: errorMessage,
        code: 'DOCX_GENERATION_FAILED'
      });
    }

    // Forward the binary response
    const buffer = await pythonResponse.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    console.log(`[${requestId}] Returning DOCX file: ${uint8Array.length} bytes`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
    res.setHeader('Content-Length', uint8Array.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).send(Buffer.from(uint8Array));

  } catch (error) {
    console.error(`[${requestId}] DOCX generation error:`, error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate DOCX document',
      code: 'INTERNAL_ERROR'
    });
  }
}