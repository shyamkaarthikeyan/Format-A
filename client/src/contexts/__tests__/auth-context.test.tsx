import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth-context';
import { User } from '@shared/schema';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test component that uses the auth context
function TestComponent() {
  const { user, isAuthenticated, loading, setUser, signOut } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user-name">{user?.name || 'no-user'}</div>
      <button onClick={() => setUser(mockUser)} data-testid="sign-in">
        Sign In
      </button>
      <button onClick={signOut} data-testid="sign-out">
        Sign Out
      </button>
    </div>
  );
}

const mockUser: User = {
  id: 'user_1',
  googleId: 'google123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
  isActive: true,
  preferences: {
    emailNotifications: true,
    defaultExportFormat: 'pdf',
    theme: 'light'
  }
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should provide initial state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('no-user');
  });

  it('should load user from localStorage on mount', async () => {
    const storedUser = JSON.stringify(mockUser);
    const storedSession = JSON.stringify({
      userId: mockUser.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    });

    mockLocalStorage.getItem
      .mockReturnValueOnce(storedUser) // format-a-user
      .mockReturnValueOnce(storedSession); // format-a-session

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
  });

  it('should clear expired session on mount', async () => {
    const storedUser = JSON.stringify(mockUser);
    const expiredSession = JSON.stringify({
      userId: mockUser.id,
      expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
      createdAt: new Date().toISOString()
    });

    mockLocalStorage.getItem
      .mockReturnValueOnce(storedUser)
      .mockReturnValueOnce(expiredSession);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('format-a-user');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('format-a-session');
  });

  it('should handle corrupted localStorage data', async () => {
    mockLocalStorage.getItem
      .mockReturnValueOnce('invalid-json')
      .mockReturnValueOnce('invalid-json');

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(consoleSpy).toHaveBeenCalled();
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('format-a-user');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('format-a-session');

    consoleSpy.mockRestore();
  });

  it('should set user and store in localStorage', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    act(() => {
      screen.getByTestId('sign-in').click();
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'format-a-user',
      JSON.stringify(mockUser)
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'format-a-session',
      expect.stringContaining('"userId":"user_1"')
    );
  });

  it('should sign out user and clear localStorage', async () => {
    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // First sign in
    act(() => {
      screen.getByTestId('sign-in').click();
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');

    // Then sign out
    act(() => {
      screen.getByTestId('sign-out').click();
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('no-user');
    
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('format-a-user');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('format-a-session');
  });

  it('should throw error when used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});