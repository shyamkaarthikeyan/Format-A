import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test 1: Basic function works
    console.log('Admin debug: Basic function working');
    
    // Test 2: Try importing neon-database
    try {
      const { neonDb } = await import('./_lib/neon-database');
      console.log('Admin debug: neon-database import successful');
      
      // Test 3: Try initializing database
      try {
        await neonDb.initialize();
        console.log('Admin debug: Database initialization successful');
        
        return res.status(200).json({
          success: true,
          message: 'Admin debug: All tests passed',
          tests: {
            basicFunction: 'PASS',
            neonImport: 'PASS',
            dbInit: 'PASS'
          }
        });
      } catch (dbError) {
        console.error('Admin debug: Database init failed:', dbError);
        return res.status(200).json({
          success: false,
          message: 'Admin debug: Database init failed',
          tests: {
            basicFunction: 'PASS',
            neonImport: 'PASS',
            dbInit: 'FAIL'
          },
          error: dbError instanceof Error ? dbError.message : 'Unknown error'
        });
      }
    } catch (importError) {
      console.error('Admin debug: Import failed:', importError);
      return res.status(200).json({
        success: false,
        message: 'Admin debug: Import failed',
        tests: {
          basicFunction: 'PASS',
          neonImport: 'FAIL',
          dbInit: 'NOT_TESTED'
        },
        error: importError instanceof Error ? importError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Admin debug: Basic function failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Admin debug: Basic function failed',
      tests: {
        basicFunction: 'FAIL',
        neonImport: 'NOT_TESTED',
        dbInit: 'NOT_TESTED'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}