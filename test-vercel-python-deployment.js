#!/usr/bin/env node
/**
 * Test script to verify Vercel Python serverless function deployment
 * This script can be used to test the Python functions locally or in deployment
 */

const https = require('https');
const http = require('http');

async function testPythonEndpoint(url, description) {
    return new Promise((resolve) => {
        console.log(`Testing: ${description}`);
        console.log(`URL: ${url}`);
        
        const client = url.startsWith('https') ? https : http;
        
        const req = client.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`✅ Status: ${res.statusCode}`);
                    console.log(`✅ Response: ${JSON.stringify(result, null, 2)}`);
                    resolve({ success: true, status: res.statusCode, data: result });
                } catch (e) {
                    console.log(`❌ Invalid JSON response: ${data}`);
                    resolve({ success: false, error: 'Invalid JSON', rawData: data });
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ Request failed: ${error.message}`);
            resolve({ success: false, error: error.message });
        });
        
        req.setTimeout(30000, () => {
            console.log(`❌ Request timeout`);
            req.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
    });
}

async function main() {
    console.log('Testing Vercel Python Serverless Function Deployment');
    console.log('=' * 60);
    
    // Test endpoints - update these URLs based on your deployment
    const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
    
    const tests = [
        {
            url: `${baseUrl}/api/test-python`,
            description: 'Python Test Function - Basic functionality and dependencies'
        },
        {
            url: `${baseUrl}/api/health-python`,
            description: 'Python Health Check - Comprehensive dependency and environment test'
        }
    ];
    
    console.log(`Base URL: ${baseUrl}`);
    console.log('');
    
    const results = [];
    
    for (const test of tests) {
        console.log('-'.repeat(50));
        const result = await testPythonEndpoint(test.url, test.description);
        results.push({ ...test, result });
        console.log('');
    }
    
    // Summary
    console.log('='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    
    let allPassed = true;
    for (const test of results) {
        const status = test.result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} - ${test.description}`);
        if (!test.result.success) {
            allPassed = false;
            console.log(`  Error: ${test.result.error}`);
        }
    }
    
    console.log('');
    if (allPassed) {
        console.log('🎉 All Python serverless functions are working correctly!');
        console.log('✅ Python runtime is properly configured for Vercel');
        console.log('✅ All required dependencies are available');
        console.log('✅ Functions can handle HTTP requests and responses');
    } else {
        console.log('❌ Some Python serverless functions failed');
        console.log('Check the errors above and verify:');
        console.log('  - requirements.txt contains all dependencies');
        console.log('  - vercel.json has Python runtime configuration');
        console.log('  - Python functions are in /api/ directory');
    }
    
    process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
    main().catch(console.error);
}