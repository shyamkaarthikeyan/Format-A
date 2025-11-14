import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('=== Email Configuration Test ===');
    console.log('Environment variables:');
    console.log('  EMAIL_USER:', process.env.EMAIL_USER || '(NOT SET - REQUIRED)');
    console.log('  EMAIL_PASS:', process.env.EMAIL_PASS ? '(set)' : '(NOT SET - REQUIRED)');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  VERCEL:', process.env.VERCEL);
    console.log('');

    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('EMAIL_USER and EMAIL_PASS environment variables are not set in Vercel. Please add them in Settings → Environment Variables.');
    }
    
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    console.log('Creating nodemailer transporter...');
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.default.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
    
    console.log('Verifying SMTP connection...');
    const startTime = Date.now();
    
    try {
      await transporter.verify();
      const verifyTime = Date.now() - startTime;
      console.log(`✅ SMTP connection verified in ${verifyTime}ms`);
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError);
      throw verifyError;
    }
    
    console.log('Sending test email...');
    const sendStartTime = Date.now();
    
    const result = await transporter.sendMail({
      from: emailUser,
      to: emailUser, // Send to self for testing
      subject: `Test Email from Vercel - ${new Date().toISOString()}`,
      text: 'This is a test email from Vercel serverless function to verify SMTP configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #667eea;">✅ SMTP Test Successful!</h1>
          <p>This email was sent from a Vercel serverless function.</p>
          <hr>
          <p><strong>Configuration:</strong></p>
          <ul>
            <li>Host: smtp.gmail.com</li>
            <li>Port: 465</li>
            <li>Secure: true</li>
            <li>User: ${emailUser}</li>
          </ul>
          <hr>
          <p><strong>Environment:</strong></p>
          <ul>
            <li>NODE_ENV: ${process.env.NODE_ENV}</li>
            <li>VERCEL: ${process.env.VERCEL}</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
          </ul>
        </div>
      `
    });
    
    const sendTime = Date.now() - sendStartTime;
    console.log(`✅ Test email sent in ${sendTime}ms`);
    console.log('Message ID:', result.messageId);
    console.log('');
    console.log('=== Test Complete ===');
    
    res.json({
      success: true,
      message: 'Email sent successfully! Check your inbox.',
      details: {
        messageId: result.messageId,
        recipient: emailUser,
        verifyTime: `${Date.now() - startTime}ms`,
        sendTime: `${sendTime}ms`,
        timestamp: new Date().toISOString()
      },
      config: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        user: emailUser,
        hasPassword: !!emailPass,
        passwordSource: process.env.EMAIL_PASS ? 'environment' : 'fallback'
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        hasEmailUser: !!process.env.EMAIL_USER,
        hasEmailPass: !!process.env.EMAIL_PASS
      }
    });
  } catch (error: any) {
    console.error('=== Email Test Failed ===');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Stack:', error.stack);
    
    let errorDetails = {
      message: error.message,
      code: error.code,
      name: error.name
    };
    
    let troubleshooting = [];
    
    if (error.code === 'EAUTH') {
      troubleshooting.push('Authentication failed - Gmail credentials are incorrect or expired');
      troubleshooting.push('Check if EMAIL_USER and EMAIL_PASS are set correctly in Vercel');
      troubleshooting.push('Verify Gmail app password is still valid');
      troubleshooting.push('Ensure 2FA is enabled on Gmail account');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      troubleshooting.push('Connection timeout - SMTP server unreachable');
      troubleshooting.push('Vercel might be blocking SMTP connections');
      troubleshooting.push('Consider using Resend or SendGrid instead');
    } else if (error.message.includes('Missing credentials')) {
      troubleshooting.push('Email credentials not found');
      troubleshooting.push('Add EMAIL_USER and EMAIL_PASS to Vercel environment variables');
    }
    
    res.status(500).json({
      success: false,
      error: errorDetails,
      troubleshooting,
      config: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        user: process.env.EMAIL_USER,
        hasPassword: !!process.env.EMAIL_PASS,
        passwordSource: process.env.EMAIL_PASS ? 'environment' : 'NOT SET'
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        hasEmailUser: !!process.env.EMAIL_USER,
        hasEmailPass: !!process.env.EMAIL_PASS
      }
    });
  }
}
