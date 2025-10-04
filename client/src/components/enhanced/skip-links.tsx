import React from 'react';
import { useSkipLinks } from '@/contexts/accessibility-context';
import { Button } from '@/components/ui/button';

export function SkipLinks() {
  const { skipToContent, skipToNavigation } = useSkipLinks();

  return (
    <div className="skip-links">
      <Button
        variant="outline"
        size="sm"
        className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-background border-2 border-primary"
        onClick={skipToContent}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            skipToContent();
          }
        }}
      >
        Skip to main content
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-40 focus:z-50 bg-background border-2 border-primary"
        onClick={skipToNavigation}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            skipToNavigation();
          }
        }}
      >
        Skip to navigation
      </Button>
    </div>
  );
}