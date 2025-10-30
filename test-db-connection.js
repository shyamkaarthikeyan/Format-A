// Test database connection with neonDb.initialize()
import https from 'https';

const testData = JSON.stringify({
  testInit: true
});

const options = {
  hostname: 'format-a.vercel.app',
  port: 443,
  path: '/api/diagnostics?endpoint=test-db',
  method: 'GET'
};

console.log('🔍 Testing database initialization...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ Database test endpoint works');
      console.log('The issue might be in the auth-specific database initialization');
    } else {
      console.log('❌ Database test endpoint also failing');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();