import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/auth-context';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface GoogleLoginComponentProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const GoogleLoginComponent: React.FC<GoogleLoginComponentProps> = ({
  onSuccess,
  onError,
  className = ''
}) => {
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      const errorMsg = 'No credential received from Google';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔐 Processing Google login...');
      
      const result = await login(credentialResponse.credential);
      
      if (result.success) {
        console.log('✅ Google login successful');
        onSuccess?.();
      } else {
        const errorMsg = result.error || 'Login failed';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'Network error during login';
      console.error('❌ Google login error:', error);
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleError = () => {
    const errorMsg = 'Google authentication failed';
    console.error('❌ Google OAuth error');
    setError(errorMsg);
    onError?.(errorMsg);
  };

  if (isLoading || isProcessing) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-gray-600">
            {isProcessing ? 'Signing you in...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col items-center space-y-4">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap={false}
          theme="outline"
          size="large"
          text="signin_with"
          shape="rectangular"
          logo_alignment="left"
        />
        
        <div className="text-xs text-gray-500 text-center max-w-sm">
          By signing in, you agree to our terms of service and privacy policy.
          Your account will be created automatically.
        </div>
      </div>
    </div>
  );
};

// Alternative custom button version
export const CustomGoogleLoginButton: React.FC<GoogleLoginComponentProps> = ({
  onSuccess,
  onError,
  className = ''
}) => {
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      const errorMsg = 'No credential received from Google';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await login(credentialResponse.credential);
      
      if (result.success) {
        onSuccess?.();
      } else {
        const errorMsg = result.error || 'Login failed';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'Network error during login';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => setError('Google authentication failed')}
        useOneTap={false}
      >
        {({ onClick }) => (
          <Button
            onClick={onClick}
            disabled={isLoading || isProcessing}
            className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span>
              {isProcessing ? 'Signing in...' : 'Continue with Google'}
            </span>
          </Button>
        )}
      </GoogleLogin>
    </div>
  );
};