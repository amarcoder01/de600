// Migration Helper - Assists in migrating localStorage data to database
export class MigrationHelper {
  // Collect all localStorage data that needs migration
  static collectLocalStorageData(): any {
    const data: any = {}
    
    try {
      // Recent searches
      const recentSearches = localStorage.getItem('recentSearches')
      if (recentSearches) {
        data.recentSearches = JSON.parse(recentSearches)
      }

      // Favorite stocks
      const favoriteStocks = localStorage.getItem('favoriteStocks')
      if (favoriteStocks) {
        data.favoriteStocks = JSON.parse(favoriteStocks)
      }

      // Portfolio data
      const portfolioPositions = localStorage.getItem('portfolio-positions')
      const portfolioTransactions = localStorage.getItem('portfolio-transactions')
      const portfolioTrades = localStorage.getItem('portfolio-trades')
      
      if (portfolioPositions || portfolioTransactions || portfolioTrades) {
        data.portfolioData = {
          positions: portfolioPositions ? JSON.parse(portfolioPositions) : [],
          transactions: portfolioTransactions ? JSON.parse(portfolioTransactions) : [],
          trades: portfolioTrades ? JSON.parse(portfolioTrades) : []
        }
      }

      // Trading strategies
      const tradingStrategies = localStorage.getItem('trading-strategies')
      if (tradingStrategies) {
        data.tradingStrategies = JSON.parse(tradingStrategies)
      }

      // Stock comparison sessions
      const stockComparisonSessions = localStorage.getItem('stockComparisonSessions')
      if (stockComparisonSessions) {
        data.stockComparisonSessions = JSON.parse(stockComparisonSessions)
      }

      // Market search history
      const marketSearchHistory = localStorage.getItem('marketSearchHistory')
      if (marketSearchHistory) {
        data.marketSearchHistory = JSON.parse(marketSearchHistory)
      }

      // Paper trading specific data
      const paperTradingRecentSearches = localStorage.getItem('paperTrading_recentSearches')
      const paperTradingFavoriteStocks = localStorage.getItem('paperTrading_favoriteStocks')
      
      if (paperTradingRecentSearches) {
        data.paperTradingRecentSearches = JSON.parse(paperTradingRecentSearches)
      }
      
      if (paperTradingFavoriteStocks) {
        data.paperTradingFavoriteStocks = JSON.parse(paperTradingFavoriteStocks)
      }

      // Trading session ID
      const tradingSessionId = localStorage.getItem('trading_session_id')
      if (tradingSessionId) {
        data.tradingSessionId = tradingSessionId
      }

      console.log('📊 Collected localStorage data for migration:', data)
      return data
    } catch (error) {
      console.error('❌ Error collecting localStorage data:', error)
      return {}
    }
  }

  // Migrate data to database
  static async migrateToDatabase(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const localStorageData = this.collectLocalStorageData()
      
      if (Object.keys(localStorageData).length === 0) {
        return {
          success: true,
          message: 'No localStorage data found to migrate'
        }
      }

      // Get authentication token
      const token = localStorage.getItem('token')
      
      // Send migration request to API
      const response = await fetch('/api/user/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(localStorageData)
      })

      const result = await response.json()

      if (result.success) {
        // Clear localStorage after successful migration
        this.clearLocalStorageData()
        
        return {
          success: true,
          message: 'Data migrated successfully',
          data: result.data
        }
      } else {
        return {
          success: false,
          message: result.message || 'Migration failed'
        }
      }
    } catch (error) {
      console.error('❌ Error during migration:', error)
      return {
        success: false,
        message: 'Migration failed due to network error'
      }
    }
  }

  // Clear localStorage data after successful migration
  static clearLocalStorageData(): void {
    try {
      const keysToRemove = [
        'recentSearches',
        'favoriteStocks',
        'portfolio-positions',
        'portfolio-transactions',
        'portfolio-trades',
        'trading-strategies',
        'stockComparisonSessions',
        'marketSearchHistory',
        'paperTrading_recentSearches',
        'paperTrading_favoriteStocks',
        'trading_session_id'
      ]

      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })

      console.log('✅ Cleared localStorage data after successful migration')
    } catch (error) {
      console.error('❌ Error clearing localStorage data:', error)
    }
  }

  // Check if migration is needed
  static needsMigration(): boolean {
    const keysToCheck = [
      'recentSearches',
      'favoriteStocks',
      'portfolio-positions',
      'portfolio-transactions',
      'portfolio-trades',
      'trading-strategies',
      'stockComparisonSessions',
      'marketSearchHistory',
      'paperTrading_recentSearches',
      'paperTrading_favoriteStocks',
      'trading_session_id'
    ]

    return keysToCheck.some(key => localStorage.getItem(key) !== null)
  }

  // Get migration status
  static getMigrationStatus(): {
    needsMigration: boolean
    dataCount: number
    dataTypes: string[]
  } {
    const needsMigration = this.needsMigration()
    const data = this.collectLocalStorageData()
    const dataTypes = Object.keys(data)
    
    return {
      needsMigration,
      dataCount: dataTypes.length,
      dataTypes
    }
  }

  // Validate data before migration
  static validateData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate recent searches
    if (data.recentSearches && !Array.isArray(data.recentSearches)) {
      errors.push('recentSearches must be an array')
    }

    // Validate favorite stocks
    if (data.favoriteStocks && !Array.isArray(data.favoriteStocks)) {
      errors.push('favoriteStocks must be an array')
    }

    // Validate portfolio data
    if (data.portfolioData) {
      if (data.portfolioData.positions && !Array.isArray(data.portfolioData.positions)) {
        errors.push('portfolioData.positions must be an array')
      }
      if (data.portfolioData.transactions && !Array.isArray(data.portfolioData.transactions)) {
        errors.push('portfolioData.transactions must be an array')
      }
      if (data.portfolioData.trades && !Array.isArray(data.portfolioData.trades)) {
        errors.push('portfolioData.trades must be an array')
      }
    }

    // Validate trading strategies
    if (data.tradingStrategies && !Array.isArray(data.tradingStrategies)) {
      errors.push('tradingStrategies must be an array')
    }

    // Validate stock comparison sessions
    if (data.stockComparisonSessions && !Array.isArray(data.stockComparisonSessions)) {
      errors.push('stockComparisonSessions must be an array')
    }

    // Validate market search history
    if (data.marketSearchHistory && !Array.isArray(data.marketSearchHistory)) {
      errors.push('marketSearchHistory must be an array')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Create migration summary
  static createMigrationSummary(data: any): string {
    const summary: string[] = []
    
    if (data.recentSearches) {
      summary.push(`${data.recentSearches.length} recent searches`)
    }
    
    if (data.favoriteStocks) {
      summary.push(`${data.favoriteStocks.length} favorite stocks`)
    }
    
    if (data.portfolioData) {
      if (data.portfolioData.positions) {
        summary.push(`${data.portfolioData.positions.length} portfolio positions`)
      }
      if (data.portfolioData.transactions) {
        summary.push(`${data.portfolioData.transactions.length} portfolio transactions`)
      }
      if (data.portfolioData.trades) {
        summary.push(`${data.portfolioData.trades.length} portfolio trades`)
      }
    }
    
    if (data.tradingStrategies) {
      summary.push(`${data.tradingStrategies.length} trading strategies`)
    }
    
    if (data.stockComparisonSessions) {
      summary.push(`${data.stockComparisonSessions.length} stock comparison sessions`)
    }
    
    if (data.marketSearchHistory) {
      summary.push(`${data.marketSearchHistory.length} market search history items`)
    }

    return summary.length > 0 ? summary.join(', ') : 'No data to migrate'
  }
}
