// Test user management endpoint specifically
import fetch from 'node-fetch';

async function testUserManagement() {
    console.log('🔍 Testing User Management endpoint...\n');
    
    try {
        const response = await fetch('http://localhost:5000/api/admin?path=users', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': 'admin_token_test'
            }
        });
        
        console.log(`Status: ${response.status}`);
        const data = await response.text();
        
        if (response.status === 200) {
            const jsonData = JSON.parse(data);
            console.log('✅ Response received');
            console.log('Full response structure:');
            console.log(JSON.stringify(jsonData, null, 2));
        } else {
            console.log('❌ Failed response:');
            console.log(data);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testUserManagement();