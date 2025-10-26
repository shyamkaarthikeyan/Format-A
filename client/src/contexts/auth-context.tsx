import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@shared/schema';
import { AuthenticationError, getUserFriendlyErrorMessage, handleApiResponse } from '@/lib/error-handling';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  signOut: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount and verify with server
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('format-a-user');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          
          // Verify the session is still valid with the server
          try {
            const response = await fetch('/api/auth/verify', {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const { user: serverUser } = await response.json();
              setUserState(serverUser);
            } else {
              // Session invalid, clear local storage
              localStorage.removeItem('format-a-user');
              setUserState(null);
            }
          } catch (verifyError) {
            console.error('Error verifying session:', verifyError);
            // If verification fails, clear local storage
            localStorage.removeItem('format-a-user');
            setUserState(null);
          }
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
        // Clear corrupted data
        localStorage.removeItem('format-a-user');
        setUserState(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    
    if (newUser) {
      // Store user in localStorage for quick access
      localStorage.setItem('format-a-user', JSON.stringify(newUser));
    } else {
      // Clear user from localStorage
      localStorage.removeItem('format-a-user');
    }
  };

  const signOut = () => {
    setUser(null);
    
    // Clear any cookies
    document.cookie = 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Optionally revoke Google tokens (if we stored them)
    // This would require additional Google API calls
  };

  const isAuthenticated = user !== null;

  const value: AuthContextType = {
    user,
    setUser,
    signOut,
    isAuthenticated,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}