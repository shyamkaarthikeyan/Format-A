/**
 * Test script for consolidated documents API routing
 */

const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  console.log(`\n🧪 Testing ${method} ${endpoint}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script'
      }
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const contentType = response.headers.get('content-type');
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${contentType}`);
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      console.log(`   Response:`, JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log(`   Response: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    }
    
    return { success: response.ok, status: response.status, response };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing Consolidated Documents API Routing');
  console.log(`Base URL: ${BASE_URL}`);
  
  const results = [];
  
  // Test 1: Health check endpoint
  results.push(await testEndpoint('/api/documents?path=health'));
  
  // Test 2: Diagnostics endpoint
  results.push(await testEndpoint('/api/documents?path=diagnostics'));
  
  // Test 3: CORS preflight request
  results.push(await testEndpoint('/api/documents', 'OPTIONS'));
  
  // Test 4: Invalid path
  results.push(await testEndpoint('/api/documents?path=invalid'));
  
  // Test 5: Document generation with invalid data (should fail validation)
  results.push(await testEndpoint('/api/documents?path=generate', 'POST', { invalid: 'data' }));
  
  // Test 6: Document generation with valid data
  const validDocument = {
    title: 'Test IEEE Paper',
    authors: [
      {
        name: 'John Doe',
        affiliation: 'Test University',
        email: 'john.doe@test.edu'
      }
    ],
    abstract: 'This is a test abstract for the IEEE paper format.',
    keywords: 'test, ieee, paper, format',
    sections: [
      {
        title: 'Introduction',
        content: 'This is the introduction section of the test paper.'
      },
      {
        title: 'Methodology',
        content: 'This section describes the methodology used in the research.'
      }
    ]
  };
  
  results.push(await testEndpoint('/api/documents?path=generate&preview=true', 'POST', validDocument));
  
  // Test 7: Method not allowed for health check
  results.push(await testEndpoint('/api/documents?path=health', 'POST', {}));
  
  // Summary
  console.log('\n📊 Test Summary:');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. This may be expected for certain error conditions.');
  } else {
    console.log('\n🎉 All tests completed successfully!');
  }
}

// Run the tests
runTests().catch(console.error);