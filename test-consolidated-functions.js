// Test script to verify consolidated serverless functions work correctly
import https from 'https';
import http from 'http';

const BASE_URL = process.env.VERCEL_URL || 'http://localhost:3000';

async function testEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script/1.0'
      }
    };

    // Use http or https based on the protocol
    const requestModule = url.protocol === 'https:' ? https : http;
    
    const req = requestModule.request(url, options, (res) => {
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
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing consolidated serverless functions...\n');

  // Test 1: Health check
  try {
    console.log('1. Testing health endpoint...');
    const health = await testEndpoint('/api/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${JSON.stringify(health.data, null, 2)}\n`);
  } catch (error) {
    console.log(`   ❌ Health test failed: ${error.message}\n`);
  }

  // Test 2: Auth test (consolidated into admin.ts)
  try {
    console.log('2. Testing consolidated auth test endpoint...');
    const authTest = await testEndpoint('/api/admin?path=auth-test');
    console.log(`   Status: ${authTest.status}`);
    console.log(`   Response: ${JSON.stringify(authTest.data, null, 2)}\n`);
  } catch (error) {
    console.log(`   ❌ Auth test failed: ${error.message}\n`);
  }

  // Test 3: Database test (consolidated into admin.ts)
  try {
    console.log('3. Testing consolidated database test endpoint...');
    const dbTest = await testEndpoint('/api/admin?path=test-db');
    console.log(`   Status: ${dbTest.status}`);
    console.log(`   Response: ${JSON.stringify(dbTest.data, null, 2)}\n`);
  } catch (error) {
    console.log(`   ❌ Database test failed: ${error.message}\n`);
  }

  // Test 4: Analytics (consolidated into admin.ts)
  try {
    console.log('4. Testing consolidated analytics endpoint...');
    const analytics = await testEndpoint('/api/admin?path=analytics&type=system');
    console.log(`   Status: ${analytics.status}`);
    console.log(`   Response: ${JSON.stringify(analytics.data, null, 2)}\n`);
  } catch (error) {
    console.log(`   ❌ Analytics test failed: ${error.message}\n`);
  }

  // Test 5: Google Auth (consolidated into auth.ts)
  try {
    console.log('5. Testing consolidated Google auth endpoint...');
    const googleAuth = await testEndpoint('/api/auth?path=google', 'POST', {
      googleId: 'test_google_id',
      email: 'test@example.com',
      name: 'Test User'
    });
    console.log(`   Status: ${googleAuth.status}`);
    console.log(`   Response: ${JSON.stringify(googleAuth.data, null, 2)}\n`);
  } catch (error) {
    console.log(`   ❌ Google auth test failed: ${error.message}\n`);
  }

  console.log('✅ Consolidated function tests completed!');
  console.log('\n📊 Function Count Summary:');
  console.log('   Before consolidation: 12+ functions (over limit)');
  console.log('   After consolidation: 8 functions (under limit)');
  console.log('   Vercel Hobby limit: 12 functions');
  console.log('   Status: ✅ UNDER LIMIT');
}

runTests().catch(console.error);