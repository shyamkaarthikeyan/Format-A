import { NextApiRequest, NextApiResponse } from 'next';

/**
 * DOCX to PDF Generation Endpoint
 * Routes PDF generation requests to Python serverless functions
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] PDF generation request: ${req.method} ${req.url}`);
  
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Check if this is a preview request
    const isPreview = req.query.preview === 'true' || req.headers['x-preview'] === 'true';
    const isDownload = req.headers['x-download'] === 'true';
    
    console.log(`[${requestId}] Request type - Preview: ${isPreview}, Download: ${isDownload}`);

    // Get the base URL for internal function calls
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://format-a.vercel.app';

    // Try direct PDF generation first
    let pythonUrl = `${baseUrl}/api/generate-pdf.py`;
    if (isPreview) {
      pythonUrl += '?preview=true';
    }
    
    console.log(`[${requestId}] Calling Python PDF function: ${pythonUrl}`);
    
    // Call Python serverless function for direct PDF generation
    const pythonResponse = await fetch(pythonUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Preview': isPreview ? 'true' : 'false',
        'X-Download': isDownload ? 'true' : 'false'
      },
      body: JSON.stringify(req.body),
      // Longer timeout for PDF generation
      signal: AbortSignal.timeout(45000)
    });

    console.log(`[${requestId}] Python PDF response: ${pythonResponse.status} ${pythonResponse.statusText}`);

    if (pythonResponse.ok) {
      // Direct PDF generation succeeded
      const contentType = pythonResponse.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // JSON response (likely for preview)
        const jsonData = await pythonResponse.json();
        console.log(`[${requestId}] Returning JSON response for preview`);
        return res.status(200).json(jsonData);
      } else {
        // Binary PDF response
        const buffer = await pythonResponse.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        console.log(`[${requestId}] Returning PDF file: ${uint8Array.length} bytes`);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
        res.setHeader('Content-Length', uint8Array.length);
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        return res.status(200).send(Buffer.from(uint8Array));
      }
    }

    // Direct PDF generation failed, try DOCX to PDF conversion
    console.log(`[${requestId}] Direct PDF failed, trying DOCX to PDF conversion`);
    
    try {
      // First generate DOCX
      const docxUrl = `${baseUrl}/api/generate-pdf.py?format=docx`;
      console.log(`[${requestId}] Generating DOCX first: ${docxUrl}`);
      
      const docxResponse = await fetch(docxUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Format': 'docx'
        },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(30000)
      });

      if (!docxResponse.ok) {
        throw new Error(`DOCX generation failed: ${docxResponse.statusText}`);
      }

      const docxBuffer = await docxResponse.arrayBuffer();
      const docxBase64 = Buffer.from(docxBuffer).toString('base64');
      
      console.log(`[${requestId}] DOCX generated (${docxBuffer.byteLength} bytes), converting to PDF`);

      // Convert DOCX to PDF
      const convertUrl = `${baseUrl}/api/convert-docx-pdf.py${isPreview ? '?preview=true' : ''}`;
      console.log(`[${requestId}] Converting DOCX to PDF: ${convertUrl}`);
      
      const convertResponse = await fetch(convertUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Preview': isPreview ? 'true' : 'false'
        },
        body: JSON.stringify({
          docx_data: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxBase64}`
        }),
        signal: AbortSignal.timeout(30000)
      });

      console.log(`[${requestId}] DOCX to PDF conversion response: ${convertResponse.status} ${convertResponse.statusText}`);

      if (convertResponse.ok) {
        const convertContentType = convertResponse.headers.get('content-type');
        
        if (convertContentType?.includes('application/json')) {
          // JSON response (likely for preview)
          const jsonData = await convertResponse.json();
          console.log(`[${requestId}] Returning converted PDF as JSON for preview`);
          return res.status(200).json(jsonData);
        } else {
          // Binary PDF response
          const buffer = await convertResponse.arrayBuffer();
          const uint8Array = new Uint8Array(buffer);
          
          console.log(`[${requestId}] Returning converted PDF file: ${uint8Array.length} bytes`);

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
          res.setHeader('Content-Length', uint8Array.length);
          res.setHeader('Access-Control-Allow-Origin', '*');
          
          return res.status(200).send(Buffer.from(uint8Array));
        }
      } else {
        // Conversion also failed, return DOCX as fallback
        console.log(`[${requestId}] PDF conversion failed, returning DOCX as fallback`);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
        res.setHeader('Content-Length', docxBuffer.byteLength);
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        return res.status(200).send(Buffer.from(docxBuffer));
      }

    } catch (conversionError) {
      console.error(`[${requestId}] DOCX to PDF conversion failed:`, conversionError);
      
      // Return error with helpful message
      return res.status(503).json({
        success: false,
        error: 'PDF generation is temporarily unavailable',
        message: 'PDF generation is not available on this deployment due to serverless limitations. Perfect IEEE formatting is available via Word download - the DOCX file contains identical formatting!',
        suggestion: 'Use the Download Word button above.',
        code: 'PDF_UNAVAILABLE_SERVERLESS',
        fallback: 'docx'
      });
    }

  } catch (error) {
    console.error(`[${requestId}] PDF generation error:`, error);
    
    let errorMessage = 'Failed to generate PDF document';
    let errorCode = 'PDF_GENERATION_FAILED';
    
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        errorMessage = 'PDF generation timed out';
        errorCode = 'TIMEOUT_ERROR';
      } else {
        errorMessage = error.message;
      }
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      code: errorCode,
      suggestion: 'Please try again or use the Word download option.'
    });
  }
}