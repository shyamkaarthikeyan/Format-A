import { useAuth } from '@/contexts/auth-context';
import GuestRestrictionsService, { type RestrictedAction, type FeatureAccess } from '@/lib/guest-restrictions';

/**
 * Hook for managing guest user restrictions
 */
export function useGuestRestrictions() {
  const { isAuthenticated } = useAuth();

  const checkAction = (action: RestrictedAction) => {
    return GuestRestrictionsService.checkAction(action, isAuthenticated);
  };

  const getFeatureAccess = (): FeatureAccess => {
    return GuestRestrictionsService.getFeatureAccess(isAuthenticated);
  };

  const getRestrictionMessage = (action: RestrictedAction): string => {
    return GuestRestrictionsService.getRestrictionMessage(action);
  };

  const getSignInBenefits = (action: RestrictedAction): string[] => {
    return GuestRestrictionsService.getSignInBenefits(action);
  };

  const handleRestrictedAction = (
    action: RestrictedAction,
    onAuthRequired?: (action: RestrictedAction) => void
  ): boolean => {
    return GuestRestrictionsService.handleRestrictedAction(action, isAuthenticated, onAuthRequired);
  };

  const getRestrictionIndicators = (action: RestrictedAction) => {
    return GuestRestrictionsService.getRestrictionIndicators(action, isAuthenticated);
  };

  const checkUsageLimits = () => {
    return GuestRestrictionsService.checkUsageLimits();
  };

  return {
    isAuthenticated,
    checkAction,
    getFeatureAccess,
    getRestrictionMessage,
    getSignInBenefits,
    handleRestrictedAction,
    getRestrictionIndicators,
    checkUsageLimits
  };
}