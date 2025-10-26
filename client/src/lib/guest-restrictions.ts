/**
 * Guest Restrictions Service
 * Centralized management of guest user restrictions and feature access
 */

export type RestrictedAction = 'download' | 'email' | 'save' | 'export' | 'share';

export interface RestrictionResult {
  allowed: boolean;
  reason?: string;
  requiresAuth: boolean;
  action: RestrictedAction;
}

export interface FeatureAccess {
  canDownloadPDF: boolean;
  canDownloadDOCX: boolean;
  canEmailDocument: boolean;
  canSaveToCloud: boolean;
  canExportToFormats: boolean;
  canShareDocument: boolean;
  canAccessHistory: boolean;
  canUseAdvancedFeatures: boolean;
}

class GuestRestrictionsService {
  /**
   * Check if a specific action is allowed for guest users
   */
  static checkAction(action: RestrictedAction, isAuthenticated: boolean): RestrictionResult {
    if (isAuthenticated) {
      return {
        allowed: true,
        requiresAuth: false,
        action
      };
    }

    // Define restricted actions for guest users
    const restrictedActions: RestrictedAction[] = ['download', 'email', 'save', 'export', 'share'];
    
    const isRestricted = restrictedActions.includes(action);
    
    return {
      allowed: !isRestricted,
      reason: isRestricted ? `${action} requires sign-in` : undefined,
      requiresAuth: isRestricted,
      action
    };
  }

  /**
   * Get comprehensive feature access for current user
   */
  static getFeatureAccess(isAuthenticated: boolean): FeatureAccess {
    if (isAuthenticated) {
      return {
        canDownloadPDF: true,
        canDownloadDOCX: true,
        canEmailDocument: true,
        canSaveToCloud: true,
        canExportToFormats: true,
        canShareDocument: true,
        canAccessHistory: true,
        canUseAdvancedFeatures: true
      };
    }

    // Guest user restrictions
    return {
      canDownloadPDF: false,
      canDownloadDOCX: false,
      canEmailDocument: false,
      canSaveToCloud: false,
      canExportToFormats: false,
      canShareDocument: false,
      canAccessHistory: false,
      canUseAdvancedFeatures: false
    };
  }

  /**
   * Get user-friendly restriction messages
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
  static getSignInBenefits(action: RestrictedAction): string[] {
    const commonBenefits = [
      'Save document history',
      'Access from any device',
      'Secure cloud storage',
      'Advanced formatting options'
    ];

    const actionSpecificBenefits: Record<RestrictedAction, string[]> = {
      download: [
        'Download as PDF or DOCX',
        'High-quality exports',
        'Embedded fonts and formatting',
        ...commonBenefits
      ],
      email: [
        'Email documents directly',
        'Share with collaborators',
        'Automatic formatting preservation',
        ...commonBenefits
      ],
      save: [
        'Cloud document storage',
        'Automatic backups',
        'Version history',
        ...commonBenefits
      ],
      export: [
        'Multiple export formats',
        'Custom formatting options',
        'Batch export capabilities',
        ...commonBenefits
      ],
      share: [
        'Secure document sharing',
        'Collaboration features',
        'Access control',
        ...commonBenefits
      ]
    };

    return actionSpecificBenefits[action] || commonBenefits;
  }

  /**
   * Check if guest user has reached any usage limits
   */
  static checkUsageLimits(): {
    withinLimits: boolean;
    limits: {
      documentsCreated: number;
      maxDocuments: number;
      sessionDuration: number;
      maxSessionDuration: number;
    };
  } {
    // For now, implement basic limits
    // In a real app, this would track actual usage
    const sessionStart = sessionStorage.getItem('guest-session-start');
    const currentTime = Date.now();
    const sessionDuration = sessionStart ? currentTime - parseInt(sessionStart) : 0;
    
    // Set session start if not exists
    if (!sessionStart) {
      sessionStorage.setItem('guest-session-start', currentTime.toString());
    }

    const limits = {
      documentsCreated: 1, // Simplified - would track actual count
      maxDocuments: 3,
      sessionDuration: sessionDuration,
      maxSessionDuration: 2 * 60 * 60 * 1000 // 2 hours
    };

    const withinLimits = 
      limits.documentsCreated <= limits.maxDocuments &&
      limits.sessionDuration <= limits.maxSessionDuration;

    return { withinLimits, limits };
  }

  /**
   * Get visual indicators for restricted features
   */
  static getRestrictionIndicators(action: RestrictedAction, isAuthenticated: boolean) {
    if (isAuthenticated) {
      return {
        showLockIcon: false,
        isDisabled: false,
        tooltipText: '',
        className: ''
      };
    }

    return {
      showLockIcon: true,
      isDisabled: true,
      tooltipText: this.getRestrictionMessage(action),
      className: 'opacity-50 cursor-not-allowed'
    };
  }

  /**
   * Handle restricted action attempt
   */
  static handleRestrictedAction(
    action: RestrictedAction,
    isAuthenticated: boolean,
    onAuthRequired?: (action: RestrictedAction) => void
  ): boolean {
    const result = this.checkAction(action, isAuthenticated);
    
    if (!result.allowed && result.requiresAuth && onAuthRequired) {
      onAuthRequired(action);
      return false;
    }
    
    return result.allowed;
  }
}

export default GuestRestrictionsService;