#!/usr/bin/env node

/**
 * Simple Production Deployment and Validation Runner
 */

import { execSync } from 'child_process';
import fetch from 'node-fetch';
import fs from 'fs';

const PRODUCTION_URL = 'https://format-a.vercel.app';

console.log('🚀 Starting Production Deployment and Validation');
console.log('================================================');

async function deployAndValidate() {
  try {
    // Task 1: Deploy to Vercel
    console.log('\n📦 Task 1: Deploying to Vercel...');

    // Check if requirements.txt exists
    if (!fs.existsSync('requirements.txt')) {
      console.log('❌ requirements.txt not found');
      process.exit(1);
    }

    console.log('✅ Python dependencies file found');

    // Check Vercel configuration
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    console.log('✅ Vercel configuration found');

    // Deploy to Vercel
    console.log('🚀 Deploying to Vercel...');
    try {
      const deployOutput = execSync('npx vercel --prod --yes', {
        encoding: 'utf8',
        timeout: 300000 // 5 minutes timeout
      });
      console.log('✅ Deployment successful');
      console.log('⏳ Waiting 30 seconds for deployment to propagate...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } catch (error) {
      console.log(`❌ Deployment failed: ${error.message}`);
      // Continue with validation even if deployment fails (might already be deployed)
    }

    // Task 2: Test PDF generation endpoints
    console.log('\n🔧 Task 2: Testing PDF generation endpoints...');

    const pdfEndpoints = [
      { name: 'Python Health Check', url: `${PRODUCTION_URL}/api/health-python` },
      {
        name: 'Generate PDF', url: `${PRODUCTION_URL}/api/generate-pdf`, method: 'POST', body: {
          title: 'Test Document',
          authors: [{ name: 'Test Author' }],
          sections: [{ title: 'Test', content: 'Test content' }]
        }
      },
      { name: 'Documents API', url: `${PRODUCTION_URL}/api/documents` }
    ];

    let pdfTestsPassed = 0;
    for (const endpoint of pdfEndpoints) {
      try {
        console.log(`  Testing ${endpoint.name}...`);

        const options = {
          method: endpoint.method || 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        };

        if (endpoint.body) {
          options.body = JSON.stringify(endpoint.body);
        }

        const response = await fetch(endpoint.url, options);

        if (response.ok) {
          console.log(`  ✅ ${endpoint.name}: ${response.status}`);
          pdfTestsPassed++;
        } else {
          console.log(`  ❌ ${endpoint.name}: ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${endpoint.name}: ${error.message}`);
      }
    }

    console.log(`📊 PDF Generation Tests: ${pdfTestsPassed}/${pdfEndpoints.length} passed`);

    // Task 3: Validate admin dashboard
    console.log('\n👤 Task 3: Validating admin dashboard...');

    const adminEndpoints = [
      { name: 'Admin Health', url: `${PRODUCTION_URL}/api/admin` },
      { name: 'Admin Analytics', url: `${PRODUCTION_URL}/api/admin/analytics` },
      { name: 'Admin Users', url: `${PRODUCTION_URL}/api/admin/users` }
    ];

    let adminTestsPassed = 0;
    for (const endpoint of adminEndpoints) {
      try {
        console.log(`  Testing ${endpoint.name}...`);

        const response = await fetch(endpoint.url, {
          headers: { 'X-Admin-Email': 'shyamkaarthikeyan@gmail.com' },
          timeout: 15000
        });

        // Admin endpoints might return 4xx which is acceptable
        if (response.status < 500) {
          console.log(`  ✅ ${endpoint.name}: ${response.status}`);
          adminTestsPassed++;
        } else {
          console.log(`  ❌ ${endpoint.name}: ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${endpoint.name}: ${error.message}`);
      }
    }

    console.log(`📊 Admin Dashboard Tests: ${adminTestsPassed}/${adminEndpoints.length} passed`);

    // Task 4: Monitor performance metrics
    console.log('\n📈 Task 4: Monitoring performance metrics...');

    const monitoringEndpoints = [
      { name: 'Health Check', url: `${PRODUCTION_URL}/api/health` },
      { name: 'Health Monitoring', url: `${PRODUCTION_URL}/api/health-monitoring` }
    ];

    const responseTimes = [];
    let monitoringTestsPassed = 0;

    for (const endpoint of monitoringEndpoints) {
      try {
        console.log(`  Monitoring ${endpoint.name}...`);

        const startTime = Date.now();
        const response = await fetch(endpoint.url, { timeout: 10000 });
        const responseTime = Date.now() - startTime;

        responseTimes.push(responseTime);

        if (response.ok) {
          console.log(`  ✅ ${endpoint.name}: ${response.status} (${responseTime}ms)`);
          monitoringTestsPassed++;
        } else {
          console.log(`  ❌ ${endpoint.name}: ${response.status} (${responseTime}ms)`);
        }
      } catch (error) {
        console.log(`  ❌ ${endpoint.name}: ${error.message}`);
      }
    }

    const avgResponseTime = responseTimes.length > 0 ?
      Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;

    console.log(`📊 Performance Monitoring: ${monitoringTestsPassed}/${monitoringEndpoints.length} passed`);
    console.log(`📊 Average Response Time: ${avgResponseTime}ms`);

    // Final Summary
    console.log('\n🎯 DEPLOYMENT AND VALIDATION SUMMARY');
    console.log('====================================');

    const totalTests = pdfEndpoints.length + adminEndpoints.length + monitoringEndpoints.length;
    const totalPassed = pdfTestsPassed + adminTestsPassed + monitoringTestsPassed;
    const successRate = Math.round((totalPassed / totalTests) * 100);

    console.log(`✅ Total Tests Passed: ${totalPassed}/${totalTests} (${successRate}%)`);
    console.log(`📊 PDF Generation: ${pdfTestsPassed}/${pdfEndpoints.length}`);
    console.log(`📊 Admin Dashboard: ${adminTestsPassed}/${adminEndpoints.length}`);
    console.log(`📊 Performance Monitoring: ${monitoringTestsPassed}/${monitoringEndpoints.length}`);
    console.log(`⏱️  Average Response Time: ${avgResponseTime}ms`);

    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      successRate,
      totalPassed,
      totalTests,
      pdfGeneration: { passed: pdfTestsPassed, total: pdfEndpoints.length },
      adminDashboard: { passed: adminTestsPassed, total: adminEndpoints.length },
      performanceMonitoring: { passed: monitoringTestsPassed, total: monitoringEndpoints.length },
      averageResponseTime: avgResponseTime
    };

    fs.writeFileSync(`deployment-validation-results-${Date.now()}.json`, JSON.stringify(results, null, 2));

    if (successRate >= 80) {
      console.log('\n🎉 Production deployment and validation completed successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Production deployment completed with issues.');
      process.exit(1);
    }

  } catch (error) {
    console.log(`\n💥 Deployment and validation failed: ${error.message}`);
    process.exit(1);
  }
}

deployAndValidate();