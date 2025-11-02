/**
 * Tests for DocumentStructurePreview component
 * Verifies fallback preview functionality and document structure rendering
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentStructurePreview from '../DocumentStructurePreview';
import type { Document } from '@shared/schema';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    React.createElement('div', { 'data-testid': 'card', className }, children),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    React.createElement('div', { 'data-testid': 'card-content', className }, children),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  FileText: () => React.createElement('div', { 'data-testid': 'file-text-icon' }),
  Users: () => React.createElement('div', { 'data-testid': 'users-icon' }),
  Hash: () => React.createElement('div', { 'data-testid': 'hash-icon' }),
  BookOpen: () => React.createElement('div', { 'data-testid': 'book-open-icon' }),
  Image: () => React.createElement('div', { 'data-testid': 'image-icon' }),
  Table: () => React.createElement('div', { 'data-testid': 'table-icon' }),
  Calculator: () => React.createElement('div', { 'data-testid': 'calculator-icon' }),
}));

describe('DocumentStructurePreview', () => {
  const createMockDocument = (overrides: Partial<Document> = {}): Document => ({
    id: 'test-doc-1',
    title: 'Test IEEE Paper',
    authors: [
      { id: 'author-1', name: 'John Doe', email: 'john@example.com', customFields: [] },
      { id: 'author-2', name: 'Jane Smith', email: 'jane@example.com', customFields: [] }
    ],
    abstract: 'This is a test abstract for the IEEE paper. It contains multiple sentences to test paragraph rendering.',
    keywords: 'machine learning, artificial intelligence, neural networks',
    sections: [
      {
        id: 'section-1',
        title: 'Introduction',
        contentBlocks: [],
        subsections: [
          {
            id: 'subsection-1',
            title: 'Background',
            content: '',
            order: 1
          }
        ],
        order: 1
      },
      {
        id: 'section-2',
        title: 'Methodology',
        contentBlocks: [],
        subsections: [],
        order: 2
      }
    ],
    references: [
      { id: 'ref-1', text: 'Smith, J. (2023). Machine Learning Fundamentals. Journal of AI, 15(3), 123-145.', order: 1 },
      { id: 'ref-2', text: 'Doe, J. & Brown, A. (2022). Neural Network Applications. IEEE Transactions on Computing, 45(2), 67-89.', order: 2 }
    ],
    figures: [],
    settings: {
      fontSize: '9.5pt',
      columns: 'double',
      exportFormat: 'docx',
      includePageNumbers: true,
      includeCopyright: true
    },
    ...overrides
  });

  describe('Basic Rendering', () => {
    it('should render the component with basic document info', () => {
      const document = createMockDocument();
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('Document Structure Preview')).toBeInTheDocument();
      expect(screen.getByText('Test IEEE Paper')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const document = createMockDocument();
      render(<DocumentStructurePreview document={document} className="custom-class" />);
      
      const container = screen.getByText('Document Structure Preview').closest('div');
      expect(container).toHaveClass('custom-class');
    });

    it('should show fallback message about PDF unavailability', () => {
      const document = createMockDocument();
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText(/PDF preview is not available on this deployment/)).toBeInTheDocument();
    });
  });

  describe('Title and Authors Rendering', () => {
    it('should render document title', () => {
      const document = createMockDocument({ title: 'Advanced AI Research Paper' });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('Advanced AI Research Paper')).toBeInTheDocument();
    });

    it('should handle missing title gracefully', () => {
      const document = createMockDocument({ title: '' });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    });

    it('should render multiple authors', () => {
      const document = createMockDocument({
        authors: [
          { id: 'author-1', name: 'Alice Johnson', email: 'alice@example.com', customFields: [] },
          { id: 'author-2', name: 'Bob Wilson', email: 'bob@example.com', customFields: [] },
          { id: 'author-3', name: 'Carol Davis', email: 'carol@example.com', customFields: [] }
        ]
      });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      expect(screen.getByText('Carol Davis')).toBeInTheDocument();
    });

    it('should handle authors without names', () => {
      const document = createMockDocument({
        authors: [
          { id: 'author-1', name: 'Valid Author', email: 'valid@example.com', customFields: [] },
          { id: 'author-2', name: '', email: 'empty@example.com', customFields: [] },
          { id: 'author-3', name: 'Another Valid', email: 'another@example.com', customFields: [] }
        ]
      });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('Valid Author')).toBeInTheDocument();
      expect(screen.getByText('Another Valid')).toBeInTheDocument();
      expect(screen.queryByText('empty@example.com')).not.toBeInTheDocument();
    });

    it('should handle missing authors array', () => {
      const document = createMockDocument({ authors: [] });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.queryByTestId('users-icon')).not.toBeInTheDocument();
    });
  });

  describe('Abstract Rendering', () => {
    it('should render abstract section', () => {
      const document = createMockDocument({
        abstract: 'This is a comprehensive abstract that describes the research methodology and findings.'
      });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('Abstract')).toBeInTheDocument();
      expect(screen.getByText(/comprehensive abstract that describes/)).toBeInTheDocument();
    });

    it('should handle multi-paragraph abstracts', () => {
      const document = createMockDocument({
        abstract: 'First paragraph of the abstract.\n\nSecond paragraph with more details.\n\nThird paragraph with conclusions.'
      });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('First paragraph of the abstract.')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph with more details.')).toBeInTheDocument();
      expect(screen.getByText('Third paragraph with conclusions.')).toBeInTheDocument();
    });

    it('should handle missing abstract', () => {
      const document = createMockDocument({ abstract: '' });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.queryByText('Abstract')).not.toBeInTheDocument();
    });
  });

  describe('Keywords Rendering', () => {
    it('should render keywords as tags', () => {
      const document = createMockDocument({
        keywords: 'machine learning, artificial intelligence, neural networks, deep learning'
      });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('Keywords')).toBeInTheDocument();
      expect(screen.getByText('machine learning')).toBeInTheDocument();
      expect(screen.getByText('artificial intelligence')).toBeInTheDocument();
      expect(screen.getByText('neural networks')).toBeInTheDocument();
      expect(screen.getByText('deep learning')).toBeInTheDocument();
    });

    it('should handle keywords with extra whitespace', () => {
      const document = createMockDocument({
        keywords: ' keyword1 ,  keyword2  , keyword3 '
      });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('keyword1')).toBeInTheDocument();
      expect(screen.getByText('keyword2')).toBeInTheDocument();
      expect(screen.getByText('keyword3')).toBeInTheDocument();
    });

    it('should handle missing keywords', () => {
      const document = createMockDocument({ keywords: '' });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.queryByText('Keywords')).not.toBeInTheDocument();
    });
  });

  describe('Sections Rendering', () => {
    it('should render document sections', () => {
      const document = createMockDocument({
        sections: [
          { id: 'section-1', title: 'Introduction', contentBlocks: [], subsections: [], order: 1 },
          { id: 'section-2', title: 'Literature Review', contentBlocks: [], subsections: [], order: 2 },
          { id: 'section-3', title: 'Methodology', contentBlocks: [], subsections: [], order: 3 }
        ]
      });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('Document Sections')).toBeInTheDocument();
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Literature Review')).toBeInTheDocument();
      expect(screen.getByText('Methodology')).toBeInTheDocument();
    });

    it('should render subsections with proper indentation', () => {
      const document = createMockDocument({
        sections: [
          {
            id: 'section-1',
            title: 'Introduction',
            contentBlocks: [],
            subsections: [
              { id: 'subsection-1', title: 'Background', content: '', order: 1 },
              { id: 'subsection-2', title: 'Motivation', content: '', order: 2 }
            ],
            order: 1
          }
        ]
      });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Background')).toBeInTheDocument();
      expect(screen.getByText('Motivation')).toBeInTheDocument();
    });

    it('should handle sections without titles', () => {
      const document = createMockDocument({
        sections: [
          { id: 'section-1', title: '', contentBlocks: [], subsections: [], order: 1 },
          { id: 'section-2', title: 'Valid Section', contentBlocks: [], subsections: [], order: 2 }
        ]
      });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('Valid Section')).toBeInTheDocument();
    });

    it('should handle empty sections array', () => {
      const document = createMockDocument({ sections: [] });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.queryByText('Document Sections')).not.toBeInTheDocument();
    });
  });

  describe('References Rendering', () => {
    it('should render references with numbering', () => {
      const document = createMockDocument({
        references: [
          { id: 'ref-1', text: 'Smith, J. (2023). First Reference. Journal A, 1(1), 1-10.', order: 1 },
          { id: 'ref-2', text: 'Doe, J. (2022). Second Reference. Conference B, pp. 20-30.', order: 2 },
          { id: 'ref-3', text: 'Brown, A. (2021). Third Reference. Book Publisher.', order: 3 }
        ]
      });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('References')).toBeInTheDocument();
      expect(screen.getByText(/\[1\].*Smith, J.*First Reference/)).toBeInTheDocument();
      expect(screen.getByText(/\[2\].*Doe, J.*Second Reference/)).toBeInTheDocument();
      expect(screen.getByText(/\[3\].*Brown, A.*Third Reference/)).toBeInTheDocument();
    });

    it('should handle empty references array', () => {
      const document = createMockDocument({ references: [] });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.queryByText('References')).not.toBeInTheDocument();
    });
  });

  describe('Document Summary', () => {
    it('should display document statistics', () => {
      const document = createMockDocument({
        sections: [
          { id: 'section-1', title: 'Section 1', contentBlocks: [], subsections: [], order: 1 },
          { id: 'section-2', title: 'Section 2', contentBlocks: [], subsections: [], order: 2 }
        ],
        references: [
          { id: 'ref-1', text: 'Ref 1', order: 1 },
          { id: 'ref-2', text: 'Ref 2', order: 2 },
          { id: 'ref-3', text: 'Ref 3', order: 3 }
        ],
        authors: [
          { id: 'author-1', name: 'Author 1', email: 'a1@example.com', customFields: [] },
          { id: 'author-2', name: 'Author 2', email: 'a2@example.com', customFields: [] }
        ],
        keywords: 'keyword1, keyword2, keyword3, keyword4'
      });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('Document Summary')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Sections count
      expect(screen.getByText('3')).toBeInTheDocument(); // References count
      expect(screen.getByText('4')).toBeInTheDocument(); // Keywords count
    });

    it('should handle zero counts gracefully', () => {
      const document = createMockDocument({
        sections: [],
        references: [],
        authors: [],
        keywords: ''
      });
      render(<DocumentStructurePreview document={document} />);
      
      expect(screen.getByText('Document Summary')).toBeInTheDocument();
      // Should show 0 for all counts
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      const document = createMockDocument();
      render(<DocumentStructurePreview document={document} />);
      
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Test IEEE Paper');
      
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    it('should have appropriate ARIA labels and roles', () => {
      const document = createMockDocument();
      render(<DocumentStructurePreview document={document} />);
      
      // Check for semantic structure
      expect(screen.getByText('Document Structure Preview')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed document data gracefully', () => {
      const malformedDocument = {
        title: null,
        authors: null,
        abstract: null,
        keywords: null,
        sections: null,
        references: null
      } as any;
      
      expect(() => {
        render(<DocumentStructurePreview document={malformedDocument} />);
      }).not.toThrow();
    });

    it('should handle undefined document properties', () => {
      const partialDocument = {
        title: 'Test Title'
        // Missing other properties
      } as any;
      
      expect(() => {
        render(<DocumentStructurePreview document={partialDocument} />);
      }).not.toThrow();
      
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render large documents efficiently', () => {
      const largeDocument = createMockDocument({
        sections: Array.from({ length: 20 }, (_, i) => ({
          id: `section-${i + 1}`,
          title: `Section ${i + 1}`,
          contentBlocks: [],
          subsections: Array.from({ length: 5 }, (_, j) => ({
            id: `subsection-${i + 1}-${j + 1}`,
            title: `Subsection ${i + 1}.${j + 1}`,
            content: '',
            order: j + 1
          })),
          order: i + 1
        })),
        references: Array.from({ length: 50 }, (_, i) => ({
          id: `ref-${i + 1}`,
          text: `Reference ${i + 1}. Journal, 1(1), 1-10.`,
          order: i + 1
        })),
        keywords: Array.from({ length: 20 }, (_, i) => `keyword${i + 1}`).join(', ')
      });
      
      const startTime = performance.now();
      render(<DocumentStructurePreview document={largeDocument} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      
      expect(screen.getByText('Document Summary')).toBeInTheDocument();
    });
  });
});