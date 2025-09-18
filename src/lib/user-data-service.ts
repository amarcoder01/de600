import { DatabaseService } from './db'
import { AuthService } from './auth-service'

export class UserDataService {
  // Generate anonymous user ID for unauthenticated users
  private static generateAnonymousUserId(): string {
    // Create a unique anonymous user ID based on browser fingerprint
    const browserInfo = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      localStorage.getItem('anonymous_user_id') // Check if we already have one
    ].join('|')
    
    // If we already have an anonymous ID, use it
    const existingId = localStorage.getItem('anonymous_user_id')
    if (existingId) {
      return existingId
    }
    
    // Generate new anonymous ID
    const hash = btoa(browserInfo + Date.now() + Math.random()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
    const anonymousId = `anon_${hash}`
    
    // Store it for future use
    localStorage.setItem('anonymous_user_id', anonymousId)
    return anonymousId
  }

  // Get current user ID from token
  private static async getCurrentUserId(token?: string): Promise<string> {
    if (token) {
      const user = await AuthService.getUserFromToken(token)
      if (user) {
        return user.id
      }
    }
    
    // For unauthenticated users, use anonymous user ID
    // This ensures each browser/device gets its own unique sessions
    if (typeof window !== 'undefined') {
      return this.generateAnonymousUserId()
    }
    
    // Server-side fallback to demo user (shouldn't happen with proper token handling)
    const demoUser = await DatabaseService.getOrCreateDemoUser()
    return demoUser.id
  }

  // ===== RECENT SEARCHES =====
  
  static async getRecentSearches(token?: string): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId(token)
      return await DatabaseService.getRecentSearches(userId)
    } catch (error) {
      console.error('Error getting recent searches:', error)
      return []
    }
  }

  static async addRecentSearch(query: string, results: any[], token?: string): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId(token)
      return await DatabaseService.storeRecentSearch(userId, {
        query,
        results,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Error adding recent search:', error)
      return []
    }
  }

  // ===== FAVORITE STOCKS =====
  
  static async getFavoriteStocks(token?: string): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId(token)
      return await DatabaseService.getFavoriteStocks(userId)
    } catch (error) {
      console.error('Error getting favorite stocks:', error)
      return []
    }
  }

  static async addFavoriteStock(stock: any, token?: string): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId(token)
      const favorites = await DatabaseService.getFavoriteStocks(userId)
      
      // Check if already exists
      const exists = favorites.find((f: any) => f.symbol === stock.symbol)
      if (!exists) {
        favorites.push(stock)
        return await DatabaseService.storeFavoriteStocks(userId, favorites)
      }
      
      return favorites
    } catch (error) {
      console.error('Error adding favorite stock:', error)
      return []
    }
  }

  static async removeFavoriteStock(symbol: string, token?: string): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId(token)
      const favorites = await DatabaseService.getFavoriteStocks(userId)
      const filtered = favorites.filter((f: any) => f.symbol !== symbol)
      return await DatabaseService.storeFavoriteStocks(userId, filtered)
    } catch (error) {
      console.error('Error removing favorite stock:', error)
      return []
    }
  }

  // ===== PORTFOLIO DATA =====
  
  static async getPortfolioData(token?: string): Promise<any> {
    try {
      const userId = await this.getCurrentUserId(token)
      return await DatabaseService.getPortfolioData(userId)
    } catch (error) {
      console.error('Error getting portfolio data:', error)
      return { positions: [], transactions: [], trades: [] }
    }
  }

  static async updatePortfolioData(portfolioData: any, token?: string): Promise<any> {
    try {
      const userId = await this.getCurrentUserId(token)
      return await DatabaseService.storePortfolioData(userId, portfolioData)
    } catch (error) {
      console.error('Error updating portfolio data:', error)
      throw error
    }
  }

  // ===== TRADING STRATEGIES =====
  
  static async getTradingStrategies(token?: string): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId(token)
      return await DatabaseService.getTradingStrategies(userId)
    } catch (error) {
      console.error('Error getting trading strategies:', error)
      return []
    }
  }

  static async saveTradingStrategy(strategy: any, token?: string): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId(token)
      const strategies = await DatabaseService.getTradingStrategies(userId)
      
      // Update existing or add new
      const index = strategies.findIndex((s: any) => s.id === strategy.id)
      if (index >= 0) {
        strategies[index] = strategy
      } else {
        strategies.push({ ...strategy, id: Date.now().toString() })
      }
      
      return await DatabaseService.storeTradingStrategies(userId, strategies)
    } catch (error) {
      console.error('Error saving trading strategy:', error)
      return []
    }
  }

  static async deleteTradingStrategy(strategyId: string, token?: string): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId(token)
      const strategies = await DatabaseService.getTradingStrategies(userId)
      const filtered = strategies.filter((s: any) => s.id !== strategyId)
      return await DatabaseService.storeTradingStrategies(userId, filtered)
    } catch (error) {
      console.error('Error deleting trading strategy:', error)
      return []
    }
  }

  // ===== STOCK COMPARISON SESSIONS =====
  
  static async getStockComparisonSessions(token?: string): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId(token)
      return await DatabaseService.getStockComparisonSessions(userId)
    } catch (error) {
      console.error('Error getting stock comparison sessions:', error)
      return []
    }
  }

  static async saveStockComparisonSession(session: any, token?: string): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId(token)
      console.log('💾 UserDataService - Saving session for user:', userId)
      console.log('💾 UserDataService - Session data:', session)
      
      // If the payload is a wrapper containing the full sessions array (from a delete/cleanup operation),
      // persist it directly instead of pushing a wrapper object into the list.
      if (session && Array.isArray(session.sessions)) {
        console.warn('💾 UserDataService - Received full sessions payload; replacing existing sessions')
        return await DatabaseService.storeStockComparisonSessions(userId, session.sessions)
      }

      // Validate minimal shape of the incoming single session to prevent corruption
      const isValidSingleSession = !!(
        session &&
        typeof session.id !== 'undefined' &&
        Array.isArray(session.stocks) &&
        typeof session.timestamp === 'string'
      )

      if (!isValidSingleSession) {
        console.error('❌ Invalid session payload; refusing to save to prevent corruption:', session)
        const existing = await DatabaseService.getStockComparisonSessions(userId)
        return existing
      }

      const sessions = await DatabaseService.getStockComparisonSessions(userId)
      console.log('💾 UserDataService - Existing sessions:', sessions)
      
      // Update existing or add new
      const index = sessions.findIndex((s: any) => s.id === session.id)
      if (index >= 0) {
        console.log('💾 UserDataService - Updating existing session at index:', index)
        sessions[index] = session
      } else {
        console.log('💾 UserDataService - Adding new session')
        sessions.push({ ...session, id: session.id || Date.now().toString() })
      }
      
      console.log('💾 UserDataService - Sessions to store:', sessions)
      const result = await DatabaseService.storeStockComparisonSessions(userId, sessions)
      console.log('💾 UserDataService - Store result:', result)
      
      return result
    } catch (error) {
      console.error('Error saving stock comparison session:', error)
      return []
    }
  }

  static async setStockComparisonSessions(sessions: any[], token?: string): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId(token)
      // Basic normalization: ensure array and only keep minimally valid sessions
      const normalized = (Array.isArray(sessions) ? sessions : [])
        .filter((s: any) => s && typeof s.id !== 'undefined')
        .map((s: any) => ({
          ...s,
          stocks: Array.isArray(s.stocks) ? s.stocks : [],
          timestamp: typeof s.timestamp === 'string' ? s.timestamp : new Date().toISOString(),
          analysis: typeof s.analysis === 'string' ? s.analysis : (s.analysis ? JSON.stringify(s.analysis) : ''),
        }))

      return await DatabaseService.storeStockComparisonSessions(userId, normalized)
    } catch (error) {
      console.error('Error setting stock comparison sessions:', error)
      return []
    }
  }

  // ===== MARKET SEARCH HISTORY =====
  
  static async getMarketSearchHistory(token?: string): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId(token)
      return await DatabaseService.getMarketSearchHistory(userId)
    } catch (error) {
      console.error('Error getting market search history:', error)
      return []
    }
  }

  static async addMarketSearchHistory(search: any, token?: string): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId(token)
      const history = await DatabaseService.getMarketSearchHistory(userId)
      
      // Remove duplicate if exists
      const filtered = history.filter((h: any) => h.query !== search.query)
      
      // Add new search at the beginning
      const updated = [
        { ...search, timestamp: new Date().toISOString() },
        ...filtered
      ].slice(0, 20) // Keep only last 20 searches
      
      return await DatabaseService.storeMarketSearchHistory(userId, updated)
    } catch (error) {
      console.error('Error adding market search history:', error)
      return []
    }
  }

  // ===== USER PREFERENCES =====
  
  static async getUserPreferences(token?: string): Promise<any> {
    try {
      const userId = await this.getCurrentUserId(token)
      return await DatabaseService.getUserPreferences(userId)
    } catch (error) {
      console.error('Error getting user preferences:', error)
      return DatabaseService.getDefaultPreferences()
    }
  }

  static async updateUserPreferences(preferences: any, token?: string): Promise<any> {
    try {
      const userId = await this.getCurrentUserId(token)
      return await DatabaseService.updateUserPreferences(userId, preferences)
    } catch (error) {
      console.error('Error updating user preferences:', error)
      throw error
    }
  }

  // ===== MIGRATION UTILITIES =====
  
  static async migrateLocalStorageData(localStorageData: any, token?: string): Promise<any> {
    try {
      const userId = await this.getCurrentUserId(token)
      return await DatabaseService.migrateLocalStorageData(userId, localStorageData)
    } catch (error) {
      console.error('Error migrating localStorage data:', error)
      throw error
    }
  }

  // ===== UTILITY METHODS =====
  
  static async clearAllUserData(token?: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId(token)
      const defaultPrefs = DatabaseService.getDefaultPreferences()
      
      await DatabaseService.updateUserPreferences(userId, {
        ...defaultPrefs,
        recentSearches: [],
        favoriteStocks: [],
        portfolioData: { positions: [], transactions: [], trades: [] },
        tradingStrategies: [],
        stockComparisonSessions: [],
        marketSearchHistory: []
      })
      
      console.log('✅ All user data cleared successfully')
    } catch (error) {
      console.error('Error clearing user data:', error)
      throw error
    }
  }

  static async exportUserData(token?: string): Promise<any> {
    try {
      const userId = await this.getCurrentUserId(token)
      
      const [
        preferences,
        recentSearches,
        favoriteStocks,
        portfolioData,
        tradingStrategies,
        stockComparisonSessions,
        marketSearchHistory
      ] = await Promise.all([
        DatabaseService.getUserPreferences(userId),
        DatabaseService.getRecentSearches(userId),
        DatabaseService.getFavoriteStocks(userId),
        DatabaseService.getPortfolioData(userId),
        DatabaseService.getTradingStrategies(userId),
        DatabaseService.getStockComparisonSessions(userId),
        DatabaseService.getMarketSearchHistory(userId)
      ])
      
      return {
        userId,
        exportDate: new Date().toISOString(),
        preferences,
        recentSearches,
        favoriteStocks,
        portfolioData,
        tradingStrategies,
        stockComparisonSessions,
        marketSearchHistory
      }
    } catch (error) {
      console.error('Error exporting user data:', error)
      throw error
    }
  }
}
