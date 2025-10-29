// Simple test to check admin API directly
import fetch from 'node-fetch';

async function testAdminAPI() {
  console.log('🔧 Testing Admin API endpoints...\n');
  
  const baseUrl = 'http://localhost:5000';
  
  const tests = [
    {
      name: 'User Analytics',
      url: `${baseUrl}/api/admin?path=analytics&type=users`
    },
    {
      name: 'Document Analytics', 
      url: `${baseUrl}/api/admin?path=analytics&type=documents`
    },
    {
      name: 'Download Analytics',
      url: `${baseUrl}/api/admin?path=analytics&type=downloads`
    },
    {
      name: 'System Analytics',
      url: `${baseUrl}/api/admin?path=analytics&type=system`
    },
    {
      name: 'Direct Analytics Route',
      url: `${baseUrl}/api/admin/analytics/users`
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      
      const response = await fetch(test.url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`  Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Success: ${data.success ? 'true' : 'false'}`);
        if (data.data && data.data.totalUsers !== undefined) {
          console.log(`  📊 Total Users: ${data.data.totalUsers}`);
        }
        if (data.data && data.data.totalDocuments !== undefined) {
          console.log(`  📄 Total Documents: ${data.data.totalDocuments}`);
        }
        if (data.data && data.data.totalDownloads !== undefined) {
          console.log(`  📥 Total Downloads: ${data.data.totalDownloads}`);
        }
      } else {
        const errorText = await response.text();
        console.log(`  ❌ Error: ${errorText}`);
      }
      
    } catch (error) {
      console.log(`  ❌ Network Error: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
}

testAdminAPI();