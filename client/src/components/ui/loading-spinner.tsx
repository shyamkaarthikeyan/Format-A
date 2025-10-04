import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'pulse' | 'bars';
  color?: 'purple' | 'blue' | 'green' | 'gray';
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  variant = 'default',
  color = 'purple',
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colorClasses = {
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    gray: 'text-gray-600',
  };

  if (variant === 'default') {
    return (
      <Loader2 
        className={cn(
          'animate-spin',
          sizeClasses[size],
          colorClasses[color],
          className
        )} 
      />
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex space-x-1', className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-full animate-pulse',
              size === 'sm' && 'w-1 h-1',
              size === 'md' && 'w-2 h-2',
              size === 'lg' && 'w-3 h-3',
              size === 'xl' && 'w-4 h-4',
              color === 'purple' && 'bg-purple-600',
              color === 'blue' && 'bg-blue-600',
              color === 'green' && 'bg-green-600',
              color === 'gray' && 'bg-gray-600'
            )}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s',
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div
        className={cn(
          'rounded-full animate-pulse',
          sizeClasses[size],
          color === 'purple' && 'bg-purple-600',
          color === 'blue' && 'bg-blue-600',
          color === 'green' && 'bg-green-600',
          color === 'gray' && 'bg-gray-600',
          className
        )}
      />
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex items-end space-x-1', className)}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'animate-pulse',
              size === 'sm' && 'w-1 h-3',
              size === 'md' && 'w-1 h-4',
              size === 'lg' && 'w-2 h-6',
              size === 'xl' && 'w-2 h-8',
              color === 'purple' && 'bg-purple-600',
              color === 'blue' && 'bg-blue-600',
              color === 'green' && 'bg-green-600',
              color === 'gray' && 'bg-gray-600'
            )}
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.8s',
            }}
          />
        ))}
      </div>
    );
  }

  return null;
}

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  className?: string;
}

export function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  children,
  className,
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <div className="text-center space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600 font-medium">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface LoadingStateProps {
  isLoading: boolean;
  error?: string | null;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  children: React.ReactNode;
}

export function LoadingState({
  isLoading,
  error,
  loadingComponent,
  errorComponent,
  children,
}: LoadingStateProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        {loadingComponent || (
          <div className="text-center space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600">Loading...</p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        {errorComponent || (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-red-600 text-xl">!</span>
            </div>
            <div>
              <p className="text-sm font-medium text-red-600">Error</p>
              <p className="text-xs text-gray-500 mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}