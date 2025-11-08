import { NextRequest, NextResponse } from 'next/server';

export default async function handler(req: NextRequest) {
  // Temporary redirect to admin-fresh endpoint
  // This fixes the 404 errors while frontend deployment updates
  
  const url = new URL(req.url);
  const searchParams = url.searchParams;
  
  // Get all query parameters
  const path = searchParams.get('path');
  const type = searchParams.get('type');
  const adminEmail = searchParams.get('adminEmail');
  
  // Build the redirect URL to admin-fresh
  const redirectUrl = new URL('/api/admin-fresh', url.origin);
  if (path) redirectUrl.searchParams.set('path', path);
  if (type) redirectUrl.searchParams.set('type', type);
  if (adminEmail) redirectUrl.searchParams.set('adminEmail', adminEmail);
  
  console.log('Redirecting from /api/admin to /api/admin-fresh:', {
    originalUrl: req.url,
    redirectUrl: redirectUrl.toString()
  });
  
  try {
    // Forward the request to admin-fresh
    const response = await fetch(redirectUrl.toString(), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
    
  } catch (error) {
    console.error('Error redirecting to admin-fresh:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Redirect to admin-fresh failed',
        message: 'Temporary redirect endpoint error'
      }, 
      { status: 500 }
    );
  }
}