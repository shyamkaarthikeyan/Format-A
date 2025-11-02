import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Health Check Endpoint for Document Generation API
 * Checks the status of Python serverless functions and overall system health
 */

interface HealthCheckResponse {
  success: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    node_api: {
      status: 'healthy';
      version: string;
      uptime: number;
    };
    python_functions: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      details?: any;
      error?: string;
    };
    document_generation: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      capabilities: string[];
      last_check: string;
    };
  };
  environment: {
    node_env: string;
    vercel_env?: string;
    vercel_region?: string;
  };
}

/**
 * Call Python health check function
 */
async function checkPythonHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: any;
  error?: string;
}> {
  try {
    // Get the base URL for internal function calls
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://format-a.vercel.app';

    const healthUrl = `${baseUrl}/api/health-python.py`;
    
    console.log('Checking Python health:', healthUrl);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Format-A-Health-Check'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (response.ok) {
      const healthData = await response.json();
      return {
        status: healthData.status || 'healthy',
        details: healthData
      };
    } else {
      return {
        status: 'unhealthy',
        error: `Health check failed: ${response.status} ${response.statusText}`
      };
    }

  } catch (error) {
    console.error('Python health check failed:', error);
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test document generation capabilities
 */
async function testDocumentGeneration(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  capabilities: string[];
}> {
  const capabilities: string[] = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  try {
    // Get the base URL for internal function calls
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://format-a.vercel.app';

    // Test Python health with detailed checks
    const healthUrl = `${baseUrl}/api/health-python.py`;
    const healthResponse = await fetch(healthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        test_pdf_generation: true,
        test_docx_conversion: false // Skip slow conversion test in health check
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      
      // Check individual capabilities
      if (healthData.dependencies) {
        const reportlab = healthData.dependencies.find((dep: any) => dep.name === 'reportlab');
        if (reportlab && reportlab.status === 'available') {
          capabilities.push('pdf_generation');
        }

        const docx = healthData.dependencies.find((dep: any) => dep.name === 'python-docx');
        if (docx && docx.status === 'available') {
          capabilities.push('docx_generation');
        }

        const docx2pdf = healthData.dependencies.find((dep: any) => dep.name === 'docx2pdf');
        if (docx2pdf && docx2pdf.status === 'available') {
          capabilities.push('docx_to_pdf_conversion');
        }
      }

      // Check test results
      if (healthData.tests && healthData.tests.pdf_generation) {
        if (healthData.tests.pdf_generation.status === 'passed') {
          capabilities.push('pdf_test_passed');
        } else {
          overallStatus = 'degraded';
        }
      }

      // Determine overall status
      if (capabilities.length === 0) {
        overallStatus = 'unhealthy';
      } else if (capabilities.length < 3) {
        overallStatus = 'degraded';
      }

    } else {
      overallStatus = 'unhealthy';
    }

  } catch (error) {
    console.error('Document generation test failed:', error);
    overallStatus = 'unhealthy';
  }

  return {
    status: overallStatus,
    capabilities
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<HealthCheckResponse>) {
  const startTime = Date.now();
  
  console.log('Health check request:', req.method, req.url);

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        node_api: {
          status: 'healthy',
          version: process.version,
          uptime: process.uptime()
        },
        python_functions: {
          status: 'unhealthy',
          error: 'Method not allowed'
        },
        document_generation: {
          status: 'unhealthy',
          capabilities: [],
          last_check: new Date().toISOString()
        }
      },
      environment: {
        node_env: process.env.NODE_ENV || 'unknown',
        vercel_env: process.env.VERCEL_ENV,
        vercel_region: process.env.VERCEL_REGION
      }
    });
  }

  try {
    // Check Python functions health
    console.log('Checking Python functions health...');
    const pythonHealth = await checkPythonHealth();
    
    // Test document generation capabilities
    console.log('Testing document generation capabilities...');
    const docGenTest = await testDocumentGeneration();

    // Determine overall system status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (pythonHealth.status === 'unhealthy' || docGenTest.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (pythonHealth.status === 'degraded' || docGenTest.status === 'degraded') {
      overallStatus = 'degraded';
    }

    const response: HealthCheckResponse = {
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        node_api: {
          status: 'healthy',
          version: process.version,
          uptime: process.uptime()
        },
        python_functions: pythonHealth,
        document_generation: {
          status: docGenTest.status,
          capabilities: docGenTest.capabilities,
          last_check: new Date().toISOString()
        }
      },
      environment: {
        node_env: process.env.NODE_ENV || 'unknown',
        vercel_env: process.env.VERCEL_ENV,
        vercel_region: process.env.VERCEL_REGION
      }
    };

    const duration = Date.now() - startTime;
    console.log(`Health check completed in ${duration}ms, status: ${overallStatus}`);

    // Set appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 206 : 503;
    
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(httpStatus).json(response);

  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorResponse: HealthCheckResponse = {
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        node_api: {
          status: 'healthy',
          version: process.version,
          uptime: process.uptime()
        },
        python_functions: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : String(error)
        },
        document_generation: {
          status: 'unhealthy',
          capabilities: [],
          last_check: new Date().toISOString()
        }
      },
      environment: {
        node_env: process.env.NODE_ENV || 'unknown',
        vercel_env: process.env.VERCEL_ENV,
        vercel_region: process.env.VERCEL_REGION
      }
    };

    return res.status(503).json(errorResponse);
  }
}