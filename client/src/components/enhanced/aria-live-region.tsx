import React, { useEffect, useRef } from 'react';

interface AriaLiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
}

export function AriaLiveRegion({ 
  message, 
  priority = 'polite', 
  clearAfter = 5000 
}: AriaLiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && regionRef.current) {
      regionRef.current.textContent = message;
      
      if (clearAfter > 0) {
        const timer = setTimeout(() => {
          if (regionRef.current) {
            regionRef.current.textContent = '';
          }
        }, clearAfter);
        
        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      ref={regionRef}
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      role="status"
    />
  );
}

// Status announcer component
export function StatusAnnouncer({ 
  children, 
  announceOnChange = true 
}: { 
  children: React.ReactNode;
  announceOnChange?: boolean;
}) {
  const previousContent = useRef<string>('');

  useEffect(() => {
    if (announceOnChange && typeof children === 'string') {
      const currentContent = children;
      if (currentContent !== previousContent.current && currentContent.trim()) {
        previousContent.current = currentContent;
      }
    }
  }, [children, announceOnChange]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {children}
    </div>
  );
}

// Progress announcer for loading states
export function ProgressAnnouncer({ 
  progress, 
  label, 
  announceInterval = 25 
}: { 
  progress: number;
  label: string;
  announceInterval?: number;
}) {
  const lastAnnouncedProgress = useRef<number>(-1);

  useEffect(() => {
    const roundedProgress = Math.round(progress / announceInterval) * announceInterval;
    
    if (roundedProgress !== lastAnnouncedProgress.current && roundedProgress >= 0 && roundedProgress <= 100) {
      lastAnnouncedProgress.current = roundedProgress;
    }
  }, [progress, announceInterval]);

  return (
    <div
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="sr-only"
    >
      {label}: {Math.round(progress)}% complete
    </div>
  );
}