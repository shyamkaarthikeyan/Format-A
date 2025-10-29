// Test if server is running and responding
import http from 'http';

async function testServerHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testAdminEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin?path=analytics&type=system',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('🔍 Testing server connectivity...\n');

  // Test 1: Health endpoint
  try {
    console.log('1. Testing health endpoint...');
    const health = await testServerHealth();
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${health.data.substring(0, 200)}...\n`);
  } catch (error) {
    console.log(`   ❌ Health test failed: ${error.message}\n`);
    console.log('   Server might not be running on port 5000');
    return;
  }

  // Test 2: Admin endpoint
  try {
    console.log('2. Testing admin analytics endpoint...');
    const admin = await testAdminEndpoint();
    console.log(`   Status: ${admin.status}`);
    console.log(`   Response: ${admin.data.substring(0, 200)}...\n`);
  } catch (error) {
    console.log(`   ❌ Admin test failed: ${error.message}\n`);
  }

  console.log('✅ Server connectivity tests completed!');
}

runTests().catch(console.error);