/**
 * Tests for Vercel error messages
 * Verifies error message improvements and user-friendly messaging
 */

import {
  VERCEL_ERROR_MESSAGES,
  getVercelErrorMessage,
  formatErrorMessage,
  getDetailedErrorMessage,
  type ErrorMessage
} from '../vercel-error-messages';

describe('Vercel Error Messages', () => {
  describe('Error Message Constants', () => {
    it('should have all required error message types', () => {
      expect(VERCEL_ERROR_MESSAGES.PDF_PREVIEW_UNAVAILABLE).toBeDefined();
      expect(VERCEL_ERROR_MESSAGES.PDF_GENERATION_FAILED).toBeDefined();
      expect(VERCEL_ERROR_MESSAGES.SERVERLESS_LIMITATION).toBeDefined();
      expect(VERCEL_ERROR_MESSAGES.PYTHON_DEPENDENCY_MISSING).toBeDefined();
      expect(VERCEL_ERROR_MESSAGES.SERVICE_UNAVAILABLE).toBeDefined();
      expect(VERCEL_ERROR_MESSAGES.NETWORK_ERROR).toBeDefined();
      expect(VERCEL_ERROR_MESSAGES.DOCUMENT_VALIDATION_ERROR).toBeDefined();
    });

    it('should have consistent error message structure', () => {
      Object.values(VERCEL_ERROR_MESSAGES).forEach((errorMsg) => {
        expect(errorMsg).toHaveProperty('title');
        expect(errorMsg).toHaveProperty('message');
        expect(errorMsg).toHaveProperty('suggestion');
        expect(errorMsg).toHaveProperty('alternatives');
        
        expect(typeof errorMsg.title).toBe('string');
        expect(typeof errorMsg.message).toBe('string');
        expect(typeof errorMsg.suggestion).toBe('string');
        expect(Array.isArray(errorMsg.alternatives)).toBe(true);
        expect(errorMsg.alternatives.length).toBeGreaterThan(0);
      });
    });

    it('should provide user-friendly titles', () => {
      expect(VERCEL_ERROR_MESSAGES.PDF_PREVIEW_UNAVAILABLE.title).toBe('PDF Preview Not Available');
      expect(VERCEL_ERROR_MESSAGES.SERVICE_UNAVAILABLE.title).toBe('Preview Service Unavailable');
      expect(VERCEL_ERROR_MESSAGES.NETWORK_ERROR.title).toBe('Connection Issue');
    });

    it('should provide actionable suggestions', () => {
      const pdfError = VERCEL_ERROR_MESSAGES.PDF_PREVIEW_UNAVAILABLE;
      expect(pdfError.suggestion).toContain('Download Word');
      expect(pdfError.suggestion).toContain('identical IEEE formatting');
      
      const serviceError = VERCEL_ERROR_MESSAGES.SERVICE_UNAVAILABLE;
      expect(serviceError.suggestion).toContain('Download Word');
      expect(serviceError.suggestion).toContain('perfect IEEE formatting');
    });

    it('should provide multiple alternatives', () => {
      Object.values(VERCEL_ERROR_MESSAGES).forEach((errorMsg) => {
        expect(errorMsg.alternatives.length).toBeGreaterThanOrEqual(2);
        errorMsg.alternatives.forEach((alt) => {
          expect(typeof alt).toBe('string');
          expect(alt.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Error Message Selection', () => {
    it('should return SERVICE_UNAVAILABLE for 503 status code', () => {
      const error = getVercelErrorMessage('Some error', 503);
      expect(error).toEqual(VERCEL_ERROR_MESSAGES.SERVICE_UNAVAILABLE);
    });

    it('should return PYTHON_DEPENDENCY_MISSING for Python-related errors', () => {
      const pythonError = getVercelErrorMessage('Python module not found');
      expect(pythonError).toEqual(VERCEL_ERROR_MESSAGES.PYTHON_DEPENDENCY_MISSING);
      
      const docx2pdfError = getVercelErrorMessage('docx2pdf command failed');
      expect(docx2pdfError).toEqual(VERCEL_ERROR_MESSAGES.PYTHON_DEPENDENCY_MISSING);
    });

    it('should return SERVERLESS_LIMITATION for serverless-related errors', () => {
      const serverlessError = getVercelErrorMessage('Serverless function timeout');
      expect(serverlessError).toEqual(VERCEL_ERROR_MESSAGES.SERVERLESS_LIMITATION);
      
      const deploymentError = getVercelErrorMessage('Deployment limitation encountered');
      expect(deploymentError).toEqual(VERCEL_ERROR_MESSAGES.SERVERLESS_LIMITATION);
    });

    it('should return PDF_PREVIEW_UNAVAILABLE for PDF unavailable errors', () => {
      const pdfError = getVercelErrorMessage('PDF not available');
      expect(pdfError).toEqual(VERCEL_ERROR_MESSAGES.PDF_PREVIEW_UNAVAILABLE);
      
      const unavailableError = getVercelErrorMessage('PDF preview unavailable');
      expect(unavailableError).toEqual(VERCEL_ERROR_MESSAGES.PDF_PREVIEW_UNAVAILABLE);
    });

    it('should return NETWORK_ERROR for network-related errors', () => {
      const networkError = getVercelErrorMessage('Network timeout');
      expect(networkError).toEqual(VERCEL_ERROR_MESSAGES.NETWORK_ERROR);
      
      const connectionError = getVercelErrorMessage('Connection failed');
      expect(connectionError).toEqual(VERCEL_ERROR_MESSAGES.NETWORK_ERROR);
    });

    it('should return DOCUMENT_VALIDATION_ERROR for validation errors', () => {
      const titleError = getVercelErrorMessage('Title is required');
      expect(titleError).toEqual(VERCEL_ERROR_MESSAGES.DOCUMENT_VALIDATION_ERROR);
      
      const authorError = getVercelErrorMessage('Author information missing');
      expect(authorError).toEqual(VERCEL_ERROR_MESSAGES.DOCUMENT_VALIDATION_ERROR);
    });

    it('should handle Error objects', () => {
      const error = new Error('Python module not found');
      const result = getVercelErrorMessage(error);
      expect(result).toEqual(VERCEL_ERROR_MESSAGES.PYTHON_DEPENDENCY_MISSING);
    });

    it('should default to PDF_GENERATION_FAILED for unknown errors', () => {
      const unknownError = getVercelErrorMessage('Some random error');
      expect(unknownError).toEqual(VERCEL_ERROR_MESSAGES.PDF_GENERATION_FAILED);
    });

    it('should be case insensitive', () => {
      const upperCaseError = getVercelErrorMessage('PYTHON MODULE NOT FOUND');
      expect(upperCaseError).toEqual(VERCEL_ERROR_MESSAGES.PYTHON_DEPENDENCY_MISSING);
      
      const mixedCaseError = getVercelErrorMessage('Network TIMEOUT occurred');
      expect(mixedCaseError).toEqual(VERCEL_ERROR_MESSAGES.NETWORK_ERROR);
    });
  });

  describe('Error Message Formatting', () => {
    it('should format error messages correctly', () => {
      const errorMsg = VERCEL_ERROR_MESSAGES.PDF_PREVIEW_UNAVAILABLE;
      const formatted = formatErrorMessage(errorMsg);
      
      expect(formatted).toBe(`${errorMsg.message} ${errorMsg.suggestion}`);
      expect(formatted).toContain('PDF preview is not available');
      expect(formatted).toContain('Download Word button');
    });

    it('should handle empty messages gracefully', () => {
      const emptyError: ErrorMessage = {
        title: '',
        message: '',
        suggestion: '',
        alternatives: []
      };
      
      const formatted = formatErrorMessage(emptyError);
      expect(formatted).toBe(' ');
    });
  });

  describe('Detailed Error Messages', () => {
    it('should return detailed error information', () => {
      const errorMsg = VERCEL_ERROR_MESSAGES.SERVICE_UNAVAILABLE;
      const detailed = getDetailedErrorMessage(errorMsg);
      
      expect(detailed).toHaveProperty('message');
      expect(detailed).toHaveProperty('alternatives');
      expect(detailed.message).toBe(formatErrorMessage(errorMsg));
      expect(detailed.alternatives).toEqual(errorMsg.alternatives);
    });

    it('should preserve alternatives array', () => {
      const errorMsg = VERCEL_ERROR_MESSAGES.PYTHON_DEPENDENCY_MISSING;
      const detailed = getDetailedErrorMessage(errorMsg);
      
      expect(Array.isArray(detailed.alternatives)).toBe(true);
      expect(detailed.alternatives.length).toBe(errorMsg.alternatives.length);
      expect(detailed.alternatives).toEqual(errorMsg.alternatives);
    });
  });

  describe('Error Message Content Quality', () => {
    it('should avoid technical jargon in user-facing messages', () => {
      Object.values(VERCEL_ERROR_MESSAGES).forEach((errorMsg) => {
        // Check that messages are user-friendly
        expect(errorMsg.message).not.toContain('HTTP 500');
        expect(errorMsg.message).not.toContain('stack trace');
        expect(errorMsg.message).not.toContain('undefined');
        expect(errorMsg.suggestion).not.toContain('debug');
      });
    });

    it('should emphasize positive alternatives', () => {
      Object.values(VERCEL_ERROR_MESSAGES).forEach((errorMsg) => {
        // Check that suggestions are positive and actionable
        const suggestion = errorMsg.suggestion.toLowerCase();
        expect(
          suggestion.includes('download') || 
          suggestion.includes('try') || 
          suggestion.includes('use')
        ).toBe(true);
      });
    });

    it('should mention IEEE formatting consistency', () => {
      const pdfErrors = [
        VERCEL_ERROR_MESSAGES.PDF_PREVIEW_UNAVAILABLE,
        VERCEL_ERROR_MESSAGES.PDF_GENERATION_FAILED,
        VERCEL_ERROR_MESSAGES.PYTHON_DEPENDENCY_MISSING,
        VERCEL_ERROR_MESSAGES.SERVICE_UNAVAILABLE
      ];
      
      pdfErrors.forEach((errorMsg) => {
        const fullMessage = `${errorMsg.message} ${errorMsg.suggestion}`;
        expect(
          fullMessage.toLowerCase().includes('ieee') ||
          fullMessage.toLowerCase().includes('identical') ||
          fullMessage.toLowerCase().includes('perfect')
        ).toBe(true);
      });
    });

    it('should provide specific alternatives for each error type', () => {
      // PDF-related errors should mention Word download
      const pdfError = VERCEL_ERROR_MESSAGES.PDF_PREVIEW_UNAVAILABLE;
      expect(pdfError.alternatives.some(alt => alt.toLowerCase().includes('word'))).toBe(true);
      expect(pdfError.alternatives.some(alt => alt.toLowerCase().includes('docx'))).toBe(true);
      
      // Network errors should mention retry options
      const networkError = VERCEL_ERROR_MESSAGES.NETWORK_ERROR;
      expect(networkError.alternatives.some(alt => alt.toLowerCase().includes('retry'))).toBe(true);
      
      // Validation errors should mention required fields
      const validationError = VERCEL_ERROR_MESSAGES.DOCUMENT_VALIDATION_ERROR;
      expect(validationError.alternatives.some(alt => alt.toLowerCase().includes('title'))).toBe(true);
      expect(validationError.alternatives.some(alt => alt.toLowerCase().includes('author'))).toBe(true);
    });
  });

  describe('Consistency Across Error Types', () => {
    it('should maintain consistent tone across all error messages', () => {
      Object.values(VERCEL_ERROR_MESSAGES).forEach((errorMsg) => {
        // Check for consistent helpful tone
        expect(errorMsg.title.length).toBeGreaterThan(0);
        expect(errorMsg.message.length).toBeGreaterThan(10);
        expect(errorMsg.suggestion.length).toBeGreaterThan(10);
        
        // Should not be overly technical or alarming
        expect(errorMsg.message).not.toContain('FATAL');
        expect(errorMsg.message).not.toContain('CRITICAL');
        expect(errorMsg.message).not.toContain('ERROR:');
      });
    });

    it('should provide at least 2 alternatives for each error', () => {
      Object.values(VERCEL_ERROR_MESSAGES).forEach((errorMsg) => {
        expect(errorMsg.alternatives.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should have reasonable message lengths', () => {
      Object.values(VERCEL_ERROR_MESSAGES).forEach((errorMsg) => {
        // Messages should be informative but not too long
        expect(errorMsg.message.length).toBeLessThan(200);
        expect(errorMsg.suggestion.length).toBeLessThan(200);
        
        errorMsg.alternatives.forEach((alt) => {
          expect(alt.length).toBeLessThan(100);
        });
      });
    });
  });
});