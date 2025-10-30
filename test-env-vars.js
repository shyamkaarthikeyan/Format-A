// Test environment variables access
import https from 'https';

const testData = JSON.stringify({});

const options = {
  hostname: 'format-a.vercel.app',
  port: 443,
  path: '/api/diagnostics?endpoint=debug-env',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('🔍 Testing environment variables...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Environment check:');
      console.log('- DATABASE_URL exists:', response.data.DATABASE_URL_EXISTS);
      console.log('- GOOGLE_CLIENT_ID exists:', response.data.GOOGLE_CLIENT_ID_EXISTS);
      console.log('- JWT_SECRET exists:', response.data.JWT_SECRET_EXISTS);
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();