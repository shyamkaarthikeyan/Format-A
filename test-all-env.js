// Test all environment variables
import https from 'https';

const options = {
  hostname: 'format-a.vercel.app',
  port: 443,
  path: '/api/diagnostics?endpoint=debug-env',
  method: 'GET'
};

console.log('🔍 Testing all environment variables...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Full environment response:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();