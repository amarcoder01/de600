// Telemetry and Analytics Service
// Provides comprehensive tracking for user behavior, performance, and security

export interface TelemetryEvent {
  event: string
  category: 'user' | 'performance' | 'security' | 'error' | 'business'
  timestamp: string
  sessionId: string
  userId?: string
  properties: Record<string, any>
  metadata?: {
    userAgent?: string
    ipAddress?: string
    referrer?: string
    pathname?: string
  }
}

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: string
  sessionId: string
  userId?: string
  metadata?: Record<string, any>
}

export interface SecurityEvent {
  event: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  sessionId: string
  userId?: string
  ipAddress?: string
  userAgent?: string
  details: Record<string, any>
}

class TelemetryService {
  private sessionId: string
  private userId?: string
  private queue: TelemetryEvent[] = []
  private performanceQueue: PerformanceMetric[] = []
  private securityQueue: SecurityEvent[] = []
  private isInitialized = false
  private flushInterval: NodeJS.Timeout | null = null
  private endpoint = '/api/telemetry'

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initialize()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initialize() {
    if (this.isInitialized) return

    // Set up periodic flushing
    this.flushInterval = setInterval(() => {
      this.flush()
    }, 30000) // Flush every 30 seconds

    // Set up performance monitoring
    this.setupPerformanceMonitoring()

    // Set up error tracking
    this.setupErrorTracking()

    // Set up navigation tracking
    this.setupNavigationTracking()

    this.isInitialized = true
  }

  private setupPerformanceMonitoring() {
    if (typeof window === 'undefined') return

    // Track page load performance
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        this.trackPerformance('page_load_time', navigation.loadEventEnd - navigation.loadEventStart, 'ms')
        this.trackPerformance('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart, 'ms')
        this.trackPerformance('first_paint', performance.getEntriesByName('first-paint')[0]?.startTime || 0, 'ms')
        this.trackPerformance('first_contentful_paint', performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0, 'ms')
      }
    })

    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.trackPerformance('largest_contentful_paint', lastEntry.startTime, 'ms')
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.trackPerformance('first_input_delay', entry.processingStart - entry.startTime, 'ms')
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        this.trackPerformance('cumulative_layout_shift', clsValue, 'score')
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    }
  }

  private setupErrorTracking() {
    if (typeof window === 'undefined') return

    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      })
    })

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('unhandled_promise_rejection', {
        reason: event.reason,
        promise: event.promise
      })
    })

    // Track React errors (if React is available)
    if (typeof window !== 'undefined' && (window as any).React) {
      const originalConsoleError = console.error
      console.error = (...args) => {
        this.trackError('react_error', {
          message: args.join(' '),
          stack: new Error().stack
        })
        originalConsoleError.apply(console, args)
      }
    }
  }

  private setupNavigationTracking() {
    if (typeof window === 'undefined') return

    // Track route changes
    let currentPath = window.location.pathname
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== currentPath) {
        this.trackEvent('navigation', 'user', {
          from: currentPath,
          to: window.location.pathname,
          timestamp: Date.now()
        })
        currentPath = window.location.pathname
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  // Set user ID for tracking
  setUserId(userId: string) {
    this.userId = userId
  }

  // Track custom events
  trackEvent(
    event: string,
    category: TelemetryEvent['category'],
    properties: Record<string, any> = {}
  ) {
    const telemetryEvent: TelemetryEvent = {
      event,
      category,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      properties,
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined
      }
    }

    this.queue.push(telemetryEvent)

    // Flush immediately for important events
    if (category === 'security' || category === 'error') {
      this.flush()
    }
  }

  // Track performance metrics
  trackPerformance(name: string, value: number, unit: string, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      metadata
    }

    this.performanceQueue.push(metric)
  }

  // Track security events
  trackSecurityEvent(
    event: string,
    severity: SecurityEvent['severity'],
    details: Record<string, any>
  ) {
    const securityEvent: SecurityEvent = {
      event,
      severity,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      ipAddress: details.ipAddress,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      details
    }

    this.securityQueue.push(securityEvent)

    // Flush security events immediately
    this.flush()
  }

  // Track errors
  trackError(type: string, details: Record<string, any>) {
    this.trackEvent('error', 'error', {
      type,
      ...details
    })
  }

  // Track user interactions
  trackUserInteraction(action: string, target: string, properties: Record<string, any> = {}) {
    this.trackEvent('user_interaction', 'user', {
      action,
      target,
      ...properties
    })
  }

  // Track business events
  trackBusinessEvent(event: string, properties: Record<string, any> = {}) {
    this.trackEvent(event, 'business', properties)
  }

  // Track authentication events
  trackAuthEvent(event: string, success: boolean, properties: Record<string, any> = {}) {
    this.trackEvent('auth', 'security', {
      event,
      success,
      ...properties
    })
  }

  // Track API calls
  trackApiCall(endpoint: string, method: string, status: number, duration: number) {
    this.trackEvent('api_call', 'performance', {
      endpoint,
      method,
      status,
      duration
    })
  }

  // Flush queued events to server
  private async flush() {
    if (this.queue.length === 0 && this.performanceQueue.length === 0 && this.securityQueue.length === 0) {
      return
    }

    const events = [...this.queue]
    const performanceMetrics = [...this.performanceQueue]
    const securityEvents = [...this.securityQueue]

    // Clear queues
    this.queue = []
    this.performanceQueue = []
    this.securityQueue = []

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events,
          performanceMetrics,
          securityEvents,
          sessionId: this.sessionId,
          userId: this.userId,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Failed to send telemetry data:', error)
      // Re-queue events for retry
      this.queue.unshift(...events)
      this.performanceQueue.unshift(...performanceMetrics)
      this.securityQueue.unshift(...securityEvents)
    }
  }

  // Cleanup
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush()
  }
}

// Create singleton instance
export const telemetry = new TelemetryService()

// Export convenience functions
export const trackEvent = (event: string, category: TelemetryEvent['category'], properties?: Record<string, any>) => {
  telemetry.trackEvent(event, category, properties)
}

export const trackUserInteraction = (action: string, target: string, properties?: Record<string, any>) => {
  telemetry.trackUserInteraction(action, target, properties)
}

export const trackBusinessEvent = (event: string, properties?: Record<string, any>) => {
  telemetry.trackBusinessEvent(event, properties)
}

export const trackAuthEvent = (event: string, success: boolean, properties?: Record<string, any>) => {
  telemetry.trackAuthEvent(event, success, properties)
}

export const trackApiCall = (endpoint: string, method: string, status: number, duration: number) => {
  telemetry.trackApiCall(endpoint, method, status, duration)
}

export const trackError = (type: string, details: Record<string, any>) => {
  telemetry.trackError(type, details)
}

export const setUserId = (userId: string) => {
  telemetry.setUserId(userId)
}
