import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Gmail SMTP configuration - using port 465 with SSL for better reliability
const EMAIL_CONFIG = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: 'formatateam@gmail.com',
    pass: 'qrcrrrlodnywmsyw' // App password: qrcr rrlo dnyw msyw (spaces removed)
  },
  tls: {
    rejectUnauthorized: false
  }
};

// Create transporter - FIX: use createTransport not createTransporter
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('Gmail SMTP configuration error:', error);
  } else {
    console.log('Gmail SMTP server is ready to send messages');
  }
});

export interface EmailOptions {
  to: string;
  subject?: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const mailOptions = {
      from: EMAIL_CONFIG.auth.user,
      to: options.to,
      subject: options.subject || 'Your IEEE Paper Document',
      text: options.text || 'Hi, please find your IEEE paper attached.',
      html: options.html,
      attachments: options.attachments || []
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email: ' + (error as Error).message);
  }
}

export async function sendIEEEPaper(to: string, pdfBuffer: Buffer, filename: string = 'ieee-paper.pdf') {
  try {
    const emailOptions: EmailOptions = {
      to,
      subject: 'Your IEEE Paper Document',
      text: 'Hi, please find your IEEE paper attached.',
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
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    return await sendEmail(emailOptions);
  } catch (error) {
    console.error('Error sending IEEE paper:', error);
    throw error;
  }
}