// Test failing endpoints with detailed data inspection
import fetch from 'node-fetch';

async function testEndpointDetailed(endpoint, name) {
    console.log(`\n🔍 Testing ${name} in detail...`);
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
                console.log(`✅ ${name} JSON parsed successfully`);
                console.log(`Success field: ${jsonData.success}`);
                console.log(`Has data field: ${!!jsonData.data}`);
                
                if (jsonData.data) {
                    console.log(`Data type: ${typeof jsonData.data}`);
                    console.log(`Data keys: ${Object.keys(jsonData.data).join(', ')}`);
                    
                    // Check specific data structures
                    if (name === 'Document Analytics') {
                        console.log(`Total documents: ${jsonData.data.totalDocuments}`);
                        console.log(`Documents this month: ${jsonData.data.documentsThisMonth}`);
                        console.log(`Has document trends: ${!!jsonData.data.documentTrends}`);
                        console.log(`Has recent documents: ${!!jsonData.data.recentDocuments}`);
                        if (jsonData.data.recentDocuments) {
                            console.log(`Recent documents count: ${jsonData.data.recentDocuments.length}`);
                        }
                    }
                    
                    if (name === 'User Management') {
                        console.log(`Has users array: ${!!jsonData.data.users || Array.isArray(jsonData.data)}`);
                        if (jsonData.data.users) {
                            console.log(`Users count: ${jsonData.data.users.length}`);
                        } else if (Array.isArray(jsonData.data)) {
                            console.log(`Direct array count: ${jsonData.data.length}`);
                        }
                        console.log(`Has summary: ${!!jsonData.data.summary}`);
                    }
                }
                
                // Show first 500 chars of response for inspection
                console.log(`Response preview: ${JSON.stringify(jsonData, null, 2).substring(0, 500)}...`);
                
            } catch (e) {
                console.log(`❌ ${name} returned invalid JSON`);
                console.log(`Parse error: ${e.message}`);
                console.log(`Response: ${data.substring(0, 300)}...`);
            }
        } else {
            console.log(`❌ ${name} failed with status ${response.status}`);
            console.log(`Response: ${data.substring(0, 300)}...`);
        }
    } catch (error) {
        console.log(`❌ ${name} network error: ${error.message}`);
    }
}

async function testFailingEndpoints() {
    console.log('🚀 Testing failing endpoints in detail...\n');
    
    // Test the two failing endpoints
    await testEndpointDetailed('analytics&type=documents', 'Document Analytics');
    await testEndpointDetailed('users', 'User Management');
    
    console.log('\n✅ Detailed tests completed!');
}

testFailingEndpoints();