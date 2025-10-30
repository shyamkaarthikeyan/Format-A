// Comprehensive test for all admin endpoints
const baseUrl = 'https://format-a.vercel.app';

const endpoints = [
  { url: '/api/diagnostics?endpoint=debug-env', name: 'Environment Debug' },
  { url: '/api/diagnostics?endpoint=test-db', name: 'Database Test' },
  { url: '/api/diagnostics?endpoint=analytics&type=users', name: 'User Analytics' },
  { url: '/api/diagnostics?endpoint=analytics&type=documents', name: 'Document Analytics' },
  { url: '/api/diagnostics?endpoint=analytics&type=downloads', name: 'Download Analytics' },
  { url: '/api/diagnostics?endpoint=analytics&type=system', name: 'System Health' },
  { url: '/api/diagnostics?endpoint=users', name: 'User Management' }
];

async function testEndpoint(endpoint) {
  try {
    console.log(`\n🔍 Testing ${endpoint.name}: ${baseUrl}${endpoint.url}`);
    const response = await fetch(`${baseUrl}${endpoint.url}`);
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      try {
        const data = JSON.parse(text);
        if (data.success) {
          console.log(`✅ SUCCESS - ${endpoint.name}`);
          if (data.data) {
            console.log('Data keys:', Object.keys(data.data));
          }
        } else {
          console.log(`❌ API ERROR - ${endpoint.name}`);
          console.log('Error:', data.error);
        }
      } catch (e) {
        console.log(`❌ INVALID JSON - ${endpoint.name}`);
        console.log('Response:', text.substring(0, 100));
      }
    } else {
      console.log(`❌ HTTP ERROR - ${endpoint.name}`);
      console.log('Response:', text.substring(0, 100));
    }
  } catch (error) {
    console.log(`❌ NETWORK ERROR - ${endpoint.name}`);
    console.log('Error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing All Format-A Admin Endpoints');
  console.log('=========================================');
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between requests
  }
  
  console.log('\n✨ Test complete! Summary:');
  console.log('- Environment & Database: Should be working');
  console.log('- Analytics Endpoints: Should be working');
  console.log('- User Management: Should now be working with simple-users endpoint');
}

runTests();