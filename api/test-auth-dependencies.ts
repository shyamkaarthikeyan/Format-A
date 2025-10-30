import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      dependencies: {},
      environmentVariables: {}
    };

    // Test environment variables
    results.environmentVariables = {
      VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING'
    };

    // Test Google Auth Library import
    try {
      const { OAuth2Client } = await import('google-auth-library');
      results.dependencies.googleAuthLibrary = {
        status: 'SUCCESS',
        canInstantiate: false
      };
      
      // Try to instantiate OAuth2Client
      try {
        const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);
        results.dependencies.googleAuthLibrary.canInstantiate = true;
      } catch (e) {
        results.dependencies.googleAuthLibrary.instantiationError = e.message;
      }
    } catch (e) {
      results.dependencies.googleAuthLibrary = {
        status: 'FAILED',
        error: e.message
      };
    }

    // Test JWT library import
    try {
      const jwt = await import('jsonwebtoken');
      results.dependencies.jsonwebtoken = {
        status: 'SUCCESS',
        canSign: false
      };
      
      // Try to sign a token
      try {
        const token = jwt.sign({ test: 'data' }, 'test-secret', { expiresIn: '1h' });
        results.dependencies.jsonwebtoken.canSign = true;
      } catch (e) {
        results.dependencies.jsonwebtoken.signError = e.message;
      }
    } catch (e) {
      results.dependencies.jsonwebtoken = {
        status: 'FAILED',
        error: e.message
      };
    }

    // Test Neon database import
    try {
      const { neonDb } = await import('./_lib/neon-database');
      results.dependencies.neonDatabase = {
        status: 'SUCCESS',
        canInitialize: false
      };
      
      // Try to initialize database
      try {
        await neonDb.initialize();
        results.dependencies.neonDatabase.canInitialize = true;
      } catch (e) {
        results.dependencies.neonDatabase.initError = e.message;
      }
    } catch (e) {
      results.dependencies.neonDatabase = {
        status: 'FAILED',
        error: e.message
      };
    }

    return res.status(200).json({
      success: true,
      message: 'Dependency test completed',
      results
    });

  } catch (error) {
    console.error('Dependency test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Dependency test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}