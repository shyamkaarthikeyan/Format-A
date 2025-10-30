// Test the failing endpoints
const baseUrl = 'https://format-a.vercel.app';

async function testEndpoint(endpoint, description) {
  try {
    console.log(`\n🔍 Testing ${description}: ${baseUrl}${endpoint}`);
    const response = await fetch(`${baseUrl}${endpoint}`);
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      try {
        const data = JSON.parse(text);
        console.log(`✅ SUCCESS - ${description}`);
        console.log('Data keys:', Object.keys(data.data || data));
      } catch (e) {
        console.log(`❌ INVALID JSON - ${description}`);
        console.log('Response:', text.substring(0, 100));
      }
    } else {
      console.log(`❌ FAILED - ${description}`);
      console.log('Response:', text.substring(0, 100));
    }
  } catch (error) {
    console.log(`❌ NETWORK ERROR - ${description}`);
    console.log('Error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing Failing Endpoints');
  console.log('============================');
  
  // Test the endpoints that might be failing
  await testEndpoint('/api/simple-admin?type=documents', 'Document Analytics');
  await testEndpoint('/api/admin?path=users', 'User Management');
  await testEndpoint('/api/admin/users', 'User Management (direct)');
  
  console.log('\n✨ Test complete!');
}

runTests();