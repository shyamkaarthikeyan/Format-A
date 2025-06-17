import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Generate PDF
    const pdfResponse = await fetch(`${process.env.VERCEL_URL}/api/generate/docx-to-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(documentData)
    });

    if (!pdfResponse.ok) {
      throw new Error('Failed to generate PDF for email');
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Set up email transporter
    const transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER || 'formatateam@gmail.com',
        pass: process.env.EMAIL_PASS || 'qrcrrrlodnywmsyw'
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Send email with PDF attachment
    const mailOptions = {
      from: process.env.EMAIL_USER || 'formatateam@gmail.com',
      to: email,
      subject: 'Your IEEE Paper Document',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">Your IEEE Paper is Ready!</h2>
          <p>Hi there,</p>
          <p>Your IEEE research paper has been generated successfully. Please find the PDF document attached to this email.</p>
          <p>The document has been formatted according to IEEE standards and is ready for submission.</p>
          <br>
          <p>Best regards,<br>
          <strong style="color: #7c3aed;">Format A Team</strong></p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280;">
            This email was sent from Format A - IEEE Research Paper Generator
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `ieee-paper-${Date.now()}.pdf`,
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf'
        }
      ]
    };

    const result = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      message: `IEEE paper sent successfully to ${email}`,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      error: 'Failed to send email', 
      details: (error as Error).message 
    });
  }
}