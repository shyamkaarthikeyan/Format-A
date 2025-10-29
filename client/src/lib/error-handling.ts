// Error handling utilities for authentication and API calls
import React from 'react';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export class AuthenticationError extends Error {
  code: string;
  details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
    this.details = details;
  }
}

export class DownloadError extends Error {
  code: string;
  details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'DownloadError';
    this.code = code;
    this.details = details;
  }
}

export class StorageError extends Error {
  code: string;
  details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.details = details;
  }
}

export class NetworkError extends Error {
  code: string;
  details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
    this.details = details;
  }
}

export class AdminError extends Error {
  code: string;
  details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'AdminError';
    this.code = code;
    this.details = details;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AuthenticationError || error instanceof DownloadError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}

export function getErrorCode(error: unknown): string {
  if (error instanceof AuthenticationError || 
      error instanceof DownloadError || 
      error instanceof StorageError || 
      error instanceof NetworkError || 
      error instanceof AdminError) {
    return error.code;
  }
  
  return 'UNKNOWN_ERROR';
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isDownloadError(error: unknown): error is DownloadError {
  return error instanceof DownloadError;
}

export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isAdminError(error: unknown): error is AdminError {
  return error instanceof AdminError;
}

// Storage utilities for guest documents
export function checkLocalStorageAvailability(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function getLocalStorageUsage(): { used: number; available: number; percentage: number } {
  if (!checkLocalStorageAvailability()) {
    return { used: 0, available: 0, percentage: 100 };
  }

  let used = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }

  // Most browsers limit localStorage to 5-10MB, we'll assume 5MB
  const available = 5 * 1024 * 1024; // 5MB in bytes
  const percentage = (used / available) * 100;

  return { used, available, percentage };
}

export function handleStorageError(operation: string, error: unknown): StorageError {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'QuotaExceededError':
        return new StorageError(
          'STORAGE_QUOTA_EXCEEDED',
          'Storage quota exceeded. Please clear some space or sign in to save your work.',
          { operation, originalError: error }
        );
      case 'SecurityError':
        return new StorageError(
          'STORAGE_SECURITY_ERROR',
          'Storage access denied. Please check your browser settings.',
          { operation, originalError: error }
        );
      default:
        return new StorageError(
          'STORAGE_ERROR',
          `Storage operation failed: ${error.message}`,
          { operation, originalError: error }
        );
    }
  }

  return new StorageError(
    'STORAGE_UNKNOWN_ERROR',
    'An unknown storage error occurred',
    { operation, originalError: error }
  );
}

export function handleNetworkError(error: unknown): NetworkError {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError(
      'NETWORK_OFFLINE',
      'You appear to be offline. Please check your internet connection.',
      { originalError: error }
    );
  }

  if (error instanceof Error && error.message.includes('timeout')) {
    return new NetworkError(
      'NETWORK_TIMEOUT',
      'Request timed out. Please try again.',
      { originalError: error }
    );
  }

  return new NetworkError(
    'NETWORK_ERROR',
    'Network error occurred. Please check your connection and try again.',
    { originalError: error }
  );
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiResponse;
    
    try {
      errorData = await response.json();
    } catch {
      // If we can't parse the error response, create a generic error
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const error = errorData.error;
    if (error) {
      switch (error.code) {
        case 'AUTHENTICATION_REQUIRED':
        case 'INVALID_TOKEN':
        case 'EXPIRED_SESSION':
        case 'GOOGLE_AUTH_FAILED':
        case 'USER_NOT_FOUND':
        case 'SESSION_EXPIRED':
          throw new AuthenticationError(error.code, error.message, error.details);
        
        case 'DOCUMENT_GENERATION_FAILED':
        case 'EMAIL_DELIVERY_FAILED':
        case 'DOWNLOAD_LIMIT_EXCEEDED':
        case 'INVALID_DOCUMENT_DATA':
          throw new DownloadError(error.code, error.message, error.details);
        
        default:
          throw new Error(error.message);
      }
    }
    
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data: ApiResponse<T> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || 'Request failed');
  }
  
  return data as T;
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);

  // Provide user-friendly messages for common error codes
  switch (code) {
    // Authentication errors
    case 'AUTHENTICATION_REQUIRED':
      return 'Please sign in to continue';
    
    case 'EXPIRED_SESSION':
    case 'SESSION_EXPIRED':
      return 'Your session has expired. Please sign in again';
    
    case 'GOOGLE_AUTH_FAILED':
      return 'Google sign-in failed. Please try again';
    
    case 'ADMIN_ACCESS_DENIED':
      return 'You do not have permission to access this area';
    
    // Document and download errors
    case 'DOCUMENT_GENERATION_FAILED':
      return 'Failed to generate document. Please check your content and try again';
    
    case 'EMAIL_DELIVERY_FAILED':
      return 'Document generated successfully, but email delivery failed. You can still download the file';
    
    case 'DOWNLOAD_LIMIT_EXCEEDED':
      return 'You have reached your download limit. Please try again later';
    
    case 'INVALID_DOCUMENT_DATA':
      return 'Invalid document data. Please check your content and try again';
    
    // Storage errors
    case 'STORAGE_QUOTA_EXCEEDED':
      return 'Storage space is full. Please clear some space or sign in to save your work to the cloud';
    
    case 'STORAGE_SECURITY_ERROR':
      return 'Unable to save your work due to browser security settings. Please check your privacy settings';
    
    case 'STORAGE_ERROR':
      return 'Failed to save your work locally. Your progress may be lost if you refresh the page';
    
    // Network errors
    case 'NETWORK_OFFLINE':
      return 'You appear to be offline. Some features may not work until you reconnect';
    
    case 'NETWORK_TIMEOUT':
      return 'Request timed out. Please check your connection and try again';
    
    case 'NETWORK_ERROR':
      return 'Network error occurred. Please check your connection and try again';
    
    // Admin errors
    case 'ADMIN_UNAUTHORIZED':
      return 'Admin access denied. Please verify your credentials';
    
    case 'ADMIN_SESSION_EXPIRED':
      return 'Admin session expired. Please sign in again';
    
    case 'ADMIN_PERMISSION_DENIED':
      return 'You do not have permission to perform this action';
    
    case 'ADMIN_RATE_LIMITED':
      return 'Too many requests. Please wait a moment and try again';
    
    default:
      return message;
  }
}

// Retry mechanism for failed operations
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry certain types of errors
      if (isAuthenticationError(error) || isStorageError(error)) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
}

// Error boundary helper
export function createErrorBoundary(fallback: React.ComponentType<{ error: Error }>) {
  return class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('Error boundary caught an error:', error, errorInfo);
    }

    render() {
      if (this.state.hasError && this.state.error) {
        return React.createElement(fallback, { error: this.state.error });
      }

      return this.props.children;
    }
  };
}