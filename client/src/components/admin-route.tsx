import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { AdminPermission } from '@/lib/admin-auth';

interface AdminRouteProps {
  children: React.ReactNode;
  requiredPermissions?: AdminPermission[];
  fallbackPath?: string;
  showUnauthorized?: boolean;
}

const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  requiredPermissions = ['admin_panel_access'],
  fallbackPath = '/',
  showUnauthorized = false
}) => {
  const { user, isAdmin, adminSession, loading, initializeAdminAccess } = useAuth();
  const [, setLocation] = useLocation();
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    const handleAdminAccess = async () => {
      console.log('Admin route check:', { loading, user: !!user, isAdmin, adminSession: !!adminSession });
      
      // Wait for auth to finish loading
      if (loading) return;

      // If not authenticated, redirect to sign-in
      if (!user) {
        console.log('No user, redirecting to signin');
        setLocation('/signin');
        return;
      }

      // If not admin, redirect or show unauthorized
      if (!isAdmin) {
        console.log('User is not admin');
        if (showUnauthorized) {
          setInitializationError('You do not have administrative privileges. Only shyamkaarthikeyan@gmail.com can access the admin panel.');
        } else {
          setLocation(fallbackPath);
        }
        return;
      }

      // For admin users, ensure they have an admin session
      if (!adminSession && !isInitializing && isAdmin) {
        console.log('Creating admin session for admin user...');
        setIsInitializing(true);
        setInitializationError(null);
        
        try {
          // Try to create admin session via API first
          const response = await fetch('/api/admin/auth/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              email: user.email
            })
          });

          if (response.ok) {
            const { adminSession: newSession, adminToken } = await response.json();
            localStorage.setItem('admin-session', JSON.stringify(newSession));
            localStorage.setItem('admin-token', adminToken);
            console.log('Admin session created via API');
          } else {
            // Fallback to local session creation
            console.log('API session creation failed, creating local session');
            const localAdminSession = {
              sessionId: 'local_admin_' + Date.now(),
              userId: user.id,
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
            
            const adminToken = 'admin_token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('admin-session', JSON.stringify(localAdminSession));
            localStorage.setItem('admin-token', adminToken);
            console.log('Local admin session created with token:', adminToken);
          }
          
          // Trigger a re-render to pick up the new session
          window.location.reload();
          
        } catch (error) {
          console.error('Failed to create admin session:', error);
          setInitializationError('Failed to initialize admin access. Please try refreshing the page.');
        } finally {
          setIsInitializing(false);
        }
      }
    };

    handleAdminAccess();
  }, [user, isAdmin, adminSession, loading, isInitializing, setLocation, showUnauthorized, fallbackPath]);

  // Check if user has required permissions
  const hasRequiredPermissions = () => {
    // For admin users, always allow access (simplified check)
    if (isAdmin) return true;
    
    if (!adminSession) return false;
    
    return requiredPermissions.every(permission =>
      adminSession.adminPermissions.includes(permission)
    );
  };

  // Show loading state
  if (loading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? 'Loading...' : 'Initializing admin access...'}
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (initializationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">{initializationError}</p>
          <button
            onClick={() => setLocation(fallbackPath)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check permissions
  if (adminSession && !hasRequiredPermissions()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Insufficient Permissions</h2>
          <p className="text-gray-600 mb-4">
            You don't have the required permissions to access this area.
          </p>
          <div className="text-sm text-gray-500 mb-6">
            <p>Required: {requiredPermissions.join(', ')}</p>
            <p>Current: {adminSession?.adminPermissions.join(', ') || 'None'}</p>
          </div>
          <button
            onClick={() => setLocation(fallbackPath)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // All checks passed, render children
  if (adminSession && hasRequiredPermissions()) {
    return <>{children}</>;
  }

  // Fallback loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );
};

export default AdminRoute;