import React from 'react';
import { AlertCircle, CheckCircle, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { PDFGenerationState } from '@/hooks/use-pdf-generation';

interface PDFGenerationProgressProps {
  state: PDFGenerationState;
  onRetry?: () => void;
  onCancel?: () => void;
}

export function PDFGenerationProgress({ 
  state, 
  onRetry, 
  onCancel 
}: PDFGenerationProgressProps) {
  const { status, progress, message, error } = state;

  // Don't render anything if idle
  if (status === 'idle') {
    return null;
  }

  // Success state
  if (status === 'complete') {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">Success</AlertTitle>
        <AlertDescription className="text-green-700">
          {message}
        </AlertDescription>
      </Alert>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>PDF Generation Failed</AlertTitle>
        <AlertDescription className="space-y-3">
          <p className="font-medium">{message}</p>
          {error && (
            <p className="text-sm">{error}</p>
          )}
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {onCancel && (
              <Button
                onClick={onCancel}
                size="sm"
                variant="ghost"
                className="text-red-700 hover:bg-red-100"
              >
                Cancel
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Loading states (generating_word or converting_pdf)
  return (
    <Alert className="border-purple-200 bg-purple-50">
      <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
      <AlertTitle className="text-purple-900">
        {status === 'generating_word' ? 'Generating Document' : 'Converting to PDF'}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-purple-700">{message}</p>
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-purple-600">
            <span>{progress}% complete</span>
            {status === 'generating_word' && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Creating Word document
              </span>
            )}
            {status === 'converting_pdf' && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Converting to PDF
              </span>
            )}
          </div>
        </div>
        {onCancel && (
          <Button
            onClick={onCancel}
            size="sm"
            variant="ghost"
            className="text-purple-700 hover:bg-purple-100 mt-2"
          >
            Cancel
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface PDFGenerationModalProps {
  state: PDFGenerationState;
  onRetry?: () => void;
  onClose?: () => void;
}

export function PDFGenerationModal({ 
  state, 
  onRetry, 
  onClose 
}: PDFGenerationModalProps) {
  const { status, progress, message, error } = state;

  // Don't render modal if idle
  if (status === 'idle') {
    return null;
  }

  // Don't render modal if complete (let the component handle success feedback)
  if (status === 'complete') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Error state */}
        {status === 'error' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">PDF Generation Failed</h3>
                <p className="text-sm text-gray-600">{message}</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              )}
            </div>
          </>
        )}

        {/* Loading states */}
        {(status === 'generating_word' || status === 'converting_pdf') && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {status === 'generating_word' ? 'Generating Document' : 'Converting to PDF'}
                </h3>
                <p className="text-sm text-gray-600">{message}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{progress}% complete</span>
                <span>Please wait...</span>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-purple-600 mt-0.5" />
                <div className="text-sm text-purple-800">
                  {status === 'generating_word' && (
                    <p>Creating your IEEE-formatted Word document with all sections, figures, and references...</p>
                  )}
                  {status === 'converting_pdf' && (
                    <p>Converting your document to PDF format while preserving all formatting and layout...</p>
                  )}
                </div>
              </div>
            </div>

            {onClose && (
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
