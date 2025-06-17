import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const documentData = req.body;
    
    if (!documentData.title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    // First generate DOCX
    const docxResponse = await fetch(`${process.env.VERCEL_URL}/api/generate-docx-py`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(documentData)
    });

    if (!docxResponse.ok) {
      throw new Error('Failed to generate DOCX for PDF conversion');
    }

    const docxBuffer = await docxResponse.arrayBuffer();
    
    // Convert DOCX to PDF using Python function
    const pdfResponse = await fetch(`${process.env.VERCEL_URL}/api/convert-docx-to-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: docxBuffer
    });

    if (!pdfResponse.ok) {
      throw new Error('Failed to convert DOCX to PDF');
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: (error as Error).message
    });
  }
}