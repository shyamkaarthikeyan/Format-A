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
        console.log('Using client ID:', clientId);
        console.log('Environment variables:', import.meta.env);
        
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
        // Decode the JWT token to get user info
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        
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

        // Send user data to server to create/update user
        const serverResponse = await fetch('/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });

        if (!serverResponse.ok) {
          throw new Error('Failed to authenticate with server');
        }

        const { user: serverUser, sessionId } = await serverResponse.json();

        // Store session ID in cookie
        // Note: Remove 'secure' flag for development (localhost), add it back for production HTTPS
        const isProduction = window.location.protocol === 'https:';
        const cookieOptions = isProduction 
          ? `sessionId=${sessionId}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
          : `sessionId=${sessionId}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
        document.cookie = cookieOptions;

        // Update auth context
        setUser(serverUser);
        setError('');
        setLocation('/generator');
      } catch (err) {
        console.error('Authentication error:', err);
        setError('Failed to process authentication');
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white shadow-xl rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left: Illustration & marketing */}
        <div className="p-10 bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex flex-col justify-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:"#ffffff", stopOpacity:1}} />
                    <stop offset="50%" style={{stopColor:"#f8fafc", stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:"#e2e8f0", stopOpacity:1}} />
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="6" fill="url(#logo-gradient)"/>
                <text x="16" y="24" fontFamily="serif" fontSize="20" fontWeight="bold" textAnchor="middle" fill="#4f46e5">F</text>
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Format A</h2>
          </div>
          <h3 className="text-3xl font-bold">Create beautiful academic documents faster</h3>
          <p className="text-white/90 max-w-md">Use our editor to assemble sections, citations, figures and export clean PDFs ready for submission.</p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="inline-block mt-1 w-3 h-3 bg-white rounded-full" />
              <span className="text-white/90">Templates for IEEE, ACM and custom journals</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-block mt-1 w-3 h-3 bg-white rounded-full" />
              <span className="text-white/90">Collaborative drafting and versioning</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-block mt-1 w-3 h-3 bg-white rounded-full" />
              <span className="text-white/90">Export to DOCX / PDF with preserved styling</span>
            </li>
          </ul>
        </div>

        {/* Right: Sign-in card */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Welcome back</h1>
              <p className="text-sm text-gray-500">Sign in to continue to your account</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    <span className="ml-3 text-gray-600">Preparing sign-in…</span>
                  </div>
                ) : (
                  <div>
                    <div id="googleButton" className="mx-auto w-full mb-4" />
                    {!gsiReady && (
                      <div className="text-center">
                        <button
                          onClick={manualSignIn}
                          className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Sign in with Google
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-gray-400">
                By signing in you agree to our <a className="underline" href="/terms">Terms</a> and <a className="underline" href="/privacy">Privacy Policy</a>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}