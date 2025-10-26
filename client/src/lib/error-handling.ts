// Error handling utilities for authentication and API calls

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
  if (error instanceof AuthenticationError || error instanceof DownloadError) {
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
  
  return data.data as T;
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);

  // Provide user-friendly messages for common error codes
  switch (code) {
    case 'AUTHENTICATION_REQUIRED':
      return 'Please sign in to continue';
    
    case 'EXPIRED_SESSION':
    case 'SESSION_EXPIRED':
      return 'Your session has expired. Please sign in again';
    
    case 'GOOGLE_AUTH_FAILED':
      return 'Google sign-in failed. Please try again';
    
    case 'DOCUMENT_GENERATION_FAILED':
      return 'Failed to generate document. Please check your content and try again';
    
    case 'EMAIL_DELIVERY_FAILED':
      return 'Document generated successfully, but email delivery failed. You can still download the file';
    
    case 'DOWNLOAD_LIMIT_EXCEEDED':
      return 'You have reached your download limit. Please try again later';
    
    case 'INVALID_DOCUMENT_DATA':
      return 'Invalid document data. Please check your content and try again';
    
    default:
      return message;
  }
}