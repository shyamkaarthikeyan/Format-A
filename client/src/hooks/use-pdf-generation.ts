import { useState, useCallback } from 'react';

export type PDFGenerationStatus = 
  | 'idle' 
  | 'generating_word' 
  | 'converting_pdf' 
  | 'complete' 
  | 'error';

export interface PDFGenerationState {
  status: PDFGenerationStatus;
  progress: number;
  message: string;
  error?: string;
  errorCode?: string;
}

export interface PDFGenerationError {
  message: string;
  code?: string;
  retryable?: boolean;
  suggestedAction?: string;
}

const ERROR_MESSAGES: Record<string, PDFGenerationError> = {
  SERVICE_UNAVAILABLE: {
    message: 'PDF service is temporarily unavailable',
    code: 'SERVICE_UNAVAILABLE',
    retryable: true,
    suggestedAction: 'Please try again in a few minutes. The service may be experiencing high load.'
  },
  TIMEOUT: {
    message: 'PDF generation is taking longer than expected',
    code: 'TIMEOUT',
    retryable: true,
    suggestedAction: 'Your document may be large or complex. Please try again or simplify your document.'
  },
  CONVERSION_FAILED: {
    message: 'PDF conversion failed',
    code: 'CONVERSION_FAILED',
    retryable: true,
    suggestedAction: 'There was an issue converting your document. Please check your content and try again.'
  },
  CONNECTION_ERROR: {
    message: 'Cannot connect to PDF service',
    code: 'CONNECTION_ERROR',
    retryable: true,
    suggestedAction: 'Please check your internet connection and try again.'
  },
  INVALID_DOCUMENT: {
    message: 'Invalid document data',
    code: 'INVALID_DOCUMENT',
    retryable: false,
    suggestedAction: 'Please ensure your document has a title and at least one author.'
  },
  UNKNOWN: {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN',
    retryable: true,
    suggestedAction: 'Please try again. If the problem persists, contact support.'
  }
};

export function usePDFGeneration() {
  const [state, setState] = useState<PDFGenerationState>({
    status: 'idle',
    progress: 0,
    message: ''
  });

  const setGeneratingWord = useCallback(() => {
    setState({
      status: 'generating_word',
      progress: 25,
      message: 'Generating IEEE-formatted document...'
    });
  }, []);

  const setConvertingPdf = useCallback(() => {
    setState({
      status: 'converting_pdf',
      progress: 75,
      message: 'Converting to PDF format...'
    });
  }, []);

  const setComplete = useCallback(() => {
    setState({
      status: 'complete',
      progress: 100,
      message: 'PDF generated successfully!'
    });
  }, []);

  const setError = useCallback((error: Error | string, errorCode?: string) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    // Try to match error message to known error types
    let errorDetails = ERROR_MESSAGES.UNKNOWN;
    
    if (errorMessage.includes('temporarily unavailable') || errorMessage.includes('503')) {
      errorDetails = ERROR_MESSAGES.SERVICE_UNAVAILABLE;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      errorDetails = ERROR_MESSAGES.TIMEOUT;
    } else if (errorMessage.includes('conversion failed') || errorMessage.includes('convert')) {
      errorDetails = ERROR_MESSAGES.CONVERSION_FAILED;
    } else if (errorMessage.includes('connect') || errorMessage.includes('network')) {
      errorDetails = ERROR_MESSAGES.CONNECTION_ERROR;
    } else if (errorMessage.includes('title') || errorMessage.includes('author')) {
      errorDetails = ERROR_MESSAGES.INVALID_DOCUMENT;
    } else if (errorCode && ERROR_MESSAGES[errorCode]) {
      errorDetails = ERROR_MESSAGES[errorCode];
    }

    setState({
      status: 'error',
      progress: 0,
      message: errorDetails.message,
      error: errorDetails.suggestedAction,
      errorCode: errorDetails.code
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      progress: 0,
      message: ''
    });
  }, []);

  const isRetryable = useCallback(() => {
    if (state.status !== 'error' || !state.errorCode) {
      return false;
    }
    
    const errorDetails = ERROR_MESSAGES[state.errorCode];
    return errorDetails?.retryable ?? true;
  }, [state.status, state.errorCode]);

  return {
    state,
    setGeneratingWord,
    setConvertingPdf,
    setComplete,
    setError,
    reset,
    isRetryable
  };
}
