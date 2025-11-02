/**
 * Performance Monitoring Test Suite
 * Tests memory usage, execution time, and resource constraints
 */

import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';

// Configuration
const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NODE_ENV === 'production'
  ? 'https://format-a.vercel.app'
  : 'http://localhost:3000';

const TEST_TIMEOUT = 45000; // 45 seconds
const MEMORY_LIMIT_MB = 1024; // Vercel function memory limit
const EXECUTION_LIMIT_MS = 30000; // Vercel function execution limit

class PerformanceMonitor {
  constructor() {
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      performanceMetrics: {
        memoryTests: [],
        timeoutTests: [],
        loadTests: [],
        resourceTests: []
      },
      startTime: Date.now(),
      endTime: null
    };
  }

  async runPerformanceTests() {
    console.log('⚡ Starting Performance Monitoring Tests');
    console.log(`📍 Target: ${BASE_URL}`);
    console.log(`🎯 Memory Limit: ${MEMORY_LIMIT_MB}MB`);
    console.log(`⏱️  Execution Limit: ${EXECUTION_LIMIT_MS}ms`);
    console.log('=' .repeat(80));

    // Memory usage tests
    await this.testMemoryUsage();
    
    // Execution time tests
    await this.testExecutionTimes();
    
    // Load testing
    await this.testLoadHandling();
    
    // Resource constraint tests
    await this.testResourceConstraints();
    
    // Timeout monitoring
    await this.testTimeoutHandling();
    
    // Memory leak detection
    await this.testMemoryLeaks();

    this.results.endTime = Date.now();
    this.generatePerformanceReport();
    return this.results;
  }

  async testMemoryUsage() {
    console.log('\n🧠 Testing Memory Usage');
    
    const memoryTest = {
      name: 'memory_usage_test',
      passed: false,
      measurements: [],
      peakMemory: 0,
      averageMemory: 0
    };

    try {
      // Test with documents of increasing complexity
      const testDocuments = this.generateTestDocuments();
      
      for (let i = 0; i < testDocuments.length; i++) {
        const doc = testDocuments[i];
        const startTime = Date.now();
        
        console.log(`   📄 Testing document ${i + 1}/${testDocuments.length} (${doc.complexity})`);
        
        const response = await fetch(`${BASE_URL}/api/test-production-validation?test=performance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(doc.data),
          timeout: TEST_TIMEOUT
        });

        const executionTime = Date.now() - startTime;
        
        if (response.ok) {
          const data = await response.json();
          const memoryInfo = data.execution_metadata?.memory_usage || {};
          
          const measurement = {
            documentComplexity: doc.complexity,
            executionTime,
            memoryUsage: memoryInfo.rss_mb || 0,
            heapUsage: memoryInfo.heap_mb || 0,
            success: true
          };
          
          memoryTest.measurements.push(measurement);
          memoryTest.peakMemory = Math.max(memoryTest.peakMemory, measurement.memoryUsage);
          
          console.log(`     ✅ Memory: ${measurement.memoryUsage}MB, Time: ${executionTime}ms`);
          
          // Check if memory usage is within acceptable limits
          if (measurement.memoryUsage > MEMORY_LIMIT_MB * 0.9) {
            console.log(`     ⚠️  High memory usage: ${measurement.memoryUsage}MB (${((measurement.memoryUsage / MEMORY_LIMIT_MB) * 100).toFixed(1)}% of limit)`);
          }
        } else {
          console.log(`     ❌ Request failed: ${response.status}`);
          memoryTest.measurements.push({
            documentComplexity: doc.complexity,
            executionTime,
            success: false,
            error: response.statusText
          });
        }
      }

      // Calculate averages
      const successfulMeasurements = memoryTest.measurements.filter(m => m.success);
      if (successfulMeasurements.length > 0) {
        memoryTest.averageMemory = successfulMeasurements.reduce((sum, m) => sum + m.memoryUsage, 0) / successfulMeasurements.length;
        memoryTest.passed = memoryTest.peakMemory < MEMORY_LIMIT_MB * 0.95; // Pass if under 95% of limit
      }

      console.log(`   📊 Peak Memory: ${memoryTest.peakMemory}MB, Average: ${memoryTest.averageMemory.toFixed(1)}MB`);
      console.log(`   ${memoryTest.passed ? '✅' : '❌'} Memory test ${memoryTest.passed ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
      console.log(`   ❌ Memory test failed: ${error.message}`);
      memoryTest.error = error.message;
    }

    this.results.performanceMetrics.memoryTests.push(memoryTest);
    this.updateTestCounts(memoryTest.passed);
  }

  async testExecutionTimes() {
    console.log('\n⏱️  Testing Execution Times');
    
    const timeTest = {
      name: 'execution_time_test',
      passed: false,
      measurements: [],
      averageTime: 0,
      maxTime: 0,
      timeoutRisk: false
    };

    try {
      const testDocument = {
        title: 'Execution Time Test Document',
        authors: [{ name: 'Performance Test Author' }],
        abstract: 'This document is used to test execution time performance.',
        sections: Array.from({ length: 5 }, (_, i) => ({
          title: `Section ${i + 1}`,
          content: 'Lorem ipsum '.repeat(100) // Moderate content
        }))
      };

      // Run multiple iterations to get consistent timing
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        console.log(`   🔄 Iteration ${i + 1}/5`);
        
        const response = await fetch(`${BASE_URL}/api/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testDocument),
          timeout: TEST_TIMEOUT
        });

        const executionTime = Date.now() - startTime;
        
        const measurement = {
          iteration: i + 1,
          executionTime,
          success: response.ok,
          status: response.status
        };

        if (response.ok) {
          const buffer = await response.arrayBuffer();
          measurement.outputSize = buffer.byteLength;
          console.log(`     ✅ Time: ${executionTime}ms, Output: ${buffer.byteLength} bytes`);
        } else {
          console.log(`     ❌ Failed: ${response.status} in ${executionTime}ms`);
        }

        timeTest.measurements.push(measurement);
        timeTest.maxTime = Math.max(timeTest.maxTime, executionTime);
        
        // Check for timeout risk (over 80% of limit)
        if (executionTime > EXECUTION_LIMIT_MS * 0.8) {
          timeTest.timeoutRisk = true;
          console.log(`     ⚠️  Timeout risk: ${executionTime}ms (${((executionTime / EXECUTION_LIMIT_MS) * 100).toFixed(1)}% of limit)`);
        }
      }

      // Calculate averages
      const successfulMeasurements = timeTest.measurements.filter(m => m.success);
      if (successfulMeasurements.length > 0) {
        timeTest.averageTime = successfulMeasurements.reduce((sum, m) => sum + m.executionTime, 0) / successfulMeasurements.length;
        timeTest.passed = timeTest.averageTime < EXECUTION_LIMIT_MS * 0.7 && !timeTest.timeoutRisk; // Pass if under 70% of limit
      }

      console.log(`   📊 Average Time: ${timeTest.averageTime.toFixed(0)}ms, Max: ${timeTest.maxTime}ms`);
      console.log(`   ${timeTest.passed ? '✅' : '❌'} Execution time test ${timeTest.passed ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
      console.log(`   ❌ Execution time test failed: ${error.message}`);
      timeTest.error = error.message;
    }

    this.results.performanceMetrics.timeoutTests.push(timeTest);
    this.updateTestCounts(timeTest.passed);
  }

  async testLoadHandling() {
    console.log('\n🚀 Testing Load Handling');
    
    const loadTest = {
      name: 'load_handling_test',
      passed: false,
      concurrentRequests: 5,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      measurements: []
    };

    try {
      const testDocument = {
        title: 'Load Test Document',
        authors: [{ name: 'Load Test Author' }],
        sections: [{ title: 'Load Test Section', content: 'Load test content' }]
      };

      console.log(`   🔄 Running ${loadTest.concurrentRequests} concurrent requests`);
      
      const promises = Array.from({ length: loadTest.concurrentRequests }, (_, i) => 
        this.makeTimedRequest(testDocument, i + 1)
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const totalTime = Date.now() - startTime;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          loadTest.successfulRequests++;
          loadTest.measurements.push(result.value);
        } else {
          loadTest.failedRequests++;
          console.log(`     ❌ Request ${index + 1} failed: ${result.reason || result.value?.error}`);
        }
      });

      if (loadTest.successfulRequests > 0) {
        loadTest.averageResponseTime = loadTest.measurements.reduce((sum, m) => sum + m.responseTime, 0) / loadTest.measurements.length;
        loadTest.passed = loadTest.successfulRequests >= loadTest.concurrentRequests * 0.8; // 80% success rate
      }

      console.log(`   📊 Successful: ${loadTest.successfulRequests}/${loadTest.concurrentRequests}`);
      console.log(`   📊 Average Response Time: ${loadTest.averageResponseTime.toFixed(0)}ms`);
      console.log(`   📊 Total Time: ${totalTime}ms`);
      console.log(`   ${loadTest.passed ? '✅' : '❌'} Load test ${loadTest.passed ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
      console.log(`   ❌ Load test failed: ${error.message}`);
      loadTest.error = error.message;
    }

    this.results.performanceMetrics.loadTests.push(loadTest);
    this.updateTestCounts(loadTest.passed);
  }

  async testResourceConstraints() {
    console.log('\n🔧 Testing Resource Constraints');
    
    const resourceTest = {
      name: 'resource_constraints_test',
      passed: false,
      tests: []
    };

    try {
      // Test large document generation
      const largeDocument = {
        title: 'Large Document Resource Test',
        authors: Array.from({ length: 10 }, (_, i) => ({ 
          name: `Author ${i + 1}`, 
          affiliation: `University ${i + 1}` 
        })),
        abstract: 'Large document abstract '.repeat(50),
        keywords: Array.from({ length: 20 }, (_, i) => `keyword${i + 1}`).join(', '),
        sections: Array.from({ length: 10 }, (_, i) => ({
          title: `Section ${i + 1}`,
          content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(200)
        }))
      };

      console.log('   📄 Testing large document generation');
      const largeDocTest = await this.testResourceConstraint('large_document', largeDocument);
      resourceTest.tests.push(largeDocTest);

      // Test with images (if supported)
      const imageDocument = {
        title: 'Image Resource Test',
        authors: [{ name: 'Image Test Author' }],
        sections: [{
          title: 'Image Section',
          contentBlocks: [{
            type: 'image',
            data: 'data:image/png;base64,' + 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='.repeat(100),
            caption: 'Test image',
            size: 'large'
          }]
        }]
      };

      console.log('   🖼️  Testing image processing');
      const imageTest = await this.testResourceConstraint('image_processing', imageDocument);
      resourceTest.tests.push(imageTest);

      // Determine overall pass/fail
      resourceTest.passed = resourceTest.tests.every(test => test.passed);
      console.log(`   ${resourceTest.passed ? '✅' : '❌'} Resource constraints test ${resourceTest.passed ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
      console.log(`   ❌ Resource constraints test failed: ${error.message}`);
      resourceTest.error = error.message;
    }

    this.results.performanceMetrics.resourceTests.push(resourceTest);
    this.updateTestCounts(resourceTest.passed);
  }

  async testTimeoutHandling() {
    console.log('\n⏰ Testing Timeout Handling');
    
    const timeoutTest = {
      name: 'timeout_handling_test',
      passed: false,
      timeoutDetected: false,
      gracefulHandling: false
    };

    try {
      // Create a document that might push timeout limits
      const complexDocument = {
        title: 'Timeout Test Document',
        authors: Array.from({ length: 20 }, (_, i) => ({ name: `Author ${i + 1}` })),
        sections: Array.from({ length: 20 }, (_, i) => ({
          title: `Section ${i + 1}`,
          content: 'Complex content '.repeat(500)
        }))
      };

      console.log('   ⏳ Testing with complex document (may approach timeout)');
      
      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complexDocument),
        timeout: TEST_TIMEOUT
      });

      const executionTime = Date.now() - startTime;
      
      if (executionTime > EXECUTION_LIMIT_MS * 0.9) {
        timeoutTest.timeoutDetected = true;
        console.log(`   ⚠️  Near timeout detected: ${executionTime}ms`);
      }

      if (response.ok) {
        timeoutTest.gracefulHandling = true;
        console.log(`   ✅ Complex document handled successfully in ${executionTime}ms`);
      } else if (response.status === 504 || response.status === 408) {
        // Timeout responses are acceptable
        timeoutTest.gracefulHandling = true;
        console.log(`   ✅ Timeout handled gracefully: ${response.status}`);
      } else {
        console.log(`   ❌ Unexpected error: ${response.status}`);
      }

      timeoutTest.passed = timeoutTest.gracefulHandling;
      console.log(`   ${timeoutTest.passed ? '✅' : '❌'} Timeout handling test ${timeoutTest.passed ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
      if (error.message.includes('timeout')) {
        timeoutTest.timeoutDetected = true;
        timeoutTest.gracefulHandling = true;
        timeoutTest.passed = true;
        console.log(`   ✅ Timeout handled gracefully: ${error.message}`);
      } else {
        console.log(`   ❌ Timeout test failed: ${error.message}`);
        timeoutTest.error = error.message;
      }
    }

    this.results.performanceMetrics.timeoutTests.push(timeoutTest);
    this.updateTestCounts(timeoutTest.passed);
  }

  async testMemoryLeaks() {
    console.log('\n🔍 Testing Memory Leak Detection');
    
    const leakTest = {
      name: 'memory_leak_test',
      passed: false,
      iterations: 5,
      memoryProgression: [],
      leakDetected: false
    };

    try {
      const testDocument = {
        title: 'Memory Leak Test',
        authors: [{ name: 'Leak Test Author' }],
        sections: [{ title: 'Test Section', content: 'Memory test content' }]
      };

      console.log(`   🔄 Running ${leakTest.iterations} iterations to detect memory leaks`);

      for (let i = 0; i < leakTest.iterations; i++) {
        const response = await fetch(`${BASE_URL}/api/test-production-validation?test=performance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testDocument),
          timeout: TEST_TIMEOUT
        });

        if (response.ok) {
          const data = await response.json();
          const memoryUsage = data.execution_metadata?.memory_usage?.rss_mb || 0;
          
          leakTest.memoryProgression.push({
            iteration: i + 1,
            memoryUsage
          });

          console.log(`     Iteration ${i + 1}: ${memoryUsage}MB`);
        }

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Analyze memory progression
      if (leakTest.memoryProgression.length >= 3) {
        const firstThird = leakTest.memoryProgression.slice(0, Math.floor(leakTest.iterations / 3));
        const lastThird = leakTest.memoryProgression.slice(-Math.floor(leakTest.iterations / 3));
        
        const avgFirst = firstThird.reduce((sum, m) => sum + m.memoryUsage, 0) / firstThird.length;
        const avgLast = lastThird.reduce((sum, m) => sum + m.memoryUsage, 0) / lastThird.length;
        
        const memoryIncrease = avgLast - avgFirst;
        leakTest.leakDetected = memoryIncrease > 50; // More than 50MB increase
        
        console.log(`   📊 Memory change: ${memoryIncrease.toFixed(1)}MB (${avgFirst.toFixed(1)}MB → ${avgLast.toFixed(1)}MB)`);
        
        if (leakTest.leakDetected) {
          console.log(`   ⚠️  Potential memory leak detected`);
        }
      }

      leakTest.passed = !leakTest.leakDetected;
      console.log(`   ${leakTest.passed ? '✅' : '❌'} Memory leak test ${leakTest.passed ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
      console.log(`   ❌ Memory leak test failed: ${error.message}`);
      leakTest.error = error.message;
    }

    this.results.performanceMetrics.memoryTests.push(leakTest);
    this.updateTestCounts(leakTest.passed);
  }

  async testResourceConstraint(testName, document) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${BASE_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document),
        timeout: TEST_TIMEOUT
      });

      const executionTime = Date.now() - startTime;
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        console.log(`     ✅ ${testName}: ${executionTime}ms, ${buffer.byteLength} bytes`);
        
        return {
          name: testName,
          passed: true,
          executionTime,
          outputSize: buffer.byteLength
        };
      } else {
        console.log(`     ❌ ${testName}: Failed with status ${response.status}`);
        return {
          name: testName,
          passed: false,
          executionTime,
          error: response.statusText
        };
      }
    } catch (error) {
      console.log(`     ❌ ${testName}: ${error.message}`);
      return {
        name: testName,
        passed: false,
        error: error.message
      };
    }
  }

  async makeTimedRequest(document, requestId) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${BASE_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...document,
          title: `${document.title} - Request ${requestId}`
        }),
        timeout: TEST_TIMEOUT
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        console.log(`     ✅ Request ${requestId}: ${responseTime}ms, ${buffer.byteLength} bytes`);
        
        return {
          success: true,
          requestId,
          responseTime,
          outputSize: buffer.byteLength
        };
      } else {
        console.log(`     ❌ Request ${requestId}: Failed ${response.status} in ${responseTime}ms`);
        return {
          success: false,
          requestId,
          responseTime,
          error: response.statusText
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        requestId,
        responseTime,
        error: error.message
      };
    }
  }

  generateTestDocuments() {
    return [
      {
        complexity: 'simple',
        data: {
          title: 'Simple Test Document',
          authors: [{ name: 'Test Author' }],
          sections: [{ title: 'Test Section', content: 'Simple content' }]
        }
      },
      {
        complexity: 'medium',
        data: {
          title: 'Medium Complexity Document',
          authors: [
            { name: 'Author 1', affiliation: 'University 1' },
            { name: 'Author 2', affiliation: 'University 2' }
          ],
          abstract: 'Medium complexity abstract '.repeat(10),
          sections: Array.from({ length: 3 }, (_, i) => ({
            title: `Section ${i + 1}`,
            content: 'Medium content '.repeat(50)
          }))
        }
      },
      {
        complexity: 'complex',
        data: {
          title: 'Complex Test Document',
          authors: Array.from({ length: 5 }, (_, i) => ({ 
            name: `Author ${i + 1}`, 
            affiliation: `University ${i + 1}` 
          })),
          abstract: 'Complex abstract '.repeat(20),
          sections: Array.from({ length: 5 }, (_, i) => ({
            title: `Section ${i + 1}`,
            content: 'Complex content '.repeat(100)
          }))
        }
      }
    ];
  }

  updateTestCounts(passed) {
    this.results.totalTests++;
    if (passed) {
      this.results.passedTests++;
    } else {
      this.results.failedTests++;
    }
  }

  async generatePerformanceReport() {
    const executionTime = this.results.endTime - this.results.startTime;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE MONITORING SUMMARY');
    console.log('='.repeat(80));
    console.log(`🎯 Total Tests: ${this.results.totalTests}`);
    console.log(`✅ Passed: ${this.results.passedTests}`);
    console.log(`❌ Failed: ${this.results.failedTests}`);
    console.log(`⏱️  Total Execution Time: ${executionTime}ms`);
    console.log(`📈 Success Rate: ${((this.results.passedTests / this.results.totalTests) * 100).toFixed(1)}%`);

    // Memory analysis
    const memoryTests = this.results.performanceMetrics.memoryTests;
    if (memoryTests.length > 0) {
      const memoryTest = memoryTests[0];
      if (memoryTest.peakMemory > 0) {
        console.log(`🧠 Peak Memory Usage: ${memoryTest.peakMemory}MB (${((memoryTest.peakMemory / MEMORY_LIMIT_MB) * 100).toFixed(1)}% of limit)`);
      }
    }

    // Timing analysis
    const timeTests = this.results.performanceMetrics.timeoutTests;
    if (timeTests.length > 0) {
      const timeTest = timeTests[0];
      if (timeTest.averageTime > 0) {
        console.log(`⏱️  Average Execution Time: ${timeTest.averageTime.toFixed(0)}ms (${((timeTest.averageTime / EXECUTION_LIMIT_MS) * 100).toFixed(1)}% of limit)`);
      }
    }

    // Save detailed report
    try {
      const reportPath = path.join(__dirname, 'performance-report.json');
      await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.log(`⚠️  Could not save report: ${error.message}`);
    }

    console.log('\n🏁 Performance monitoring completed');
    
    if (this.results.failedTests === 0) {
      console.log('🎉 All performance tests passed!');
    } else {
      console.log('⚠️  Some performance tests failed. Review the results above.');
    }
  }
}

// Run tests if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  const monitor = new PerformanceMonitor();
  monitor.runPerformanceTests()
    .then(results => {
      process.exit(results.failedTests === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Performance monitoring failed:', error);
      process.exit(1);
    });
}

export default PerformanceMonitor;