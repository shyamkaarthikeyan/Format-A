// Test local database connection
import fetch from 'node-fetch';

async function testLocalDatabase() {
  console.log('🔍 Testing local database connection...');
  
  try {
    // Test basic database connection
    const response = await fetch('http://localhost:5000/api/admin?path=test-db', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.text();
    console.log('Response:', data);
    
    if (response.status === 200) {
      console.log('✅ Local database connection works');
    } else {
      console.log('❌ Local database connection failed');
    }
    
    // Test admin analytics endpoint
    console.log('\n🔍 Testing admin analytics...');
    const analyticsResponse = await fetch('http://localhost:5000/api/admin?path=analytics&type=users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': 'admin_token_test'
      }
    });
    
    console.log(`Analytics Status: ${analyticsResponse.status}`);
    const analyticsData = await analyticsResponse.text();
    console.log('Analytics Response:', analyticsData.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ Error testing database:', error.message);
  }
}

testLocalDatabase();