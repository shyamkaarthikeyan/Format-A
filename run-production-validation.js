#!/usr/bin/env node

/**
 * Production Validation Test Runner
 * Orchestrates all production testing and validation components
 */

import IntegrationTestRunner from './test-integration-pipeline.js';
import ProductionEndpointTester from './test-production-endpoints.js';
import PerformanceMonitor from './test-performance-monitoring.js';
import { promises as fs } from 'fs';
import path from 'path';

class ProductionValidationRunner {
  constructor() {
    this.results = {
      startTime: Date.now(),
      endTime: null,
      totalExecutionTime: 0,
      testSuites: {
        integration: null,
        endpoints: null,
        performance: null
      },
      overallStatus: 'unknown',
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        successRate: 0
      },
      recommendations: []
    };
  }

  async runAllValidationTests() {
    console.log('🚀 PRODUCTION VALIDATION TEST SUITE');
    console.log('=' .repeat(80));
    console.log('Running comprehensive validation of PDF generation pipeline');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('=' .repeat(80));

    try {
      // Run Integration Tests
      console.log('\n📋 PHASE 1: INTEGRATION PIPELINE TESTS');
      console.log('-'.repeat(50));
      const integrationRunner = new IntegrationTestRunner();
      this.results.testSuites.integration = await integrationRunner.runAllTests();

      // Run Endpoint Tests
      console.log('\n🔗 PHASE 2: PRODUCTION ENDPOINT TESTS');
      console.log('-'.repeat(50));
      const endpointTester = new ProductionEndpointTester();
      this.results.testSuites.endpoints = await endpointTester.testAllEndpoints();

      // Run Performance Tests
      console.log('\n⚡ PHASE 3: PERFORMANCE MONITORING TESTS');
      console.log('-'.repeat(50));
      const performanceMonitor = new PerformanceMonitor();
      this.results.testSuites.performance = await performanceMonitor.runPerformanceTests();

      // Calculate overall results
      this.calculateOverallResults();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Create comprehensive report
      await this.generateComprehensiveReport();

    } catch (error) {
      console.error('\n❌ VALIDATION SUITE FAILED');
      console.error('Error:', error.message);
      this.results.overallStatus = 'failed';
    }

    this.results.endTime = Date.now();
    this.results.totalExecutionTime = this.results.endTime - this.results.startTime;

    this.printFinalSummary();
    return this.results;
  }

  calculateOverallResults() {
    const suites = this.results.testSuites;
    
    // Integration tests
    if (suites.integration) {
      this.results.summary.totalTests += suites.integration.totalTests;
      this.results.summary.passedTests += suites.integration.passedTests;
      this.results.summary.failedTests += suites.integration.failedTests;
    }

    // Endpoint tests
    if (suites.endpoints) {
      this.results.summary.totalTests += suites.endpoints.totalEndpoints;
      this.results.summary.passedTests += suites.endpoints.passedEndpoints;
      this.results.summary.failedTests += suites.endpoints.failedEndpoints;
    }

    // Performance tests
    if (suites.performance) {
      this.results.summary.totalTests += suites.performance.totalTests;
      this.results.summary.passedTests += suites.performance.passedTests;
      this.results.summary.failedTests += suites.performance.failedTests;
    }

    // Calculate success rate
    if (this.results.summary.totalTests > 0) {
      this.results.summary.successRate = (this.results.summary.passedTests / this.results.summary.totalTests) * 100;
    }

    // Determine overall status
    if (this.results.summary.failedTests === 0) {
      this.results.overallStatus = 'passed';
    } else if (this.results.summary.successRate >= 80) {
      this.results.overallStatus = 'passed_with_warnings';
    } else {
      this.results.overallStatus = 'failed';
    }
  }

  generateRecommendations() {
    const recommendations = [];
    const suites = this.results.testSuites;

    // Integration test recommendations
    if (suites.integration && suites.integration.failedTests > 0) {
      recommendations.push({
        category: 'Integration',
        priority: 'high',
        issue: 'Integration tests failed',
        recommendation: 'Review failed integration tests and fix underlying issues before deployment',
        failedTests: suites.integration.testResults.filter(t => !t.success).map(t => t.name)
      });
    }

    // Endpoint test recommendations
    if (suites.endpoints && suites.endpoints.failedEndpoints > 0) {
      recommendations.push({
        category: 'Endpoints',
        priority: 'high',
        issue: 'Some endpoints are not responding correctly',
        recommendation: 'Fix failing endpoints before production deployment',
        failedEndpoints: suites.endpoints.endpointResults.filter(e => !e.passed).map(e => e.name)
      });
    }

    // Performance recommendations
    if (suites.performance) {
      const memoryTests = suites.performance.performanceMetrics.memoryTests;
      const timeTests = suites.performance.performanceMetrics.timeoutTests;

      // Memory recommendations
      if (memoryTests.length > 0) {
        const memoryTest = memoryTests[0];
        if (memoryTest.peakMemory > 800) { // Over 800MB
          recommendations.push({
            category: 'Performance',
            priority: 'medium',
            issue: `High memory usage detected: ${memoryTest.peakMemory}MB`,
            recommendation: 'Consider optimizing memory usage or increasing function memory limit'
          });
        }
      }

      // Timeout recommendations
      if (timeTests.length > 0) {
        const timeTest = timeTests[0];
        if (timeTest.averageTime > 20000) { // Over 20 seconds
          recommendations.push({
            category: 'Performance',
            priority: 'medium',
            issue: `Slow execution times: ${timeTest.averageTime.toFixed(0)}ms average`,
            recommendation: 'Optimize PDF generation performance or increase function timeout'
          });
        }
      }
    }

    // Success recommendations
    if (this.results.overallStatus === 'passed') {
      recommendations.push({
        category: 'Deployment',
        priority: 'info',
        issue: 'All tests passed',
        recommendation: 'System is ready for production deployment'
      });
    }

    this.results.recommendations = recommendations;
  }

  async generateComprehensiveReport() {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        testSuiteVersion: '1.0.0',
        environment: process.env.NODE_ENV || 'unknown',
        targetUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
      },
      summary: this.results.summary,
      overallStatus: this.results.overallStatus,
      executionTime: this.results.totalExecutionTime,
      testSuites: {
        integration: this.sanitizeTestResults(this.results.testSuites.integration),
        endpoints: this.sanitizeTestResults(this.results.testSuites.endpoints),
        performance: this.sanitizeTestResults(this.results.testSuites.performance)
      },
      recommendations: this.results.recommendations,
      detailedResults: {
        failedTests: this.getFailedTests(),
        performanceMetrics: this.getPerformanceMetrics(),
        healthStatus: this.getHealthStatus()
      }
    };

    try {
      const reportPath = path.join(__dirname, 'production-validation-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Comprehensive report saved to: ${reportPath}`);

      // Also create a summary report
      const summaryPath = path.join(__dirname, 'validation-summary.md');
      await this.generateMarkdownSummary(report, summaryPath);
      console.log(`📄 Summary report saved to: ${summaryPath}`);

    } catch (error) {
      console.error(`⚠️  Could not save reports: ${error.message}`);
    }
  }

  async generateMarkdownSummary(report, filePath) {
    const markdown = `# Production Validation Report

## Summary
- **Overall Status**: ${report.overallStatus.toUpperCase()}
- **Total Tests**: ${report.summary.totalTests}
- **Passed**: ${report.summary.passedTests}
- **Failed**: ${report.summary.failedTests}
- **Success Rate**: ${report.summary.successRate.toFixed(1)}%
- **Execution Time**: ${(report.executionTime / 1000).toFixed(1)} seconds
- **Generated**: ${report.metadata.generatedAt}

## Test Suite Results

### Integration Tests
${report.testSuites.integration ? `
- **Status**: ${report.testSuites.integration.failedTests === 0 ? '✅ PASSED' : '❌ FAILED'}
- **Tests**: ${report.testSuites.integration.passedTests}/${report.testSuites.integration.totalTests} passed
- **Execution Time**: ${report.testSuites.integration.executionTimeMs}ms
` : '- **Status**: Not run'}

### Endpoint Tests
${report.testSuites.endpoints ? `
- **Status**: ${report.testSuites.endpoints.failedEndpoints === 0 ? '✅ PASSED' : '❌ FAILED'}
- **Endpoints**: ${report.testSuites.endpoints.passedEndpoints}/${report.testSuites.endpoints.totalEndpoints} passed
` : '- **Status**: Not run'}

### Performance Tests
${report.testSuites.performance ? `
- **Status**: ${report.testSuites.performance.failedTests === 0 ? '✅ PASSED' : '❌ FAILED'}
- **Tests**: ${report.testSuites.performance.passedTests}/${report.testSuites.performance.totalTests} passed
` : '- **Status**: Not run'}

## Recommendations

${report.recommendations.map(rec => `
### ${rec.category} - ${rec.priority.toUpperCase()}
**Issue**: ${rec.issue}
**Recommendation**: ${rec.recommendation}
${rec.failedTests ? `**Failed Tests**: ${rec.failedTests.join(', ')}` : ''}
${rec.failedEndpoints ? `**Failed Endpoints**: ${rec.failedEndpoints.join(', ')}` : ''}
`).join('\n')}

## Next Steps

${report.overallStatus === 'passed' ? `
✅ **Ready for Production**
All tests passed successfully. The system is ready for production deployment.
` : report.overallStatus === 'passed_with_warnings' ? `
⚠️ **Deploy with Caution**
Most tests passed but some issues were detected. Review recommendations before deployment.
` : `
❌ **Not Ready for Production**
Critical issues detected. Fix failing tests before deployment.
`}

---
*Generated by Production Validation Test Suite v${report.metadata.testSuiteVersion}*
`;

    await fs.writeFile(filePath, markdown);
  }

  sanitizeTestResults(results) {
    if (!results) return null;

    // Remove large binary data and sensitive information
    const sanitized = JSON.parse(JSON.stringify(results));
    
    // Remove large response data
    if (sanitized.endpointResults) {
      sanitized.endpointResults.forEach(result => {
        if (result.responseData && typeof result.responseData === 'object') {
          Object.keys(result.responseData).forEach(key => {
            if (typeof result.responseData[key] === 'string' && result.responseData[key].length > 500) {
              result.responseData[key] = '[Large data truncated]';
            }
          });
        }
      });
    }

    return sanitized;
  }

  getFailedTests() {
    const failed = [];
    const suites = this.results.testSuites;

    if (suites.integration && suites.integration.testResults) {
      failed.push(...suites.integration.testResults.filter(t => !t.success).map(t => ({
        suite: 'integration',
        name: t.name,
        error: t.error
      })));
    }

    if (suites.endpoints && suites.endpoints.endpointResults) {
      failed.push(...suites.endpoints.endpointResults.filter(e => !e.passed).map(e => ({
        suite: 'endpoints',
        name: e.name,
        error: e.error || `Status: ${e.status}`
      })));
    }

    if (suites.performance && suites.performance.performanceMetrics) {
      // Add failed performance tests
      Object.values(suites.performance.performanceMetrics).forEach(metricArray => {
        if (Array.isArray(metricArray)) {
          metricArray.forEach(metric => {
            if (metric.passed === false) {
              failed.push({
                suite: 'performance',
                name: metric.name,
                error: metric.error || 'Performance threshold not met'
              });
            }
          });
        }
      });
    }

    return failed;
  }

  getPerformanceMetrics() {
    const performance = this.results.testSuites.performance;
    if (!performance || !performance.performanceMetrics) return null;

    const metrics = {};
    
    // Memory metrics
    if (performance.performanceMetrics.memoryTests.length > 0) {
      const memTest = performance.performanceMetrics.memoryTests[0];
      metrics.memory = {
        peakUsage: memTest.peakMemory,
        averageUsage: memTest.averageMemory,
        withinLimits: memTest.passed
      };
    }

    // Timing metrics
    if (performance.performanceMetrics.timeoutTests.length > 0) {
      const timeTest = performance.performanceMetrics.timeoutTests[0];
      metrics.timing = {
        averageTime: timeTest.averageTime,
        maxTime: timeTest.maxTime,
        withinLimits: timeTest.passed
      };
    }

    return metrics;
  }

  getHealthStatus() {
    // Determine overall health based on test results
    const status = {
      overall: this.results.overallStatus,
      components: {
        pdfGeneration: 'unknown',
        apiEndpoints: 'unknown',
        performance: 'unknown'
      }
    };

    const suites = this.results.testSuites;

    if (suites.integration) {
      status.components.pdfGeneration = suites.integration.failedTests === 0 ? 'healthy' : 'unhealthy';
    }

    if (suites.endpoints) {
      status.components.apiEndpoints = suites.endpoints.failedEndpoints === 0 ? 'healthy' : 'unhealthy';
    }

    if (suites.performance) {
      status.components.performance = suites.performance.failedTests === 0 ? 'healthy' : 'degraded';
    }

    return status;
  }

  printFinalSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('🏁 PRODUCTION VALIDATION COMPLETE');
    console.log('='.repeat(80));
    
    const statusEmoji = {
      'passed': '🎉',
      'passed_with_warnings': '⚠️',
      'failed': '❌',
      'unknown': '❓'
    };

    console.log(`${statusEmoji[this.results.overallStatus]} Overall Status: ${this.results.overallStatus.toUpperCase().replace('_', ' ')}`);
    console.log(`📊 Total Tests: ${this.results.summary.totalTests}`);
    console.log(`✅ Passed: ${this.results.summary.passedTests}`);
    console.log(`❌ Failed: ${this.results.summary.failedTests}`);
    console.log(`📈 Success Rate: ${this.results.summary.successRate.toFixed(1)}%`);
    console.log(`⏱️  Total Time: ${(this.results.totalExecutionTime / 1000).toFixed(1)} seconds`);

    if (this.results.recommendations.length > 0) {
      console.log('\n📋 RECOMMENDATIONS:');
      this.results.recommendations.forEach((rec, index) => {
        const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢', info: 'ℹ️' };
        console.log(`${index + 1}. ${priorityEmoji[rec.priority]} [${rec.category}] ${rec.recommendation}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    
    if (this.results.overallStatus === 'passed') {
      console.log('🚀 READY FOR PRODUCTION DEPLOYMENT');
    } else if (this.results.overallStatus === 'passed_with_warnings') {
      console.log('⚠️  DEPLOY WITH CAUTION - Review recommendations');
    } else {
      console.log('🛑 NOT READY FOR PRODUCTION - Fix critical issues first');
    }
    
    console.log('='.repeat(80));
  }
}

// CLI execution
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  const runner = new ProductionValidationRunner();
  
  runner.runAllValidationTests()
    .then(results => {
      const exitCode = results.overallStatus === 'failed' ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('\n❌ VALIDATION RUNNER FAILED');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    });
}

export default ProductionValidationRunner;