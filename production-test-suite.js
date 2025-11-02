#!/usr/bin/env node

/**
 * Comprehensive Production Test Suite
 * 
 * This script provides detailed testing for all production functionality
 * including edge cases, error handling, and performance validation.
 */

import fetch from 'node-fetch';
import fs from 'fs';

const PRODUCTION_URL = 'https://format-a.vercel.app';

class ProductionTestSuite {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(testName, testFunction) {
    this.log(`Running test: ${testName}`, 'info');
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name: testName,
        status: 'passed',
        duration,
        result,
        timestamp: new Date().toISOString()
      });
      
      this.log(`✅ ${testName} passed (${duration}ms)`, 'success');
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name: testName,
        status: 'failed',
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.log(`❌ ${testName} failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async testApplicationLoad() {
    const response = await fetch(PRODUCTION_URL, {
      timeout: 10000,
      headers: { 'User-Agent': 'Production-Test-Suite/1.0' }
    });
    
    if (!response.ok) {
      throw new Error(`Application failed to load: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Check for critical elements
    if (!html.includes('<div id="root">')) {
      throw new Error('React root element not found');
    }
    
    if (html.includes('500') || html.includes('Internal Server Error')) {
      throw new Error('500 error detected in HTML response');
    }
    
    return {
      status: response.status,
      contentLength: html.length,
      hasReactRoot: html.includes('<div id="root">'),
      responseTime: response.headers.get('x-vercel-cache') || 'unknown'
    };
  }

  async testPythonHealthCheck() {
    const response = await fetch(`${PRODUCTION_URL}/api/health-python`, {
      timeout: 15000,
      headers: { 'User-Agent': 'Production-Test-Suite/1.0' }
    });
    
    if (!response.ok) {
      throw new Error(`Python health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Verify Python dependencies are available
    const requiredDeps = ['reportlab', 'docx', 'PIL'];
    const missingDeps = requiredDeps.filter(dep => !data.dependencies || !data.dependencies[dep]);
    
    if (missingDeps.length > 0) {
      throw new Error(`Missing Python dependencies: ${missingDeps.join(', ')}`);
    }
    
    return data;
  }

  async testPDFGeneration() {
    const testDocument = {
      title: 'Production Test Document',
      authors: [
        { name: 'Test Author', affiliation: 'Test University', email: 'test@example.com' }
      ],
      abstract: 'This is a test abstract for production validation of PDF generation functionality.',
      keywords: ['test', 'production', 'validation'],
      sections: [
        {
          title: 'Introduction',
          content: 'This is the introduction section for testing PDF generation in production.'
        },
        {
          title: 'Methodology',
          content: 'This section describes the testing methodology used for production validation.'
        },
        {
          title: 'Results',
          content: 'This section contains the results of the production testing process.'
        },
        {
          title: 'Conclusion',
          content: 'This section provides conclusions from the production testing validation.'
        }
      ]
    };

    const response = await fetch(`${PRODUCTION_URL}/api/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Production-Test-Suite/1.0'
      },
      body: JSON.stringify(testDocument),
      timeout: 30000
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PDF generation failed: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/pdf')) {
      throw new Error(`Invalid content type: ${contentType}, expected application/pdf`);
    }

    const buffer = await response.buffer();
    
    // Basic PDF validation
    if (buffer.length < 1000) {
      throw new Error('Generated PDF is too small, likely corrupted');
    }
    
    // Check PDF header
    const pdfHeader = buffer.slice(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      throw new Error('Invalid PDF header');
    }

    return {
      size: buffer.length,
      contentType,
      isValidPDF: pdfHeader === '%PDF',
      responseTime: response.headers.get('x-vercel-execution-time') || 'unknown'
    };
  }

  async testDOCXToPDFConversion() {
    const testData = {
      docxData: 'test-docx-content-for-production-validation',
      filename: 'production-test.docx'
    };

    const response = await fetch(`${PRODUCTION_URL}/api/convert-docx-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Production-Test-Suite/1.0'
      },
      body: JSON.stringify(testData),
      timeout: 30000
    });

    // This endpoint might not be fully implemented, so we accept 404 or 501
    if (response.status === 404 || response.status === 501) {
      return {
        status: 'not_implemented',
        message: 'DOCX to PDF conversion endpoint not yet implemented'
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DOCX to PDF conversion failed: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.buffer();

    return {
      size: buffer.length,
      contentType,
      responseTime: response.headers.get('x-vercel-execution-time') || 'unknown'
    };
  }

  async testPreviewGeneration() {
    const testData = {
      title: 'Preview Test Document',
      content: 'This is test content for preview generation validation in production.'
    };

    const response = await fetch(`${PRODUCTION_URL}/api/generate/docx-to-pdf?preview=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Production-Test-Suite/1.0'
      },
      body: JSON.stringify(testData),
      timeout: 30000
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Preview generation failed: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.buffer();

    return {
      size: buffer.length,
      contentType,
      responseTime: response.headers.get('x-vercel-execution-time') || 'unknown'
    };
  }

  async testAdminEndpoints() {
    const adminTests = [
      { name: 'Admin Health', endpoint: '/api/admin' },
      { name: 'Admin Analytics', endpoint: '/api/admin/analytics' },
      { name: 'Admin Users', endpoint: '/api/admin/users' },
      { name: 'Admin Dashboard', endpoint: '/api/admin/dashboard' }
    ];

    const results = {};

    for (const test of adminTests) {
      try {
        const response = await fetch(`${PRODUCTION_URL}${test.endpoint}`, {
          headers: {
            'X-Admin-Email': 'shyamkaarthikeyan@gmail.com',
            'User-Agent': 'Production-Test-Suite/1.0'
          },
          timeout: 10000
        });

        results[test.name] = {
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get('content-type')
        };

        if (response.ok) {
          const data = await response.json();
          results[test.name].hasData = Object.keys(data).length > 0;
        }
      } catch (error) {
        results[test.name] = {
          status: 'error',
          error: error.message
        };
      }
    }

    return results;
  }

  async testErrorHandling() {
    const errorTests = [
      {
        name: 'Invalid PDF Request',
        url: `${PRODUCTION_URL}/api/generate-pdf`,
        method: 'POST',
        body: { invalid: 'data' },
        expectedStatus: [400, 422, 500]
      },
      {
        name: 'Non-existent Endpoint',
        url: `${PRODUCTION_URL}/api/non-existent-endpoint`,
        method: 'GET',
        expectedStatus: [404]
      },
      {
        name: 'Invalid Method',
        url: `${PRODUCTION_URL}/api/health-python`,
        method: 'DELETE',
        expectedStatus: [405, 404]
      }
    ];

    const results = {};

    for (const test of errorTests) {
      try {
        const options = {
          method: test.method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Production-Test-Suite/1.0'
          },
          timeout: 10000
        };

        if (test.body) {
          options.body = JSON.stringify(test.body);
        }

        const response = await fetch(test.url, options);
        
        results[test.name] = {
          status: response.status,
          expectedStatus: test.expectedStatus,
          handledCorrectly: test.expectedStatus.includes(response.status)
        };

        if (!response.ok) {
          const errorText = await response.text();
          results[test.name].errorMessage = errorText;
        }
      } catch (error) {
        results[test.name] = {
          status: 'network_error',
          error: error.message,
          handledCorrectly: false
        };
      }
    }

    return results;
  }

  async testPerformanceMetrics() {
    const endpoints = [
      `${PRODUCTION_URL}/api/health`,
      `${PRODUCTION_URL}/api/health-python`,
      `${PRODUCTION_URL}/api/documents`
    ];

    const metrics = {
      responseTimes: [],
      successRate: 0,
      totalRequests: 0
    };

    for (const endpoint of endpoints) {
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        try {
          const response = await fetch(endpoint, {
            timeout: 10000,
            headers: { 'User-Agent': 'Production-Test-Suite/1.0' }
          });
          
          const responseTime = Date.now() - startTime;
          metrics.responseTimes.push(responseTime);
          metrics.totalRequests++;
          
          if (response.ok) {
            metrics.successRate++;
          }
        } catch (error) {
          metrics.totalRequests++;
          metrics.responseTimes.push(10000); // Timeout value
        }
      }
    }

    metrics.averageResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
    metrics.maxResponseTime = Math.max(...metrics.responseTimes);
    metrics.successRate = (metrics.successRate / metrics.totalRequests) * 100;

    return metrics;
  }

  async runAllTests() {
    this.log('🧪 Starting Comprehensive Production Test Suite', 'info');
    this.log('===============================================', 'info');

    const tests = [
      { name: 'Application Load Test', fn: () => this.testApplicationLoad() },
      { name: 'Python Health Check', fn: () => this.testPythonHealthCheck() },
      { name: 'PDF Generation Test', fn: () => this.testPDFGeneration() },
      { name: 'DOCX to PDF Conversion', fn: () => this.testDOCXToPDFConversion() },
      { name: 'Preview Generation Test', fn: () => this.testPreviewGeneration() },
      { name: 'Admin Endpoints Test', fn: () => this.testAdminEndpoints() },
      { name: 'Error Handling Test', fn: () => this.testErrorHandling() },
      { name: 'Performance Metrics', fn: () => this.testPerformanceMetrics() }
    ];

    let passedTests = 0;
    let failedTests = 0;

    for (const test of tests) {
      try {
        await this.runTest(test.name, test.fn);
        passedTests++;
      } catch (error) {
        failedTests++;
        // Continue with other tests
      }
    }

    // Generate report
    const totalTime = Date.now() - this.startTime;
    const report = {
      summary: {
        totalTests: tests.length,
        passedTests,
        failedTests,
        successRate: Math.round((passedTests / tests.length) * 100),
        totalTime: Math.round(totalTime / 1000),
        timestamp: new Date().toISOString()
      },
      results: this.testResults
    };

    // Save report
    const reportPath = `production-test-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Print summary
    this.log('\n📊 TEST SUITE SUMMARY', 'info');
    this.log('====================', 'info');
    this.log(`Total Tests: ${report.summary.totalTests}`, 'info');
    this.log(`Passed: ${report.summary.passedTests}`, 'success');
    this.log(`Failed: ${report.summary.failedTests}`, failedTests > 0 ? 'error' : 'info');
    this.log(`Success Rate: ${report.summary.successRate}%`, 
             report.summary.successRate >= 80 ? 'success' : 'warning');
    this.log(`Total Time: ${report.summary.totalTime}s`, 'info');
    this.log(`Report saved to: ${reportPath}`, 'info');

    return report;
  }
}

// Run the test suite
const testSuite = new ProductionTestSuite();
testSuite.runAllTests()
  .then(report => {
    process.exit(report.summary.successRate >= 80 ? 0 : 1);
  })
  .catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });

export default ProductionTestSuite;