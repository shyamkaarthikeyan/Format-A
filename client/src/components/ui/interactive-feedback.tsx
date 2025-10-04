import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface InteractiveElementProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'strong';
  feedback?: 'hover' | 'press' | 'focus' | 'all';
  disabled?: boolean;
  children: React.ReactNode;
}

export function InteractiveElement({
  variant = 'default',
  feedback = 'all',
  disabled = false,
  className,
  children,
  ...props
}: InteractiveElementProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const baseClasses = 'transition-all duration-200 ease-out';
  
  const variantClasses = {
    default: cn(
      'hover:shadow-md hover:-translate-y-0.5',
      isPressed && 'scale-95 shadow-sm translate-y-0',
      isFocused && 'ring-2 ring-purple-500/20 ring-offset-2'
    ),
    subtle: cn(
      'hover:bg-gray-50 hover:shadow-sm',
      isPressed && 'bg-gray-100 scale-98',
      isFocused && 'ring-1 ring-purple-300'
    ),
    strong: cn(
      'hover:shadow-lg hover:-translate-y-1 hover:scale-105',
      isPressed && 'scale-95 shadow-md translate-y-0',
      isFocused && 'ring-2 ring-purple-500/30 ring-offset-4'
    ),
  };

  const disabledClasses = disabled 
    ? 'opacity-50 cursor-not-allowed pointer-events-none' 
    : 'cursor-pointer';

  const handleMouseDown = () => {
    if (disabled || !feedback.includes('press') && feedback !== 'all') return;
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    if (disabled) return;
    setIsPressed(false);
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    setIsPressed(false);
  };

  const handleFocus = () => {
    if (disabled || !feedback.includes('focus') && feedback !== 'all') return;
    setIsFocused(true);
  };

  const handleBlur = () => {
    if (disabled) return;
    setIsFocused(false);
  };

  return (
    <div
      ref={elementRef}
      className={cn(
        baseClasses,
        variantClasses[variant],
        disabledClasses,
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      {children}
    </div>
  );
}

interface RippleEffectProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  duration?: number;
}

export function RippleEffect({
  children,
  className,
  color = 'rgba(147, 51, 234, 0.3)',
  duration = 600,
}: RippleEffectProps) {
  const [ripples, setRipples] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
  }>>([]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const newRipple = {
      id: Date.now(),
      x: x - size / 2,
      y: y - size / 2,
      size,
    };

    setRipples(prev => [...prev, newRipple]);

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, duration);
  };

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      onClick={handleClick}
    >
      {children}
      
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none animate-ping"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: color,
            animationDuration: `${duration}ms`,
          }}
        />
      ))}
    </div>
  );
}

interface HoverCardProps {
  children: React.ReactNode;
  hoverContent: React.ReactNode;
  delay?: number;
  className?: string;
}

export function HoverCard({
  children,
  hoverContent,
  delay = 300,
  className,
}: HoverCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg animate-in fade-in-0 zoom-in-95 duration-200">
            {hoverContent}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

interface FocusRingProps {
  children: React.ReactNode;
  className?: string;
  color?: 'purple' | 'blue' | 'green' | 'red';
  offset?: number;
}

export function FocusRing({
  children,
  className,
  color = 'purple',
  offset = 2,
}: FocusRingProps) {
  const colorClasses = {
    purple: 'focus-within:ring-purple-500',
    blue: 'focus-within:ring-blue-500',
    green: 'focus-within:ring-green-500',
    red: 'focus-within:ring-red-500',
  };

  return (
    <div
      className={cn(
        'focus-within:ring-2 focus-within:ring-opacity-50 rounded-md transition-all duration-200',
        colorClasses[color],
        className
      )}
      style={{ '--tw-ring-offset-width': `${offset}px` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

interface PressEffectProps {
  children: React.ReactNode;
  className?: string;
  scale?: number;
}

export function PressEffect({
  children,
  className,
  scale = 0.95,
}: PressEffectProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div
      className={cn(
        'transition-transform duration-100 ease-out',
        isPressed && `scale-${Math.round(scale * 100)}`,
        className
      )}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      {children}
    </div>
  );
}

interface GlowEffectProps {
  children: React.ReactNode;
  className?: string;
  color?: 'purple' | 'blue' | 'green' | 'red';
  intensity?: 'low' | 'medium' | 'high';
}

export function GlowEffect({
  children,
  className,
  color = 'purple',
  intensity = 'medium',
}: GlowEffectProps) {
  const glowClasses = {
    purple: {
      low: 'hover:shadow-purple-500/25',
      medium: 'hover:shadow-purple-500/40',
      high: 'hover:shadow-purple-500/60',
    },
    blue: {
      low: 'hover:shadow-blue-500/25',
      medium: 'hover:shadow-blue-500/40',
      high: 'hover:shadow-blue-500/60',
    },
    green: {
      low: 'hover:shadow-green-500/25',
      medium: 'hover:shadow-green-500/40',
      high: 'hover:shadow-green-500/60',
    },
    red: {
      low: 'hover:shadow-red-500/25',
      medium: 'hover:shadow-red-500/40',
      high: 'hover:shadow-red-500/60',
    },
  };

  return (
    <div
      className={cn(
        'transition-shadow duration-300 hover:shadow-xl',
        glowClasses[color][intensity],
        className
      )}
    >
      {children}
    </div>
  );
}