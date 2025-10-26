import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';

// Type definitions for Google Sign-In
interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
  clientId: string;
}

// Extend Window interface to include Google
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, config: any) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

export default function SigninPage() {
  const { user, setUser } = useAuth();
  const [error, setError] = useState('');
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [gsiReady, setGsiReady] = useState(false);

  useEffect(() => {
    if (user) {
      setLocation('/generator');
      return;
    }

    let cancelled = false;

    const loadGoogleScript = () => {
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        initializeGoogle();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.head.appendChild(script);
    };

    const initializeGoogle = () => {
      if (!window.google) {
        // keep trying briefly until library loads
        setTimeout(initializeGoogle, 100);
        return;
      }

      try {
        console.log('Initializing Google Sign-In...');
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '19094603379-giuh4heaq1so1ctvutd9cukqg7ja9m81.apps.googleusercontent.com';

        console.log('Using client ID:', clientId.substring(0, 10) + '...');

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
        });

        // Wait for DOM to be ready and try multiple times to find the element
        const tryRenderButton = (attempts = 0) => {
          const parent = document.getElementById('googleButton');
          console.log(`Attempt ${attempts + 1}: Google button parent element:`, parent);

          if (parent) {
            // Clear any existing content first
            parent.innerHTML = '';

            try {
              window.google.accounts.id.renderButton(parent, {
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                width: 320,
              });
              console.log('Google button rendered successfully');

              // Check if button actually rendered
              setTimeout(() => {
                if (parent.children.length === 0) {
                  console.warn('Google button did not render, adding fallback');
                  renderFallbackButton(parent);
                }
              }, 1000);
            } catch (renderError) {
              console.error('Error rendering Google button:', renderError);
              renderFallbackButton(parent);
            }
          } else if (attempts < 10) {
            // Try again after a short delay
            setTimeout(() => tryRenderButton(attempts + 1), 200);
          } else {
            console.error('Google button parent element not found after multiple attempts');
            setError('Sign-in interface not available - please refresh the page');
          }
        };

        const renderFallbackButton = (parent: HTMLElement) => {
          parent.innerHTML = `
            <button 
              onclick="window.handleManualSignIn()" 
              class="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          `;
        };

        tryRenderButton();

        setGsiReady(true);
        if (!cancelled) setLoading(false);
        console.log('Google Sign-In initialization complete');
      } catch (err) {
        console.error('Google initialization error:', err);
        if (!cancelled) {
          setError(`Failed to load Google Sign-In: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setLoading(false);
        }
      }
    };

    const handleCredentialResponse = async (response: GoogleCredentialResponse): Promise<void> => {
      try {
        console.log('🔐 Processing Google credential response...');

        // Decode the JWT token to get user info
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        console.log('✅ Google payload decoded:', {
          sub: payload.sub,
          email: payload.email,
          name: payload.name
        });

        // Create user object from Google payload
        const userData = {
          googleId: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          preferences: {
            emailNotifications: true,
            defaultExportFormat: 'pdf' as const,
            theme: 'light' as const
          }
        };

        console.log('📤 Sending user data to server...');

        // Send user data to server to create/update user
        const serverResponse = await fetch('/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });

        console.log('📥 Server response status:', serverResponse.status);

        if (!serverResponse.ok) {
          const errorText = await serverResponse.text();
          console.error('❌ Server error response:', errorText);
          throw new Error(`Server authentication failed (${serverResponse.status}): ${errorText}`);
        }

        const responseData = await serverResponse.json();
        console.log('✅ Server response data:', responseData);

        if (!responseData.success) {
          const errorMsg = responseData.error?.message || 'Unknown server error';
          console.error('❌ Server returned error:', errorMsg);
          throw new Error(`Authentication failed: ${errorMsg}`);
        }

        const { user: serverUser, sessionId } = responseData;

        if (!serverUser || !sessionId) {
          console.error('❌ Missing user or session data in response');
          throw new Error('Invalid response from server - missing user or session data');
        }

        console.log('🍪 Setting session cookie...');

        // Store session ID in cookie
        const isProduction = window.location.protocol === 'https:';
        const cookieOptions = isProduction
          ? `sessionId=${sessionId}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
          : `sessionId=${sessionId}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
        document.cookie = cookieOptions;

        console.log('🎉 Authentication successful! Redirecting to app...');

        // Update auth context
        setUser(serverUser);
        setError('');
        setLocation('/generator');
      } catch (err) {
        console.error('❌ Authentication error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to process authentication';
        setError(`Authentication failed: ${errorMessage}`);
      }
    };

    // Add manual sign-in handler to window for fallback button
    (window as any).handleManualSignIn = manualSignIn;

    loadGoogleScript();

    return () => {
      cancelled = true;
      // Clean up global function
      delete (window as any).handleManualSignIn;
    };
  }, [user, setLocation, setUser]);

  if (user) return null;

  const manualSignIn = () => {
    if (!gsiReady || !window.google) {
      setError('Google Sign-In not available. Try again in a moment.');
      return;
    }

    try {
      // Re-render the Google button to trigger sign-in
      const parent = document.getElementById('googleButton');
      if (parent) {
        parent.innerHTML = ''; // Clear existing button
        window.google.accounts.id.renderButton(parent, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 320,
        });
      }

      // Also try programmatic prompt
      if (window.google.accounts.id.prompt) {
        window.google.accounts.id.prompt();
      }
    } catch (err) {
      console.error('Manual sign-in error', err);
      setError('Unable to start Google Sign-In');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-violet-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-purple-300 rounded-full opacity-20 animate-pulse"
            style={{
              animation: `float ${3 + Math.random() * 2}s ease-in-out infinite ${i * 0.2}s`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Background Shapes */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
      <div className="absolute top-40 right-10 w-96 h-96 bg-violet-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

            {/* Left: Branding & Features */}
            <div className="text-center lg:text-left space-y-8 px-4 lg:px-8">
              {/* Logo & Brand */}
              <div className="space-y-4">
                <div className="flex items-center justify-center lg:justify-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
                    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                      <text x="16" y="24" fontFamily="serif" fontSize="24" fontWeight="bold" textAnchor="middle" fill="white">F</text>
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                      Format A
                    </h1>
                    <p className="text-gray-600 text-sm">IEEE Document Generator</p>
                  </div>
                </div>

                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                  Create beautiful <span className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">academic documents</span> in minutes
                </h2>

                <p className="text-lg text-gray-600 max-w-lg mx-auto lg:mx-0">
                  Professional IEEE-formatted papers with real-time preview, smart templates, and seamless collaboration.
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto lg:mx-0">
                <div className="flex items-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-purple-200">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">IEEE Templates</h3>
                    <p className="text-sm text-gray-600">Professional formatting</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-purple-200">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Live Preview</h3>
                    <p className="text-sm text-gray-600">Real-time editing</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-purple-200">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Export Ready</h3>
                    <p className="text-sm text-gray-600">PDF & DOCX output</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-purple-200">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Collaboration</h3>
                    <p className="text-sm text-gray-600">Team workflows</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Sign-in Card */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md">
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 space-y-6">
                  {/* Header */}
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Welcome back</h3>
                    <p className="text-gray-600">Sign in to continue creating amazing documents</p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-800">{error}</div>
                    </div>
                  )}

                  {/* Sign-in Content */}
                  <div className="space-y-4">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
                          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-r-violet-400 animate-spin animation-delay-150"></div>
                        </div>
                        <p className="text-gray-600 font-medium">Preparing your sign-in experience...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div id="googleButton" className="w-full" />
                        {!gsiReady && (
                          <button
                            onClick={manualSignIn}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all duration-200 group"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="font-medium text-gray-700 group-hover:text-gray-900">Continue with Google</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      By signing in, you agree to our{' '}
                      <a href="/terms" className="text-purple-600 hover:text-purple-700 underline">Terms of Service</a>
                      {' '}and{' '}
                      <a href="/privacy" className="text-purple-600 hover:text-purple-700 underline">Privacy Policy</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2000ms; }
        .animation-delay-4000 { animation-delay: 4000ms; }
        .animation-delay-150 { animation-delay: 150ms; }
      `}</style>
    </div>
  );
}