import { PrismaClient } from '@prisma/client'

// Global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined
}

// Connection status tracking
let isConnected = false
let connectionPromise: Promise<boolean> | null = null
let lastConnectionAttempt = 0
const CONNECTION_RETRY_DELAY = 5000 // 5 seconds

// Enhanced Prisma client configuration with production-ready features
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })

  // Enhanced error handling
  client.$on('error', (e) => {
    console.error('❌ Prisma client error:', e)
    isConnected = false
  })

  return client
}

// Singleton Prisma client with connection management
let prisma: PrismaClient

if (process.env.NODE_ENV === 'development') {
  // In development, use global instance to prevent multiple connections
  if (!globalThis.__prisma) {
    globalThis.__prisma = createPrismaClient()
  }
  prisma = globalThis.__prisma
} else {
  // In production, create new instance
  prisma = createPrismaClient()
}

// Enhanced database connection test with retry logic and health checks
export const testDatabaseConnection = async (maxRetries = 3): Promise<boolean> => {
  // If we have a recent connection attempt, wait
  const now = Date.now()
  if (connectionPromise && (now - lastConnectionAttempt) < CONNECTION_RETRY_DELAY) {
    try {
      await connectionPromise
      return isConnected
    } catch {
      // Connection failed, continue with retry logic
    }
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Testing database connection (attempt ${attempt}/${maxRetries})...`)
      
      // Test connection with a simple query
      await prisma.$queryRaw`SELECT 1`
      
      isConnected = true
      console.log('✅ Database connection successful')
      return true
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, error)
      isConnected = false
      
      if (attempt === maxRetries) {
        console.error('❌ All database connection attempts failed')
        return false
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000
      console.log(`⏳ Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return false
}

// Initialize database connection on startup
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('🚀 Initializing database connection...')
    
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not configured')
    }
    
    // Test connection
    const isConnected = await testDatabaseConnection()
    
    if (!isConnected) {
      throw new Error('Failed to establish database connection after multiple attempts')
    }
    
    console.log('✅ Database initialized successfully')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  }
}

// Get database connection status
export const getDatabaseStatus = (): { isConnected: boolean; lastAttempt: number } => {
  return {
    isConnected,
    lastAttempt: lastConnectionAttempt
  }
}

// Ensure database is ready before operations
export const ensureDatabaseReady = async (): Promise<void> => {
  if (isConnected) {
    return
  }

  // If there's no active connection attempt, start one
  if (!connectionPromise) {
    connectionPromise = testDatabaseConnection()
    lastConnectionAttempt = Date.now()
  }

  try {
    await connectionPromise
  } finally {
    connectionPromise = null
  }
}

// Graceful shutdown (only for production)
export const disconnectDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Disconnecting from database...')
    await prisma.$disconnect()
    isConnected = false
    console.log('✅ Database disconnected successfully')
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error)
  }
}

// Export the configured Prisma client
export { prisma }

// Database service for all user data operations
export class DatabaseService {
  // Test database connection
  static async testConnection(): Promise<boolean> {
    try {
      await ensureDatabaseReady()
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('❌ Database connection test failed:', error)
      return false
    }
  }

  // Get or create demo user for testing
  static async getOrCreateDemoUser() {
    try {
      await ensureDatabaseReady()
      
      // Check if demo user exists
      let user = await prisma.user.findUnique({
        where: { email: 'demo@vidality.com' }
      })

      if (!user) {
        // Create demo user if doesn't exist
        user = await prisma.user.create({
          data: {
            email: 'demo@vidality.com',
            password: '$2a$10$demo.hash.for.testing.purposes.only',
            firstName: 'Demo',
            lastName: 'User',
            isEmailVerified: true,
            preferences: JSON.stringify({
              theme: 'system',
              currency: 'USD',
              timezone: 'UTC',
              notifications: {
                email: true,
                push: true,
                sms: false
              }
            })
          }
        })
        console.log('✅ Demo user created successfully')
      }

      return user
    } catch (error) {
      console.error('❌ Error getting/creating demo user:', error)
      throw error
    }
  }

  // ===== WATCHLIST OPERATIONS =====
  
  // Create a new watchlist for a user
  static async createWatchlist(userId: string, name: string = 'My Watchlist') {
    try {
      await ensureDatabaseReady()
      
      // Check if watchlist with same name already exists for this user
      const existingWatchlist = await prisma.watchlist.findFirst({
        where: { 
          userId,
          name 
        }
      })
      
      if (existingWatchlist) {
        throw new Error(`Watchlist "${name}" already exists`)
      }
      
      const watchlist = await prisma.watchlist.create({
        data: {
          userId,
          name,
        },
        include: {
          items: true
        }
      })
      
      console.log('✅ Watchlist created successfully:', watchlist.name)
      return watchlist
    } catch (error) {
      console.error('❌ Error creating watchlist:', error)
      throw error
    }
  }

  // Get all watchlists for a user
  static async getWatchlists(userId: string) {
    try {
      await ensureDatabaseReady()
      
      const watchlists = await prisma.watchlist.findMany({
        where: { userId },
        include: {
          items: {
            orderBy: { addedAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      return watchlists
    } catch (error) {
      console.error('❌ Error getting watchlists:', error)
      throw error
    }
  }

  // Get a specific watchlist by ID
  static async getWatchlistById(watchlistId: string, userId: string) {
    try {
      await ensureDatabaseReady()
      
      const watchlist = await prisma.watchlist.findFirst({
        where: { 
          id: watchlistId,
          userId 
        },
        include: {
          items: {
            orderBy: { addedAt: 'desc' }
          }
        }
      })
      
      return watchlist
    } catch (error) {
      console.error('❌ Error getting watchlist by ID:', error)
      throw error
    }
  }

  // Get a specific watchlist by ID (alias for backward compatibility)
  static async getWatchlist(watchlistId: string) {
    try {
      await ensureDatabaseReady()
      
      const watchlist = await prisma.watchlist.findUnique({
        where: { id: watchlistId },
        include: {
          items: {
            orderBy: { addedAt: 'desc' }
          }
        }
      })
      
      return watchlist
    } catch (error) {
      console.error('❌ Error getting watchlist:', error)
      throw error
    }
  }

  // Add a stock to a watchlist
  static async addStockToWatchlist(watchlistId: string, symbol: string, userId: string) {
    try {
      await ensureDatabaseReady()
      
      // Verify watchlist ownership
      const watchlist = await prisma.watchlist.findFirst({
        where: { 
          id: watchlistId,
          userId 
        }
      })
      
      if (!watchlist) {
        throw new Error('Watchlist not found or access denied')
      }
      
      // Check if stock already exists in watchlist
      const existingItem = await prisma.watchlistItem.findFirst({
        where: { 
          watchlistId,
          symbol: symbol.toUpperCase()
        }
      })
      
      if (existingItem) {
        throw new Error(`Stock ${symbol} is already in this watchlist`)
      }
      
      const item = await prisma.watchlistItem.create({
        data: {
          watchlistId,
          symbol: symbol.toUpperCase(),
          name: symbol.toUpperCase(), // Required field
          type: 'stock', // Required field
          addedAt: new Date()
        }
      })
      
      console.log('✅ Stock added to watchlist:', symbol)
      return item
    } catch (error) {
      console.error('❌ Error adding stock to watchlist:', error)
      throw error
    }
  }

  // Add a stock to a watchlist with full stock data (alias for backward compatibility)
  static async addToWatchlist(watchlistId: string, stockData: {
    symbol: string
    name: string
    type: string
    price: number
    change: number
    changePercent: number
    exchange?: string
    sector?: string
    industry?: string
    volume?: number
    marketCap?: number
  }) {
    try {
      await ensureDatabaseReady()
      
      // Check if item already exists
      const existingItem = await prisma.watchlistItem.findFirst({
        where: {
          watchlistId,
          symbol: stockData.symbol,
        }
      })

      if (existingItem) {
        // Update existing item
        const updatedItem = await prisma.watchlistItem.update({
          where: { id: existingItem.id },
          data: {
            name: stockData.name,
            price: stockData.price,
            change: stockData.change,
            changePercent: stockData.changePercent,
            exchange: stockData.exchange,
            sector: stockData.sector,
            industry: stockData.industry,
            volume: stockData.volume,
            marketCap: stockData.marketCap,
            lastUpdated: new Date(),
          }
        })
        return updatedItem
      } else {
        // Create new item
        const newItem = await prisma.watchlistItem.create({
          data: {
            watchlistId,
            symbol: stockData.symbol,
            name: stockData.name,
            type: stockData.type,
            price: stockData.price,
            change: stockData.change,
            changePercent: stockData.changePercent,
            exchange: stockData.exchange,
            sector: stockData.sector,
            industry: stockData.industry,
            volume: stockData.volume,
            marketCap: stockData.marketCap,
            lastUpdated: new Date(),
          }
        })
        return newItem
      }
    } catch (error) {
      console.error('❌ Error adding to watchlist:', error)
      throw error
    }
  }

  // Remove a stock from a watchlist
  static async removeStockFromWatchlist(watchlistId: string, symbol: string, userId: string) {
    try {
      await ensureDatabaseReady()
      
      // Verify watchlist ownership
      const watchlist = await prisma.watchlist.findFirst({
        where: { 
          id: watchlistId,
          userId 
        }
      })
      
      if (!watchlist) {
        throw new Error('Watchlist not found or access denied')
      }
      
      const deletedItem = await prisma.watchlistItem.deleteMany({
        where: { 
          watchlistId,
          symbol: symbol.toUpperCase()
        }
      })
      
      if (deletedItem.count === 0) {
        throw new Error(`Stock ${symbol} not found in watchlist`)
      }
      
      console.log('✅ Stock removed from watchlist:', symbol)
      return { success: true, deletedCount: deletedItem.count }
    } catch (error) {
      console.error('❌ Error removing stock from watchlist:', error)
      throw error
    }
  }

  // Remove a stock from a watchlist (alias for backward compatibility)
  static async removeFromWatchlist(watchlistId: string, symbol: string) {
    try {
      console.log(`🗑️ Database: Removing ${symbol} from watchlist ${watchlistId}...`)
      
      // First, verify the watchlist exists
      const watchlist = await prisma.watchlist.findUnique({
        where: { id: watchlistId }
      })
      
      if (!watchlist) {
        throw new Error(`Watchlist ${watchlistId} not found`)
      }
      
      // Find the item to verify it exists
      const item = await prisma.watchlistItem.findFirst({
        where: {
          watchlistId,
          symbol: symbol.toUpperCase(), // Normalize symbol case
        }
      })
      
      if (!item) {
        throw new Error(`Stock ${symbol} not found in watchlist`)
      }
      
      // Delete the item
      const deletedItem = await prisma.watchlistItem.delete({
        where: {
          id: item.id
        }
      })
      
      console.log(`✅ Database: Successfully removed ${symbol} from watchlist ${watchlistId}`)
      return deletedItem
    } catch (error) {
      console.error('❌ Error removing from watchlist:', error)
      throw error
    }
  }

  // Delete a watchlist
  static async deleteWatchlist(watchlistId: string, userId: string) {
    try {
      await ensureDatabaseReady()
      
      // Verify watchlist ownership
      const watchlist = await prisma.watchlist.findFirst({
        where: { 
          id: watchlistId,
          userId 
        }
      })
      
      if (!watchlist) {
        throw new Error('Watchlist not found or access denied')
      }
      
      // Delete watchlist items first (cascade delete)
      await prisma.watchlistItem.deleteMany({
        where: { watchlistId }
      })
      
      // Delete the watchlist
      await prisma.watchlist.delete({
        where: { id: watchlistId }
      })
      
      console.log('✅ Watchlist deleted successfully:', watchlist.name)
      return { success: true }
    } catch (error) {
      console.error('❌ Error deleting watchlist:', error)
      throw error
    }
  }

  // Delete a watchlist (alias for backward compatibility - no userId check)
  static async deleteWatchlistById(watchlistId: string) {
    try {
      await ensureDatabaseReady()
      
      // Delete watchlist items first (cascade delete)
      await prisma.watchlistItem.deleteMany({
        where: { watchlistId }
      })
      
      // Delete the watchlist
      await prisma.watchlist.delete({
        where: { id: watchlistId }
      })
      
      console.log('✅ Watchlist deleted successfully:', watchlistId)
      return { success: true }
    } catch (error) {
      console.error('❌ Error deleting watchlist:', error)
      throw error
    }
  }

  // Update watchlist name
  static async updateWatchlistName(watchlistId: string, newName: string, userId: string) {
    try {
      await ensureDatabaseReady()
      
      // Verify watchlist ownership
      const watchlist = await prisma.watchlist.findFirst({
        where: { 
          id: watchlistId,
          userId 
        }
      })
      
      if (!watchlist) {
        throw new Error('Watchlist not found or access denied')
      }
      
      // Check if new name already exists for this user
      const existingWatchlist = await prisma.watchlist.findFirst({
        where: { 
          userId,
          name: newName,
          id: { not: watchlistId }
        }
      })
      
      if (existingWatchlist) {
        throw new Error(`Watchlist "${newName}" already exists`)
      }
      
      const updatedWatchlist = await prisma.watchlist.update({
        where: { id: watchlistId },
        data: { name: newName }
      })
      
      console.log('✅ Watchlist name updated:', newName)
      return updatedWatchlist
    } catch (error) {
      console.error('❌ Error updating watchlist name:', error)
      throw error
    }
  }

  // ===== USER PREFERENCES AND SETTINGS =====

  // Get user preferences
  static async getUserPreferences(userId: string) {
    try {
      await ensureDatabaseReady()
      
      // Handle anonymous users - use localStorage-based storage
      if (userId.startsWith('anon_')) {
        return this.getAnonymousUserPreferences(userId)
      }
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true }
      })
      
      if (!user || !user.preferences) {
        return this.getDefaultPreferences()
      }
      
      return JSON.parse(user.preferences)
    } catch (error) {
      console.error('❌ Error fetching user preferences:', error)
      return this.getDefaultPreferences()
    }
  }

  // Update user preferences
  static async updateUserPreferences(userId: string, preferences: any) {
    try {
      await ensureDatabaseReady()
      
      // Handle anonymous users - use localStorage-based storage
      if (userId.startsWith('anon_')) {
        return this.updateAnonymousUserPreferences(userId, preferences)
      }
      
      const currentPreferences = await this.getUserPreferences(userId)
      const updatedPreferences = { ...currentPreferences, ...preferences }
      
      await prisma.user.update({
        where: { id: userId },
        data: { preferences: JSON.stringify(updatedPreferences) }
      })
      
      return updatedPreferences
    } catch (error) {
      console.error('❌ Error updating user preferences:', error)
      throw error
    }
  }

  // Get default preferences
  static getDefaultPreferences() {
    return {
      theme: 'system',
      currency: 'USD',
      timezone: 'UTC',
      notifications: {
        email: true,
        push: true,
        sms: false
      },
      security: {
        mfaEnabled: false,
        trustedDevices: [],
        lastPasswordChange: new Date().toISOString()
      },
      trading: {
        defaultOrderType: 'market',
        defaultQuantity: 100,
        showConfirmations: true
      },
      display: {
        chartType: 'candlestick',
        timeFrame: '1D',
        showVolume: true,
        showIndicators: true
      },
      // User data collections
      recentSearches: [],
      favoriteStocks: [],
      portfolioData: {
        positions: [],
        transactions: [],
        trades: []
      },
      tradingStrategies: [],
      stockComparisonSessions: [],
      marketSearchHistory: []
    }
  }

  // Anonymous user storage methods (using localStorage)
  static getAnonymousUserPreferences(userId: string) {
    if (typeof window === 'undefined') {
      return this.getDefaultPreferences()
    }
    
    try {
      const key = `user_prefs_${userId}`
      const stored = localStorage.getItem(key)
      if (stored) {
        return JSON.parse(stored)
      }
      
      // Initialize with defaults
      const defaults = this.getDefaultPreferences()
      localStorage.setItem(key, JSON.stringify(defaults))
      return defaults
    } catch (error) {
      console.error('❌ Error getting anonymous user preferences:', error)
      return this.getDefaultPreferences()
    }
  }

  static updateAnonymousUserPreferences(userId: string, preferences: any) {
    if (typeof window === 'undefined') {
      return this.getDefaultPreferences()
    }
    
    try {
      const key = `user_prefs_${userId}`
      const current = this.getAnonymousUserPreferences(userId)
      const updated = { ...current, ...preferences }
      localStorage.setItem(key, JSON.stringify(updated))
      return updated
    } catch (error) {
      console.error('❌ Error updating anonymous user preferences:', error)
      return this.getDefaultPreferences()
    }
  }

  // ===== USER DATA STORAGE =====

  // Store recent searches for a user
  static async storeRecentSearch(userId: string, searchData: {
    query: string
    results: any[]
    timestamp: Date
  }) {
    try {
      await ensureDatabaseReady()
      
      const preferences = await this.getUserPreferences(userId)
      const recentSearches = preferences.recentSearches || []
      
      // Remove duplicate if exists
      const filteredSearches = recentSearches.filter(
        (search: any) => search.query !== searchData.query
      )
      
      // Add new search at the beginning
      const updatedSearches = [
        {
          query: searchData.query,
          results: searchData.results.slice(0, 5), // Store only first 5 results
          timestamp: searchData.timestamp.toISOString()
        },
        ...filteredSearches
      ].slice(0, 10) // Keep only last 10 searches
      
      await this.updateUserPreferences(userId, { recentSearches: updatedSearches })
      return updatedSearches
    } catch (error) {
      console.error('❌ Error storing recent search:', error)
      throw error
    }
  }

  // Get recent searches for a user
  static async getRecentSearches(userId: string) {
    try {
      const preferences = await this.getUserPreferences(userId)
      return preferences.recentSearches || []
    } catch (error) {
      console.error('❌ Error fetching recent searches:', error)
      return []
    }
  }

  // Store favorite stocks for a user
  static async storeFavoriteStocks(userId: string, favorites: any[]) {
    try {
      await this.updateUserPreferences(userId, { favoriteStocks: favorites })
      return favorites
    } catch (error) {
      console.error('❌ Error storing favorite stocks:', error)
      throw error
    }
  }

  // Get favorite stocks for a user
  static async getFavoriteStocks(userId: string) {
    try {
      const preferences = await this.getUserPreferences(userId)
      return preferences.favoriteStocks || []
    } catch (error) {
      console.error('❌ Error fetching favorite stocks:', error)
      return []
    }
  }

  // Store portfolio data for a user
  static async storePortfolioData(userId: string, portfolioData: {
    positions: any[]
    transactions: any[]
    trades: any[]
  }) {
    try {
      await this.updateUserPreferences(userId, { 
        portfolioData: {
          ...portfolioData,
          lastUpdated: new Date().toISOString()
        }
      })
      return portfolioData
    } catch (error) {
      console.error('❌ Error storing portfolio data:', error)
      throw error
    }
  }

  // Get portfolio data for a user
  static async getPortfolioData(userId: string) {
    try {
      const preferences = await this.getUserPreferences(userId)
      return preferences.portfolioData || { positions: [], transactions: [], trades: [] }
    } catch (error) {
      console.error('❌ Error fetching portfolio data:', error)
      return { positions: [], transactions: [], trades: [] }
    }
  }

  // Store trading strategies for a user
  static async storeTradingStrategies(userId: string, strategies: any[]) {
    try {
      await this.updateUserPreferences(userId, { tradingStrategies: strategies })
      return strategies
    } catch (error) {
      console.error('❌ Error storing trading strategies:', error)
      throw error
    }
  }

  // Get trading strategies for a user
  static async getTradingStrategies(userId: string) {
    try {
      const preferences = await this.getUserPreferences(userId)
      return preferences.tradingStrategies || []
    } catch (error) {
      console.error('❌ Error fetching trading strategies:', error)
      return []
    }
  }

  // Store stock comparison sessions for a user
  static async storeStockComparisonSessions(userId: string, sessions: any[]) {
    try {
      console.log('🗄️ DatabaseService - Storing sessions for user:', userId)
      console.log('🗄️ DatabaseService - Sessions to store:', JSON.stringify(sessions, null, 2))
      
      await this.updateUserPreferences(userId, { stockComparisonSessions: sessions })
      
      console.log('🗄️ DatabaseService - Sessions stored successfully')
      return sessions
    } catch (error) {
      console.error('❌ Error storing stock comparison sessions:', error)
      throw error
    }
  }

  // Get stock comparison sessions for a user
  static async getStockComparisonSessions(userId: string) {
    try {
      console.log('🔍 DatabaseService - Getting sessions for user:', userId)
      const preferences = await this.getUserPreferences(userId)
      console.log('🔍 DatabaseService - User preferences:', preferences)
      
      const sessions = preferences.stockComparisonSessions || []
      console.log('🔍 DatabaseService - Retrieved sessions:', JSON.stringify(sessions, null, 2))
      
      return sessions
    } catch (error) {
      console.error('❌ Error fetching stock comparison sessions:', error)
      return []
    }
  }

  // Store market search history for a user
  static async storeMarketSearchHistory(userId: string, history: any[]) {
    try {
      await this.updateUserPreferences(userId, { marketSearchHistory: history })
      return history
    } catch (error) {
      console.error('❌ Error storing market search history:', error)
      throw error
    }
  }

  // Get market search history for a user
  static async getMarketSearchHistory(userId: string) {
    try {
      const preferences = await this.getUserPreferences(userId)
      return preferences.marketSearchHistory || []
    } catch (error) {
      console.error('❌ Error fetching market search history:', error)
      return []
    }
  }

  // ===== UTILITY METHODS =====

  // Migrate localStorage data to database for a user
  static async migrateLocalStorageData(userId: string, localStorageData: any) {
    try {
      await ensureDatabaseReady()
      
      const updates: any = {}
      
      // Migrate recent searches
      if (localStorageData.recentSearches) {
        updates.recentSearches = localStorageData.recentSearches
      }
      
      // Migrate favorite stocks
      if (localStorageData.favoriteStocks) {
        updates.favoriteStocks = localStorageData.favoriteStocks
      }
      
      // Migrate portfolio data
      if (localStorageData.portfolioData) {
        updates.portfolioData = localStorageData.portfolioData
      }
      
      // Migrate trading strategies
      if (localStorageData.tradingStrategies) {
        updates.tradingStrategies = localStorageData.tradingStrategies
      }
      
      // Migrate stock comparison sessions
      if (localStorageData.stockComparisonSessions) {
        updates.stockComparisonSessions = localStorageData.stockComparisonSessions
      }
      
      // Migrate market search history
      if (localStorageData.marketSearchHistory) {
        updates.marketSearchHistory = localStorageData.marketSearchHistory
      }
      
      if (Object.keys(updates).length > 0) {
        await this.updateUserPreferences(userId, updates)
        console.log('✅ Successfully migrated localStorage data to database')
      }
      
      return updates
    } catch (error) {
      console.error('❌ Error migrating localStorage data:', error)
      throw error
    }
  }
}
