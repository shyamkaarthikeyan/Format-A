/**
 * Integration Tests for Complete PDF Generation Pipeline
 * Tests the entire flow from frontend request to PDF generation
 */

import fetch from 'node-fetch';

// Configuration
const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NODE_ENV === 'production'
  ? 'https://format-a.vercel.app'
  : 'http://localhost:3000';

const TEST_TIMEOUT = 45000; // 45 seconds

// Test document templates
const TEST_DOCUMENTS = {
  simple: {
    title: 'Integration Test Document - Simple',
    authors: [
      { name: 'Test Author', affiliation: 'Test University' }
    ],
    abstract: 'This is a test abstract for integration testing of the PDF generation pipeline.',
    keywords: 'integration, test, pdf, generation',
    sections: [
      {
        title: 'Introduction',
        content: 'This is the introduction section for integration testing.'
      }
    ]
  },
  
  complex: {
    title: 'Integration Test Document - Complex Features',
    authors: [
      { 
        name: 'Primary Author', 
        affiliation: 'Primary University',
        department: 'Computer Science',
        email: 'primary@test.edu'
      },
      { 
        name: 'Secondary Author', 
        affiliation: 'Secondary University',
        department: 'Engineering'
      }
    ],
    abstract: 'This is a comprehensive test document that includes multiple authors, complex formatting, and various content types to validate the complete PDF generation pipeline.',
    keywords: 'complex, integration, test, multiple, authors, formatting',
    sections: [
      {
        title: 'Introduction',
        content: 'Introduction section with <b>bold text</b> and <i>italic formatting</i>.'
      },
      {
        title: 'Methodology',
        content: 'Methodology section with detailed content and <u>underlined text</u>.'
      },
      {
        title: 'Results and Discussion',
        content: 'Results section with comprehensive findings and analysis.',
        subsections: [
          {
            id: 'results-1',
            title: 'Primary Results',
            content: 'Primary results subsection content.',
            level: 1
          },
          {
            id: 'results-2',
            title: 'Secondary Analysis',
            content: 'Secondary analysis subsection content.',
            level: 1
          }
        ]
      },
      {
        title: 'Conclusion',
        content: 'Conclusion section summarizing the test results.'
      }
    ],
    references: [
      {
        authors: 'Test Author et al.',
        title: 'Sample Reference for Testing',
        journal: 'Test Journal',
        year: '2024',
        pages: '1-10'
      }
    ]
  },

  withImages: {
    title: 'Integration Test Document - With Images',
    authors: [{ name: 'Image Test Author', affiliation: 'Visual Test University' }],
    abstract: 'Test document with embedded images to validate image processing in PDF generation.',
    keywords: 'images, visual, test, pdf',
    sections: [
      {
        title: 'Visual Content Test',
        contentBlocks: [
          {
            type: 'text',
            content: 'This section contains both text and images.'
          },
          {
            type: 'image',
            data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            caption: 'Test image for integration testing',
            size: 'small'
          },
          {
            type: 'text',
            content: 'Additional text content after the image.'
          }
        ]
      }
    ]
  }
};

class IntegrationTestRunner {
  constructor() {
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      testResults: [],
      startTime: Date.now(),
      endTime: null,
      executionTimeMs: 0
    };
  }

  async runAllTests() {
    console.log('🚀 Starting PDF Generation Pipeline Integration Tests');
    console.log(`📍 Testing against: ${BASE_URL}`);
    console.log('=' .repeat(80));

    try {
      // Test 1: Health Check
      await this.runTest('Health Check', () => this.testHealthCheck());

      // Test 2: Simple Document Generation
      await this.runTest('Simple Document PDF Generation', () => 
        this.testDocumentGeneration(TEST_DOCUMENTS.simple, 'simple'));

      // Test 3: Complex Document Generation
      await this.runTest('Complex Document PDF Generation', () => 
        this.testDocumentGeneration(TEST_DOCUMENTS.complex, 'complex'));

      // Test 4: Document with Images
      await this.runTest('Document with Images PDF Generation', () => 
        this.testDocumentGeneration(TEST_DOCUMENTS.withImages, 'withImages'));

      // Test 5: Preview Mode
      await this.runTest('PDF Preview Mode', () => 
        this.testPreviewMode(TEST_DOCUMENTS.simple));

      // Test 6: DOCX Generation
      await this.runTest('DOCX Document Generation', () => 
        this.testDocxGeneration(TEST_DOCUMENTS.simple));

      // Test 7: Error Handling
      await this.runTest('Error Handling', () => this.testErrorHandling());

      // Test 8: Performance Test
      await this.runTest('Performance Test', () => this.testPerformance());

      // Test 9: Concurrent Requests
      await this.runTest('Concurrent Requests', () => this.testConcurrentRequests());

      // Test 10: Memory and Timeout Monitoring
      await this.runTest('Memory and Timeout Monitoring', () => this.testResourceMonitoring());

    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
    }

    this.results.endTime = Date.now();
    this.results.executionTimeMs = this.results.endTime - this.results.startTime;
    
    this.printSummary();
    return this.results;
  }

  async runTest(testName, testFunction) {
    this.results.totalTests++;
    const startTime = Date.now();
    
    console.log(`\n🧪 Running: ${testName}`);
    
    try {
      const result = await Promise.race([
        testFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), TEST_TIMEOUT)
        )
      ]);

      const executionTime = Date.now() - startTime;
      
      if (result.success) {
        this.results.passedTests++;
        console.log(`✅ PASSED: ${testName} (${executionTime}ms)`);
        if (result.details) {
          console.log(`   📊 ${result.details}`);
        }
      } else {
        this.results.failedTests++;
        console.log(`❌ FAILED: ${testName} (${executionTime}ms)`);
        console.log(`   💥 Error: ${result.error}`);
      }

      this.results.testResults.push({
        name: testName,
        success: result.success,
        executionTime,
        error: result.error,
        details: result.details
      });

    } catch (error) {
      this.results.failedTests++;
      const executionTime = Date.now() - startTime;
      
      console.log(`❌ FAILED: ${testName} (${executionTime}ms)`);
      console.log(`   💥 Exception: ${error.message}`);

      this.results.testResults.push({
        name: testName,
        success: false,
        executionTime,
        error: error.message,
        exception: true
      });
    }
  }

  async testHealthCheck() {
    try {
      const response = await fetch(`${BASE_URL}/api/documents/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        return { success: false, error: `Health check failed: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      
      if (!data.success) {
        return { success: false, error: 'Health check returned unsuccessful status' };
      }

      return { 
        success: true, 
        details: `Status: ${data.data.status}, Python functions: ${data.data.python_functions.status || 'unknown'}` 
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testDocumentGeneration(documentData, testType) {
    try {
      const response = await fetch(`${BASE_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `PDF generation failed: ${response.status} - ${errorText}` };
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/pdf')) {
        const pdfBuffer = await response.arrayBuffer();
        const pdfSize = pdfBuffer.byteLength;
        
        if (pdfSize === 0) {
          return { success: false, error: 'Generated PDF is empty' };
        }

        // Basic PDF validation - check for PDF header
        const pdfHeader = new Uint8Array(pdfBuffer.slice(0, 4));
        const headerString = String.fromCharCode(...pdfHeader);
        
        if (!headerString.startsWith('%PDF')) {
          return { success: false, error: 'Generated file is not a valid PDF' };
        }

        return { 
          success: true, 
          details: `PDF generated successfully (${pdfSize} bytes, type: ${testType})` 
        };

      } else {
        // JSON response - might be an error or preview data
        const jsonData = await response.json();
        
        if (jsonData.success) {
          return { success: true, details: 'Document generation completed with JSON response' };
        } else {
          return { success: false, error: jsonData.error || 'Unknown error in JSON response' };
        }
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testPreviewMode(documentData) {
    try {
      const response = await fetch(`${BASE_URL}/api/documents?preview=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Preview generation failed: ${response.status} - ${errorText}` };
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const jsonData = await response.json();
        
        if (jsonData.success && jsonData.data) {
          return { success: true, details: 'Preview mode returned JSON data successfully' };
        } else {
          return { success: false, error: 'Preview mode did not return expected data structure' };
        }
      } else {
        // Binary response is also acceptable for preview
        const buffer = await response.arrayBuffer();
        return { success: true, details: `Preview generated binary response (${buffer.byteLength} bytes)` };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testDocxGeneration(documentData) {
    try {
      const response = await fetch(`${BASE_URL}/api/documents?format=docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `DOCX generation failed: ${response.status} - ${errorText}` };
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        const docxBuffer = await response.arrayBuffer();
        const docxSize = docxBuffer.byteLength;
        
        if (docxSize === 0) {
          return { success: false, error: 'Generated DOCX is empty' };
        }

        return { success: true, details: `DOCX generated successfully (${docxSize} bytes)` };
      } else {
        return { success: false, error: `Unexpected content type: ${contentType}` };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testErrorHandling() {
    try {
      // Test with invalid document data
      const response = await fetch(`${BASE_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' })
      });

      if (response.ok) {
        return { success: false, error: 'Expected error response for invalid data, but got success' };
      }

      const errorData = await response.json();
      
      if (errorData.success === false && errorData.error) {
        return { success: true, details: `Error handling working correctly: ${errorData.error}` };
      } else {
        return { success: false, error: 'Error response format is incorrect' };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testPerformance() {
    const performanceResults = [];
    const testDocument = TEST_DOCUMENTS.simple;

    try {
      // Run multiple requests to test performance
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        
        const response = await fetch(`${BASE_URL}/api/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testDocument)
        });

        const endTime = Date.now();
        const executionTime = endTime - startTime;

        if (response.ok) {
          const buffer = await response.arrayBuffer();
          performanceResults.push({
            iteration: i + 1,
            executionTime,
            pdfSize: buffer.byteLength,
            success: true
          });
        } else {
          performanceResults.push({
            iteration: i + 1,
            executionTime,
            success: false,
            error: response.statusText
          });
        }
      }

      const successfulResults = performanceResults.filter(r => r.success);
      
      if (successfulResults.length === 0) {
        return { success: false, error: 'No successful performance test iterations' };
      }

      const avgTime = successfulResults.reduce((sum, r) => sum + r.executionTime, 0) / successfulResults.length;
      const maxTime = Math.max(...successfulResults.map(r => r.executionTime));
      const minTime = Math.min(...successfulResults.map(r => r.executionTime));

      return { 
        success: true, 
        details: `Performance: avg ${avgTime.toFixed(0)}ms, min ${minTime}ms, max ${maxTime}ms (${successfulResults.length}/3 successful)` 
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testConcurrentRequests() {
    try {
      const testDocument = TEST_DOCUMENTS.simple;
      const concurrentRequests = 3;

      // Create multiple concurrent requests
      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        fetch(`${BASE_URL}/api/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...testDocument,
            title: `${testDocument.title} - Concurrent ${i + 1}`
          })
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      const successfulResponses = responses.filter(r => r.ok);
      
      if (successfulResponses.length === 0) {
        return { success: false, error: 'No successful concurrent requests' };
      }

      return { 
        success: true, 
        details: `Concurrent requests: ${successfulResponses.length}/${concurrentRequests} successful in ${endTime - startTime}ms` 
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testResourceMonitoring() {
    try {
      // Test the production validation endpoint for resource monitoring
      const response = await fetch(`${BASE_URL}/api/test-production-validation?test=performance`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        return { success: false, error: `Resource monitoring test failed: ${response.status}` };
      }

      const data = await response.json();
      
      if (data.success) {
        const memoryInfo = data.performance_monitoring?.memory_summary;
        const timeoutInfo = data.performance_monitoring?.timeout_tests?.[0];
        
        let details = 'Resource monitoring active';
        if (memoryInfo) {
          details += `, Memory: ${memoryInfo.final_memory_mb || 0}MB`;
        }
        if (timeoutInfo) {
          details += `, Timeout risk: ${timeoutInfo.at_risk ? 'Yes' : 'No'}`;
        }

        return { success: true, details };
      } else {
        return { success: false, error: data.error || 'Resource monitoring test failed' };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`🎯 Total Tests: ${this.results.totalTests}`);
    console.log(`✅ Passed: ${this.results.passedTests}`);
    console.log(`❌ Failed: ${this.results.failedTests}`);
    console.log(`⏱️  Total Execution Time: ${this.results.executionTimeMs}ms`);
    console.log(`📈 Success Rate: ${((this.results.passedTests / this.results.totalTests) * 100).toFixed(1)}%`);
    
    if (this.results.failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.testResults
        .filter(test => !test.success)
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }

    console.log('\n🏁 Integration test suite completed');
    
    if (this.results.failedTests === 0) {
      console.log('🎉 All tests passed! PDF generation pipeline is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above.');
    }
  }
}

// Run tests if this file is executed directly
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  const runner = new IntegrationTestRunner();
  runner.runAllTests()
    .then(results => {
      process.exit(results.failedTests === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export default IntegrationTestRunner;