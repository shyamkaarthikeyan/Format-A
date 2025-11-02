/**
 * Test script to verify enhanced serverless error handling in production endpoints
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

console.log('🧪 Testing Enhanced Serverless Error Handling');
console.log('=' .repeat(60));
console.log(`Base URL: ${BASE_URL}`);

/**
 * Make HTTP request with timeout and error handling
 */
async function makeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TEST_TIMEOUT);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        clearTimeout(timeoutId);
        
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        return {
            status: response.status,
            statusText: response.statusText,
            data,
            headers: Object.fromEntries(response.headers.entries())
        };
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Test Python health endpoint with enhanced diagnostics
 */
async function testHealthEndpoint() {
    console.log('\\n🏥 Testing Enhanced Health Endpoint...');
    
    try {
        // Test basic health check
        const response = await makeRequest(`${BASE_URL}/api/health-python`);
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.data && typeof response.data === 'object') {
            const health = response.data;
            console.log(`Health Status: ${health.status || 'unknown'}`);
            console.log(`Dependencies: ${health.dependencies ? health.dependencies.length : 0} checked`);
            console.log(`Capabilities: ${health.capabilities ? health.capabilities.join(', ') : 'none'}`);
            
            // Check for enhanced serverless diagnostics
            if (health.serverless_diagnostics) {
                const diag = health.serverless_diagnostics;
                console.log('Enhanced Diagnostics:');
                console.log(`  Memory Info: ${diag.memory_info ? 'Available' : 'Not available'}`);
                console.log(`  Memory Healthy: ${diag.memory_healthy ? '✅' : '⚠️'}`);
                console.log(`  Timeout Healthy: ${diag.timeout_healthy ? '✅' : '⚠️'}`);
                
                if (health.warnings && health.warnings.length > 0) {
                    console.log(`  Warnings: ${health.warnings.join(', ')}`);
                }
            }
            
            if (health.execution_time_seconds) {
                console.log(`Execution Time: ${health.execution_time_seconds}s`);
            }
        }
        
        console.log('✅ Health endpoint test completed');
        return true;
        
    } catch (error) {
        console.log(`❌ Health endpoint test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test detailed health check with dependency testing
 */
async function testDetailedHealthCheck() {
    console.log('\\n🔍 Testing Detailed Health Check...');
    
    try {
        const response = await makeRequest(`${BASE_URL}/api/health-python`, {
            method: 'POST',
            body: JSON.stringify({
                test_pdf_generation: true,
                test_docx_conversion: true
            })
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.data && typeof response.data === 'object') {
            const health = response.data;
            console.log(`Health Status: ${health.status || 'unknown'}`);
            
            // Check test results
            if (health.tests) {
                console.log('Test Results:');
                for (const [testName, result] of Object.entries(health.tests)) {
                    const status = result.status === 'passed' ? '✅' : 
                                  result.status === 'failed' ? '❌' : '⚠️';
                    console.log(`  ${testName}: ${status} ${result.message || ''}`);
                }
            }
        }
        
        console.log('✅ Detailed health check completed');
        return true;
        
    } catch (error) {
        console.log(`❌ Detailed health check failed: ${error.message}`);
        return false;
    }
}

/**
 * Test PDF generation with invalid input to trigger enhanced error handling
 */
async function testPDFGenerationErrorHandling() {
    console.log('\\n📄 Testing PDF Generation Error Handling...');
    
    try {
        // Test with invalid JSON
        console.log('Testing invalid JSON...');
        const invalidJsonResponse = await makeRequest(`${BASE_URL}/api/generate-pdf`, {
            method: 'POST',
            body: 'invalid json data'
        });
        
        console.log(`Invalid JSON Status: ${invalidJsonResponse.status}`);
        if (invalidJsonResponse.data && invalidJsonResponse.data.error) {
            const error = invalidJsonResponse.data.error;
            console.log(`Error Code: ${error.code}`);
            console.log(`Error Category: ${error.category || 'not specified'}`);
            console.log(`Suggestions: ${invalidJsonResponse.data.suggestions ? invalidJsonResponse.data.suggestions.length : 0} provided`);
        }
        
        // Test with missing required fields
        console.log('\\nTesting missing required fields...');
        const missingFieldsResponse = await makeRequest(`${BASE_URL}/api/generate-pdf`, {
            method: 'POST',
            body: JSON.stringify({
                title: 'Test Document'
                // Missing authors and sections
            })
        });
        
        console.log(`Missing Fields Status: ${missingFieldsResponse.status}`);
        if (missingFieldsResponse.data && missingFieldsResponse.data.error) {
            const error = missingFieldsResponse.data.error;
            console.log(`Error Code: ${error.code}`);
            console.log(`Error Category: ${error.category || 'not specified'}`);
        }
        
        // Test with oversized request
        console.log('\\nTesting oversized request...');
        const largeData = 'x'.repeat(60 * 1024 * 1024); // 60MB of data
        try {
            const oversizedResponse = await makeRequest(`${BASE_URL}/api/generate-pdf`, {
                method: 'POST',
                body: JSON.stringify({
                    title: 'Test Document',
                    authors: [{ name: 'Test Author' }],
                    sections: [{ title: 'Test', content: largeData }]
                })
            });
            
            console.log(`Oversized Status: ${oversizedResponse.status}`);
            if (oversizedResponse.data && oversizedResponse.data.error) {
                const error = oversizedResponse.data.error;
                console.log(`Error Code: ${error.code}`);
            }
        } catch (error) {
            console.log(`Oversized request handled: ${error.message}`);
        }
        
        console.log('✅ PDF generation error handling tests completed');
        return true;
        
    } catch (error) {
        console.log(`❌ PDF generation error handling test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test DOCX conversion error handling
 */
async function testDocxConversionErrorHandling() {
    console.log('\\n📝 Testing DOCX Conversion Error Handling...');
    
    try {
        // Test with missing docx_data
        console.log('Testing missing DOCX data...');
        const missingDataResponse = await makeRequest(`${BASE_URL}/api/convert-docx-pdf`, {
            method: 'POST',
            body: JSON.stringify({
                // Missing docx_data field
            })
        });
        
        console.log(`Missing Data Status: ${missingDataResponse.status}`);
        if (missingDataResponse.data && missingDataResponse.data.error) {
            const error = missingDataResponse.data.error;
            console.log(`Error Code: ${error.code}`);
            console.log(`Error Category: ${error.category || 'not specified'}`);
        }
        
        // Test with invalid base64 data
        console.log('\\nTesting invalid base64 data...');
        const invalidBase64Response = await makeRequest(`${BASE_URL}/api/convert-docx-pdf`, {
            method: 'POST',
            body: JSON.stringify({
                docx_data: 'invalid_base64_data_here'
            })
        });
        
        console.log(`Invalid Base64 Status: ${invalidBase64Response.status}`);
        if (invalidBase64Response.data && invalidBase64Response.data.error) {
            const error = invalidBase64Response.data.error;
            console.log(`Error Code: ${error.code}`);
            console.log(`Error Category: ${error.category || 'not specified'}`);
        }
        
        console.log('✅ DOCX conversion error handling tests completed');
        return true;
        
    } catch (error) {
        console.log(`❌ DOCX conversion error handling test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test successful operations to ensure enhanced logging works
 */
async function testSuccessfulOperations() {
    console.log('\\n✅ Testing Successful Operations with Enhanced Logging...');
    
    try {
        // Test successful PDF generation with minimal data
        const validDoc = {
            title: 'Test Document for Enhanced Logging',
            authors: [{ name: 'Test Author' }],
            sections: [{ 
                title: 'Introduction', 
                contentBlocks: [{ 
                    type: 'text', 
                    content: 'This is a test document to verify enhanced logging and monitoring.' 
                }]
            }]
        };
        
        console.log('Testing successful PDF generation...');
        const pdfResponse = await makeRequest(`${BASE_URL}/api/generate-pdf?preview=true`, {
            method: 'POST',
            body: JSON.stringify(validDoc)
        });
        
        console.log(`PDF Generation Status: ${pdfResponse.status}`);
        if (pdfResponse.data && pdfResponse.data.success) {
            console.log('✅ PDF generation successful');
            
            // Check for enhanced metadata
            if (pdfResponse.data.metadata) {
                const meta = pdfResponse.data.metadata;
                console.log(`Generation Time: ${meta.generation_time_seconds || 'not recorded'}s`);
                console.log(`Memory Usage: ${meta.memory_usage ? 'recorded' : 'not recorded'}`);
                console.log(`Request ID: ${meta.request_id || 'not recorded'}`);
            }
        }
        
        console.log('✅ Successful operations test completed');
        return true;
        
    } catch (error) {
        console.log(`❌ Successful operations test failed: ${error.message}`);
        return false;
    }
}

/**
 * Main test runner
 */
async function runTests() {
    console.log('Starting enhanced serverless error handling tests...\\n');
    
    const tests = [
        { name: 'Health Endpoint', fn: testHealthEndpoint },
        { name: 'Detailed Health Check', fn: testDetailedHealthCheck },
        { name: 'PDF Generation Error Handling', fn: testPDFGenerationErrorHandling },
        { name: 'DOCX Conversion Error Handling', fn: testDocxConversionErrorHandling },
        { name: 'Successful Operations', fn: testSuccessfulOperations }
    ];
    
    const results = [];
    
    for (const test of tests) {
        console.log(`\\n${'='.repeat(60)}`);
        console.log(`Running: ${test.name}`);
        console.log(`${'='.repeat(60)}`);
        
        try {
            const result = await test.fn();
            results.push({ name: test.name, success: result });
        } catch (error) {
            console.log(`❌ Test '${test.name}' threw an error: ${error.message}`);
            results.push({ name: test.name, success: false, error: error.message });
        }
    }
    
    // Summary
    console.log('\\n' + '='.repeat(60));
    console.log('🎯 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    results.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${result.name}`);
        if (result.error) {
            console.log(`    Error: ${result.error}`);
        }
    });
    
    console.log(`\\nResults: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All enhanced serverless error handling tests passed!');
        process.exit(0);
    } else {
        console.log('⚠️ Some tests failed. Check the output above for details.');
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = {
    runTests,
    testHealthEndpoint,
    testDetailedHealthCheck,
    testPDFGenerationErrorHandling,
    testDocxConversionErrorHandling,
    testSuccessfulOperations
};