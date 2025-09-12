/**
 * Secure Database Operations
 * Provides safe database access with SQL injection protection and connection pooling
 */

import { Pool, PoolClient } from 'pg'
import { query as pgQuery, pool } from './pg'
import { SECURITY_CONFIG } from './security-config'

export interface QueryOptions {
  timeout?: number
  retries?: number
  transaction?: boolean
}

export interface SecureQueryResult<T = any> {
  rows: T[]
  rowCount: number
  success: boolean
  error?: string
}

/**
 * Secure query execution with parameterized statements
 */
export async function secureQuery<T = any>(
  text: string,
  params: any[] = [],
  options: QueryOptions = {}
): Promise<SecureQueryResult<T>> {
  const { timeout = 30000, retries = 3, transaction = false } = options
  
  // Validate query for potential SQL injection
  if (!isQuerySafe(text)) {
    return {
      rows: [],
      rowCount: 0,
      success: false,
      error: 'Query contains potentially unsafe operations'
    }
  }
  
  // Validate parameters
  const validationResult = validateQueryParams(params)
  if (!validationResult.isValid) {
    return {
      rows: [],
      rowCount: 0,
      success: false,
      error: `Invalid query parameters: ${validationResult.errors.join(', ')}`
    }
  }
  
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔍 Secure Query (attempt ${attempt}/${retries}):`, {
        query: text.substring(0, 100) + '...',
        paramCount: params.length,
        timeout
      })
      
      const result = await pgQuery(text, params)
      
      console.log(`✅ Secure Query successful:`, {
        rowCount: result.rows.length,
        attempt
      })
      
      return {
        rows: result.rows,
        rowCount: result.rows.length,
        success: true
      }
      
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Secure Query attempt ${attempt} failed:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: text.substring(0, 100) + '...'
      })
      
      // Don't retry on certain types of errors
      if (isNonRetryableError(error as Error)) {
        break
      }
      
      if (attempt < retries) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  return {
    rows: [],
    rowCount: 0,
    success: false,
    error: lastError?.message || 'Query execution failed after all retries'
  }
}

/**
 * Secure transaction execution
 */
export async function secureTransaction<T>(
  operations: (client: PoolClient) => Promise<T>,
  options: QueryOptions = {}
): Promise<{ success: boolean; result?: T; error?: string }> {
  const { timeout = 30000, retries = 3 } = options
  
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = await pool.connect()
    
    try {
      console.log(`🔍 Secure Transaction (attempt ${attempt}/${retries})`)
      
      await client.query('BEGIN')
      
      const result = await Promise.race([
        operations(client),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), timeout)
        )
      ])
      
      await client.query('COMMIT')
      
      console.log(`✅ Secure Transaction successful:`, { attempt })
      
      return { success: true, result }
      
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError)
      }
      
      lastError = error as Error
      console.error(`❌ Secure Transaction attempt ${attempt} failed:`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      if (isNonRetryableError(error as Error)) {
        break
      }
      
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
    } finally {
      client.release()
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'Transaction failed after all retries'
  }
}

/**
 * Validate query safety
 */
function isQuerySafe(query: string): boolean {
  const dangerousPatterns = [
    /--/g,                    // SQL comments
    /\/\*[\s\S]*?\*\//g,      // Block comments
    /;\s*drop\s+/gi,          // DROP statements
    /;\s*delete\s+from\s+/gi, // DELETE without WHERE
    /;\s*truncate\s+/gi,      // TRUNCATE
    /;\s*alter\s+/gi,         // ALTER statements
    /;\s*create\s+/gi,        // CREATE statements
    /;\s*grant\s+/gi,         // GRANT statements
    /;\s*revoke\s+/gi,        // REVOKE statements
    /union\s+select/gi,       // UNION injection
    /information_schema/gi,   // Information schema access
    /pg_/gi,                  // PostgreSQL system tables
    /exec\s*\(/gi,            // Command execution
    /sp_/gi,                  // Stored procedures
    /xp_/gi,                  // Extended procedures
    /waitfor\s+delay/gi,      // Time-based attacks
    /benchmark\s*\(/gi,       // MySQL time-based attacks
    /sleep\s*\(/gi,           // Sleep functions
    /load_file\s*\(/gi,       // File reading
    /into\s+outfile/gi,       // File writing
    /char\s*\(/gi,            // Character conversion (potential encoding attacks)
    /ascii\s*\(/gi,           // ASCII conversion
    /hex\s*\(/gi,             // Hex conversion
    /unhex\s*\(/gi,           // Hex decoding
    /@@version/gi,            // Version information
    /@@hostname/gi,           // Hostname information
    /user\s*\(/gi,            // User function
    /database\s*\(/gi,        // Database function
    /schema\s*\(/gi           // Schema function
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      console.error('🚫 Unsafe query pattern detected:', pattern.source)
      return false
    }
  }
  
  // Check for parameterized queries (should use $1, $2, etc.)
  if (query.includes('$') && !/\$\d+/.test(query)) {
    console.error('🚫 Invalid parameter placeholder format')
    return false
  }
  
  return true
}

/**
 * Validate query parameters
 */
function validateQueryParams(params: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  for (let i = 0; i < params.length; i++) {
    const param = params[i]
    
    if (param === null || param === undefined) {
      continue // NULL values are allowed
    }
    
    if (typeof param === 'string') {
      // Check for potential injection patterns
      const dangerousPatterns = [
        /--/,
        /\/\*/,
        /;\s*drop/i,
        /;\s*delete/i,
        /;\s*truncate/i,
        /;\s*alter/i,
        /union\s+select/i,
        /information_schema/i,
        /pg_/i,
        /exec\s*\(/i,
        /waitfor\s+delay/i,
        /benchmark\s*\(/i,
        /sleep\s*\(/i,
        /load_file\s*\(/i,
        /into\s+outfile/i
      ]
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(param)) {
          errors.push(`Parameter ${i + 1} contains potentially dangerous pattern: ${pattern.source}`)
          break
        }
      }
      
      // Check parameter length
      if (param.length > 10000) {
        errors.push(`Parameter ${i + 1} is too long (${param.length} characters)`)
      }
    }
    
    if (typeof param === 'object' && param !== null) {
      errors.push(`Parameter ${i + 1} is an object, which is not allowed in queries`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Check if error is non-retryable
 */
function isNonRetryableError(error: Error): boolean {
  const nonRetryablePatterns = [
    /syntax error/i,
    /invalid input/i,
    /permission denied/i,
    /relation.*does not exist/i,
    /column.*does not exist/i,
    /duplicate key/i,
    /unique constraint/i,
    /check constraint/i,
    /foreign key/i,
    /not null/i,
    /invalid.*format/i
  ]
  
  const message = error.message.toLowerCase()
  return nonRetryablePatterns.some(pattern => pattern.test(message))
}

/**
 * Secure user operations
 */
export class SecureUserOperations {
  
  /**
   * Get user by ID with security checks
   */
  static async getUserById(userId: string): Promise<SecureQueryResult> {
    if (!userId || typeof userId !== 'string') {
      return {
        rows: [],
        rowCount: 0,
        success: false,
        error: 'Invalid user ID'
      }
    }
    
    return secureQuery(
      'SELECT id, email, "firstName", "lastName", "isEmailVerified", "isAccountLocked", "isAccountDisabled", "createdAt", "updatedAt" FROM "User" WHERE id = $1',
      [userId]
    )
  }
  
  /**
   * Get user by email with security checks
   */
  static async getUserByEmail(email: string): Promise<SecureQueryResult> {
    if (!email || typeof email !== 'string') {
      return {
        rows: [],
        rowCount: 0,
        success: false,
        error: 'Invalid email'
      }
    }
    
    return secureQuery(
      'SELECT id, email, password, "firstName", "lastName", "isEmailVerified", "isAccountLocked", "isAccountDisabled", "failedLoginAttempts", "lockoutUntil" FROM "User" WHERE email = $1',
      [email.toLowerCase().trim()]
    )
  }
  
  /**
   * Create user with security checks
   */
  static async createUser(userData: {
    id: string
    email: string
    password: string
    firstName: string
    lastName: string
  }): Promise<SecureQueryResult> {
    return secureQuery(
      'INSERT INTO "User" (id, email, password, "firstName", "lastName", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id, email, "firstName", "lastName", "createdAt"',
      [userData.id, userData.email.toLowerCase().trim(), userData.password, userData.firstName.trim(), userData.lastName.trim()]
    )
  }
  
  /**
   * Update user login attempts
   */
  static async updateLoginAttempts(userId: string, attempts: number, lockoutUntil?: Date): Promise<SecureQueryResult> {
    if (lockoutUntil) {
      return secureQuery(
        'UPDATE "User" SET "failedLoginAttempts" = $2, "lockoutUntil" = $3, "updatedAt" = NOW() WHERE id = $1',
        [userId, attempts, lockoutUntil]
      )
    } else {
      return secureQuery(
        'UPDATE "User" SET "failedLoginAttempts" = $2, "updatedAt" = NOW() WHERE id = $1',
        [userId, attempts]
      )
    }
  }
  
  /**
   * Reset login attempts on successful login
   */
  static async resetLoginAttempts(userId: string): Promise<SecureQueryResult> {
    return secureQuery(
      'UPDATE "User" SET "failedLoginAttempts" = 0, "lockoutUntil" = NULL, "lastLoginAt" = NOW(), "updatedAt" = NOW() WHERE id = $1',
      [userId]
    )
  }
}

/**
 * Secure portfolio operations
 */
export class SecurePortfolioOperations {
  
  /**
   * Get portfolio by ID with ownership check
   */
  static async getPortfolioById(portfolioId: string, userId: string): Promise<SecureQueryResult> {
    return secureQuery(
      'SELECT id, name, "userId", "createdAt", "updatedAt" FROM "Portfolio" WHERE id = $1 AND "userId" = $2',
      [portfolioId, userId]
    )
  }
  
  /**
   * Get user portfolios
   */
  static async getUserPortfolios(userId: string): Promise<SecureQueryResult> {
    return secureQuery(
      'SELECT id, name, "createdAt", "updatedAt" FROM "Portfolio" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
      [userId]
    )
  }
  
  /**
   * Create portfolio
   */
  static async createPortfolio(userId: string, name: string): Promise<SecureQueryResult> {
    return secureQuery(
      'INSERT INTO "Portfolio" (id, name, "userId", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING id, name, "createdAt"',
      [name.trim(), userId]
    )
  }
  
  /**
   * Update portfolio
   */
  static async updatePortfolio(portfolioId: string, userId: string, name: string): Promise<SecureQueryResult> {
    return secureQuery(
      'UPDATE "Portfolio" SET name = $3, "updatedAt" = NOW() WHERE id = $1 AND "userId" = $2 RETURNING id, name, "updatedAt"',
      [portfolioId, userId, name.trim()]
    )
  }
  
  /**
   * Delete portfolio
   */
  static async deletePortfolio(portfolioId: string, userId: string): Promise<SecureQueryResult> {
    return secureQuery(
      'DELETE FROM "Portfolio" WHERE id = $1 AND "userId" = $2',
      [portfolioId, userId]
    )
  }
}

/**
 * Secure trade operations
 */
export class SecureTradeOperations {
  
  /**
   * Get trades for portfolio with ownership check
   */
  static async getPortfolioTrades(portfolioId: string, userId: string): Promise<SecureQueryResult> {
    return secureQuery(
      `SELECT t.id, t.symbol, t.type, t.quantity, t.price, t.amount, t.date, t.notes
       FROM "Trade" t
       JOIN "Portfolio" p ON t."portfolioId" = p.id
       WHERE p.id = $1 AND p."userId" = $2
       ORDER BY t.date DESC`,
      [portfolioId, userId]
    )
  }
  
  /**
   * Create trade with ownership check
   */
  static async createTrade(portfolioId: string, userId: string, tradeData: {
    symbol: string
    type: string
    quantity: number
    price: number
    amount: number
    notes?: string
  }): Promise<SecureQueryResult> {
    return secureQuery(
      `INSERT INTO "Trade" (id, "portfolioId", symbol, type, quantity, price, amount, date, notes)
       SELECT gen_random_uuid(), $1, $3, $4, $5, $6, $7, NOW(), $8
       WHERE EXISTS (SELECT 1 FROM "Portfolio" WHERE id = $1 AND "userId" = $2)
       RETURNING id, symbol, type, quantity, price, amount, date`,
      [portfolioId, userId, tradeData.symbol.toUpperCase(), tradeData.type, tradeData.quantity, tradeData.price, tradeData.amount, tradeData.notes || null]
    )
  }
}

