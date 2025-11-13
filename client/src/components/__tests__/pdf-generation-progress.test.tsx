import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PDFGenerationProgress, PDFGenerationModal } from '../pdf-generation-progress';
import type { PDFGenerationState } from '@/hooks/use-pdf-generation';

describe('PDFGenerationProgress', () => {
  const mockOnRetry = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Idle State', () => {
    it('should not render when status is idle', () => {
      const state: PDFGenerationState = {
        status: 'idle',
        progress: 0,
        message: ''
      };

      const { container } = render(
        <PDFGenerationProgress state={state} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('should display generating_word state correctly', () => {
      const state: PDFGenerationState = {
        status: 'generating_word',
        progress: 25,
        message: 'Generating IEEE-formatted document...'
      };

      render(<PDFGenerationProgress state={state} />);

      expect(screen.getByText('Generating Document')).toBeInTheDocument();
      expect(screen.getByText('Generating IEEE-formatted document...')).toBeInTheDocument();
      expect(screen.getByText('25% complete')).toBeInTheDocument();
      expect(screen.getByText('Creating Word document')).toBeInTheDocument();
    });

    it('should display converting_pdf state correctly', () => {
      const state: PDFGenerationState = {
        status: 'converting_pdf',
        progress: 75,
        message: 'Converting to PDF format...'
      };

      render(<PDFGenerationProgress state={state} />);

      expect(screen.getAllByText('Converting to PDF').length).toBeGreaterThan(0);
      expect(screen.getByText('Converting to PDF format...')).toBeInTheDocument();
      expect(screen.getByText('75% complete')).toBeInTheDocument();
    });

    it('should show cancel button when onCancel is provided', () => {
      const state: PDFGenerationState = {
        status: 'generating_word',
        progress: 25,
        message: 'Generating...'
      };

      render(
        <PDFGenerationProgress 
          state={state} 
          onCancel={mockOnCancel} 
        />
      );

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeInTheDocument();

      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should not show cancel button when onCancel is not provided', () => {
      const state: PDFGenerationState = {
        status: 'generating_word',
        progress: 25,
        message: 'Generating...'
      };

      render(<PDFGenerationProgress state={state} />);

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  describe('Complete State', () => {
    it('should display success message when complete', () => {
      const state: PDFGenerationState = {
        status: 'complete',
        progress: 100,
        message: 'PDF generated successfully!'
      };

      render(<PDFGenerationProgress state={state} />);

      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('PDF generated successfully!')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      const state: PDFGenerationState = {
        status: 'error',
        progress: 0,
        message: 'PDF service is temporarily unavailable',
        error: 'Please try again in a few minutes.'
      };

      render(<PDFGenerationProgress state={state} />);

      expect(screen.getByText('PDF Generation Failed')).toBeInTheDocument();
      expect(screen.getByText('PDF service is temporarily unavailable')).toBeInTheDocument();
      expect(screen.getByText('Please try again in a few minutes.')).toBeInTheDocument();
    });

    it('should show retry button when onRetry is provided', () => {
      const state: PDFGenerationState = {
        status: 'error',
        progress: 0,
        message: 'Error occurred',
        error: 'Please try again'
      };

      render(
        <PDFGenerationProgress 
          state={state} 
          onRetry={mockOnRetry} 
        />
      );

      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should show cancel button in error state when provided', () => {
      const state: PDFGenerationState = {
        status: 'error',
        progress: 0,
        message: 'Error occurred'
      };

      render(
        <PDFGenerationProgress 
          state={state} 
          onCancel={mockOnCancel} 
        />
      );

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeInTheDocument();

      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should display error without suggested action', () => {
      const state: PDFGenerationState = {
        status: 'error',
        progress: 0,
        message: 'An error occurred'
      };

      render(<PDFGenerationProgress state={state} />);

      expect(screen.getByText('PDF Generation Failed')).toBeInTheDocument();
      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });
  });
});

describe('PDFGenerationModal', () => {
  const mockOnRetry = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Idle and Complete States', () => {
    it('should not render when status is idle', () => {
      const state: PDFGenerationState = {
        status: 'idle',
        progress: 0,
        message: ''
      };

      const { container } = render(
        <PDFGenerationModal state={state} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when status is complete', () => {
      const state: PDFGenerationState = {
        status: 'complete',
        progress: 100,
        message: 'Success'
      };

      const { container } = render(
        <PDFGenerationModal state={state} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('should display generating_word modal correctly', () => {
      const state: PDFGenerationState = {
        status: 'generating_word',
        progress: 25,
        message: 'Generating IEEE-formatted document...'
      };

      render(<PDFGenerationModal state={state} />);

      expect(screen.getByText('Generating Document')).toBeInTheDocument();
      expect(screen.getByText('Generating IEEE-formatted document...')).toBeInTheDocument();
      expect(screen.getByText('25% complete')).toBeInTheDocument();
      expect(screen.getByText(/Creating your IEEE-formatted Word document/)).toBeInTheDocument();
    });

    it('should display converting_pdf modal correctly', () => {
      const state: PDFGenerationState = {
        status: 'converting_pdf',
        progress: 75,
        message: 'Converting to PDF format...'
      };

      render(<PDFGenerationModal state={state} />);

      expect(screen.getByText('Converting to PDF')).toBeInTheDocument();
      expect(screen.getByText('Converting to PDF format...')).toBeInTheDocument();
      expect(screen.getByText('75% complete')).toBeInTheDocument();
      expect(screen.getByText(/Converting your document to PDF format/)).toBeInTheDocument();
    });

    it('should show close button in loading state when provided', () => {
      const state: PDFGenerationState = {
        status: 'generating_word',
        progress: 25,
        message: 'Generating...'
      };

      render(
        <PDFGenerationModal 
          state={state} 
          onClose={mockOnClose} 
        />
      );

      const closeButton = screen.getByText('Cancel');
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error State', () => {
    it('should display error modal with retry and close buttons', () => {
      const state: PDFGenerationState = {
        status: 'error',
        progress: 0,
        message: 'PDF service is temporarily unavailable',
        error: 'Please try again in a few minutes.'
      };

      render(
        <PDFGenerationModal 
          state={state} 
          onRetry={mockOnRetry}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('PDF Generation Failed')).toBeInTheDocument();
      expect(screen.getByText('PDF service is temporarily unavailable')).toBeInTheDocument();
      expect(screen.getByText('Please try again in a few minutes.')).toBeInTheDocument();

      const retryButton = screen.getByText('Try Again');
      const closeButton = screen.getByText('Close');

      expect(retryButton).toBeInTheDocument();
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);

      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should display error modal without suggested action', () => {
      const state: PDFGenerationState = {
        status: 'error',
        progress: 0,
        message: 'An error occurred'
      };

      render(<PDFGenerationModal state={state} />);

      expect(screen.getByText('PDF Generation Failed')).toBeInTheDocument();
      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });
  });

  describe('Modal Overlay', () => {
    it('should render modal with overlay for loading states', () => {
      const state: PDFGenerationState = {
        status: 'generating_word',
        progress: 25,
        message: 'Generating...'
      };

      const { container } = render(<PDFGenerationModal state={state} />);

      const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');
      expect(overlay).toBeInTheDocument();
    });

    it('should render modal with overlay for error state', () => {
      const state: PDFGenerationState = {
        status: 'error',
        progress: 0,
        message: 'Error'
      };

      const { container } = render(<PDFGenerationModal state={state} />);

      const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');
      expect(overlay).toBeInTheDocument();
    });
  });
});
