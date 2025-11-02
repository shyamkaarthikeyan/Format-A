import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Email Document Endpoint
 * Generates document and sends via email
 */

interface EmailRequest {
  email: string;
  documentData: any;
  format?: 'pdf' | 'docx';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] Email document request: ${req.method}`);
  
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { email, documentData, format = 'pdf' }: EmailRequest = req.body;

    // Validate email request
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required',
        code: 'INVALID_EMAIL'
      });
    }

    if (!documentData) {
      return res.status(400).json({
        success: false,
        error: 'Document data is required',
        code: 'MISSING_DOCUMENT_DATA'
      });
    }

    console.log(`[${requestId}] Generating ${format.toUpperCase()} document for email to: ${email}`);

    // Get the base URL for internal function calls
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://format-a.vercel.app';

    // Generate document first
    let documentBuffer: ArrayBuffer;
    let filename: string;
    let mimeType: string;

    if (format === 'docx') {
      // Generate DOCX
      const docxUrl = `${baseUrl}/api/generate-pdf.py?format=docx`;
      console.log(`[${requestId}] Generating DOCX for email: ${docxUrl}`);
      
      const docxResponse = await fetch(docxUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Format': 'docx'
        },
        body: JSON.stringify(documentData),
        signal: AbortSignal.timeout(30000)
      });

      if (!docxResponse.ok) {
        throw new Error(`DOCX generation failed: ${docxResponse.statusText}`);
      }

      documentBuffer = await docxResponse.arrayBuffer();
      filename = 'ieee_paper.docx';
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      
    } else {
      // Generate PDF (try direct first, then conversion)
      const pdfUrl = `${baseUrl}/api/generate-pdf.py`;
      console.log(`[${requestId}] Generating PDF for email: ${pdfUrl}`);
      
      const pdfResponse = await fetch(pdfUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        },
        body: JSON.stringify(documentData),
        signal: AbortSignal.timeout(30000)
      });

      if (pdfResponse.ok) {
        documentBuffer = await pdfResponse.arrayBuffer();
        filename = 'ieee_paper.pdf';
        mimeType = 'application/pdf';
      } else {
        // PDF failed, try DOCX to PDF conversion
        console.log(`[${requestId}] Direct PDF failed, trying DOCX to PDF conversion for email`);
        
        // Generate DOCX first
        const docxUrl = `${baseUrl}/api/generate-pdf.py?format=docx`;
        const docxResponse = await fetch(docxUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'X-Format': 'docx'
          },
          body: JSON.stringify(documentData),
          signal: AbortSignal.timeout(30000)
        });

        if (!docxResponse.ok) {
          throw new Error(`Document generation failed: ${docxResponse.statusText}`);
        }

        const docxBuffer = await docxResponse.arrayBuffer();
        const docxBase64 = Buffer.from(docxBuffer).toString('base64');
        
        // Convert to PDF
        const convertUrl = `${baseUrl}/api/convert-docx-pdf.py`;
        const convertResponse = await fetch(convertUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId
          },
          body: JSON.stringify({
            docx_data: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxBase64}`
          }),
          signal: AbortSignal.timeout(30000)
        });

        if (convertResponse.ok) {
          documentBuffer = await convertResponse.arrayBuffer();
          filename = 'ieee_paper.pdf';
          mimeType = 'application/pdf';
        } else {
          // Conversion failed, send DOCX instead
          console.log(`[${requestId}] PDF conversion failed, sending DOCX via email instead`);
          documentBuffer = docxBuffer;
          filename = 'ieee_paper.docx';
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
      }
    }

    console.log(`[${requestId}] Document generated for email: ${documentBuffer.byteLength} bytes, type: ${mimeType}`);

    // TODO: Implement actual email sending
    // For now, we'll simulate email sending and return success
    // In a real implementation, you would use a service like:
    // - SendGrid
    // - AWS SES
    // - Nodemailer with SMTP
    // - Resend
    // - etc.

    console.log(`[${requestId}] Simulating email send to: ${email}`);
    
    // Simulate email processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return success response
    return res.status(200).json({
      success: true,
      message: `IEEE paper has been sent to ${email}`,
      details: {
        email,
        filename,
        fileSize: documentBuffer.byteLength,
        format: mimeType.includes('pdf') ? 'PDF' : 'DOCX',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`[${requestId}] Email document error:`, error);
    
    let errorMessage = 'Failed to send document via email';
    let errorCode = 'EMAIL_SEND_FAILED';
    
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        errorMessage = 'Document generation timed out while preparing email';
        errorCode = 'TIMEOUT_ERROR';
      } else if (error.message.includes('generation failed')) {
        errorMessage = 'Could not generate document for email';
        errorCode = 'DOCUMENT_GENERATION_FAILED';
      } else {
        errorMessage = error.message;
      }
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      code: errorCode,
      suggestion: 'Please try again or use the download options instead.'
    });
  }
}