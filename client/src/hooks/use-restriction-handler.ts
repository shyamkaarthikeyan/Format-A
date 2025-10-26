import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { RestrictedAction, RestrictionEnforcement } from '@/lib/restriction-enforcement';

export interface RestrictionHandlerState {
  showAuthPrompt: boolean;
  currentAction: RestrictedAction | null;
  isProcessing: boolean;
  error: string | null;
}

export interface RestrictionHandlerActions {
  handleRestrictedAction: (action: RestrictedAction, callback?: () => void) => void;
  closeAuthPrompt: () => void;
  redirectToSignIn: () => void;
  clearError: () => void;
  reset: () => void;
}

export function useRestrictionHandler(): RestrictionHandlerState & RestrictionHandlerActions {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<RestrictionHandlerState>({
    showAuthPrompt: false,
    currentAction: null,
    isProcessing: false,
    error: null
  });

  const handleRestrictedAction = useCallback((
    action: RestrictedAction, 
    callback?: () => void
  ) => {
    const result = RestrictionEnforcement.checkAction(action, isAuthenticated);
    
    if (result.allowed) {
      // Action is allowed, execute callback
      if (callback) {
        setState(prev => ({ ...prev, isProcessing: true, error: null }));
        try {
          callback();
        } catch (error) {
          setState(prev => ({ 
            ...prev, 
            error: error instanceof Error ? error.message : 'Action failed',
            isProcessing: false 
          }));
          return;
        }
        setState(prev => ({ ...prev, isProcessing: false }));
      }
    } else {
      // Action is restricted, show auth prompt
      setState(prev => ({
        ...prev,
        showAuthPrompt: true,
        currentAction: action,
        error: null
      }));
    }
  }, [isAuthenticated]);

  const closeAuthPrompt = useCallback(() => {
    setState(prev => ({
      ...prev,
      showAuthPrompt: false,
      currentAction: null
    }));
  }, []);

  const redirectToSignIn = useCallback(() => {
    // Store the current action for after sign-in
    if (state.currentAction) {
      sessionStorage.setItem('pending-action', state.currentAction);
    }
    
    // Redirect to sign-in page
    window.location.href = '/signin';
  }, [state.currentAction]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      showAuthPrompt: false,
      currentAction: null,
      isProcessing: false,
      error: null
    });
  }, []);

  return {
    ...state,
    handleRestrictedAction,
    closeAuthPrompt,
    redirectToSignIn,
    clearError,
    reset
  };
}

export default useRestrictionHandler;