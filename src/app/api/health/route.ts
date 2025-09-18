import { NextResponse } from 'next/server'
import { getDatabaseStatus, performHealthCheck } from '@/lib/db-init'

export async function GET() {
  try {
    const startTime = Date.now()
    
    // Get database status
    const dbStatus = await getDatabaseStatus()
    
    // Perform additional health check
    const healthCheck = await performHealthCheck()
    
    const responseTime = Date.now() - startTime
    
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: {
        status: dbStatus.isConnected ? 'connected' : 'disconnected',
        initialized: dbStatus.isInitialized,
        health: healthCheck.status,
        error: dbStatus.error || null,
        lastHealthCheck: dbStatus.lastHealthCheck ? new Date(dbStatus.lastHealthCheck).toISOString() : null
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        databaseUrlPreview: process.env.DATABASE_URL ? 
          `${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'configured'}` : 
          'missing'
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      },
      performance: {
        responseTime: responseTime,
        healthCheckStatus: healthCheck.status,
        healthCheckDetails: healthCheck.details
      }
    }
    
    // Determine overall status
    if (!dbStatus.isConnected || !dbStatus.isInitialized) {
      healthStatus.status = 'degraded'
    }
    
    if (dbStatus.error || healthCheck.status === 'unhealthy') {
      healthStatus.status = 'error'
    }
    
    const statusCode = healthStatus.status === 'ok' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503
    
    return NextResponse.json(healthStatus, { status: statusCode })
    
  } catch (error) {
    console.error('❌ Health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        status: 'unknown',
        initialized: false,
        health: 'unhealthy',
        error: 'Health check failed'
      },
      system: {
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version
      }
    }, { status: 503 })
  }
}
