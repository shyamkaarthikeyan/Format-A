// Simple test for auth endpoint
import https from 'https';

const testData = JSON.stringify({
  googleId: "test123",
  email: "test@example.com", 
  name: "Test User"
});

const options = {
  hostname: 'format-a.vercel.app',
  port: 443,
  path: '/api/auth/google',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length
  }
};

console.log('🔍 Testing auth endpoint with env vars...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(testData);
req.end();