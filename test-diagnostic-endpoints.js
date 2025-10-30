// Test script for diagnostic endpoints
const baseUrl = 'https://format-a.vercel.app';

const endpoints = [
  '/api/debug-env',
  '/api/test-db',
  '/api/simple-admin?type=users',
  '/api/simple-admin?type=documents',
  '/api/simple-admin?type=downloads',
  '/api/simple-admin?type=system'
];

async function testEndpoint(endpoint) {
  try {
    console.log(`\n🔍 Testing: ${baseUrl}${endpoint}`);
    const response = await fetch(`${baseUrl}${endpoint}`);
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${data.success}`);
    
    if (data.success) {
      console.log('✅ PASSED');
      if (data.data) {
        console.log('Data keys:', Object.keys(data.data));
      }
    } else {
      console.log('❌ FAILED');
      console.log('Error:', data.error);
      console.log('Message:', data.message);
    }
  } catch (error) {
    console.log('❌ NETWORK ERROR');
    console.log('Error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing Format-A Diagnostic Endpoints');
  console.log('==========================================');
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
  }
  
  console.log('\n✨ Test complete! Check the results above.');
}

runTests();