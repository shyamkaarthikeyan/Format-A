/**
 * Production Endpoint Testing Suite
 * Tests all serverless functionality endpoints in production environment
 */

import fetch from 'node-fetch';

// Configuration
const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NODE_ENV === 'production'
  ? 'https://format-a.vercel.app'
  : 'http://localhost:3000';

const TEST_TIMEOUT = 30000; // 30 seconds

class ProductionEndpointTester {
  constructor() {
    this.results = {
      totalEndpoints: 0,
      passedEndpoints: 0,
      failedEndpoints: 0,
      endpointResults: [],
      startTime: Date.now(),
      endTime: null
    };
  }

  async testAllEndpoints() {
    console.log('🔍 Testing Production Serverless Endpoints');
    console.log(`📍 Target: ${BASE_URL}`);
    console.log('=' .repeat(80));

    // Core health endpoints
    await this.testEndpoint('Python Health Check', 'GET', '/api/health-python');
    await this.testEndpoint('Documents Health Check', 'GET', '/api/documents/health');
    await this.testEndpoint('Documents Diagnostics', 'GET', '/api/documents/diagnostics');
    await this.testEndpoint('Health Monitoring - Quick', 'GET', '/api/health-monitoring?type=quick');
    await this.testEndpoint('Health Monitoring - Detailed', 'GET', '/api/health-monitoring?type=detailed');
    await this.testEndpoint('Health Monitoring - Performance', 'GET', '/api/health-monitoring?type=performance');

    // Production validation endpoints
    await this.testEndpoint('Production Validation - All Tests', 'GET', '/api/test-production-validation');
    await this.testEndpoint('Production Validation - Pipeline', 'GET', '/api/test-production-validation?test=pipeline');
    await this.testEndpoint('Production Validation - Dependencies', 'GET', '/api/test-production-validation?test=dependencies');
    await this.testEndpoint('Production Validation - Performance', 'GET', '/api/test-production-validation?test=performance');
    await this.testEndpoint('Production Validation - Serverless', 'GET', '/api/test-production-validation?test=serverless');

    // Document generation endpoints
    await this.testDocumentGeneration();
    await this.testPreviewGeneration();
    await this.testDocxGeneration();

    // Error handling tests
    await this.testErrorHandling();

    // Performance tests
    await this.testPerformanceEndpoints();

    this.results.endTime = Date.now();
    this.printSummary();
    return this.results;
  }

  async testEndpoint(name, method, path, body = null, expectedStatus = 200) {
    this.results.totalEndpoints++;
    const startTime = Date.now();

    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   📡 ${method} ${path}`);

    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Production-Endpoint-Tester'
        },
        timeout: TEST_TIMEOUT
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${BASE_URL}${path}`, options);
      const executionTime = Date.now() - startTime;

      // Get response data
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch (e) {
          responseData = { error: 'Could not parse JSON response' };
        }
      } else {
        const buffer = await response.arrayBuffer();
        responseData = { 
          type: 'binary', 
          size: buffer.byteLength,
          contentType: contentType || 'unknown'
        };
      }

      // Determine if test passed
      const passed = this.evaluateResponse(response, responseData, expectedStatus);

      if (passed) {
        this.results.passedEndpoints++;
        console.log(`   ✅ PASSED (${executionTime}ms) - Status: ${response.status}`);
        
        if (responseData.type === 'binary') {
          console.log(`   📄 Binary response: ${responseData.size} bytes, type: ${responseData.contentType}`);
        } else if (responseData.success !== undefined) {
          console.log(`   📊 Success: ${responseData.success}, Status: ${responseData.status || 'N/A'}`);
        }
      } else {
        this.results.failedEndpoints++;
        console.log(`   ❌ FAILED (${executionTime}ms) - Status: ${response.status}`);
        
        if (responseData.error) {
          console.log(`   💥 Error: ${responseData.error}`);
        }
      }

      this.results.endpointResults.push({
        name,
        method,
        path,
        passed,
        status: response.status,
        executionTime,
        responseData: this.sanitizeResponseData(responseData)
      });

    } catch (error) {
      this.results.failedEndpoints++;
      const executionTime = Date.now() - startTime;
      
      console.log(`   ❌ FAILED (${executionTime}ms) - Exception: ${error.message}`);

      this.results.endpointResults.push({
        name,
        method,
        path,
        passed: false,
        error: error.message,
        executionTime
      });
    }
  }

  async testDocumentGeneration() {
    const testDocument = {
      title: 'Production Test Document',
      authors: [
        { name: 'Production Test Author', affiliation: 'Test University' }
      ],
      abstract: 'This is a test document for production endpoint validation.',
      keywords: 'production, test, validation',
      sections: [
        {
          title: 'Introduction',
          content: 'This is the introduction section for production testing.'
        },
        {
          title: 'Methodology',
          content: 'This section describes the testing methodology.'
        }
      ]
    };

    await this.testEndpoint(
      'Document Generation - PDF',
      'POST',
      '/api/documents',
      testDocument,
      200
    );
  }

  async testPreviewGeneration() {
    const testDocument = {
      title: 'Preview Test Document',
      authors: [{ name: 'Preview Test Author' }],
      sections: [{ title: 'Test Section', content: 'Preview test content' }]
    };

    await this.testEndpoint(
      'Document Generation - Preview',
      'POST',
      '/api/documents?preview=true',
      testDocument,
      200
    );
  }

  async testDocxGeneration() {
    const testDocument = {
      title: 'DOCX Test Document',
      authors: [{ name: 'DOCX Test Author' }],
      sections: [{ title: 'Test Section', content: 'DOCX test content' }]
    };

    await this.testEndpoint(
      'Document Generation - DOCX',
      'POST',
      '/api/documents?format=docx',
      testDocument,
      200
    );
  }

  async testErrorHandling() {
    // Test invalid document data
    await this.testEndpoint(
      'Error Handling - Invalid Data',
      'POST',
      '/api/documents',
      { invalid: 'data' },
      400
    );

    // Test missing content type
    console.log(`\n🧪 Testing: Error Handling - Missing Content Type`);
    try {
      const response = await fetch(`${BASE_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Production-Endpoint-Tester'
          // Intentionally omitting Content-Type
        },
        body: JSON.stringify({ title: 'Test' }),
        timeout: TEST_TIMEOUT
      });

      const passed = response.status >= 400 && response.status < 500;
      
      if (passed) {
        console.log(`   ✅ PASSED - Correctly rejected request without Content-Type (${response.status})`);
        this.results.passedEndpoints++;
      } else {
        console.log(`   ❌ FAILED - Should have rejected request without Content-Type (${response.status})`);
        this.results.failedEndpoints++;
      }

      this.results.totalEndpoints++;
      this.results.endpointResults.push({
        name: 'Error Handling - Missing Content Type',
        method: 'POST',
        path: '/api/documents',
        passed,
        status: response.status
      });

    } catch (error) {
      console.log(`   ❌ FAILED - Exception: ${error.message}`);
      this.results.failedEndpoints++;
      this.results.totalEndpoints++;
    }
  }

  async testPerformanceEndpoints() {
    // Test multiple rapid requests
    console.log(`\n🧪 Testing: Performance - Rapid Requests`);
    
    const testDocument = {
      title: 'Performance Test',
      authors: [{ name: 'Perf Test' }],
      sections: [{ title: 'Test', content: 'Performance test content' }]
    };

    const rapidRequests = 3;
    const promises = [];

    for (let i = 0; i < rapidRequests; i++) {
      promises.push(
        fetch(`${BASE_URL}/api/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...testDocument,
            title: `${testDocument.title} ${i + 1}`
          }),
          timeout: TEST_TIMEOUT
        })
      );
    }

    try {
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const executionTime = Date.now() - startTime;

      const successfulResponses = responses.filter(r => r.ok);
      const passed = successfulResponses.length >= Math.floor(rapidRequests * 0.8); // 80% success rate

      if (passed) {
        console.log(`   ✅ PASSED - ${successfulResponses.length}/${rapidRequests} requests successful in ${executionTime}ms`);
        this.results.passedEndpoints++;
      } else {
        console.log(`   ❌ FAILED - Only ${successfulResponses.length}/${rapidRequests} requests successful`);
        this.results.failedEndpoints++;
      }

      this.results.totalEndpoints++;
      this.results.endpointResults.push({
        name: 'Performance - Rapid Requests',
        method: 'POST',
        path: '/api/documents',
        passed,
        executionTime,
        details: `${successfulResponses.length}/${rapidRequests} successful`
      });

    } catch (error) {
      console.log(`   ❌ FAILED - Exception: ${error.message}`);
      this.results.failedEndpoints++;
      this.results.totalEndpoints++;
    }
  }

  evaluateResponse(response, responseData, expectedStatus) {
    // Check status code
    if (expectedStatus && response.status !== expectedStatus) {
      // Allow some flexibility for expected error codes
      if (expectedStatus >= 400 && response.status >= 400 && response.status < 500) {
        return true; // Any 4xx error is acceptable when expecting an error
      }
      return false;
    }

    // For successful responses, check if we got meaningful data
    if (response.status >= 200 && response.status < 300) {
      if (responseData.type === 'binary' && responseData.size > 0) {
        return true; // Valid binary response
      }
      
      if (responseData.success !== undefined) {
        return true; // Valid JSON response with success field
      }
      
      if (responseData.status || responseData.timestamp) {
        return true; // Valid health/status response
      }
      
      // If we have any meaningful data, consider it a pass
      return Object.keys(responseData).length > 0;
    }

    return false;
  }

  sanitizeResponseData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Remove large binary data and sensitive information
    const sanitized = { ...data };
    
    if (sanitized.type === 'binary') {
      return { type: 'binary', size: sanitized.size, contentType: sanitized.contentType };
    }

    // Remove potentially large arrays/objects for logging
    Object.keys(sanitized).forEach(key => {
      if (Array.isArray(sanitized[key]) && sanitized[key].length > 5) {
        sanitized[key] = `[Array with ${sanitized[key].length} items]`;
      }
      
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 200) {
        sanitized[key] = sanitized[key].substring(0, 200) + '...';
      }
    });

    return sanitized;
  }

  printSummary() {
    const executionTime = this.results.endTime - this.results.startTime;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 PRODUCTION ENDPOINT TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`🎯 Total Endpoints Tested: ${this.results.totalEndpoints}`);
    console.log(`✅ Passed: ${this.results.passedEndpoints}`);
    console.log(`❌ Failed: ${this.results.failedEndpoints}`);
    console.log(`⏱️  Total Execution Time: ${executionTime}ms`);
    console.log(`📈 Success Rate: ${((this.results.passedEndpoints / this.results.totalEndpoints) * 100).toFixed(1)}%`);

    if (this.results.failedEndpoints > 0) {
      console.log('\n❌ FAILED ENDPOINTS:');
      this.results.endpointResults
        .filter(result => !result.passed)
        .forEach(result => {
          console.log(`   • ${result.name} (${result.method} ${result.path})`);
          if (result.error) {
            console.log(`     Error: ${result.error}`);
          } else if (result.status) {
            console.log(`     Status: ${result.status}`);
          }
        });
    }

    console.log('\n🏁 Production endpoint testing completed');
    
    if (this.results.failedEndpoints === 0) {
      console.log('🎉 All endpoints are working correctly in production!');
    } else {
      console.log('⚠️  Some endpoints failed. Please review the errors above.');
    }

    // Performance summary
    const avgResponseTime = this.results.endpointResults
      .filter(r => r.executionTime)
      .reduce((sum, r) => sum + r.executionTime, 0) / 
      this.results.endpointResults.filter(r => r.executionTime).length;

    if (avgResponseTime) {
      console.log(`📊 Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    }
  }
}

// Run tests if this file is executed directly
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  const tester = new ProductionEndpointTester();
  tester.testAllEndpoints()
    .then(results => {
      process.exit(results.failedEndpoints === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Endpoint testing failed:', error);
      process.exit(1);
    });
}

export default ProductionEndpointTester;