import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { neon } from '@neondatabase/serverless';

// Initialize SQL connection
let sql: any = null;
function getSql() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL!, {
      fullResults: true,
      arrayMode: false
    });
  }
  return sql;
}

// Email service configuration
const EMAIL_CONFIG = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'formatateam@gmail.com',
    pass: 'qrcrrrlodnywmsyw' // App password from existing config
  }
};

// Import nodemailer dynamically to avoid build issues
async function sendEmailNotification(to: string, downloadData: any, fileData?: string) {
  try {
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.default.createTransport(EMAIL_CONFIG);
    
    const emailTemplate = generateDownloadEmailTemplate(downloadData);
    
    const mailOptions: any = {
      from: EMAIL_CONFIG.auth.user,
      to: to,
      subject: `📄 Your IEEE Paper: "${downloadData.documentTitle}"`,
      html: emailTemplate,
      text: `Your document "${downloadData.documentTitle}" has been generated successfully. File format: ${downloadData.fileFormat.toUpperCase()}, Size: ${formatFileSize(downloadData.fileSize)}`
    };

    // Attach the document file if provided
    if (fileData) {
      const fileExtension = downloadData.fileFormat.toLowerCase();
      const mimeType = fileExtension === 'pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      
      mailOptions.attachments = [{
        filename: `${downloadData.documentTitle}.${fileExtension}`,
        content: Buffer.from(fileData, 'base64'),
        contentType: mimeType
      }];
    }

    const result = await transporter.sendMail(mailOptions);
    console.log('Document email sent with attachment:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending download notification email:', error);
    throw new Error(`Failed to send email notification: ${error.message}`);
  }
}

function generateDownloadEmailTemplate(downloadData: any): string {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (format: string): string => {
    switch (format.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'docx':
        return '📝';
      case 'email':
        return '📧';
      default:
        return '📄';
    }
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document Ready - Format-A</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
            ${getFileIcon(downloadData.fileFormat)} Document Ready!
          </h1>
          <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">
            Your document has been generated successfully
          </p>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          
          <!-- Success Message -->
          <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
            <h2 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 20px;">
              ✅ Your Document is Attached
            </h2>
            <p style="color: #075985; margin: 0; font-size: 16px;">
              Your IEEE-formatted document "<strong>${downloadData.documentTitle}</strong>" is attached to this email!
            </p>
          </div>

          <!-- Document Details -->
          <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
              📋 Document Details
            </h3>
            
            <div style="display: grid; gap: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-weight: 500;">Document Title:</span>
                <span style="color: #1e293b; font-weight: 600;">${downloadData.documentTitle}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-weight: 500;">File Format:</span>
                <span style="color: #1e293b; font-weight: 600; text-transform: uppercase;">${downloadData.fileFormat}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-weight: 500;">File Size:</span>
                <span style="color: #1e293b; font-weight: 600;">${formatFileSize(downloadData.fileSize)}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
                <span style="color: #64748b; font-weight: 500;">Generated:</span>
                <span style="color: #1e293b; font-weight: 600;">${formatDate(downloadData.downloadedAt)}</span>
              </div>
            </div>
          </div>

          ${downloadData.documentMetadata ? `
          <!-- Document Statistics -->
          <div style="background-color: #fefce8; padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #fde047;">
            <h3 style="color: #713f12; margin: 0 0 20px 0; font-size: 18px;">
              📊 Document Statistics
            </h3>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
              ${downloadData.documentMetadata.wordCount ? `
              <div style="text-align: center; padding: 15px; background-color: #ffffff; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #713f12;">${downloadData.documentMetadata.wordCount}</div>
                <div style="font-size: 14px; color: #a16207;">Words</div>
              </div>
              ` : ''}
              
              ${downloadData.documentMetadata.authors ? `
              <div style="text-align: center; padding: 15px; background-color: #ffffff; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #713f12;">${downloadData.documentMetadata.authors}</div>
                <div style="font-size: 14px; color: #a16207;">Authors</div>
              </div>
              ` : ''}
              
              ${downloadData.documentMetadata.sections ? `
              <div style="text-align: center; padding: 15px; background-color: #ffffff; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #713f12;">${downloadData.documentMetadata.sections}</div>
                <div style="font-size: 14px; color: #a16207;">Sections</div>
              </div>
              ` : ''}
              
              ${downloadData.documentMetadata.references ? `
              <div style="text-align: center; padding: 15px; background-color: #ffffff; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #713f12;">${downloadData.documentMetadata.references}</div>
                <div style="font-size: 14px; color: #a16207;">References</div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://format-a.vercel.app/profile" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.2s;">
              📥 View Download History
            </a>
          </div>

          <!-- Tips Section -->
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
            <h4 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px;">📎 Document Attached:</h4>
            <ul style="color: #075985; margin: 0; padding-left: 20px; font-size: 14px;">
              <li>Your IEEE-formatted document is attached to this email</li>
              <li>The document follows IEEE formatting standards</li>
              <li>You can download it directly from this email</li>
              <li>View all your documents in your Format-A profile</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #1e293b; padding: 30px 20px; text-align: center;">
          <div style="margin-bottom: 20px;">
            <h3 style="color: #ffffff; margin: 0 0 10px 0; font-size: 20px;">Format-A</h3>
            <p style="color: #94a3b8; margin: 0; font-size: 14px;">
              Professional IEEE Research Paper Generator
            </p>
          </div>
          
          <div style="border-top: 1px solid #374151; padding-top: 20px;">
            <p style="color: #6b7280; margin: 0; font-size: 12px;">
              This email was sent because you generated a document on Format-A.<br>
              Email notifications are automatically sent for all document downloads.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Extract user from JWT token
async function extractUserFromToken(req: VercelRequest) {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    if (!decoded.userId || !decoded.email) {
      return null;
    }

    const sql = getSql();
    const result = await sql`SELECT * FROM users WHERE id = ${decoded.userId} AND is_active = true LIMIT 1`;
    const users = result.rows || result;
    
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error extracting user from token:', error);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST method is allowed'
      }
    });
  }

  try {
    const user = await extractUserFromToken(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to send download notification'
        }
      });
    }

    // Always send email notifications for every download
    console.log('📧 Preparing to send email notification to:', user.email);

    const { downloadId, downloadData, fileData } = req.body;

    if (!downloadId || !downloadData) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Download ID and download data are required'
        }
      });
    }

    // Send email with document attachment if fileData is provided
    const emailResult = await sendEmailNotification(user.email, downloadData, fileData);

    // Update download record with email status
    const sql = getSql();
    await sql`
      UPDATE downloads 
      SET email_sent = true, 
          email_sent_at = NOW()
      WHERE id = ${downloadId} AND user_id = ${user.id}
    `;

    console.log('✅ Download notification sent:', {
      user: user.email,
      document: downloadData.documentTitle,
      messageId: emailResult.messageId
    });

    res.json({
      success: true,
      data: {
        emailSent: true,
        messageId: emailResult.messageId,
        sentAt: emailResult.sentAt,
        recipient: user.email
      },
      message: 'Download notification sent successfully'
    });

  } catch (error) {
    console.error('Error sending download notification:', error);
    
    // Update download record with error status
    if (req.body.downloadId) {
      try {
        const sql = getSql();
        await sql`
          UPDATE downloads 
          SET email_sent = false, 
              email_error = ${error.message}
          WHERE id = ${req.body.downloadId}
        `;
      } catch (updateError) {
        console.error('Error updating download record:', updateError);
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'EMAIL_NOTIFICATION_ERROR',
        message: 'Failed to send download notification'
      }
    });
  }
}