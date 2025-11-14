// Test SMTP Connection
// Run this with: node test_smtp_connection.js

import nodemailer from 'nodemailer';

console.log('🔍 Testing SMTP Connection...\n');

const EMAIL_CONFIG = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'formatateam@gmail.com',
    pass: 'qrcrrrlodnywmsyw'
  }
};

console.log('Configuration:');
console.log('  Host:', EMAIL_CONFIG.host);
console.log('  Port:', EMAIL_CONFIG.port);
console.log('  User:', EMAIL_CONFIG.auth.user);
console.log('  Pass:', EMAIL_CONFIG.auth.pass.substring(0, 4) + '************');
console.log('');

const transporter = nodemailer.createTransport(EMAIL_CONFIG);

// Test 1: Verify connection
console.log('Test 1: Verifying SMTP connection...');
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ SMTP Connection Failed!');
    console.log('Error:', error.message);
    console.log('\nPossible causes:');
    console.log('  - App password expired or invalid');
    console.log('  - Gmail account locked');
    console.log('  - Network blocking port 465');
    console.log('  - Less secure apps not enabled');
    process.exit(1);
  } else {
    console.log('✅ SMTP Connection Successful!');
    console.log('Server is ready to send emails\n');
    
    // Test 2: Send test email
    sendTestEmail();
  }
});

async function sendTestEmail() {
  console.log('Test 2: Sending test email...');
  
  // Replace with your email to test
  const testRecipient = 'shyamkaarthikeyan@gmail.com'; // Change this to your email
  
  try {
    const result = await transporter.sendMail({
      from: EMAIL_CONFIG.auth.user,
      to: testRecipient,
      subject: '✅ SMTP Test - Format-A',
      text: 'This is a test email from Format-A SMTP configuration test.',
      html: `
        <div style="font-family: Arial; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7c3aed;">✅ SMTP Test Successful!</h1>
            <p>If you're reading this, the SMTP configuration is working correctly.</p>
            <p><strong>Configuration:</strong></p>
            <ul>
              <li>Host: ${EMAIL_CONFIG.host}</li>
              <li>Port: ${EMAIL_CONFIG.port}</li>
              <li>User: ${EMAIL_CONFIG.auth.user}</li>
            </ul>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Sent from Format-A SMTP Test Script
            </p>
          </div>
        </div>
      `
    });
    
    console.log('✅ Test Email Sent Successfully!');
    console.log('Message ID:', result.messageId);
    console.log(`\n📧 Check ${testRecipient} inbox (and spam folder)`);
    console.log('\n✅ SMTP is configured correctly!');
    
  } catch (error) {
    console.log('❌ Failed to send test email');
    console.log('Error:', error.message);
    console.log('\nThis means SMTP connection works but sending failed.');
    console.log('Possible causes:');
    console.log('  - Recipient email invalid');
    console.log('  - Gmail daily limit reached (500 emails/day)');
    console.log('  - Email content flagged as spam');
  }
}
