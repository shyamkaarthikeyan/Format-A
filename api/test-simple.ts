import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('🔍 Simple test endpoint called');
  console.log('🔍 Method:', req.method);
  console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🔍 Cookies:', req.cookies);
  console.log('🔍 Cookie header:', req.headers.cookie);

  res.status(200).json({
    success: true,
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: req.headers,
    cookies: req.cookies,
    cookieHeader: req.headers.cookie
  });
}