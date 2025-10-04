import React from 'react';
import { cn } from '@/lib/utils';
import { useDeviceType, useResponsiveFontSize } from '@/lib/responsive-utils';
import { Textarea, TextareaProps } from './textarea';

interface ResponsiveTextareaProps extends TextareaProps {
  touchOptimized?: boolean;
  autoResize?: boolean;
}

export const ResponsiveTextarea = React.memo<ResponsiveTextareaProps>(({
  className,
  touchOptimized = true,
  autoResize = false,
  ...props
}) => {
  const { isTouchDevice, isMobile } = useDeviceType();
  const fontSizes = useResponsiveFontSize();

  return (
    <Textarea
      className={cn(
        // Base responsive font size
        fontSizes.body,
        // Touch-friendly sizing
        touchOptimized && isTouchDevice && 'min-h-[88px] px-4 py-3',
        // Mobile-specific adjustments
        isMobile && 'text-base', // Prevents zoom on iOS
        // Auto-resize
        autoResize && 'resize-none overflow-hidden',
        className
      )}
      {...props}
    />
  );
});

ResponsiveTextarea.displayName = 'ResponsiveTextarea';