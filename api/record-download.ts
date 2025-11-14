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

// Email notification function - ALWAYS send emails for every download
async function sendDownloadNotification(downloadId: string, downloadData: any, user: any) {
  try {
    console.log('📧 Sending email notification for download:', {
      downloadId,
      hasFileData: !!downloadData.fileData,
      fileDataLength: downloadData.fileData?.length || 0,
      userEmail: user.email,
      documentTitle: downloadData.documentTitle
    });

    // Call the email notification endpoint
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://format-a.vercel.app';
    
    console.log('📧 Email notification URL:', `${baseUrl}/api/send-download-notification`);
    
    const notificationResponse = await fetch(`${baseUrl}/api/send-download-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${generateInternalToken(user)}`
      },
      body: JSON.stringify({
        downloadId,
        downloadData: {
          ...downloadData,
          fileData: downloadData.fileData // Pass file data for email attachment
        }
      })
    });

    console.log('📧 Email notification response status:', notificationResponse.status);

    if (!notificationResponse.ok) {
      const errorText = await notificationResponse.text();
      console.error('📧 Email notification error response:', errorText);
      throw new Error(`Email notification failed: ${notificationResponse.status} - ${errorText}`);
    }

    const result = await notificationResponse.json();
    console.log('📧 Email notification result:', result);
    return result;
  } catch (error) {
    console.error('Error sending download notification:', error);
    
    // Update download record with error status
    try {
      const sql = getSql();
      await sql`
        UPDATE downloads 
        SET email_sent = false, 
            email_error = ${error.message}
        WHERE id = ${downloadId}
      `;
    } catch (updateError) {
      console.error('Error updating download record with email error:', updateError);
    }
    
    throw error;
  }
}

// Generate internal token for email service
function generateInternalToken(user: any): string {
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      internal: true
    },
    jwtSecret,
    { expiresIn: '5m' } // Short-lived token for internal use
  );
}

// Extract user from JWT token
async function extractUserFromToken(req: VercelRequest) {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    if (!decoded.userId || !decoded.email) {
      return null;
    }

    // Get user from database
    const sql = getSql();
    const result = await sql`SELECT * FROM users WHERE id = ${decoded.userId} AND is_active = true LIMIT 1`;
    const users = result.rows || result;
    
    if (users.length === 0) {
      return null;
    }

    return users[0];
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

  // Handle preflight requests
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
    // Extract user from token
    const user = await extractUserFromToken(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to record download'
        }
      });
    }

    const { documentTitle, fileFormat, fileSize, documentMetadata, fileData } = req.body;

    if (!documentTitle || !fileFormat) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Document title and file format are required'
        }
      });
    }

    // Get client IP and user agent
    const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Record download in database
    const sql = getSql();
    const downloadId = `download_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const result = await sql`
      INSERT INTO downloads (
        id, user_id, document_title, file_format, file_size, 
        downloaded_at, ip_address, user_agent, status, email_sent, document_metadata
      )
      VALUES (
        ${downloadId}, ${user.id}, ${documentTitle}, ${fileFormat.toLowerCase()}, ${fileSize || 0},
        NOW(), ${Array.isArray(ipAddress) ? ipAddress[0] : ipAddress}, ${userAgent}, 
        'completed', false, ${JSON.stringify(documentMetadata || {})}
      )
      RETURNING *
    `;

    const downloadRecord = result.rows[0];

    console.log('✅ Download recorded:', {
      user: user.email,
      document: documentTitle,
      format: fileFormat,
      size: fileSize
    });

    const downloadData = {
      id: downloadRecord.id,
      userId: downloadRecord.user_id,
      documentTitle: downloadRecord.document_title,
      fileFormat: downloadRecord.file_format,
      fileSize: downloadRecord.file_size,
      downloadedAt: downloadRecord.downloaded_at,
      status: downloadRecord.status,
      documentMetadata: downloadRecord.document_metadata
    };

    // Send email with document attachment asynchronously (don't wait for it)
    console.log('📧 Initiating email notification...', {
      downloadId: downloadRecord.id,
      hasFileData: !!fileData,
      fileDataLength: fileData?.length || 0,
      userEmail: user.email
    });
    
    sendDownloadNotification(downloadRecord.id, { ...downloadData, fileData }, user)
      .then((result) => {
        console.log('📧 Email sent successfully with document attached:', {
          downloadId: downloadRecord.id,
          messageId: result?.data?.messageId,
          recipient: user.email
        });
      })
      .catch((error) => {
        console.error('📧 Failed to send email with document:', {
          downloadId: downloadRecord.id,
          error: error.message,
          stack: error.stack,
          userEmail: user.email
        });
      });

    res.json({
      success: true,
      data: downloadData,
      message: 'Download recorded successfully'
    });

  } catch (error) {
    console.error('Error recording download:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_RECORD_ERROR',
        message: 'Failed to record download'
      }
    });
  }
}