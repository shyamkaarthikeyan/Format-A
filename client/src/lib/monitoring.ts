// Monitoring and analytics utilities for guest workflow

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
}

interface GuestWorkflowMetrics {
  guestDocumentCreated: { documentId: string; contentLength: number };
  guestDocumentEdited: { documentId: string; editCount: number };
  guestPreviewViewed: { documentId: string; previewDuration: number };
  authPromptShown: { action: 'download' | 'email'; documentId: string };
  authPromptDismissed: { action: 'download' | 'email'; documentId: string };
  guestToAuthConversion: { documentId: string; conversionTime: number };
  guestSessionDuration: { duration: number; documentsCreated: number };
  storageQuotaWarning: { usagePercentage: number };
  storageQuotaExceeded: { attemptedSize: number };
  networkError: { endpoint: string; errorType: string };
  performanceMetric: { metric: string; value: number; context?: string };
}

class GuestWorkflowMonitor {
  private sessionId: string;
  private sessionStartTime: number;
  private events: AnalyticsEvent[] = [];
  private isGuest: boolean = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.setupEventListeners();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupEventListeners(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('session_hidden');
      } else {
        this.trackEvent('session_visible');
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.trackSessionEnd();
    });

    // Track performance metrics
    if ('performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.trackPerformanceMetrics();
        }, 0);
      });
    }
  }

  setGuestMode(isGuest: boolean): void {
    this.isGuest = isGuest;
    this.trackEvent('mode_set', { isGuest });
  }

  trackEvent<K extends keyof GuestWorkflowMetrics>(
    event: K,
    properties?: GuestWorkflowMetrics[K]
  ): void;
  trackEvent(event: string, properties?: Record<string, any>): void;
  trackEvent(event: string, properties?: Record<string, any>): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        isGuest: this.isGuest,
        sessionDuration: Date.now() - this.sessionStartTime
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    this.events.push(analyticsEvent);
    
    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events.shift();
    }

    // Send to analytics service (in production)
    this.sendToAnalytics(analyticsEvent);
    
    // Log for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', analyticsEvent);
    }
  }

  private async sendToAnalytics(event: AnalyticsEvent): Promise<void> {
    try {
      // In production, send to analytics service like Google Analytics, Mixpanel, etc.
      // For now, we'll store in localStorage for demo purposes
      const storedEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      storedEvents.push(event);
      
      // Keep only last 100 events in localStorage
      if (storedEvents.length > 100) {
        storedEvents.splice(0, storedEvents.length - 100);
      }
      
      localStorage.setItem('analytics_events', JSON.stringify(storedEvents));
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  private trackPerformanceMetrics(): void {
    if (!('performance' in window)) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      this.trackEvent('performanceMetric', {
        metric: 'page_load_time',
        value: navigation.loadEventEnd - navigation.fetchStart,
        context: 'navigation'
      });

      this.trackEvent('performanceMetric', {
        metric: 'dom_content_loaded',
        value: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        context: 'navigation'
      });

      this.trackEvent('performanceMetric', {
        metric: 'first_paint',
        value: navigation.responseStart - navigation.fetchStart,
        context: 'navigation'
      });
    }

    // Track memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.trackEvent('performanceMetric', {
        metric: 'memory_usage',
        value: memory.usedJSHeapSize,
        context: 'memory'
      });
    }
  }

  trackGuestDocumentCreated(documentId: string, contentLength: number): void {
    this.trackEvent('guestDocumentCreated', { documentId, contentLength });
  }

  trackGuestDocumentEdited(documentId: string, editCount: number): void {
    this.trackEvent('guestDocumentEdited', { documentId, editCount });
  }

  trackAuthPromptShown(action: 'download' | 'email', documentId: string): void {
    this.trackEvent('authPromptShown', { action, documentId });
  }

  trackAuthPromptDismissed(action: 'download' | 'email', documentId: string): void {
    this.trackEvent('authPromptDismissed', { action, documentId });
  }

  trackGuestToAuthConversion(documentId: string): void {
    const conversionTime = Date.now() - this.sessionStartTime;
    this.trackEvent('guestToAuthConversion', { documentId, conversionTime });
  }

  trackStorageWarning(usagePercentage: number): void {
    this.trackEvent('storageQuotaWarning', { usagePercentage });
  }

  trackStorageExceeded(attemptedSize: number): void {
    this.trackEvent('storageQuotaExceeded', { attemptedSize });
  }

  trackNetworkError(endpoint: string, errorType: string): void {
    this.trackEvent('networkError', { endpoint, errorType });
  }

  private trackSessionEnd(): void {
    const sessionDuration = Date.now() - this.sessionStartTime;
    const documentsCreated = this.events.filter(e => e.event === 'guestDocumentCreated').length;
    
    this.trackEvent('guestSessionDuration', { 
      duration: sessionDuration, 
      documentsCreated 
    });
  }

  getSessionMetrics(): {
    sessionId: string;
    duration: number;
    eventCount: number;
    isGuest: boolean;
    events: AnalyticsEvent[];
  } {
    return {
      sessionId: this.sessionId,
      duration: Date.now() - this.sessionStartTime,
      eventCount: this.events.length,
      isGuest: this.isGuest,
      events: [...this.events]
    };
  }

  // Get conversion funnel metrics
  getConversionMetrics(): {
    documentsCreated: number;
    authPromptsShown: number;
    authPromptsDismissed: number;
    conversions: number;
    conversionRate: number;
  } {
    const documentsCreated = this.events.filter(e => e.event === 'guestDocumentCreated').length;
    const authPromptsShown = this.events.filter(e => e.event === 'authPromptShown').length;
    const authPromptsDismissed = this.events.filter(e => e.event === 'authPromptDismissed').length;
    const conversions = this.events.filter(e => e.event === 'guestToAuthConversion').length;
    
    const conversionRate = authPromptsShown > 0 ? (conversions / authPromptsShown) * 100 : 0;

    return {
      documentsCreated,
      authPromptsShown,
      authPromptsDismissed,
      conversions,
      conversionRate
    };
  }

  // Export analytics data for admin dashboard
  exportAnalyticsData(): string {
    const metrics = this.getSessionMetrics();
    const conversion = this.getConversionMetrics();
    
    return JSON.stringify({
      session: metrics,
      conversion,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

// Global monitor instance
export const guestWorkflowMonitor = new GuestWorkflowMonitor();

// React hook for using the monitor
export function useGuestWorkflowMonitor() {
  return {
    trackDocumentCreated: guestWorkflowMonitor.trackGuestDocumentCreated.bind(guestWorkflowMonitor),
    trackDocumentEdited: guestWorkflowMonitor.trackGuestDocumentEdited.bind(guestWorkflowMonitor),
    trackAuthPromptShown: guestWorkflowMonitor.trackAuthPromptShown.bind(guestWorkflowMonitor),
    trackAuthPromptDismissed: guestWorkflowMonitor.trackAuthPromptDismissed.bind(guestWorkflowMonitor),
    trackConversion: guestWorkflowMonitor.trackGuestToAuthConversion.bind(guestWorkflowMonitor),
    trackStorageWarning: guestWorkflowMonitor.trackStorageWarning.bind(guestWorkflowMonitor),
    trackStorageExceeded: guestWorkflowMonitor.trackStorageExceeded.bind(guestWorkflowMonitor),
    trackNetworkError: guestWorkflowMonitor.trackNetworkError.bind(guestWorkflowMonitor),
    setGuestMode: guestWorkflowMonitor.setGuestMode.bind(guestWorkflowMonitor),
    getMetrics: guestWorkflowMonitor.getSessionMetrics.bind(guestWorkflowMonitor),
    getConversionMetrics: guestWorkflowMonitor.getConversionMetrics.bind(guestWorkflowMonitor),
    exportData: guestWorkflowMonitor.exportAnalyticsData.bind(guestWorkflowMonitor)
  };
}

// Health check utility
export class HealthChecker {
  private static checks: Map<string, () => Promise<boolean>> = new Map();

  static registerCheck(name: string, checkFn: () => Promise<boolean>): void {
    this.checks.set(name, checkFn);
  }

  static async runAllChecks(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: { name: string; status: boolean; error?: string }[];
  }> {
    const results = [];
    let healthyCount = 0;

    for (const [name, checkFn] of this.checks) {
      try {
        const status = await checkFn();
        results.push({ name, status });
        if (status) healthyCount++;
      } catch (error) {
        results.push({ 
          name, 
          status: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const totalChecks = results.length;
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';

    if (healthyCount === totalChecks) {
      overallStatus = 'healthy';
    } else if (healthyCount > totalChecks / 2) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return { status: overallStatus, checks: results };
  }
}

// Register default health checks
HealthChecker.registerCheck('localStorage', async () => {
  try {
    const test = '__health_check__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
});

HealthChecker.registerCheck('network', async () => {
  try {
    const response = await fetch('/api/health', { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
});

HealthChecker.registerCheck('performance', async () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const usagePercentage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
    return usagePercentage < 90; // Consider unhealthy if using >90% of heap
  }
  return true; // Assume healthy if memory API not available
});

export default guestWorkflowMonitor;