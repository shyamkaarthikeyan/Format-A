import { renderHook, act } from '@testing-library/react';
import { usePDFGeneration } from '../use-pdf-generation';

describe('usePDFGeneration', () => {
  describe('Initial State', () => {
    it('should initialize with idle state', () => {
      const { result } = renderHook(() => usePDFGeneration());

      expect(result.current.state.status).toBe('idle');
      expect(result.current.state.progress).toBe(0);
      expect(result.current.state.message).toBe('');
      expect(result.current.state.error).toBeUndefined();
      expect(result.current.state.errorCode).toBeUndefined();
    });
  });

  describe('Loading State Progression', () => {
    it('should transition to generating_word state with correct progress', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setGeneratingWord();
      });

      expect(result.current.state.status).toBe('generating_word');
      expect(result.current.state.progress).toBe(25);
      expect(result.current.state.message).toBe('Generating IEEE-formatted document...');
    });

    it('should transition to converting_pdf state with correct progress', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setConvertingPdf();
      });

      expect(result.current.state.status).toBe('converting_pdf');
      expect(result.current.state.progress).toBe(75);
      expect(result.current.state.message).toBe('Converting to PDF format...');
    });

    it('should transition to complete state with 100% progress', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setComplete();
      });

      expect(result.current.state.status).toBe('complete');
      expect(result.current.state.progress).toBe(100);
      expect(result.current.state.message).toBe('PDF generated successfully!');
    });

    it('should progress through all states in correct order', () => {
      const { result } = renderHook(() => usePDFGeneration());

      // Start with generating word
      act(() => {
        result.current.setGeneratingWord();
      });
      expect(result.current.state.status).toBe('generating_word');
      expect(result.current.state.progress).toBe(25);

      // Move to converting PDF
      act(() => {
        result.current.setConvertingPdf();
      });
      expect(result.current.state.status).toBe('converting_pdf');
      expect(result.current.state.progress).toBe(75);

      // Complete
      act(() => {
        result.current.setComplete();
      });
      expect(result.current.state.status).toBe('complete');
      expect(result.current.state.progress).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle SERVICE_UNAVAILABLE error', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setError(new Error('Service temporarily unavailable'));
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.progress).toBe(0);
      expect(result.current.state.message).toBe('PDF service is temporarily unavailable');
      expect(result.current.state.error).toBe('Please try again in a few minutes. The service may be experiencing high load.');
      expect(result.current.state.errorCode).toBe('SERVICE_UNAVAILABLE');
      expect(result.current.isRetryable()).toBe(true);
    });

    it('should handle TIMEOUT error', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setError(new Error('Request timed out'));
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.message).toBe('PDF generation is taking longer than expected');
      expect(result.current.state.error).toBe('Your document may be large or complex. Please try again or simplify your document.');
      expect(result.current.state.errorCode).toBe('TIMEOUT');
      expect(result.current.isRetryable()).toBe(true);
    });

    it('should handle CONVERSION_FAILED error', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setError(new Error('PDF conversion failed'));
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.message).toBe('PDF conversion failed');
      expect(result.current.state.error).toBe('There was an issue converting your document. Please check your content and try again.');
      expect(result.current.state.errorCode).toBe('CONVERSION_FAILED');
      expect(result.current.isRetryable()).toBe(true);
    });

    it('should handle CONNECTION_ERROR', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setError(new Error('Cannot connect to server'));
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.message).toBe('Cannot connect to PDF service');
      expect(result.current.state.error).toBe('Please check your internet connection and try again.');
      expect(result.current.state.errorCode).toBe('CONNECTION_ERROR');
      expect(result.current.isRetryable()).toBe(true);
    });

    it('should handle INVALID_DOCUMENT error', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setError(new Error('Document must have a title'));
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.message).toBe('Invalid document data');
      expect(result.current.state.error).toBe('Please ensure your document has a title and at least one author.');
      expect(result.current.state.errorCode).toBe('INVALID_DOCUMENT');
      expect(result.current.isRetryable()).toBe(false);
    });

    it('should handle UNKNOWN error', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setError(new Error('Something went wrong'));
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.message).toBe('An unexpected error occurred');
      expect(result.current.state.error).toBe('Please try again. If the problem persists, contact support.');
      expect(result.current.state.errorCode).toBe('UNKNOWN');
      expect(result.current.isRetryable()).toBe(true);
    });

    it('should handle error with explicit error code', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setError(new Error('Custom error'), 'TIMEOUT');
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.errorCode).toBe('TIMEOUT');
      expect(result.current.isRetryable()).toBe(true);
    });

    it('should handle string error messages', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setError('Service temporarily unavailable');
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.message).toBe('PDF service is temporarily unavailable');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset state to idle', () => {
      const { result } = renderHook(() => usePDFGeneration());

      // Set to error state
      act(() => {
        result.current.setError(new Error('Test error'));
      });

      expect(result.current.state.status).toBe('error');

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.state.status).toBe('idle');
      expect(result.current.state.progress).toBe(0);
      expect(result.current.state.message).toBe('');
      expect(result.current.state.error).toBeUndefined();
      expect(result.current.state.errorCode).toBeUndefined();
    });

    it('should reset from complete state', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setComplete();
      });

      expect(result.current.state.status).toBe('complete');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.status).toBe('idle');
    });
  });

  describe('Retry Logic', () => {
    it('should return false for isRetryable when not in error state', () => {
      const { result } = renderHook(() => usePDFGeneration());

      expect(result.current.isRetryable()).toBe(false);

      act(() => {
        result.current.setGeneratingWord();
      });

      expect(result.current.isRetryable()).toBe(false);
    });

    it('should return true for retryable errors', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setError(new Error('Service temporarily unavailable'));
      });

      expect(result.current.isRetryable()).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const { result } = renderHook(() => usePDFGeneration());

      act(() => {
        result.current.setError(new Error('Document must have a title'));
      });

      expect(result.current.isRetryable()).toBe(false);
    });
  });
});
