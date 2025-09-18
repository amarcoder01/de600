import { initializeDatabase, testDatabaseConnection, ensureDatabaseReady, getDatabaseStatus as getDbStatus } from './db'

// Global flag to track initialization status
let isInitialized = false
let initializationPromise: Promise<void> | null = null
let lastHealthCheck = 0
const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds

/**
 * Initialize the database connection
 * This function ensures the database is ready before any operations
 */
export const ensureDatabaseInitialized = async (): Promise<void> => {
  // If already initialized, return immediately
  if (isInitialized) {
    return
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    await initializationPromise
    return
  }

  // Start initialization
  initializationPromise = initializeDatabase()
  
  try {
    await initializationPromise
    isInitialized = true
    console.log('✅ Database initialization completed successfully')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    // Reset promise so it can be retried
    initializationPromise = null
    throw error
  } finally {
    initializationPromise = null
  }
}

/**
 * Test database connection and return status
 */
export const getDatabaseStatus = async (): Promise<{
  isConnected: boolean
  isInitialized: boolean
  error?: string
  lastHealthCheck?: number
}> => {
  try {
    if (!isInitialized) {
      return {
        isConnected: false,
        isInitialized: false,
        error: 'Database not initialized'
      }
    }

    // Check if we need to perform a health check
    const now = Date.now()
    if (now - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
      await ensureDatabaseReady()
      lastHealthCheck = now
    }

    const status = getDbStatus()
    
    return {
      isConnected: status.isConnected,
      isInitialized: true,
      error: status.isConnected ? undefined : 'Connection test failed',
      lastHealthCheck: lastHealthCheck
    }
  } catch (error) {
    return {
      isConnected: false,
      isInitialized: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Retry database initialization with exponential backoff
 */
export const retryDatabaseInitialization = async (maxRetries = 3): Promise<void> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Retrying database initialization (attempt ${attempt}/${maxRetries})...`)
      await ensureDatabaseInitialized()
      return
    } catch (error) {
      console.error(`❌ Database initialization attempt ${attempt} failed:`, error)
      
      if (attempt === maxRetries) {
        throw new Error(`Database initialization failed after ${maxRetries} attempts`)
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000
      console.log(`⏳ Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

/**
 * Perform a health check on the database
 */
export const performHealthCheck = async (): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  details: string
  timestamp: number
}> => {
  try {
    await ensureDatabaseReady()
    await testDatabaseConnection(1) // Quick test
    
    return {
      status: 'healthy',
      details: 'Database connection is stable and responsive',
      timestamp: Date.now()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }
  }
}

// Initialize database when this module is imported (only on server side)
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  // Only run on server side
  ensureDatabaseInitialized().catch(error => {
    console.error('❌ Failed to initialize database on startup:', error)
    // Don't crash the application, just log the error
  })
}
