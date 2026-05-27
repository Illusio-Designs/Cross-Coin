// Monitoring and observability utilities for production

class MonitoringService {
  constructor() {
    this.events = [];
    this.maxEvents = 100;
    this.errorThreshold = 10;
    this.errorCount = 0;
  }

  // Log performance metrics
  logMetric = (name, value, tags = {}) => {
    const metric = {
      type: 'metric',
      timestamp: Date.now(),
      name,
      value,
      tags,
    };

    this.recordEvent(metric);
    this.sendToAnalytics(metric);
  };

  // Log errors with context
  logError = (error, context = {}) => {
    this.errorCount++;

    const errorEvent = {
      type: 'error',
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context,
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    this.recordEvent(errorEvent);

    // Alert if error threshold exceeded
    if (this.errorCount > this.errorThreshold) {
      this.sendAlert('Error threshold exceeded', errorEvent);
    }

    this.sendToAnalytics(errorEvent);
  };

  // Log user actions
  logAction = (action, details = {}) => {
    const actionEvent = {
      type: 'action',
      timestamp: Date.now(),
      action,
      details,
      url: typeof window !== 'undefined' ? window.location.href : null,
    };

    this.recordEvent(actionEvent);
    this.sendToAnalytics(actionEvent);
  };

  // Track page view
  logPageView = (pageName, properties = {}) => {
    const pageViewEvent = {
      type: 'pageview',
      timestamp: Date.now(),
      pageName,
      properties,
      url: typeof window !== 'undefined' ? window.location.href : null,
    };

    this.recordEvent(pageViewEvent);
    this.sendToAnalytics(pageViewEvent);
  };

  // Record event in memory
  recordEvent = (event) => {
    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  };

  // Track API response time
  trackAPICall = (endpoint, duration, statusCode) => {
    const metric = {
      type: 'api_call',
      timestamp: Date.now(),
      endpoint,
      duration,
      statusCode,
      slow: duration > 3000, // Flag slow calls
    };

    this.recordEvent(metric);
    this.sendToAnalytics(metric);

    if (duration > 3000) {
      console.warn(`Slow API call: ${endpoint} took ${duration}ms`);
    }
  };

  // Track component render time
  trackComponentRender = (componentName, duration) => {
    const metric = {
      type: 'component_render',
      timestamp: Date.now(),
      componentName,
      duration,
      slow: duration > 1000, // Flag slow renders
    };

    this.recordEvent(metric);
    this.sendToAnalytics(metric);
  };

  // Track memory usage
  trackMemory = () => {
    if (performance && performance.memory) {
      const memory = {
        type: 'memory',
        timestamp: Date.now(),
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      };

      this.recordEvent(memory);
      this.sendToAnalytics(memory);
    }
  };

  // Send alert for critical issues
  sendAlert = (subject, details) => {
    // In production, send to alerting service (Slack, PagerDuty, etc.)
    console.error(`🚨 ALERT: ${subject}`, details);

    // Example: Send to API
    /*
    fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, details, timestamp: Date.now() })
    });
    */
  };

  // Send metrics to analytics service
  sendToAnalytics = (event) => {
    // In production, send to analytics service (Google Analytics, Mixpanel, etc.)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.type, {
        event_category: event.type,
        value: event.value || event.duration,
      });
    }
  };

  // Get all recorded events
  getEvents = () => [...this.events];

  // Get events of specific type
  getEventsByType = (type) => this.events.filter(e => e.type === type);

  // Clear all events
  clearEvents = () => {
    this.events = [];
  };

  // Generate report
  generateReport = () => {
    const errors = this.getEventsByType('error');
    const metrics = this.getEventsByType('metric');
    const apiCalls = this.getEventsByType('api_call');
    const renders = this.getEventsByType('component_render');

    return {
      summary: {
        totalEvents: this.events.length,
        errors: errors.length,
        avgErrorsPerHour: (errors.length / (Date.now() / 3600000)).toFixed(2),
      },
      metrics: {
        slowAPICallsCount: apiCalls.filter(c => c.slow).length,
        slowRendersCount: renders.filter(r => r.slow).length,
        avgAPICallDuration: apiCalls.length ? (apiCalls.reduce((sum, c) => sum + c.duration, 0) / apiCalls.length).toFixed(0) : 0,
      },
      recentErrors: errors.slice(-5),
    };
  };
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// React hook for monitoring
export const useMonitoring = (componentName) => {
  const startTime = performance.now();

  return {
    logError: (error, context) => {
      monitoringService.logError(error, { ...context, component: componentName });
    },

    logAction: (action, details) => {
      monitoringService.logAction(action, { ...details, component: componentName });
    },

    trackComponentRender: () => {
      const duration = performance.now() - startTime;
      monitoringService.trackComponentRender(componentName, duration);
    },
  };
};

// Global error handler
export const setupGlobalErrorHandler = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', event => {
      monitoringService.logError(event.error, {
        type: 'uncaughtError',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', event => {
      monitoringService.logError(event.reason, {
        type: 'unhandledRejection',
      });
    });
  }
};

export default MonitoringService;
