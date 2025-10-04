import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  steps: {
    id: string;
    label: string;
    description?: string;
    status: 'pending' | 'current' | 'completed' | 'error';
  }[];
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  className?: string;
}

export function ProgressIndicator({
  steps,
  orientation = 'horizontal',
  showLabels = true,
  className,
}: ProgressIndicatorProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div className={cn(
      'flex',
      isHorizontal ? 'items-center space-x-4' : 'flex-col space-y-4',
      className
    )}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        
        return (
          <div
            key={step.id}
            className={cn(
              'flex items-center',
              !isHorizontal && 'w-full'
            )}
          >
            {/* Step indicator */}
            <div className="flex items-center">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300',
                step.status === 'completed' && 'bg-green-500 border-green-500 text-white',
                step.status === 'current' && 'bg-purple-500 border-purple-500 text-white',
                step.status === 'error' && 'bg-red-500 border-red-500 text-white',
                step.status === 'pending' && 'bg-gray-100 border-gray-300 text-gray-500'
              )}>
                {step.status === 'completed' && <CheckCircle2 className="w-5 h-5" />}
                {step.status === 'current' && <Loader2 className="w-4 h-4 animate-spin" />}
                {step.status === 'error' && <Circle className="w-4 h-4 fill-current" />}
                {step.status === 'pending' && <span className="text-sm font-medium">{index + 1}</span>}
              </div>

              {/* Step label */}
              {showLabels && (
                <div className={cn(
                  'ml-3',
                  !isHorizontal && 'flex-1'
                )}>
                  <div className={cn(
                    'text-sm font-medium transition-colors duration-300',
                    step.status === 'completed' && 'text-green-700',
                    step.status === 'current' && 'text-purple-700',
                    step.status === 'error' && 'text-red-700',
                    step.status === 'pending' && 'text-gray-500'
                  )}>
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className={cn(
                'transition-colors duration-300',
                isHorizontal ? 'w-12 h-0.5 mx-4' : 'w-0.5 h-8 ml-4 mt-2',
                (step.status === 'completed' || steps[index + 1]?.status === 'completed') 
                  ? 'bg-green-300' 
                  : 'bg-gray-300'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  className?: string;
  color?: 'purple' | 'blue' | 'green' | 'red';
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  showValue = true,
  className,
  color = 'purple',
}: CircularProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn('transition-all duration-500 ease-out', colorClasses[color])}
        />
      </svg>
      
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-2xl font-bold', colorClasses[color])}>
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}

interface LinearProgressProps {
  value: number;
  max?: number;
  height?: number;
  showValue?: boolean;
  className?: string;
  color?: 'purple' | 'blue' | 'green' | 'red';
  animated?: boolean;
}

export function LinearProgress({
  value,
  max = 100,
  height = 8,
  showValue = false,
  className,
  color = 'purple',
  animated = false,
}: LinearProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const colorClasses = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1">
        {showValue && (
          <span className="text-sm font-medium text-gray-700">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
      
      <div
        className="w-full bg-gray-200 rounded-full overflow-hidden"
        style={{ height }}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            colorClasses[color],
            animated && 'bg-gradient-to-r from-current via-white to-current bg-[length:200%_100%] animate-shimmer'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}