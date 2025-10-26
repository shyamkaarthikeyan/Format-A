import React from 'react';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import GuestRestrictionsService, { type RestrictedAction } from '@/lib/guest-restrictions';

interface RestrictedActionButtonProps {
  action: RestrictedAction;
  onRestricted: (action: RestrictedAction) => void;
  onAllowed: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  disabled?: boolean;
}

const RestrictedActionButton: React.FC<RestrictedActionButtonProps> = ({
  action,
  onRestricted,
  onAllowed,
  children,
  variant = 'default',
  className = '',
  disabled = false
}) => {
  const { isAuthenticated } = useAuth();
  const restrictions = GuestRestrictionsService.getRestrictionIndicators(action, isAuthenticated);

  const handleClick = () => {
    if (disabled) return;
    
    const success = GuestRestrictionsService.handleRestrictedAction(
      action,
      isAuthenticated,
      onRestricted
    );
    
    if (success) {
      onAllowed();
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      disabled={disabled || restrictions.isDisabled}
      className={`flex items-center gap-2 ${restrictions.className} ${className}`}
      title={restrictions.tooltipText}
    >
      {restrictions.showLockIcon && <Lock className="w-4 h-4" />}
      {children}
    </Button>
  );
};

export default RestrictedActionButton;