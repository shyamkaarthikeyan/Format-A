import React from 'react';
import { Info, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import GuestRestrictionsService, { type RestrictedAction } from '@/lib/guest-restrictions';

interface RestrictionIndicatorProps {
  action: RestrictedAction;
  variant?: 'banner' | 'tooltip' | 'badge';
  className?: string;
}

const RestrictionIndicator: React.FC<RestrictionIndicatorProps> = ({
  action,
  variant = 'banner',
  className = ''
}) => {
  const { isAuthenticated } = useAuth();

  // Don't show indicator for authenticated users
  if (isAuthenticated) return null;

  const message = GuestRestrictionsService.getRestrictionMessage(action);

  if (variant === 'banner') {
    return (
      <div className={`flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200 ${className}`}>
        <Info className="w-4 h-4" />
        <span>Guest Mode - Sign in to download and email documents</span>
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full ${className}`}>
        <Lock className="w-3 h-3" />
        <span>Sign in required</span>
      </div>
    );
  }

  if (variant === 'tooltip') {
    return (
      <div className={`flex items-center gap-1 text-xs text-gray-500 ${className}`}>
        <AlertCircle className="w-3 h-3" />
        <span>{message}</span>
      </div>
    );
  }

  return null;
};

export default RestrictionIndicator;