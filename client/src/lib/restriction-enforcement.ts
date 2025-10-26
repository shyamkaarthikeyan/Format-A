import { useAuth } from '@/contexts/auth-context';

export type RestrictedAction = 'download' | 'email' | 'save' | 'export' | 'share';

export interface RestrictionResult {
  allowed: boolean;
  reason?: string;
  requiresAuth: boolean;
  action: RestrictedAction;
  buttonState: 'enabled' | 'disabled' | 'restricted';
  visualIndicators: {
    showLockIcon: boolean;
    showTooltip: boolean;
    tooltipText: string;
    className: string;
    ariaLabel: string;
  };
}

export interface ButtonStateConfig {
  variant: 'default' | 'outline' | 'ghost';
  disabled: boolean;
  className: string;
  title: string;
  'aria-label': string;
}

export class RestrictionEnforcement {
  /**
   * Check if an action is allowed for the current user with enhanced state management
   */
  static checkAction(action: RestrictedAction, isAuthenticated: boolean): RestrictionResult {
    // Define which actions require authentication
    const authRequiredActions: RestrictedAction[] = ['download', 'email', 'export', 'share'];
    
    const isRestricted = authRequiredActions.includes(action) && !isAuthenticated;
    
    if (isRestricted) {
      return {
        allowed: false,
        reason: `Sign in required to ${action} documents`,
        requiresAuth: true,
        action,
        buttonState: 'restricted',
        visualIndicators: {
          showLockIcon: true,
          showTooltip: true,
          tooltipText: `Sign in to ${action} your documents`,
          className: 'opacity-60 cursor-not-allowed border-dashed',
          ariaLabel: `${action} - Sign in required`
        }
      };
    }

    return {
      allowed: true,
      requiresAuth: false,
      action,
      buttonState: 'enabled',
      visualIndicators: {
        showLockIcon: false,
        showTooltip: false,
        tooltipText: '',
        className: '',
        ariaLabel: `${action} document`
      }
    };
  }

  /**
   * Get button configuration based on restriction state
   */
  static getButtonConfig(action: RestrictedAction, isAuthenticated: boolean): ButtonStateConfig {
    const result = this.checkAction(action, isAuthenticated);
    
    const baseConfig: ButtonStateConfig = {
      variant: action === 'download' ? 'default' : 'outline',
      disabled: !result.allowed,
      className: result.visualIndicators.className,
      title: result.visualIndicators.tooltipText || `${action} document`,
      'aria-label': result.visualIndicators.ariaLabel
    };

    return baseConfig;
  }

  /**
   * Get restriction message for a specific action
   */
  static getRestrictionMessage(action: RestrictedAction): string {
    const messages: Record<RestrictedAction, string> = {
      download: 'Sign in to download your documents as PDF or DOCX files',
      email: 'Sign in to email documents to yourself or collaborators',
      save: 'Sign in to save your documents to the cloud',
      export: 'Sign in to export documents in various formats',
      share: 'Sign in to share documents with others'
    };

    return messages[action] || 'Sign in to access this feature';
  }

  /**
   * Get benefits of signing in for a specific action
   */
  static getActionBenefits(action: RestrictedAction): string[] {
    const baseBenefits = [
      'Save documents to your account',
      'Access documents from any device',
      'Secure cloud storage'
    ];

    const actionSpecificBenefits: Record<RestrictedAction, string[]> = {
      download: [
        'Download as PDF or DOCX',
        'High-quality document generation',
        ...baseBenefits
      ],
      email: [
        'Email documents directly',
        'Share with collaborators',
        ...baseBenefits
      ],
      save: [
        'Automatic cloud backup',
        'Version history',
        ...baseBenefits
      ],
      export: [
        'Multiple export formats',
        'Custom formatting options',
        ...baseBenefits
      ],
      share: [
        'Collaborate with others',
        'Share via link or email',
        ...baseBenefits
      ]
    };

    return actionSpecificBenefits[action] || baseBenefits;
  }
}

/**
 * React hook for checking action restrictions
 */
export function useRestrictionCheck() {
  const { isAuthenticated } = useAuth();

  const checkAction = (action: RestrictedAction): RestrictionResult => {
    return RestrictionEnforcement.checkAction(action, isAuthenticated);
  };

  const isActionAllowed = (action: RestrictedAction): boolean => {
    return checkAction(action).allowed;
  };

  const getRestrictionReason = (action: RestrictedAction): string | undefined => {
    return checkAction(action).reason;
  };

  return {
    checkAction,
    isActionAllowed,
    getRestrictionReason,
    isAuthenticated
  };
}

/**
 * Higher-order component for protecting actions
 */
export function withRestrictionCheck<T extends object>(
  Component: React.ComponentType<T>,
  action: RestrictedAction,
  onRestricted?: (action: RestrictedAction) => void
) {
  return function RestrictedComponent(props: T) {
    const { checkAction } = useRestrictionCheck();
    const result = checkAction(action);

    if (!result.allowed && onRestricted) {
      onRestricted(action);
      return null;
    }

    return <Component {...props} />;
  };
}

/**
 * Utility for creating restricted buttons
 */
export interface RestrictedButtonProps {
  action: RestrictedAction;
  onRestricted: (action: RestrictedAction) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  [key: string]: any;
}

export function RestrictedButton({ 
  action, 
  onRestricted, 
  children, 
  className = '', 
  disabled = false,
  ...props 
}: RestrictedButtonProps) {
  const { checkAction } = useRestrictionCheck();
  const result = checkAction(action);

  const handleClick = (e: React.MouseEvent) => {
    if (!result.allowed) {
      e.preventDefault();
      onRestricted(action);
      return;
    }

    if (props.onClick) {
      props.onClick(e);
    }
  };

  const isDisabled = disabled || !result.allowed;
  const buttonClassName = `${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  return (
    <button
      {...props}
      className={buttonClassName}
      disabled={isDisabled}
      onClick={handleClick}
      title={result.reason || props.title}
    >
      {children}
    </button>
  );
}

export default RestrictionEnforcement;