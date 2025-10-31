// Test all admin endpoints
import fetch from 'node-fetch';

async function testAdminEndpoints() {
  console.log('🔍 Testing all admin endpoints...\n');
  
  const endpoints = [
    { path: 'analytics&type=users', name: 'User Analytics' },
    { path: 'analytics&type=documents', name: 'Document Analytics' },
    { path: 'analytics&type=downloads', name: 'Download Analytics' },
    { path: 'analytics&type=system', name: 'System Analytics' },
    { path: 'users', name: 'Users Management' },
    { path: 'auth/session', name: 'Admin Session' },
    { path: 'auth/verify', name: 'Admin Verify' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      const response = await fetch(`http://localhost:5000/api/admin?path=${endpoint.path}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': 'admin_token_test'
        }
      });
      
      console.log(`  Status: ${response.status}`);
      const data = await response.text();
      
      if (response.status === 200) {
        const jsonData = JSON.parse(data);
        if (jsonData.success) {
          console.log(`  ✅ ${endpoint.name} working`);
          if (jsonData.data) {
            console.log(`  📊 Data keys: ${Object.keys(jsonData.data).join(', ')}`);
          }
        } else {
          console.log(`  ⚠️ ${endpoint.name} returned success: false`);
        }
      } else {
        console.log(`  ❌ ${endpoint.name} failed: ${data.substring(0, 100)}...`);
      }
      console.log('');
      
    } catch (error) {
      console.error(`  ❌ Error testing ${endpoint.name}:`, error.message);
      console.log('');
    }
  }
}

testAdminEndpoints();