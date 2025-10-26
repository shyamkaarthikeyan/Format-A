import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, User, Cookie, Server } from 'lucide-react';
import { authenticatedFetch, apiGet } from '@/lib/api-client';

export default function AuthDebug() {
  const { user, isAuthenticated } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDebugTests = async () => {
    setLoading(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      clientAuth: {
        isAuthenticated,
        user: user ? { id: user.id, name: user.name, email: user.email } : null,
        localStorage: localStorage.getItem('format-a-user') ? 'Present' : 'Missing'
      },
      cookies: {},
      apiTests: {}
    };

    // Check cookies
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      results.cookies[name] = value;
    });

    // Test API endpoints
    try {
      // Test health endpoint (no auth required)
      const healthResponse = await fetch('/api/health');
      results.apiTests.health = {
        status: healthResponse.status,
        ok: healthResponse.ok,
        data: healthResponse.ok ? await healthResponse.json() : await healthResponse.text()
      };
    } catch (error) {
      results.apiTests.health = { error: (error as Error).message };
    }

    try {
      // Test auth verify endpoint
      const verifyResponse = await authenticatedFetch('/api/auth/verify');
      results.apiTests.verify = {
        status: verifyResponse.status,
        ok: verifyResponse.ok,
        data: verifyResponse.ok ? await verifyResponse.json() : await verifyResponse.text()
      };
    } catch (error) {
      results.apiTests.verify = { error: (error as Error).message };
    }

    try {
      // Test download history endpoint
      const historyResult = await apiGet('/api/downloads/history?page=1&limit=5');
      results.apiTests.downloadHistory = historyResult;
    } catch (error) {
      results.apiTests.downloadHistory = { error: (error as Error).message };
    }

    try {
      // Test debug auth endpoint
      const debugResult = await apiGet('/api/debug/auth');
      results.apiTests.debugAuth = debugResult;
    } catch (error) {
      results.apiTests.debugAuth = { error: (error as Error).message };
    }

    setDebugInfo(results);
    setLoading(false);
  };

  const clearAuth = () => {
    localStorage.removeItem('format-a-user');
    document.cookie = 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.reload();
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          Authentication Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button onClick={runDebugTests} disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Run Debug Tests
          </Button>
          <Button onClick={clearAuth} variant="outline">
            Clear Auth Data
          </Button>
        </div>

        {/* Current Auth Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4" />
              <span className="font-medium">Auth Status</span>
            </div>
            <Badge variant={isAuthenticated ? "default" : "secondary"}>
              {isAuthenticated ? "Authenticated" : "Not Authenticated"}
            </Badge>
            {user && (
              <div className="mt-2 text-sm text-gray-600">
                <div>ID: {user.id}</div>
                <div>Name: {user.name}</div>
                <div>Email: {user.email}</div>
              </div>
            )}
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Cookie className="w-4 h-4" />
              <span className="font-medium">Session Cookie</span>
            </div>
            <Badge variant={document.cookie.includes('sessionId') ? "default" : "secondary"}>
              {document.cookie.includes('sessionId') ? "Present" : "Missing"}
            </Badge>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4" />
              <span className="font-medium">Local Storage</span>
            </div>
            <Badge variant={localStorage.getItem('format-a-user') ? "default" : "secondary"}>
              {localStorage.getItem('format-a-user') ? "Present" : "Missing"}
            </Badge>
          </div>
        </div>

        {/* Debug Results */}
        {debugInfo && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Debug Results</h3>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}