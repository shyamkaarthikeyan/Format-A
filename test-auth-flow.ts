// Test auth flow with better error handling
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

console.log('🔍 Testing auth endpoint with detailed error handling...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    
    if (res.statusCode === 500) {
      console.log('\n❌ Auth endpoint is failing with 500 error');
      console.log('This could be due to:');
      console.log('1. Syntax error in auth.ts or neon-database.ts');
      console.log('2. Missing dependencies');
      console.log('3. Runtime error during initialization');
    } else if (res.statusCode === 200) {
      console.log('\n✅ Auth endpoint is working!');
      try {
        const response = JSON.parse(data);
        console.log('Success response:', response);
      } catch (e) {
        console.log('Could not parse JSON response');
      }
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
});

req.write(testData);
req.end();