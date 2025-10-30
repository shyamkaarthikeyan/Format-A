// Test script to see what's actually being returned
async function testDetailedResponse() {
  try {
    console.log('🔍 Testing simple-admin endpoint...');
    const response = await fetch('https://format-a.vercel.app/api/simple-admin?type=users');
    
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response text (first 200 chars):', text.substring(0, 200));
    
    if (text.startsWith('{')) {
      console.log('✅ Response is JSON');
      const json = JSON.parse(text);
      console.log('JSON success:', json.success);
    } else {
      console.log('❌ Response is HTML/Text');
      if (text.includes('404')) {
        console.log('🚨 This is a 404 error - endpoint not found');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDetailedResponse();