#!/usr/bin/env node

/**
 * Test Validation Suite
 * Quick test to verify that all production testing components are working
 */

import fetch from 'node-fetch';

// Configuration
const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NODE_ENV === 'production'
  ? 'https://format-a.vercel.app'
  : 'http://localhost:3000';

const TEST_TIMEOUT = 15000; // 15 seconds for quick tests

class ValidationSuiteTester {
  constructor() {
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testResults: []
    };
  }

  async runQuickValidation() {
    console.log('🔍 Quick Validation of Production Testing Suite');
    console.log(`📍 Target: ${BASE_URL}`);
    console.log('=' .repeat(60));

    // Test 1: Python Health Check
    await this.testEndpoint('Python Health Check', '/api/health-python');

    // Test 2: Production Validation Endpoint
    await this.testEndpoint('Production Validation - Health', '/api/test-production-validation?test=health');

    // Test 3: Health Monitoring
    await this.testEndpoint('Health Monitoring - Quick', '/api/health-monitoring?type=quick');

    // Test 4: Documents Health
    await this.testEndpoint('Documents Health', '/api/documents/health');

    // Test 5: Simple PDF Generation
    await this.testPdfGeneration();

    this.printSummary();
    return this.results;
  }

  async testEndpoint(name, path) {
    this.results.totalTests++;
    const startTime = Date.now();

    console.log(`\n🧪 Testing: ${name}`);

    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: TEST_TIMEOUT
      });

      const executionTime = Date.now() - startTime;
      const success = response.ok;

      if (success) {
        this.results.passedTests++;
        console.log(`   ✅ PASSED (${executionTime}ms) - Status: ${response.status}`);
      } else {
        this.results.failedTests++;
        console.log(`   ❌ FAILED (${executionTime}ms) - Status: ${response.status}`);
      }

      this.results.testResults.push({
        name,
        success,
        executionTime,
        status: response.status
      });

    } catch (error) {
      this.results.failedTests++;
      const executionTime = Date.now() - startTime;
      
      console.log(`   ❌ FAILED (${executionTime}ms) - Error: ${error.message}`);

      this.results.testResults.push({
        name,
        success: false,
        executionTime,
        error: error.message
      });
    }
  }

  async testPdfGeneration() {
    this.results.totalTests++;
    const startTime = Date.now();

    console.log(`\n🧪 Testing: Simple PDF Generation`);

    try {
      const testDocument = {
        title: 'Validation Test Document',
        authors: [{ name: 'Test Author' }],
        sections: [{ title: 'Test Section', content: 'Test content for validation' }]
      };

      const response = await fetch(`${BASE_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testDocument),
        timeout: TEST_TIMEOUT
      });

      const executionTime = Date.now() - startTime;
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/json'))) {
          this.results.passedTests++;
          console.log(`   ✅ PASSED (${executionTime}ms) - PDF generation working`);
          
          this.results.testResults.push({
            name: 'Simple PDF Generation',
            success: true,
            executionTime,
            contentType
          });
        } else {
          this.results.failedTests++;
          console.log(`   ❌ FAILED (${executionTime}ms) - Unexpected content type: ${contentType}`);
          
          this.results.testResults.push({
            name: 'Simple PDF Generation',
            success: false,
            executionTime,
            error: `Unexpected content type: ${contentType}`
          });
        }
      } else {
        this.results.failedTests++;
        console.log(`   ❌ FAILED (${executionTime}ms) - Status: ${response.status}`);
        
        this.results.testResults.push({
          name: 'Simple PDF Generation',
          success: false,
          executionTime,
          status: response.status
        });
      }

    } catch (error) {
      this.results.failedTests++;
      const executionTime = Date.now() - startTime;
      
      console.log(`   ❌ FAILED (${executionTime}ms) - Error: ${error.message}`);

      this.results.testResults.push({
        name: 'Simple PDF Generation',
        success: false,
        executionTime,
        error: error.message
      });
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUITE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`🎯 Total Tests: ${this.results.totalTests}`);
    console.log(`✅ Passed: ${this.results.passedTests}`);
    console.log(`❌ Failed: ${this.results.failedTests}`);
    console.log(`📈 Success Rate: ${((this.results.passedTests / this.results.totalTests) * 100).toFixed(1)}%`);

    if (this.results.failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.testResults
        .filter(test => !test.success)
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error || `Status ${test.status}`}`);
        });
    }

    console.log('\n🏁 Quick validation completed');
    
    if (this.results.failedTests === 0) {
      console.log('🎉 All validation components are working correctly!');
      console.log('✅ Ready to run full production validation suite');
    } else {
      console.log('⚠️  Some validation components failed. Fix these issues before running full suite.');
    }
  }
}

// Run quick validation if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  const tester = new ValidationSuiteTester();
  tester.runQuickValidation()
    .then(results => {
      process.exit(results.failedTests === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Quick validation failed:', error);
      process.exit(1);
    });
}

export default ValidationSuiteTester;