import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  createdAt: string;
  lastLoginAt: string;
  preferences: {
    emailNotifications: boolean;
    defaultExportFormat: 'pdf' | 'docx';
    theme: 'light' | 'dark';
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user && !!token;

  useEffect(() => {
    // Check for existing token on mount
    const savedToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (savedToken) {
      setToken(savedToken);
      verifyToken(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (authToken: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.user) {
        throw new Error('Invalid response from server - missing user or session data');
      }

      setUser({
        ...data.user,
        preferences: data.user.preferences || {
          emailNotifications: true,
          defaultExportFormat: 'pdf',
          theme: 'light'
        }
      });
      setToken(authToken);
    } catch (err) {
      console.error('Token verification failed:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      
      // Clear invalid token
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (authToken: string) => {
    localStorage.setItem('authToken', authToken);
    await verifyToken(authToken);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const refreshUser = async () => {
    if (token) {
      await verifyToken(token);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated,
      isLoading,
      error,
      login,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}