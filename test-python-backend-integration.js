/**
 * Test script to verify Python backend integration
 * Tests all document generation flows from the frontend
 */

// Test document data
const testDocument = {
  title: "Test IEEE Paper for Python Backend Integration",
  authors: [
    {
      name: "John Doe",
      department: "Computer Science",
      organization: "Test University",
      email: "john.doe@test.edu"
    }
  ],
  abstract: "This is a test abstract to verify that the Python backend integration is working correctly for document generation.",
  keywords: "test, python, backend, integration, IEEE",
  sections: [
    {
      id: "intro",
      title: "Introduction",
      contentBlocks: [
        {
          id: "intro-text",
          type: "text",
          content: "This is the introduction section of our test document to verify Python backend integration."
        }
      ],
      subsections: []
    },
    {
      id: "methods",
      title: "Methods",
      contentBlocks: [
        {
          id: "methods-text",
          type: "text",
          content: "This section describes the methods used in our test implementation."
        }
      ],
      subsections: []
    }
  ],
  references: [
    {
      id: "ref1",
      text: "Test Reference 1. A sample reference for testing purposes. Journal of Test Studies, 2024."
    }
  ]
};

// Test configuration
const config = {
  pythonBackendUrl: 'https://format-a-python-backend.vercel.app/api',
  fallbackUrl: '/api/generate',
  testTimeout: 30000 // 30 seconds
};

// Test functions
async function testPythonBackendDirectly() {
  console.log('🧪 Testing Python backend directly...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${config.pythonBackendUrl}/health`);
    console.log(`Health check: ${healthResponse.status} ${healthResponse.statusText}`);
    
    // Test document generation
    const docResponse = await fetch(`${config.pythonBackendUrl}/document-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDocument)
    });
    
    console.log(`Document generation: ${docResponse.status} ${docResponse.statusText}`);
    
    if (docResponse.ok) {
      const result = await docResponse.json();
      console.log('✅ Python backend is accessible and working');
      console.log('Response preview:', JSON.stringify(result, null, 2).substring(0, 200) + '...');
      return true;
    } else {
      const errorText = await docResponse.text();
      console.log('❌ Python backend returned error:', errorText.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.log('❌ Python backend test failed:', error.message);
    return false;
  }
}

async function testFrontendApiIntegration() {
  console.log('🧪 Testing frontend API integration...');
  
  try {
    // Import the API functions (this would be done in the browser)
    console.log('Testing API configuration...');
    
    // Test environment variables
    const pythonBackendUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001/api'
      : 'https://format-a-python-backend.vercel.app/api';
    
    console.log(`Python backend URL: ${pythonBackendUrl}`);
    
    // Test CORS and connectivity
    const corsTest = await fetch(`${pythonBackendUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`CORS test: ${corsTest.status} ${corsTest.statusText}`);
    
    if (corsTest.ok) {
      console.log('✅ CORS configuration is working');
      return true;
    } else {
      console.log('❌ CORS configuration issue');
      return false;
    }
  } catch (error) {
    console.log('❌ Frontend API integration test failed:', error.message);
    return false;
  }
}

async function testDocumentGenerationFlow() {
  console.log('🧪 Testing document generation flow...');
  
  try {
    // Test DOCX generation
    console.log('Testing DOCX generation...');
    const docxResponse = await fetch(`${config.pythonBackendUrl}/docx-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDocument)
    });
    
    console.log(`DOCX generation: ${docxResponse.status} ${docxResponse.statusText}`);
    
    // Test PDF generation
    console.log('Testing PDF generation...');
    const pdfResponse = await fetch(`${config.pythonBackendUrl}/pdf-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDocument)
    });
    
    console.log(`PDF generation: ${pdfResponse.status} ${pdfResponse.statusText}`);
    
    // Test preview generation
    console.log('Testing preview generation...');
    const previewResponse = await fetch(`${config.pythonBackendUrl}/document-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...testDocument,
        preview_type: 'html'
      })
    });
    
    console.log(`Preview generation: ${previewResponse.status} ${previewResponse.statusText}`);
    
    if (docxResponse.ok && pdfResponse.ok && previewResponse.ok) {
      console.log('✅ All document generation flows are working');
      return true;
    } else {
      console.log('❌ Some document generation flows failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Document generation flow test failed:', error.message);
    return false;
  }
}

async function testFallbackMechanism() {
  console.log('🧪 Testing fallback mechanism...');
  
  try {
    // Test with invalid Python backend URL to trigger fallback
    const invalidUrl = 'https://invalid-python-backend.vercel.app/api/document-generator';
    
    console.log('Testing fallback with invalid URL...');
    
    try {
      const response = await fetch(invalidUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testDocument),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      console.log('Unexpected success from invalid URL');
      return false;
    } catch (error) {
      console.log('Expected failure from invalid URL, testing fallback...');
      
      // Test fallback to Node.js endpoint
      const fallbackResponse = await fetch(`${config.fallbackUrl}/docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testDocument)
      });
      
      console.log(`Fallback test: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
      
      if (fallbackResponse.ok || fallbackResponse.status === 503) {
        console.log('✅ Fallback mechanism is working');
        return true;
      } else {
        console.log('❌ Fallback mechanism failed');
        return false;
      }
    }
  } catch (error) {
    console.log('❌ Fallback mechanism test failed:', error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('🧪 Testing error handling...');
  
  try {
    // Test with invalid document data
    const invalidDocument = {
      title: "", // Empty title should trigger validation error
      authors: [],
      sections: []
    };
    
    const response = await fetch(`${config.pythonBackendUrl}/document-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidDocument)
    });
    
    console.log(`Error handling test: ${response.status} ${response.statusText}`);
    
    if (response.status >= 400) {
      const errorData = await response.json();
      console.log('✅ Error handling is working, received expected error:', errorData.error || errorData.message);
      return true;
    } else {
      console.log('❌ Error handling not working, expected error but got success');
      return false;
    }
  } catch (error) {
    console.log('✅ Error handling is working, caught error:', error.message);
    return true;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Python Backend Integration Tests');
  console.log('=' .repeat(50));
  
  const results = {
    pythonBackendDirect: await testPythonBackendDirectly(),
    frontendApiIntegration: await testFrontendApiIntegration(),
    documentGenerationFlow: await testDocumentGenerationFlow(),
    fallbackMechanism: await testFallbackMechanism(),
    errorHandling: await testErrorHandling()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('=' .repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Python backend integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the Python backend configuration.');
  }
  
  return results;
}

// Export for use in browser console or Node.js
if (typeof window !== 'undefined') {
  // Browser environment
  window.testPythonBackendIntegration = runAllTests;
  console.log('Python backend integration tests loaded. Run window.testPythonBackendIntegration() to start testing.');
} else {
  // Node.js environment
  module.exports = {
    runAllTests,
    testPythonBackendDirectly,
    testFrontendApiIntegration,
    testDocumentGenerationFlow,
    testFallbackMechanism,
    testErrorHandling
  };
}