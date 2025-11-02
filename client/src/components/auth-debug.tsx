import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiGet } from '@/lib/api-client';

const AuthDebug: React.FC = () => {
  const { user, isAuthenticated, loading, isAdmin } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [apiTests, setApiTests] = useState<any>({});

  useEffect(() => {
    updateDebugInfo();
  }, [user, isAuthenticated, loading]);

  const updateDebugInfo = () => {
    const info = {
      user: user,
      isAuthenticated: isAuthenticated,
      loading: loading,
      isAdmin: isAdmin,
      localStorage: {
        user: localStorage.getItem('format-a-user'),
        adminSession: localStorage.getItem('admin-session'),
        adminToken: localStorage.getItem('admin-token')
      },
      cookies: document.cookie,
      timestamp: new Date().toISOString()
    };
    setDebugInfo(info);
  };

  const testAPIs = async () => {
    const results: any = {};
    
    try {
      // Test auth verify
      const authResult = await fetch('/api/auth/verify', {
        credentials: 'include'
      });
      results.authVerify = {
        status: authResult.status,
        data: await authResult.json()
      };
    } catch (error) {
      results.authVerify = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    try {
      // Test download history endpoint (consolidated)
      const historyResult = await apiGet('/api/downloads?action=history&page=1&limit=5');
      results.downloadHistory = historyResult;
    } catch (error) {
      results.downloadHistory = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    try {
      // Test document generation
      const testDoc = {
        title: 'Debug Test Document',
        authors: [{ name: 'Debug User', affiliation: 'Test' }],
        sections: [{ title: 'Test', content: 'Debug test content' }],
        abstract: 'Debug test',
        keywords: ['debug'],
        references: [],
        figures: [],
        settings: { fontSize: '10pt', columns: '2', exportFormat: 'docx' }
      };

      const generateResult = await fetch('/api/generate?type=docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(testDoc)
      });

      results.documentGeneration = {
        status: generateResult.status,
        ok: generateResult.ok,
        statusText: generateResult.statusText
      };

      if (!generateResult.ok) {
        results.documentGeneration.error = await generateResult.text();
      }
    } catch (error) {
      results.documentGeneration = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    setApiTests(results);
  };

  const fixAuth = () => {
    // Create a proper authenticated user
    const fixedUser = {
      id: 'debug_user_' + Date.now(),
      email: 'shyamkaarthikeyan@gmail.com',
      name: 'Debug Admin User',
      picture: null,
      isActive: true,
      preferences: {},
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    // Store user
    localStorage.setItem('format-a-user', JSON.stringify(fixedUser));

    // Create session cookie
    const sessionId = 'debug_session_' + Date.now();
    document.cookie = `sessionId=${sessionId}; path=/; max-age=86400; SameSite=Lax`;

    // Create admin session
    const adminSession = {
      sessionId: 'admin_session_' + Date.now(),
      userId: fixedUser.id,
      adminPermissions: [
        'view_analytics',
        'manage_users', 
        'system_monitoring',
        'download_reports',
        'admin_panel_access'
      ],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: new Date().toISOString()
    };

    const adminToken = 'admin_token_' + Date.now();

    localStorage.setItem('admin-session', JSON.stringify(adminSession));
    localStorage.setItem('admin-token', adminToken);

    // Force page refresh to reinitialize auth context
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const clearAuth = () => {
    localStorage.removeItem('format-a-user');
    localStorage.removeItem('admin-session');
    localStorage.removeItem('admin-token');
    document.cookie = 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            🔍 Authentication Debug Panel
            <div className="flex gap-2">
              <Button onClick={updateDebugInfo} size="sm" variant="outline">
                Refresh
              </Button>
              <Button onClick={testAPIs} size="sm" variant="outline">
                Test APIs
              </Button>
              <Button onClick={fixAuth} size="sm" className="bg-green-600 hover:bg-green-700">
                Fix Auth
              </Button>
              <Button onClick={clearAuth} size="sm" variant="destructive">
                Clear Auth
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Auth State */}
            <div>
              <h3 className="font-semibold mb-2">Current Auth State</h3>
              <div className="space-y-2 text-sm">
                <div className={`p-2 rounded ${isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <strong>Authenticated:</strong> {isAuthenticated ? 'YES' : 'NO'}
                </div>
                <div className={`p-2 rounded ${loading ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'}`}>
                  <strong>Loading:</strong> {loading ? 'YES' : 'NO'}
                </div>
                <div className={`p-2 rounded ${isAdmin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>
                  <strong>Admin:</strong> {isAdmin ? 'YES' : 'NO'}
                </div>
                {user && (
                  <div className="p-2 rounded bg-gray-100">
                    <strong>User:</strong> {user.name || user.email}
                  </div>
                )}
              </div>
            </div>

            {/* Storage Data */}
            <div>
              <h3 className="font-semibold mb-2">Storage Data</h3>
              <div className="space-y-2 text-sm">
                <div className={`p-2 rounded ${debugInfo.localStorage?.user ? 'bg-green-100' : 'bg-red-100'}`}>
                  <strong>LocalStorage User:</strong> {debugInfo.localStorage?.user ? 'EXISTS' : 'MISSING'}
                </div>
                <div className={`p-2 rounded ${debugInfo.localStorage?.adminSession ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <strong>Admin Session:</strong> {debugInfo.localStorage?.adminSession ? 'EXISTS' : 'MISSING'}
                </div>
                <div className={`p-2 rounded ${debugInfo.cookies?.includes('sessionId') ? 'bg-green-100' : 'bg-red-100'}`}>
                  <strong>Session Cookie:</strong> {debugInfo.cookies?.includes('sessionId') ? 'EXISTS' : 'MISSING'}
                </div>
              </div>
            </div>
          </div>

          {/* API Test Results */}
          {Object.keys(apiTests).length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">API Test Results</h3>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(apiTests, null, 2)}
              </pre>
            </div>
          )}

          {/* Raw Debug Data */}
          <details className="mt-4">
            <summary className="font-semibold cursor-pointer">Raw Debug Data</summary>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-60 mt-2">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>

          {/* Instructions */}
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <h4 className="font-semibold text-blue-800">Instructions:</h4>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>• If "Authenticated" shows NO but you should be logged in, click "Fix Auth"</li>
              <li>• If downloads still don't work after fixing, check API test results</li>
              <li>• "Clear Auth" will log you out completely</li>
              <li>• Check browser console for additional debug logs</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthDebug;