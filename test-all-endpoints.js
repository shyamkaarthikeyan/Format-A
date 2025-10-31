// Test all admin endpoints to debug issues
import fetch from 'node-fetch';

async function testEndpoint(endpoint, name) {
    console.log(`\n🔍 Testing ${name}...`);
    try {
        const response = await fetch(`http://localhost:5000/api/admin?path=${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': 'admin_token_test'
            }
        });
        
        console.log(`Status: ${response.status}`);
        const data = await response.text();
        
        if (response.status === 200) {
            try {
                const jsonData = JSON.parse(data);
                if (jsonData.success) {
                    console.log(`✅ ${name} working`);
                    console.log(`Data keys: ${Object.keys(jsonData.data || {}).join(', ')}`);
                } else {
                    console.log(`⚠️ ${name} returned success: false`);
                    console.log(`Error: ${jsonData.error || 'Unknown error'}`);
                }
            } catch (e) {
                console.log(`❌ ${name} returned invalid JSON`);
                console.log(`Response: ${data.substring(0, 200)}...`);
            }
        } else {
            console.log(`❌ ${name} failed`);
            console.log(`Response: ${data.substring(0, 200)}...`);
        }
    } catch (error) {
        console.log(`❌ ${name} error: ${error.message}`);
    }
}

async function testAllEndpoints() {
    console.log('🚀 Testing all admin endpoints...\n');
    
    const endpoints = [
        { path: 'analytics&type=users', name: 'User Analytics' },
        { path: 'analytics&type=documents', name: 'Document Analytics' },
        { path: 'analytics&type=downloads', name: 'Download Analytics' },
        { path: 'analytics&type=system', name: 'System Health' },
        { path: 'users', name: 'User Management' }
    ];
    
    for (const endpoint of endpoints) {
        await testEndpoint(endpoint.path, endpoint.name);
    }
    
    console.log('\n✅ All tests completed!');
}

testAllEndpoints();