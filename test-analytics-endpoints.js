// Simple test for analytics endpoints
import http from 'http';

async function testAnalyticsEndpoint(type) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin?path=analytics&type=${type}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing analytics endpoints...\n');

  const types = ['users', 'documents', 'downloads', 'system'];
  
  for (const type of types) {
    try {
      console.log(`Testing ${type} analytics...`);
      const result = await testAnalyticsEndpoint(type);
      console.log(`Status: ${result.status}`);
      
      if (result.status === 200) {
        console.log('✅ Success');
      } else {
        console.log('❌ Failed');
        console.log('Response:', JSON.stringify(result.data, null, 2));
      }
      console.log('');
    } catch (error) {
      console.log(`❌ Error testing ${type}: ${error.message}\n`);
    }
  }
}

runTests().catch(console.error);