#!/usr/bin/env node

/**
 * Production Monitoring Script
 * 
 * Monitors error logs and performance metrics for the production deployment
 */

import { execSync } from 'child_process';
import fetch from 'node-fetch';
import fs from 'fs';

const PRODUCTION_URL = 'https://format-a.vercel.app';

class ProductionMonitor {
  constructor() {
    this.metrics = {
      errors: [],
      performance: [],
      availability: [],
      startTime: Date.now()
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async checkVercelLogs() {
    this.log('Checking Vercel deployment logs...', 'info');
    
    try {
      // Get recent Vercel logs
      const logsOutput = execSync('npx vercel logs --limit=50', { 
        encoding: 'utf8',
        timeout: 30000
      });

      const logs = logsOutput.split('\n').filter(line => line.trim());
      const errors = logs.filter(line => 
        line.toLowerCase().includes('error') || 
        line.toLowerCase().includes('failed') ||
        line.includes('500') ||
        line.includes('timeout')
      );

      this.metrics.errors.push({
        timestamp: new Date().toISOString(),
        totalLogs: logs.length,
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Keep only recent errors
        errorRate: (errors.length / logs.length) * 100
      });

      this.log(`Found ${errors.length} errors in ${logs.length} log entries`, 
               errors.length > 0 ? 'warning' : 'success');

      return {
        totalLogs: logs.length,
        errorCount: errors.length,
        recentErrors: errors.slice(0, 5)
      };

    } catch (error) {
      this.log(`Failed to fetch Vercel logs: ${error.message}`, 'error');
      return { error: error.message };
    }
  }

  async monitorEndpointAvailability() {
    this.log('Monitoring endpoint availability...', 'info');

    const endpoints = [
      { name: 'Main App', url: PRODUCTION_URL },
      { name: 'Health Check', url: `${PRODUCTION_URL}/api/health` },
      { name: 'Python Health', url: `${PRODUCTION_URL}/api/health-python` },
      { name: 'Documents API', url: `${PRODUCTION_URL}/api/documents` },
      { name: 'Admin API', url: `${PRODUCTION_URL}/api/admin` }
    ];

    const availabilityResults = [];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      try {
        const response = await fetch(endpoint.url, {
          timeout: 10000,
          headers: { 'User-Agent': 'Production-Monitor/1.0' }
        });

        const responseTime = Date.now() - startTime;
        const isAvailable = response.status < 500;

        availabilityResults.push({
          name: endpoint.name,
          url: endpoint.url,
          status: response.status,
          responseTime,
          available: isAvailable,
          timestamp: new Date().toISOString()
        });

        this.log(`${endpoint.name}: ${response.status} (${responseTime}ms)`, 
                 isAvailable ? 'success' : 'error');

      } catch (error) {
        availabilityResults.push({
          name: endpoint.name,
          url: endpoint.url,
          error: error.message,
          available: false,
          timestamp: new Date().toISOString()
        });

        this.log(`${endpoint.name}: ${error.message}`, 'error');
      }
    }

    this.metrics.availability.push({
      timestamp: new Date().toISOString(),
      results: availabilityResults,
      overallAvailability: (availabilityResults.filter(r => r.available).length / availabilityResults.length) * 100
    });

    return availabilityResults;
  }

  async measurePerformanceMetrics() {
    this.log('Measuring performance metrics...', 'info');

    const performanceTests = [
      {
        name: 'PDF Generation Performance',
        url: `${PRODUCTION_URL}/api/generate-pdf`,
        method: 'POST',
        body: {
          title: 'Performance Test',
          authors: [{ name: 'Test Author' }],
          sections: [{ title: 'Test', content: 'Performance testing content' }]
        }
      },
      {
        name: 'Health Check Performance',
        url: `${PRODUCTION_URL}/api/health`,
        method: 'GET'
      },
      {
        name: 'Python Health Performance',
        url: `${PRODUCTION_URL}/api/health-python`,
        method: 'GET'
      }
    ];

    const performanceResults = [];

    for (const test of performanceTests) {
      const iterations = 3;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        try {
          const options = {
            method: test.method,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Production-Monitor/1.0'
            },
            timeout: 30000
          };

          if (test.body) {
            options.body = JSON.stringify(test.body);
          }

          const response = await fetch(test.url, options);
          const responseTime = Date.now() - startTime;
          
          if (response.ok) {
            times.push(responseTime);
          }

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          this.log(`Performance test failed for ${test.name}: ${error.message}`, 'warning');
        }
      }

      if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);

        performanceResults.push({
          name: test.name,
          averageTime: Math.round(avgTime),
          maxTime,
          minTime,
          iterations: times.length,
          timestamp: new Date().toISOString()
        });

        this.log(`${test.name}: avg ${Math.round(avgTime)}ms, max ${maxTime}ms`, 'info');
      }
    }

    this.metrics.performance.push({
      timestamp: new Date().toISOString(),
      results: performanceResults
    });

    return performanceResults;
  }

  async checkMemoryUsage() {
    this.log('Checking memory usage...', 'info');

    try {
      const response = await fetch(`${PRODUCTION_URL}/api/health-monitoring`, {
        timeout: 10000,
        headers: { 'User-Agent': 'Production-Monitor/1.0' }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.memoryUsage) {
          this.log(`Memory usage: ${JSON.stringify(data.memoryUsage)}`, 'info');
          return data.memoryUsage;
        }
      }

      return { status: 'unavailable' };

    } catch (error) {
      this.log(`Failed to check memory usage: ${error.message}`, 'warning');
      return { error: error.message };
    }
  }

  async generateMonitoringReport() {
    const totalTime = Date.now() - this.metrics.startTime;
    
    const report = {
      summary: {
        monitoringDuration: Math.round(totalTime / 1000),
        timestamp: new Date().toISOString(),
        status: this.getOverallHealthStatus()
      },
      errorAnalysis: this.metrics.errors,
      availability: this.metrics.availability,
      performance: this.metrics.performance
    };

    // Calculate summary statistics
    if (this.metrics.availability.length > 0) {
      const latestAvailability = this.metrics.availability[this.metrics.availability.length - 1];
      report.summary.overallAvailability = latestAvailability.overallAvailability;
    }

    if (this.metrics.performance.length > 0) {
      const latestPerformance = this.metrics.performance[this.metrics.performance.length - 1];
      const avgResponseTimes = latestPerformance.results.map(r => r.averageTime);
      report.summary.averageResponseTime = avgResponseTimes.length > 0 ? 
        Math.round(avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length) : 0;
    }

    if (this.metrics.errors.length > 0) {
      const latestErrors = this.metrics.errors[this.metrics.errors.length - 1];
      report.summary.errorRate = latestErrors.errorRate;
    }

    // Save report
    const reportPath = `production-monitoring-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log('\n📊 PRODUCTION MONITORING REPORT', 'info');
    this.log('===============================', 'info');
    this.log(`Overall Status: ${report.summary.status}`, 
             report.summary.status === 'HEALTHY' ? 'success' : 'warning');
    this.log(`Monitoring Duration: ${report.summary.monitoringDuration}s`, 'info');
    
    if (report.summary.overallAvailability !== undefined) {
      this.log(`Overall Availability: ${report.summary.overallAvailability.toFixed(1)}%`, 
               report.summary.overallAvailability >= 95 ? 'success' : 'warning');
    }
    
    if (report.summary.averageResponseTime !== undefined) {
      this.log(`Average Response Time: ${report.summary.averageResponseTime}ms`, 
               report.summary.averageResponseTime < 2000 ? 'success' : 'warning');
    }
    
    if (report.summary.errorRate !== undefined) {
      this.log(`Error Rate: ${report.summary.errorRate.toFixed(1)}%`, 
               report.summary.errorRate < 5 ? 'success' : 'warning');
    }

    this.log(`Report saved to: ${reportPath}`, 'info');

    return report;
  }

  getOverallHealthStatus() {
    // Determine overall health based on collected metrics
    let healthScore = 100;

    // Check availability
    if (this.metrics.availability.length > 0) {
      const latestAvailability = this.metrics.availability[this.metrics.availability.length - 1];
      if (latestAvailability.overallAvailability < 95) {
        healthScore -= 30;
      } else if (latestAvailability.overallAvailability < 99) {
        healthScore -= 10;
      }
    }

    // Check error rate
    if (this.metrics.errors.length > 0) {
      const latestErrors = this.metrics.errors[this.metrics.errors.length - 1];
      if (latestErrors.errorRate > 10) {
        healthScore -= 30;
      } else if (latestErrors.errorRate > 5) {
        healthScore -= 15;
      }
    }

    // Check performance
    if (this.metrics.performance.length > 0) {
      const latestPerformance = this.metrics.performance[this.metrics.performance.length - 1];
      const avgResponseTimes = latestPerformance.results.map(r => r.averageTime);
      const overallAvgTime = avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length;
      
      if (overallAvgTime > 5000) {
        healthScore -= 20;
      } else if (overallAvgTime > 2000) {
        healthScore -= 10;
      }
    }

    if (healthScore >= 90) return 'HEALTHY';
    if (healthScore >= 70) return 'WARNING';
    return 'CRITICAL';
  }

  async runMonitoring() {
    this.log('🔍 Starting Production Monitoring', 'info');
    this.log('================================', 'info');

    try {
      // Check Vercel logs
      await this.checkVercelLogs();

      // Monitor endpoint availability
      await this.monitorEndpointAvailability();

      // Measure performance metrics
      await this.measurePerformanceMetrics();

      // Check memory usage
      await this.checkMemoryUsage();

      // Generate final report
      const report = await this.generateMonitoringReport();

      if (report.summary.status === 'HEALTHY') {
        this.log('\n🎉 Production system is healthy!', 'success');
        return report;
      } else {
        this.log(`\n⚠️ Production system status: ${report.summary.status}`, 'warning');
        return report;
      }

    } catch (error) {
      this.log(`\n💥 Monitoring failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run the monitor
const monitor = new ProductionMonitor();
monitor.runMonitoring()
  .then(report => {
    process.exit(report.summary.status === 'CRITICAL' ? 1 : 0);
  })
  .catch(error => {
    console.error('Monitoring failed:', error);
    process.exit(1);
  });

export default ProductionMonitor;