import { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';

interface DocumentData {
  title: string;
  authors: Array<{ name: string; department?: string; organization?: string; city?: string; state?: string }>;
  abstract?: string;
  keywords?: string;
  sections?: Array<{
    title: string;
    contentBlocks?: Array<{ type: string; content?: string; caption?: string }>;
    content?: string;
    subsections?: Array<{ title: string; content: string }>;
  }>;
  references?: Array<{ text: string }>;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function generateIEEEPDF(data: DocumentData): Buffer {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
  });

  // Set IEEE formatting
  const pageWidth = 8.5;
  const pageHeight = 11;
  const margin = 0.75;
  const contentWidth = pageWidth - (2 * margin);
  const columnWidth = (contentWidth - 0.25) / 2;

  let yPosition = margin;
  const lineHeight = 0.14;

  // Helper function to add text
  function addText(text: string, x: number, y: number, fontSize: number = 9.5, fontStyle: string = 'normal'): number {
    pdf.setFont('times', fontStyle);
    pdf.setFontSize(fontSize);
    
    const lines = pdf.splitTextToSize(text, columnWidth);
    
    lines.forEach((line: string, index: number) => {
      if (y + (index * lineHeight) > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, x, y + (index * lineHeight));
    });
    
    return y + (lines.length * lineHeight);
  }

  // Title
  pdf.setFont('times', 'bold');
  pdf.setFontSize(24);
  const titleLines = pdf.splitTextToSize(data.title, contentWidth);
  titleLines.forEach((line: string, index: number) => {
    pdf.text(line, pageWidth / 2, yPosition + (index * 0.3), { align: 'center' });
  });
  yPosition += titleLines.length * 0.3 + 0.2;

  // Authors
  if (data.authors && data.authors.length > 0) {
    const authorsPerRow = Math.min(data.authors.length, 3);
    const authorWidth = contentWidth / authorsPerRow;
    
    data.authors.forEach((author, index) => {
      const col = index % authorsPerRow;
      const authorX = margin + (col * authorWidth) + (authorWidth / 2);
      let authorY = yPosition;

      pdf.setFont('times', 'bold');
      pdf.setFontSize(9.5);
      pdf.text(author.name, authorX, authorY, { align: 'center' });
      authorY += lineHeight;

      pdf.setFont('times', 'italic');
      [author.department, author.organization, author.city, author.state].forEach(field => {
        if (field) {
          pdf.text(field, authorX, authorY, { align: 'center' });
          authorY += lineHeight;
        }
      });

      if (col === authorsPerRow - 1 || index === data.authors.length - 1) {
        yPosition = authorY + 0.1;
      }
    });
  }

  // Abstract
  if (data.abstract) {
    yPosition += 0.1;
    const abstractText = stripHtml(data.abstract);
    yPosition = addText('Abstract—' + abstractText, margin, yPosition);
    yPosition += 0.1;
  }

  // Keywords
  if (data.keywords) {
    yPosition = addText('Index Terms—' + data.keywords, margin, yPosition);
    yPosition += 0.2;
  }

  // Sections (simplified for email)
  if (data.sections) {
    data.sections.forEach((section, index) => {
      const sectionNumber = index + 1;
      
      if (section.title) {
        yPosition = addText(`${sectionNumber}. ${section.title.toUpperCase()}`, margin, yPosition, 9.5, 'bold');
        yPosition += 0.05;
      }

      if (section.contentBlocks) {
        section.contentBlocks.forEach((block) => {
          if (block.type === 'text' && block.content) {
            yPosition = addText(stripHtml(block.content), margin, yPosition);
            yPosition += 0.1;
          }
        });
      } else if (section.content) {
        yPosition = addText(section.content, margin, yPosition);
        yPosition += 0.1;
      }
    });
  }

  // References
  if (data.references && data.references.length > 0) {
    yPosition = addText('REFERENCES', margin, yPosition, 9.5, 'bold');
    yPosition += 0.1;

    data.references.forEach((ref, index) => {
      if (ref.text) {
        yPosition = addText(`[${index + 1}] ${ref.text}`, margin, yPosition);
        yPosition += 0.05;
      }
    });
  }

  return Buffer.from(pdf.output('arraybuffer'));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

    if (!documentData.title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    if (!documentData.authors || !documentData.authors.some((author: any) => author.name)) {
      return res.status(400).json({ error: 'At least one author name is required' });
    }

    // Generate PDF
    const pdfBuffer = generateIEEEPDF(documentData);

    // Set up email transporter
    const transporter = nodemailer.createTransport({
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
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const result = await transporter.sendMail(mailOptions);
    
    return res.json({
      success: true,
      message: `IEEE paper sent successfully to ${email}`,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({ 
      error: 'Failed to send email', 
      details: (error as Error).message 
    });
  }
}