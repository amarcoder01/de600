/**
 * Security Monitoring System
 * Comprehensive security event logging and monitoring
 */

import { NextRequest } from 'next/server'
import { secureQuery } from './secure-database'

export interface SecurityEvent {
  id?: string
  timestamp: Date
  eventType: SecurityEventType
  severity: SecuritySeverity
  userId?: string
  ipAddress: string
  userAgent: string
  requestId: string
  endpoint?: string
  method?: string
  details: Record<string, any>
  riskScore: number
  blocked: boolean
}

export enum SecurityEventType {
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  USER_REGISTRATION = 'USER_REGISTRATION',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  API_ACCESS = 'API_ACCESS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  PATH_TRAVERSAL_ATTEMPT = 'PATH_TRAVERSAL_ATTEMPT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  DATA_ACCESS = 'DATA_ACCESS',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  EMAIL_VERIFICATION_FAILED = 'EMAIL_VERIFICATION_FAILED',
  EMAIL_VERIFICATION_RESENT = 'EMAIL_VERIFICATION_RESENT',
  EMAIL_VERIFICATION_RESEND_FAILED = 'EMAIL_VERIFICATION_RESEND_FAILED',
  ERROR = 'ERROR',
  INFO = 'INFO'
}

export enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface SecurityMetrics {
  totalEvents: number
  eventsByType: Record<SecurityEventType, number>
  eventsBySeverity: Record<SecuritySeverity, number>
  topIpAddresses: Array<{ ip: string; count: number }>
  topUserAgents: Array<{ userAgent: string; count: number }>
  blockedRequests: number
  riskScoreDistribution: Record<string, number>
}

/**
 * Security Event Logger
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor
  private eventBuffer: SecurityEvent[] = []
  private readonly bufferSize = 100
  private readonly flushInterval = 30000 // 30 seconds
  
  private constructor() {
    // Start periodic flush
    setInterval(() => this.flushEvents(), this.flushInterval)
  }
  
  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor()
    }
    return SecurityMonitor.instance
  }
  
  /**
   * Log a security event
   */
  async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    }
    
    // Add to buffer
    this.eventBuffer.push(securityEvent)
    
    // Immediate logging for critical events
    if (securityEvent.severity === SecuritySeverity.CRITICAL) {
      await this.flushEvent(securityEvent)
    }
    
    // Console logging for debugging
    console.log(`🔒 Security Event [${securityEvent.severity}]:`, {
      type: securityEvent.eventType,
      ip: securityEvent.ipAddress,
      userAgent: securityEvent.userAgent.substring(0, 50),
      riskScore: securityEvent.riskScore,
      blocked: securityEvent.blocked
    })
    
    // Flush buffer if full
    if (this.eventBuffer.length >= this.bufferSize) {
      await this.flushEvents()
    }
  }
  
  /**
   * Flush all buffered events
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return
    
    const eventsToFlush = [...this.eventBuffer]
    this.eventBuffer = []
    
    try {
      await this.bulkInsertEvents(eventsToFlush)
    } catch (error) {
      console.error('Failed to flush security events:', error)
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...eventsToFlush)
    }
  }
  
  /**
   * Flush a single event immediately
   */
  private async flushEvent(event: SecurityEvent): Promise<void> {
    try {
      await this.insertEvent(event)
    } catch (error) {
      console.error('Failed to insert security event:', error)
    }
  }
  
  /**
   * Insert a single security event
   */
  private async insertEvent(event: SecurityEvent): Promise<void> {
    const result = await secureQuery(
      `INSERT INTO "SecurityEvent" (
        "id", "timestamp", "eventType", "severity", "userId", "ipAddress", 
        "userAgent", "requestId", "endpoint", "method", "details", 
        "riskScore", "blocked"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        event.id,
        event.timestamp.toISOString(),
        event.eventType,
        event.severity,
        event.userId || null,
        event.ipAddress,
        event.userAgent,
        event.requestId,
        event.endpoint || null,
        event.method || null,
        JSON.stringify(event.details),
        event.riskScore,
        event.blocked
      ]
    )
    
    if (!result.success) {
      throw new Error(`Failed to insert security event: ${result.error}`)
    }
  }
  
  /**
   * Bulk insert security events
   */
  private async bulkInsertEvents(events: SecurityEvent[]): Promise<void> {
    if (events.length === 0) return
    
    // Process events in batches to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize)
      
      // Insert each event individually to avoid complex parameterized queries
      const insertPromises = batch.map(event => this.insertEvent(event))
      
      try {
        await Promise.all(insertPromises)
      } catch (error) {
        console.error('Failed to insert security event batch:', error)
        // Continue with next batch even if one fails
      }
    }
  }
  
  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<SecurityMetrics> {
    const timeFilter = this.getTimeFilter(timeframe)
    
    const [
      totalEvents,
      eventsByType,
      eventsBySeverity,
      topIpAddresses,
      topUserAgents,
      blockedRequests,
      riskScoreDistribution
    ] = await Promise.all([
      this.getTotalEvents(timeFilter),
      this.getEventsByType(timeFilter),
      this.getEventsBySeverity(timeFilter),
      this.getTopIpAddresses(timeFilter),
      this.getTopUserAgents(timeFilter),
      this.getBlockedRequests(timeFilter),
      this.getRiskScoreDistribution(timeFilter)
    ])
    
    return {
      totalEvents,
      eventsByType,
      eventsBySeverity,
      topIpAddresses,
      topUserAgents,
      blockedRequests,
      riskScoreDistribution
    }
  }
  
  /**
   * Get total events count
   */
  private async getTotalEvents(timeFilter: string): Promise<number> {
    const result = await secureQuery(
      `SELECT COUNT(*)::integer as count FROM "SecurityEvent" WHERE ${timeFilter}`
    )
    return result.success ? result.rows[0]?.count || 0 : 0
  }
  
  /**
   * Get events by type
   */
  private async getEventsByType(timeFilter: string): Promise<Record<SecurityEventType, number>> {
    const result = await secureQuery(
      `SELECT "eventType", COUNT(*)::integer as count 
       FROM "SecurityEvent" 
       WHERE ${timeFilter}
       GROUP BY "eventType"`
    )
    
    const eventsByType: Record<string, number> = {}
    if (result.success) {
      for (const row of result.rows) {
        eventsByType[row.eventType] = row.count
      }
    }
    
    return eventsByType as Record<SecurityEventType, number>
  }
  
  /**
   * Get events by severity
   */
  private async getEventsBySeverity(timeFilter: string): Promise<Record<SecuritySeverity, number>> {
    const result = await secureQuery(
      `SELECT "severity", COUNT(*)::integer as count 
       FROM "SecurityEvent" 
       WHERE ${timeFilter}
       GROUP BY "severity"`
    )
    
    const eventsBySeverity: Record<string, number> = {}
    if (result.success) {
      for (const row of result.rows) {
        eventsBySeverity[row.severity] = row.count
      }
    }
    
    return eventsBySeverity as Record<SecuritySeverity, number>
  }
  
  /**
   * Get top IP addresses
   */
  private async getTopIpAddresses(timeFilter: string): Promise<Array<{ ip: string; count: number }>> {
    const result = await secureQuery(
      `SELECT "ipAddress" as ip, COUNT(*)::integer as count 
       FROM "SecurityEvent" 
       WHERE ${timeFilter}
       GROUP BY "ipAddress" 
       ORDER BY count DESC 
       LIMIT 10`
    )
    
    return result.success ? result.rows : []
  }
  
  /**
   * Get top user agents
   */
  private async getTopUserAgents(timeFilter: string): Promise<Array<{ userAgent: string; count: number }>> {
    const result = await secureQuery(
      `SELECT "userAgent", COUNT(*)::integer as count 
       FROM "SecurityEvent" 
       WHERE ${timeFilter}
       GROUP BY "userAgent" 
       ORDER BY count DESC 
       LIMIT 10`
    )
    
    return result.success ? result.rows : []
  }
  
  /**
   * Get blocked requests count
   */
  private async getBlockedRequests(timeFilter: string): Promise<number> {
    const result = await secureQuery(
      `SELECT COUNT(*)::integer as count 
       FROM "SecurityEvent" 
       WHERE ${timeFilter} AND "blocked" = true`
    )
    
    return result.success ? result.rows[0]?.count || 0 : 0
  }
  
  /**
   * Get risk score distribution
   */
  private async getRiskScoreDistribution(timeFilter: string): Promise<Record<string, number>> {
    const result = await secureQuery(
      `SELECT 
         CASE 
           WHEN "riskScore" < 25 THEN 'low'
           WHEN "riskScore" < 50 THEN 'medium'
           WHEN "riskScore" < 75 THEN 'high'
           ELSE 'critical'
         END as risk_category,
         COUNT(*)::integer as count
       FROM "SecurityEvent" 
       WHERE ${timeFilter}
       GROUP BY risk_category`
    )
    
    const distribution: Record<string, number> = {}
    if (result.success) {
      for (const row of result.rows) {
        distribution[row.risk_category] = row.count
      }
    }
    
    return distribution
  }
  
  /**
   * Get time filter for SQL queries
   */
  private getTimeFilter(timeframe: string): string {
    const now = new Date()
    let startTime: Date
    
    switch (timeframe) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }
    
    return `"timestamp" >= '${startTime.toISOString()}'`
  }
  
  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
  
  /**
   * Calculate risk score for an event
   */
  calculateRiskScore(event: Partial<SecurityEvent>, request?: NextRequest): number {
    let riskScore = 0
    
    // Base risk by event type
    switch (event.eventType) {
      case SecurityEventType.LOGIN_FAILURE:
        riskScore += 20
        break
      case SecurityEventType.ACCOUNT_LOCKED:
        riskScore += 40
        break
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        riskScore += 30
        break
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        riskScore += 60
        break
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
        riskScore += 80
        break
      case SecurityEventType.XSS_ATTEMPT:
        riskScore += 70
        break
      case SecurityEventType.UNAUTHORIZED_ACCESS:
        riskScore += 50
        break
    }
    
    // Risk by severity
    switch (event.severity) {
      case SecuritySeverity.LOW:
        riskScore += 10
        break
      case SecuritySeverity.MEDIUM:
        riskScore += 25
        break
      case SecuritySeverity.HIGH:
        riskScore += 50
        break
      case SecuritySeverity.CRITICAL:
        riskScore += 75
        break
    }
    
    // Additional risk factors
    if (event.blocked) {
      riskScore += 30
    }
    
    // IP-based risk (simplified)
    if (event.ipAddress) {
      if (event.ipAddress.includes('192.168.') || event.ipAddress.includes('127.0.0.1')) {
        riskScore += 5 // Local IPs are lower risk
      } else if (event.ipAddress.includes('10.') || event.ipAddress.includes('172.')) {
        riskScore += 10 // Private IPs
      }
    }
    
    return Math.min(riskScore, 100) // Cap at 100
  }
}

// Global security monitor instance
export const securityMonitor = SecurityMonitor.getInstance()

/**
 * Log security event helper function
 */
export async function logSecurityEvent(
  eventType: SecurityEventType,
  severity: SecuritySeverity,
  request: NextRequest,
  details: Record<string, any> = {},
  userId?: string,
  blocked: boolean = false
): Promise<void> {
  const ipAddress = request.ip || 
                   request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`
  
  const event: Omit<SecurityEvent, 'id' | 'timestamp' | 'riskScore'> = {
    eventType,
    severity,
    userId,
    ipAddress,
    userAgent,
    requestId,
    endpoint: new URL(request.url).pathname,
    method: request.method,
    details,
    blocked
  }
  
  const riskScore = securityMonitor.calculateRiskScore(event, request)
  
  await securityMonitor.logEvent({
    ...event,
    riskScore
  })
}

