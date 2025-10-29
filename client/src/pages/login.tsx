import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth } from '../contexts/auth-context';
import { GoogleLoginComponent } from '../components/google-login';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, FileText, Users, BarChart3, Shield } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  const handleLoginSuccess = () => {
    console.log('🎉 Login successful, redirecting...');
    setLocation('/');
  };

  const handleLoginError = (error: string) => {
    console.error('❌ Login error:', error);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Configuration Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                Google Client ID is not configured. Please check your environment variables.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
          
          {/* Left side - Features */}
          <div className="space-y-6">
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                IEEE Format Generator
              </h1>
              <p className="text-xl text-gray-600">
                Professional academic document formatting made simple
              </p>
            </div>

            <div className="grid gap-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Document Generation</h3>
                  <p className="text-gray-600 text-sm">
                    Generate IEEE-formatted documents with proper citations and formatting
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">User Management</h3>
                  <p className="text-gray-600 text-sm">
                    Secure Google authentication with personalized document history
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Analytics Dashboard</h3>
                  <p className="text-gray-600 text-sm">
                    Track your document generation and download analytics
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Secure & Private</h3>
                  <p className="text-gray-600 text-sm">
                    Your documents and data are securely stored and protected
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                <CardDescription>
                  Sign in to access your document generator and analytics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <GoogleLoginComponent
                  onSuccess={handleLoginSuccess}
                  onError={handleLoginError}
                  className="w-full"
                />

                <div className="text-center">
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>🔒 Secure authentication via Google</p>
                    <p>📊 Automatic user analytics tracking</p>
                    <p>💾 Document history saved to your account</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-xs text-gray-400 text-center">
                    <p>New users will be automatically registered</p>
                    <p>Existing users will be signed in seamlessly</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}