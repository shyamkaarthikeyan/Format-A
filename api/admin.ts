import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Temporary redirect to admin-fresh endpoint
  // This fixes the 404 errors while frontend deployment updates
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Build the redirect URL to admin-fresh
  const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  let redirectUrl = `${baseUrl}/api/admin-fresh`;
  
  // Forward ALL query parameters to admin-fresh
  const params = new URLSearchParams();
  Object.entries(req.query).forEach(([key, value]) => {
    if (value) {
      // Handle both string and array values
      const stringValue = Array.isArray(value) ? value.join(',') : String(value);
      params.set(key, stringValue);
    }
  });
  
  if (params.toString()) {
    redirectUrl += `?${params.toString()}`;
  }
  
  console.log('Redirecting from /api/admin to /api/admin-fresh:', {
    originalUrl: req.url,
    redirectUrl
  });
  
  try {
    // Forward the request to admin-fresh
    const response = await fetch(redirectUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
    });
    
    const data = await response.json();
    
    return res.status(response.status).json(data);
    
  } catch (error) {
    console.error('Error redirecting to admin-fresh:', error);
    return res.status(500).json({
      success: false, 
      error: 'Redirect to admin-fresh failed',
      message: 'Temporary redirect endpoint error'
    });
  }
}