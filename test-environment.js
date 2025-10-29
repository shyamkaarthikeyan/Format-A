// Test environment and endpoints
import http from 'http';

async function testEndpoint(path, expectedStatus = 200) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      timeout: 10000
    };

    console.log(`Testing: ${path}`);
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = {
          path,
          status: res.statusCode,
          expected: expectedStatus,
          success: res.statusCode === expectedStatus,
          data: data.substring(0, 200) + (data.length > 200 ? '...' : ''),
          headers: res.headers
        };
        resolve(result);
      });
    });

    req.on('error', (error) => {
      reject({ path, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ path, error: 'Request timeout' });
    });

    req.end();
  });
}

async function runEnvironmentTests() {
  console.log('🔍 Testing development environment...\n');

  const tests = [
    // Basic connectivity
    { path: '/health', expected: 200 },
    { path: '/api/test', expected: 200 },
    
    // Old direct routes (should work)
    { path: '/api/admin/analytics/users', expected: 200 },
    { path: '/api/admin/analytics/system', expected: 200 },
    
    // New consolidated routes (should redirect)
    { path: '/api/admin?path=analytics&type=users', expected: 302 }, // Redirect
    { path: '/api/admin?path=analytics&type=system', expected: 302 }, // Redirect
    
    // Test with query parameters
    { path: '/api/admin?path=analytics&type=users&timeRange=30d', expected: 302 },
  ];

  for (const test of tests) {
    try {
      const result = await testEndpoint(test.path, test.expected);
      
      if (result.success) {
        console.log(`✅ ${test.path}`);
        console.log(`   Status: ${result.status} (expected ${result.expected})`);
        
        if (result.status === 302) {
          console.log(`   Redirect to: ${result.headers.location}`);
        }
      } else {
        console.log(`❌ ${test.path}`);
        console.log(`   Status: ${result.status} (expected ${result.expected})`);
        console.log(`   Response: ${result.data}`);
      }
      console.log('');
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`❌ ${error.path}`);
      console.log(`   Error: ${error.error}`);
      console.log('');
    }
  }

  console.log('✅ Environment tests completed!');
  console.log('\n📋 Summary:');
  console.log('- Health check: Tests basic server connectivity');
  console.log('- Direct routes: Original analytics endpoints');
  console.log('- Consolidated routes: New unified admin endpoint');
  console.log('- Redirects: Should redirect to appropriate direct routes');
}

runEnvironmentTests().catch(console.error);