import React from 'react';
import { cn } from '@/lib/utils';
import { useDeviceType, useResponsiveFontSize } from '@/lib/responsive-utils';
import { Input, InputProps } from './input';

interface ResponsiveInputProps extends InputProps {
  touchOptimized?: boolean;
}

export const ResponsiveInput = React.memo<ResponsiveInputProps>(({
  className,
  touchOptimized = true,
  ...props
}) => {
  const { isTouchDevice, isMobile } = useDeviceType();
  const fontSizes = useResponsiveFontSize();

  return (
    <Input
      className={cn(
        // Base responsive font size
        fontSizes.body,
        // Touch-friendly sizing
        touchOptimized && isTouchDevice && 'min-h-[44px] px-4 py-3',
        // Mobile-specific adjustments
        isMobile && 'text-base', // Prevents zoom on iOS
        className
      )}
      {...props}
    />
  );
});

ResponsiveInput.displayName = 'ResponsiveInput';