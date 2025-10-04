import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

export interface UseKeyboardNavigationOptions {
  shortcuts?: KeyboardShortcut[];
  trapFocus?: boolean;
  autoFocus?: boolean;
  onEscape?: () => void;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const { shortcuts = [], trapFocus = false, autoFocus = false, onEscape } = options;
  const containerRef = useRef<HTMLElement>(null);
  const focusableElementsRef = useRef<HTMLElement[]>([]);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'details summary',
      'audio[controls]',
      'video[controls]'
    ].join(', ');

    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    return elements.filter(element => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Handle escape key
    if (event.key === 'Escape' && onEscape) {
      onEscape();
      return;
    }

    // Handle keyboard shortcuts
    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrlKey === undefined || shortcut.ctrlKey === event.ctrlKey;
      const altMatch = shortcut.altKey === undefined || shortcut.altKey === event.altKey;
      const shiftMatch = shortcut.shiftKey === undefined || shortcut.shiftKey === event.shiftKey;
      const metaMatch = shortcut.metaKey === undefined || shortcut.metaKey === event.metaKey;
      
      if (
        event.key === shortcut.key &&
        ctrlMatch &&
        altMatch &&
        shiftMatch &&
        metaMatch
      ) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }

    // Handle focus trapping
    if (trapFocus && (event.key === 'Tab' || event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      const focusableElements = getFocusableElements();
      focusableElementsRef.current = focusableElements;
      
      if (focusableElements.length === 0) return;

      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      
      if (event.key === 'Tab') {
        event.preventDefault();
        let nextIndex;
        
        if (event.shiftKey) {
          nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
        }
        
        focusableElements[nextIndex]?.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
        focusableElements[nextIndex]?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
        focusableElements[nextIndex]?.focus();
      }
    }
  }, [shortcuts, trapFocus, onEscape, getFocusableElements]);

  // Auto focus first element
  useEffect(() => {
    if (autoFocus && containerRef.current) {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }, [autoFocus, getFocusableElements]);

  // Add event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    containerRef,
    focusableElements: focusableElementsRef.current,
    getFocusableElements
  };
}

// Hook for managing focus within a specific element
export function useFocusManagement() {
  const focusFirst = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    firstElement?.focus();
  }, []);

  const focusLast = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    );
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    lastElement?.focus();
  }, []);

  const moveFocus = useCallback((direction: 'next' | 'previous', container?: HTMLElement) => {
    const activeElement = document.activeElement as HTMLElement;
    const searchContainer = container || document.body;
    
    const focusableElements = Array.from(
      searchContainer.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];

    const currentIndex = focusableElements.indexOf(activeElement);
    
    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === 'next') {
      nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
    } else {
      nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
    }

    focusableElements[nextIndex]?.focus();
  }, []);

  return {
    focusFirst,
    focusLast,
    moveFocus
  };
}