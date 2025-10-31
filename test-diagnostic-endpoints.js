// Test document analytics endpoint specifically
import fetch from 'node-fetch';

async function testDocumentAnalytics() {
    console.log('🔍 Testing Document Analytics endpoint...\n');
    
    try {
        const response = await fetch('http://localhost:5000/api/admin?path=analytics&type=documents', {
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
            console.log('Success:', jsonData.success);
            console.log('Has data:', !!jsonData.data);
            
            if (jsonData.data) {
                console.log('Data keys:', Object.keys(jsonData.data).join(', '));
                console.log('Total documents:', jsonData.data.totalDocuments);
                console.log('Documents this month:', jsonData.data.documentsThisMonth);
                console.log('Has recent documents:', !!jsonData.data.recentDocuments);
                console.log('Recent documents count:', jsonData.data.recentDocuments?.length || 0);
                console.log('Has document trends:', !!jsonData.data.documentTrends);
                console.log('Document trends keys:', jsonData.data.documentTrends ? Object.keys(jsonData.data.documentTrends).join(', ') : 'none');
                
                // Check if daily trends exist
                if (jsonData.data.documentTrends?.daily) {
                    console.log('Daily trends count:', jsonData.data.documentTrends.daily.length);
                    if (jsonData.data.documentTrends.daily.length > 0) {
                        console.log('First daily trend:', JSON.stringify(jsonData.data.documentTrends.daily[0]));
                    }
                }
                
                // Check recent documents structure
                if (jsonData.data.recentDocuments && jsonData.data.recentDocuments.length > 0) {
                    console.log('First recent document keys:', Object.keys(jsonData.data.recentDocuments[0]).join(', '));
                }
            }
            
            console.log('\nFirst 800 chars of response:');
            console.log(JSON.stringify(jsonData, null, 2).substring(0, 800) + '...');
        } else {
            console.log('❌ Failed response:');
            console.log(data);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testDocumentAnalytics();