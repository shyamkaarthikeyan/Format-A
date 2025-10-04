import React, { useEffect, useState } from 'react';
import { useAccessibility } from '@/contexts/accessibility-context';

interface FocusIndicatorProps {
  children: React.ReactNode;
  className?: string;
  focusClassName?: string;
  disabled?: boolean;
}

export function FocusIndicator({ 
  children, 
  className = '', 
  focusClassName = 'ring-2 ring-primary ring-offset-2', 
  disabled = false 
}: FocusIndicatorProps) {
  const { preferences } = useAccessibility();
  const [isFocused, setIsFocused] = useState(false);
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    const handleKeyDown = () => setIsKeyboardUser(true);
    const handleMouseDown = () => setIsKeyboardUser(false);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const shouldShowFocus = preferences.focusVisible && isFocused && isKeyboardUser && !disabled;

  return (
    <div
      className={`${className} ${shouldShowFocus ? focusClassName : ''}`}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
    </div>
  );
}

// Enhanced button with focus indicator
export function AccessibleButton({
  children,
  onClick,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  className = '',
  variant = 'default',
  size = 'default',
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { announce } = useAccessibility();

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
      if (ariaLabel) {
        announce(`${ariaLabel} activated`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <FocusIndicator>
      <button
        className={`
          inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors
          focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50
          ${variant === 'default' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
          ${variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          ${variant === 'outline' ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground' : ''}
          ${variant === 'secondary' ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''}
          ${variant === 'ghost' ? 'hover:bg-accent hover:text-accent-foreground' : ''}
          ${variant === 'link' ? 'text-primary underline-offset-4 hover:underline' : ''}
          ${size === 'default' ? 'h-10 px-4 py-2' : ''}
          ${size === 'sm' ? 'h-9 rounded-md px-3' : ''}
          ${size === 'lg' ? 'h-11 rounded-md px-8' : ''}
          ${size === 'icon' ? 'h-10 w-10' : ''}
          ${className}
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        {...props}
      >
        {children}
      </button>
    </FocusIndicator>
  );
}