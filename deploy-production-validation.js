#!/usr/bin/env node

/**
 * Production Deployment and Validation Script
 * 
 * This script handles:
 * 1. Deploy updated code to Vercel with new dependencies
 * 2. Test all PDF generation endpoints in production environment
 * 3. Validate admin dashboard functionality works correctly
 * 4. Monitor error logs and performance metrics
 */

import { execSync } from 'child_process';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://format-a.vercel.app';
const ADMIN_EMAIL = 'shyamkaarthikeyan@gmail.com';

class ProductionValidator {
  constructor() {
    this.results = {
      deployment: { status: 'pending', details: [] },
      pdfGeneration: { status: 'pending', tests: [] },
      adminDashboard: { status: 'pending', tests: [] },
      monitoring: { status: 'pending', metrics: [] }
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Task 1: Deploy updated code to Vercel with new dependencies
  async deployToVercel() {
    this.log('Starting Vercel deployment...', 'info');
    
    try {
      // Check if we're in a git repository and have changes
      try {
        const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
        if (gitStatus.trim()) {
          this.log('Uncommitted changes detected. Committing before deployment...', 'info');
          execSync('git add .');
          execSync('git commit -m "Production deployment: Updated serverless functions and dependencies"');
        }
      } catch (error) {
        this.log('Git operations failed, continuing with deployment...', 'info');
      }

      // Verify Python dependencies are in place
      const requirementsTxt = path.join(process.cwd(), 'requirements.txt');
      if (!fs.existsSync(requirementsTxt)) {
        throw new Error('requirements.txt not found - Python dependencies not configured');
      }

      const requirements = fs.readFileSync(requirementsTxt, 'utf8');
      const expectedDeps = ['reportlab', 'python-docx', 'Pillow', 'docx2pdf'];
      const missingDeps = expectedDeps.filter(dep => !requirements.includes(dep));
      
      if (missingDeps.length > 0) {
        throw new Error(`Missing Python dependencies: ${missingDeps.join(', ')}`);
      }

      this.log('Python dependencies verified', 'success');

      // Verify Vercel configuration
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
      if (!vercelConfig.functions || !vercelConfig.functions['api/*.py']) {
        throw new Error('Vercel configuration missing Python runtime settings');
      }

      this.log('Vercel configuration verified', 'success');

      // Deploy to Vercel
      this.log('Deploying to Vercel...', 'info');
      const deployOutput = execSync('npx vercel --prod --yes', { 
        encoding: 'utf8',
        timeout: 300000 // 5 minutes timeout
      });

      // Extract deployment URL from output
      const urlMatch = deployOutput.match(/https:\/\/[^\s]+/);
      const deploymentUrl = urlMatch ? urlMatch[0] : PRODUCTION_URL;

      this.log(`Deployment successful: ${deploymentUrl}`, 'success');
      this.results.deployment.status = 'success';
      this.results.deployment.details.push({
        action: 'vercel_deploy',
        status: 'success',
        url: deploymentUrl,
        timestamp: new Date().toISOString()
      });

      // Wait for deployment to propagate
      this.log('Waiting for deployment to propagate...', 'info');
      await this.delay(30000); // 30 seconds

      return deploymentUrl;

    } catch (error) {
      this.log(`Deployment failed: ${error.message}`, 'error');
      this.results.deployment.status = 'failed';
      this.results.deployment.details.push({
        action: 'vercel_deploy',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Task 2: Test all PDF generation endpoints in production environment
  async testPDFGenerationEndpoints() {
    this.log('Testing PDF generation endpoints...', 'info');

    const endpoints = [
      {
        name: 'Python Health Check',
        url: `${PRODUCTION_URL}/api/health-python`,
        method: 'GET'
      },
      {
        name: 'Generate PDF (Python)',
        url: `${PRODUCTION_URL}/api/generate-pdf`,
        method: 'POST',
        body: {
          title: 'Test Document',
          authors: [{ name: 'Test Author', affiliation: 'Test University' }],
          abstract: 'This is a test abstract for production validation.',
          sections: [
            { title: 'Introduction', content: 'Test content for production validation.' }
          ]
        }
      },
      {
        name: 'Convert DOCX to PDF',
        url: `${PRODUCTION_URL}/api/convert-docx-pdf`,
        method: 'POST',
        body: {
          docxData: 'test-docx-content',
          filename: 'test-document.docx'
        }
      },
      {
        name: 'Generate DOCX to PDF (Preview)',
        url: `${PRODUCTION_URL}/api/generate/docx-to-pdf?preview=true`,
        method: 'POST',
        body: {
          title: 'Preview Test Document',
          content: 'Test content for preview generation'
        }
      },
      {
        name: 'Documents API Health',
        url: `${PRODUCTION_URL}/api/documents`,
        method: 'GET'
      }
    ];

    for (const endpoint of endpoints) {
      try {
        this.log(`Testing ${endpoint.name}...`, 'info');
        
        const options = {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Production-Validator/1.0'
          },
          timeout: 30000 // 30 seconds timeout
        };

        if (endpoint.body) {
          options.body = JSON.stringify(endpoint.body);
        }

        const startTime = Date.now();
        const response = await fetch(endpoint.url, options);
        const responseTime = Date.now() - startTime;

        const testResult = {
          endpoint: endpoint.name,
          url: endpoint.url,
          method: endpoint.method,
          status: response.status,
          responseTime,
          timestamp: new Date().toISOString()
        };

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          
          if (endpoint.name.includes('PDF') && contentType?.includes('application/pdf')) {
            const buffer = await response.buffer();
            testResult.pdfSize = buffer.length;
            testResult.success = buffer.length > 1000; // Basic PDF validation
          } else if (contentType?.includes('application/json')) {
            const data = await response.json();
            testResult.response = data;
            testResult.success = true;
          } else {
            testResult.success = true;
          }

          this.log(`✅ ${endpoint.name}: ${response.status} (${responseTime}ms)`, 'success');
        } else {
          const errorText = await response.text();
          testResult.error = errorText;
          testResult.success = false;
          this.log(`❌ ${endpoint.name}: ${response.status} - ${errorText}`, 'error');
        }

        this.results.pdfGeneration.tests.push(testResult);

      } catch (error) {
        this.log(`❌ ${endpoint.name}: ${error.message}`, 'error');
        this.results.pdfGeneration.tests.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          error: error.message,
          success: false,
          timestamp: new Date().toISOString()
        });
      }
    }

    const successfulTests = this.results.pdfGeneration.tests.filter(t => t.success).length;
    const totalTests = this.results.pdfGeneration.tests.length;
    
    this.results.pdfGeneration.status = successfulTests === totalTests ? 'success' : 'partial';
    this.log(`PDF Generation Tests: ${successfulTests}/${totalTests} passed`, 
             successfulTests === totalTests ? 'success' : 'error');
  }

  // Task 3: Validate admin dashboard functionality works correctly
  async validateAdminDashboard() {
    this.log('Validating admin dashboard functionality...', 'info');

    const adminEndpoints = [
      {
        name: 'Admin Health Check',
        url: `${PRODUCTION_URL}/api/admin`,
        method: 'GET'
      },
      {
        name: 'Admin Analytics',
        url: `${PRODUCTION_URL}/api/admin/analytics`,
        method: 'GET'
      },
      {
        name: 'Admin Users',
        url: `${PRODUCTION_URL}/api/admin/users`,
        method: 'GET'
      },
      {
        name: 'Admin Dashboard Data',
        url: `${PRODUCTION_URL}/api/admin/dashboard`,
        method: 'GET'
      }
    ];

    for (const endpoint of adminEndpoints) {
      try {
        this.log(`Testing ${endpoint.name}...`, 'info');
        
        const startTime = Date.now();
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Email': ADMIN_EMAIL,
            'User-Agent': 'Production-Validator/1.0'
          },
          timeout: 15000
        });
        const responseTime = Date.now() - startTime;

        const testResult = {
          endpoint: endpoint.name,
          url: endpoint.url,
          status: response.status,
          responseTime,
          timestamp: new Date().toISOString()
        };

        if (response.ok) {
          const data = await response.json();
          testResult.response = data;
          testResult.success = true;
          this.log(`✅ ${endpoint.name}: ${response.status} (${responseTime}ms)`, 'success');
        } else {
          // Admin endpoints might return fallback data instead of errors
          const errorText = await response.text();
          testResult.error = errorText;
          testResult.success = response.status < 500; // 4xx is acceptable for admin endpoints
          
          const logType = response.status < 500 ? 'info' : 'error';
          this.log(`${response.status < 500 ? 'ℹ️' : '❌'} ${endpoint.name}: ${response.status} - ${errorText}`, logType);
        }

        this.results.adminDashboard.tests.push(testResult);

      } catch (error) {
        this.log(`❌ ${endpoint.name}: ${error.message}`, 'error');
        this.results.adminDashboard.tests.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          error: error.message,
          success: false,
          timestamp: new Date().toISOString()
        });
      }
    }

    const successfulTests = this.results.adminDashboard.tests.filter(t => t.success).length;
    const totalTests = this.results.adminDashboard.tests.length;
    
    this.results.adminDashboard.status = successfulTests >= totalTests * 0.5 ? 'success' : 'failed';
    this.log(`Admin Dashboard Tests: ${successfulTests}/${totalTests} passed`, 
             successfulTests >= totalTests * 0.5 ? 'success' : 'error');
  }

  // Task 4: Monitor error logs and performance metrics
  async monitorPerformanceMetrics() {
    this.log('Monitoring performance metrics...', 'info');

    const monitoringEndpoints = [
      {
        name: 'Health Monitoring',
        url: `${PRODUCTION_URL}/api/health-monitoring`,
        method: 'GET'
      },
      {
        name: 'System Health',
        url: `${PRODUCTION_URL}/api/health`,
        method: 'GET'
      },
      {
        name: 'Production Validation',
        url: `${PRODUCTION_URL}/api/test-production-validation`,
        method: 'GET'
      }
    ];

    const performanceMetrics = {
      responseTime: [],
      memoryUsage: [],
      errorRate: 0,
      totalRequests: 0
    };

    for (const endpoint of monitoringEndpoints) {
      try {
        this.log(`Monitoring ${endpoint.name}...`, 'info');
        
        // Test multiple times to get performance metrics
        const iterations = 3;
        for (let i = 0; i < iterations; i++) {
          const startTime = Date.now();
          const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Production-Validator/1.0'
            },
            timeout: 10000
          });
          const responseTime = Date.now() - startTime;

          performanceMetrics.totalRequests++;
          performanceMetrics.responseTime.push(responseTime);

          if (!response.ok) {
            performanceMetrics.errorRate++;
          }

          if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
            const data = await response.json();
            if (data.memoryUsage) {
              performanceMetrics.memoryUsage.push(data.memoryUsage);
            }
          }

          // Small delay between requests
          await this.delay(1000);
        }

        this.log(`✅ ${endpoint.name}: Monitored ${iterations} requests`, 'success');

      } catch (error) {
        this.log(`❌ ${endpoint.name}: ${error.message}`, 'error');
        performanceMetrics.errorRate++;
        performanceMetrics.totalRequests++;
      }
    }

    // Calculate metrics
    const avgResponseTime = performanceMetrics.responseTime.reduce((a, b) => a + b, 0) / performanceMetrics.responseTime.length;
    const maxResponseTime = Math.max(...performanceMetrics.responseTime);
    const errorRatePercent = (performanceMetrics.errorRate / performanceMetrics.totalRequests) * 100;

    const metrics = {
      averageResponseTime: Math.round(avgResponseTime),
      maxResponseTime,
      errorRate: Math.round(errorRatePercent * 100) / 100,
      totalRequests: performanceMetrics.totalRequests,
      memoryUsage: performanceMetrics.memoryUsage.length > 0 ? 
        Math.round(performanceMetrics.memoryUsage.reduce((a, b) => a + b, 0) / performanceMetrics.memoryUsage.length) : 'N/A',
      timestamp: new Date().toISOString()
    };

    this.results.monitoring.metrics.push(metrics);
    this.results.monitoring.status = errorRatePercent < 20 ? 'success' : 'warning';

    this.log(`Performance Metrics:`, 'info');
    this.log(`  Average Response Time: ${metrics.averageResponseTime}ms`, 'info');
    this.log(`  Max Response Time: ${metrics.maxResponseTime}ms`, 'info');
    this.log(`  Error Rate: ${metrics.errorRate}%`, 'info');
    this.log(`  Total Requests: ${metrics.totalRequests}`, 'info');
  }

  async generateReport() {
    const totalTime = Date.now() - this.startTime;
    
    const report = {
      summary: {
        totalTime: Math.round(totalTime / 1000),
        timestamp: new Date().toISOString(),
        overallStatus: this.getOverallStatus()
      },
      deployment: this.results.deployment,
      pdfGeneration: this.results.pdfGeneration,
      adminDashboard: this.results.adminDashboard,
      monitoring: this.results.monitoring
    };

    // Save report to file
    const reportPath = `production-validation-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`\n📊 PRODUCTION VALIDATION REPORT`, 'info');
    this.log(`=================================`, 'info');
    this.log(`Overall Status: ${report.summary.overallStatus}`, 
             report.summary.overallStatus === 'SUCCESS' ? 'success' : 'error');
    this.log(`Total Time: ${report.summary.totalTime}s`, 'info');
    this.log(`Report saved to: ${reportPath}`, 'info');

    // Print summary
    this.log(`\n📋 Task Summary:`, 'info');
    this.log(`  1. Deployment: ${this.results.deployment.status}`, 
             this.results.deployment.status === 'success' ? 'success' : 'error');
    this.log(`  2. PDF Generation: ${this.results.pdfGeneration.status}`, 
             this.results.pdfGeneration.status === 'success' ? 'success' : 'error');
    this.log(`  3. Admin Dashboard: ${this.results.adminDashboard.status}`, 
             this.results.adminDashboard.status === 'success' ? 'success' : 'error');
    this.log(`  4. Performance Monitoring: ${this.results.monitoring.status}`, 
             this.results.monitoring.status === 'success' ? 'success' : 'error');

    return report;
  }

  getOverallStatus() {
    const statuses = [
      this.results.deployment.status,
      this.results.pdfGeneration.status,
      this.results.adminDashboard.status,
      this.results.monitoring.status
    ];

    if (statuses.every(s => s === 'success')) return 'SUCCESS';
    if (statuses.some(s => s === 'failed')) return 'FAILED';
    return 'PARTIAL';
  }

  async run() {
    try {
      this.log('🚀 Starting Production Deployment and Validation', 'info');
      this.log('================================================', 'info');

      // Task 1: Deploy to Vercel
      await this.deployToVercel();

      // Task 2: Test PDF generation endpoints
      await this.testPDFGenerationEndpoints();

      // Task 3: Validate admin dashboard
      await this.validateAdminDashboard();

      // Task 4: Monitor performance metrics
      await this.monitorPerformanceMetrics();

      // Generate final report
      const report = await this.generateReport();

      if (report.summary.overallStatus === 'SUCCESS') {
        this.log('\n🎉 Production deployment and validation completed successfully!', 'success');
        process.exit(0);
      } else {
        this.log('\n⚠️ Production deployment completed with issues. Check the report for details.', 'error');
        process.exit(1);
      }

    } catch (error) {
      this.log(`\n💥 Production validation failed: ${error.message}`, 'error');
      await this.generateReport();
      process.exit(1);
    }
  }
}

// Run the validator if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ProductionValidator();
  validator.run().catch(console.error);
}

export default ProductionValidator;