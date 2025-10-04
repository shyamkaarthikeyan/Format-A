import React from 'react';
import { cn } from '@/lib/utils';
import { useDeviceType } from '@/lib/responsive-utils';
import { Button, ButtonProps } from './button';

interface TouchFriendlyButtonProps extends ButtonProps {
  touchSize?: 'sm' | 'md' | 'lg';
}

export const TouchFriendlyButton = React.memo<TouchFriendlyButtonProps>(({
  className,
  touchSize = 'md',
  children,
  ...props
}) => {
  const { isTouchDevice } = useDeviceType();

  const touchSizes = {
    sm: isTouchDevice ? 'min-h-[44px] min-w-[44px] px-4 py-2' : '',
    md: isTouchDevice ? 'min-h-[48px] min-w-[48px] px-6 py-3' : '',
    lg: isTouchDevice ? 'min-h-[56px] min-w-[56px] px-8 py-4' : '',
  };

  return (
    <Button
      className={cn(
        touchSizes[touchSize],
        isTouchDevice && 'active:scale-95 transition-transform',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
});

TouchFriendlyButton.displayName = 'TouchFriendlyButton';