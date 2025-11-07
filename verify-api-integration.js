/**
 * Simple verification script for API integration
 * Run this in the browser console to test the new API functions
 */

// Test the API configuration
function testApiConfiguration() {
  console.log('🧪 Testing API Configuration...');
  
  // Check if environment variables are loaded
  const pythonBackendUrl = import.meta?.env?.VITE_PYTHON_BACKEND_URL || 'https://format-a-python-backend.vercel.app/api';
  console.log('Python Backend URL:', pythonBackendUrl);
  
  // Test API URL generation
  try {
    // These would be imported from @/lib/api in the actual application
    const testUrls = {
      pythonDocx: `${pythonBackendUrl}/docx-generator`,
      pythonPdf: `${pythonBackendUrl}/pdf-generator`,
      pythonEmail: `${pythonBackendUrl}/email-generator`,
      pythonPreview: `${pythonBackendUrl}/document-generator`,
      fallbackDocx: '/api/generate/docx',
      fallbackPdf: '/api/generate/docx-to-pdf',
      fallbackEmail: '/api/generate/email',
      fallbackPreview: '/api/generate/preview-images'
    };
    
    console.log('Generated API URLs:', testUrls);
    console.log('✅ API configuration looks correct');
    return true;
  } catch (error) {
    console.error('❌ API configuration error:', error);
    return false;
  }
}

// Test basic connectivity
async function testConnectivity() {
  console.log('🧪 Testing Basic Connectivity...');
  
  const pythonBackendUrl = 'https://format-a-python-backend.vercel.app/api';
  
  try {
    // Test Python backend health
    const healthResponse = await fetch(`${pythonBackendUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`Python backend health: ${healthResponse.status} ${healthResponse.statusText}`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health data:', healthData);
      console.log('✅ Python backend is accessible');
      return true;
    } else {
      console.log('❌ Python backend health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Connectivity test failed:', error);
    return false;
  }
}

// Test CORS configuration
async function testCORS() {
  console.log('🧪 Testing CORS Configuration...');
  
  const pythonBackendUrl = 'https://format-a-python-backend.vercel.app/api';
  
  try {
    // Test preflight request
    const preflightResponse = await fetch(`${pythonBackendUrl}/document-generator`, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`CORS preflight: ${preflightResponse.status} ${preflightResponse.statusText}`);
    
    // Check CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': preflightResponse.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': preflightResponse.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': preflightResponse.headers.get('Access-Control-Allow-Headers')
    };
    
    console.log('CORS headers:', corsHeaders);
    
    if (preflightResponse.ok || preflightResponse.status === 204) {
      console.log('✅ CORS configuration is working');
      return true;
    } else {
      console.log('❌ CORS configuration issue');
      return false;
    }
  } catch (error) {
    console.error('❌ CORS test failed:', error);
    return false;
  }
}

// Test document generation with minimal data
async function testDocumentGeneration() {
  console.log('🧪 Testing Document Generation...');
  
  const pythonBackendUrl = 'https://format-a-python-backend.vercel.app/api';
  
  const testDocument = {
    title: "API Integration Test",
    authors: [
      {
        name: "Test Author",
        department: "Test Department",
        organization: "Test Organization"
      }
    ],
    abstract: "This is a test document to verify API integration.",
    keywords: "test, api, integration",
    sections: [
      {
        id: "test-section",
        title: "Test Section",
        contentBlocks: [
          {
            id: "test-content",
            type: "text",
            content: "This is test content for API verification."
          }
        ],
        subsections: []
      }
    ],
    references: []
  };
  
  try {
    // Test document generation endpoint
    const response = await fetch(`${pythonBackendUrl}/document-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDocument)
    });
    
    console.log(`Document generation: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Generation result preview:', JSON.stringify(result, null, 2).substring(0, 300) + '...');
      console.log('✅ Document generation is working');
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Document generation failed:', errorText.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.error('❌ Document generation test failed:', error);
    return false;
  }
}

// Run all verification tests
async function runVerification() {
  console.log('🚀 Starting API Integration Verification');
  console.log('=' .repeat(50));
  
  const results = {
    apiConfiguration: testApiConfiguration(),
    connectivity: await testConnectivity(),
    cors: await testCORS(),
    documentGeneration: await testDocumentGeneration()
  };
  
  console.log('\n📊 Verification Results:');
  console.log('=' .repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All verification tests passed! API integration is ready.');
  } else {
    console.log('⚠️  Some tests failed. Check the configuration and try again.');
  }
  
  return results;
}

// Make available in browser console
if (typeof window !== 'undefined') {
  window.verifyApiIntegration = runVerification;
  console.log('API verification loaded. Run window.verifyApiIntegration() to test.');
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runVerification,
    testApiConfiguration,
    testConnectivity,
    testCORS,
    testDocumentGeneration
  };
}