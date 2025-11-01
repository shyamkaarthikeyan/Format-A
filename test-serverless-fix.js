// Quick test to verify serverless function fixes
const testEndpoints = [
  { name: 'Health Check', url: '/api/health' },
  { name: 'Root API', url: '/api/' },
  { name: 'Debug Endpoint', url: '/api/debug' },
  { name: 'Test Minimal', url: '/api/test-minimal' }
];

async function testServerlessFunctions() {
  console.log('🔍 Testing Serverless Functions...\n');
  
  for (const test of testEndpoints) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await fetch(test.url);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${test.name}: SUCCESS`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Message: ${data.message || data.status || 'OK'}\n`);
      } else {
        console.log(`❌ ${test.name}: FAILED`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${data.error || data.message}\n`);
      }
    } catch (error) {
      console.log(`💥 ${test.name}: CRASHED`);
      console.log(`   Error: ${error.message}\n`);
    }
  }
}

// Test PDF generation
async function testPDFGeneration() {
  console.log('📄 Testing PDF Generation...\n');
  
  try {
    const response = await fetch('/api/generate/docx-to-pdf?preview=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Preview': 'true'
      },
      body: JSON.stringify({
        title: 'Test Document',
        authors: [{ name: 'Test Author' }],
        sections: [{ 
          title: 'Test Section', 
          contentBlocks: [{ type: 'text', content: 'Test content' }] 
        }]
      })
    });
    
    if (response.ok) {
      console.log('✅ PDF Generation: SUCCESS');
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   Content-Length: ${response.headers.get('content-length')} bytes\n`);
    } else {
      const errorData = await response.json().catch(() => response.text());
      console.log('❌ PDF Generation: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(errorData, null, 2)}\n`);
    }
  } catch (error) {
    console.log('💥 PDF Generation: CRASHED');
    console.log(`   Error: ${error.message}\n`);
  }
}

// Run tests
testServerlessFunctions().then(() => {
  testPDFGeneration();
});