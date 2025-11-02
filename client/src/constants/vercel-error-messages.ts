/**
 * Enhanced Error Messages for Vercel Deployment Limitations
 * 
 * This module provides user-friendly error messages with actionable alternatives
 * specifically designed for Vercel serverless environment limitations. It helps
 * users understand why certain features (like PDF generation) are unavailable
 * and provides clear guidance on alternative workflows.
 * 
 * Key Features:
 * - Environment-aware error messages that explain serverless limitations
 * - User-friendly language that avoids technical jargon
 * - Actionable alternatives and suggestions for each error type
 * - Consistent messaging patterns across the application
 * - Specific handling for common Vercel deployment issues
 * 
 * Usage:
 * - Use getVercelErrorMessage() to automatically select appropriate messages
 * - Use formatErrorMessage() for simple UI display
 * - Use getDetailedErrorMessage() for comprehensive error information
 */

export interface ErrorMessage {
  title: string;
  message: string;
  suggestion: string;
  alternatives: readonly string[];
}

export const VERCEL_ERROR_MESSAGES = {
  /**
   * PDF preview generation is not available on Vercel due to serverless limitations
   */
  PDF_PREVIEW_UNAVAILABLE: {
    title: "PDF Preview Not Available",
    message: "PDF preview is not available on this deployment due to serverless limitations.",
    suggestion: "Use the Download Word button above - it contains identical IEEE formatting!",
    alternatives: [
      "Download DOCX format with perfect IEEE formatting",
      "Use local development environment for PDF preview",
      "Download functionality works perfectly on all deployments"
    ]
  },

  /**
   * PDF generation failed due to missing Python dependencies on Vercel
   */
  PDF_GENERATION_FAILED: {
    title: "PDF Generation Unavailable",
    message: "PDF generation is not supported on this deployment due to system dependencies.",
    suggestion: "Perfect IEEE formatting is available via Word download - the DOCX file contains identical formatting to what you see locally!",
    alternatives: [
      "Download Word format (DOCX) with identical formatting",
      "Email functionality sends Word documents with perfect formatting",
      "All formatting standards are preserved in Word format"
    ]
  },

  /**
   * General serverless limitation message
   */
  SERVERLESS_LIMITATION: {
    title: "Feature Limited on Serverless",
    message: "This feature requires system dependencies not available in serverless environments.",
    suggestion: "Download functionality works perfectly and provides the same formatting.",
    alternatives: [
      "Download documents in Word format",
      "Use email delivery for document sharing",
      "Run locally for full preview capabilities"
    ]
  },

  /**
   * Python dependency missing (common on Vercel)
   */
  PYTHON_DEPENDENCY_MISSING: {
    title: "System Dependencies Unavailable",
    message: "PDF processing requires Python libraries not available on this deployment.",
    suggestion: "Word documents contain identical IEEE formatting and work on all platforms!",
    alternatives: [
      "Download Word format for perfect formatting",
      "Share documents via email in Word format",
      "Word format is compatible with all IEEE submission systems"
    ]
  },

  /**
   * Service temporarily unavailable (503 error)
   */
  SERVICE_UNAVAILABLE: {
    title: "Preview Service Unavailable",
    message: "PDF preview service is temporarily unavailable on this deployment.",
    suggestion: "Download Word format which contains perfect IEEE formatting!",
    alternatives: [
      "Download DOCX with identical formatting",
      "Use email delivery for document sharing",
      "Word format works with all academic platforms"
    ]
  },

  /**
   * Network or timeout issues
   */
  NETWORK_ERROR: {
    title: "Connection Issue",
    message: "Unable to connect to preview generation service.",
    suggestion: "Try downloading the document directly - downloads work reliably!",
    alternatives: [
      "Download Word format",
      "Retry preview generation",
      "Check your internet connection"
    ]
  },

  /**
   * Document validation errors
   */
  DOCUMENT_VALIDATION_ERROR: {
    title: "Document Incomplete",
    message: "Document is missing required information for preview generation.",
    suggestion: "Add a title and at least one author to generate preview.",
    alternatives: [
      "Complete the title field",
      "Add author information",
      "Fill in required document sections"
    ]
  }
} as const;

/**
 * Get appropriate error message based on error type and context
 * 
 * This function intelligently analyzes error messages and HTTP status codes
 * to provide the most appropriate user-friendly error message with actionable
 * alternatives. It's specifically designed to handle common Vercel deployment
 * limitations and serverless environment issues.
 * 
 * @param error - Error object or error message string
 * @param statusCode - Optional HTTP status code for additional context
 * @returns Appropriate ErrorMessage object with user-friendly content
 */
export function getVercelErrorMessage(error: Error | string, statusCode?: number): ErrorMessage {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  // Check for specific error patterns in order of specificity

  // 503 Service Unavailable - Common on Vercel for PDF generation
  if (statusCode === 503) {
    return VERCEL_ERROR_MESSAGES.SERVICE_UNAVAILABLE;
  }

  // Python/PDF library dependency issues - Very common on Vercel
  if (lowerMessage.includes('python') || lowerMessage.includes('docx2pdf')) {
    return VERCEL_ERROR_MESSAGES.PYTHON_DEPENDENCY_MISSING;
  }

  // General serverless environment limitations
  if (lowerMessage.includes('serverless') || lowerMessage.includes('deployment')) {
    return VERCEL_ERROR_MESSAGES.SERVERLESS_LIMITATION;
  }

  // PDF-specific availability issues
  if (lowerMessage.includes('pdf') && (lowerMessage.includes('not available') || lowerMessage.includes('unavailable'))) {
    return VERCEL_ERROR_MESSAGES.PDF_PREVIEW_UNAVAILABLE;
  }

  // Network connectivity and timeout issues
  if (lowerMessage.includes('network') || lowerMessage.includes('timeout') || lowerMessage.includes('connection')) {
    return VERCEL_ERROR_MESSAGES.NETWORK_ERROR;
  }

  // Document validation and required field issues
  if (lowerMessage.includes('title') || lowerMessage.includes('author') || lowerMessage.includes('required')) {
    return VERCEL_ERROR_MESSAGES.DOCUMENT_VALIDATION_ERROR;
  }

  // Default fallback for unknown errors - assumes PDF generation issue
  return VERCEL_ERROR_MESSAGES.PDF_GENERATION_FAILED;
}

/**
 * Format error message for display in UI
 * 
 * Combines the main error message with the suggestion to create a
 * concise, actionable message suitable for toast notifications or
 * simple error displays.
 * 
 * @param errorMsg - ErrorMessage object to format
 * @returns Formatted string combining message and suggestion
 */
export function formatErrorMessage(errorMsg: ErrorMessage): string {
  return `${errorMsg.message} ${errorMsg.suggestion}`;
}

/**
 * Get error message with alternatives for detailed error displays
 * 
 * Provides comprehensive error information including the formatted message
 * and all available alternatives. Useful for detailed error dialogs or
 * help sections where users need complete information about their options.
 * 
 * @param errorMsg - ErrorMessage object to process
 * @returns Object with formatted message and alternatives array
 */
export function getDetailedErrorMessage(errorMsg: ErrorMessage): {
  message: string;
  alternatives: string[];
} {
  return {
    message: formatErrorMessage(errorMsg),
    alternatives: errorMsg.alternatives
  };
}