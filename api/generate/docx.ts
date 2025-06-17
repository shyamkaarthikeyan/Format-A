import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const documentData = req.body;
    
    if (!documentData.title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    // For Vercel, we'll use the Python function approach
    const response = await fetch(`${process.env.VERCEL_URL}/api/generate-docx-py`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(documentData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate document: ${response.statusText} - ${errorText}`);
    }

    const buffer = await response.arrayBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: (error as Error).message
    });
  }
}