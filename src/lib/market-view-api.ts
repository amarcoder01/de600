import { Stock, StockDetails, AppError } from '@/types/market-view'

const API_BASE_URL = '/api/market-view'

export class MarketViewApiService {
  private createAppError(type: AppError['type'], message: string, details?: any): AppError {
    return { type, message, details }
  }

  private isNetworkError(error: any): boolean {
    // Check for various network-related error types
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true
    }
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return true
    }
    if (error instanceof Error && error.message.includes('NetworkError')) {
      return true
    }
    if (error instanceof Error && error.message.includes('ERR_NETWORK')) {
      return true
    }
    // Check for specific network connection errors (more specific)
    if (error instanceof Error && (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ENETUNREACH') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNABORTED')
    )) {
      return true
    }
    // Check for fetch-specific network errors
    if (error instanceof Error && error.message.includes('TypeError: Failed to fetch')) {
      return true
    }
    // Check for timeout errors (but be more specific)
    if (error instanceof Error && error.name === 'AbortError') {
      return true
    }
    return false
  }

  async getStocks(limit: number = 50, cursor?: string): Promise<{ stocks: Stock[]; nextCursor?: string }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      })
      
      if (cursor) {
        params.append('cursor', cursor)
      }
      
      const response = await fetch(`${API_BASE_URL}/stocks?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', response.status, response.statusText, errorText)
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return {
        stocks: data.stocks || [],
        nextCursor: data.nextCursor
      }
    } catch (error) {
      console.error('Error fetching stocks:', error)
      
      if (this.isNetworkError(error)) {
        throw this.createAppError('NETWORK_ERROR', 'Network connection failed. Please check your internet connection.')
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createAppError('NETWORK_ERROR', 'Request timed out. Please check your internet connection and try again.')
      }
      
      throw this.createAppError('API_ERROR', error instanceof Error ? error.message : 'Failed to fetch stock data')
    }
  }

  async searchStocks(query: string): Promise<Stock[]> {
    try {
      const params = new URLSearchParams({
        search: query,
        limit: '20'
      })
      
      const response = await fetch(`${API_BASE_URL}/stocks?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Search API Error Response:', response.status, response.statusText, errorText)
        throw new Error(`Search request failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return data.stocks || []
    } catch (error) {
      console.error('Error searching stocks:', error)
      
      if (this.isNetworkError(error)) {
        throw this.createAppError('NETWORK_ERROR', 'Network connection failed. Please check your internet connection.')
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createAppError('NETWORK_ERROR', 'Search request timed out. Please check your internet connection and try again.')
      }
      
      throw this.createAppError('API_ERROR', error instanceof Error ? error.message : 'Failed to search stocks')
    }
  }

  async getStockDetails(ticker: string): Promise<StockDetails> {
    try {
      const response = await fetch(`${API_BASE_URL}/details/${ticker}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Stock Details API Error Response:', response.status, response.statusText, errorText)
        throw new Error(`Failed to fetch stock details: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return data
    } catch (error) {
      console.error('Error fetching stock details:', error)
      
      if (this.isNetworkError(error)) {
        throw this.createAppError('NETWORK_ERROR', 'Network connection failed. Please check your internet connection.')
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createAppError('NETWORK_ERROR', 'Request timed out. Please check your internet connection and try again.')
      }
      
      throw this.createAppError('API_ERROR', error instanceof Error ? error.message : `Failed to fetch details for ${ticker}`)
    }
  }

  isMarketClosed(): boolean {
    // Use US/Eastern timezone to avoid client local-time discrepancies
    const now = new Date()
    const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const day = etNow.getDay() // 0 = Sunday, 6 = Saturday
    const hour = etNow.getHours()
    const minute = etNow.getMinutes()

    // Weekend: closed
    if (day === 0 || day === 6) {
      return true
    }

    // Regular US market hours: 9:30 AM – 4:00 PM ET
    const timeInMinutes = hour * 60 + minute
    const openMinutes = 9 * 60 + 30 // 9:30 AM
    const closeMinutes = 16 * 60 // 4:00 PM

    const isOpen = timeInMinutes >= openMinutes && timeInMinutes < closeMinutes
    return !isOpen
  }

  // Test connection to the API
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/stocks?limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout for connection test
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', response.status, response.statusText, errorText)
        return {
          success: false,
          message: `API responded with status: ${response.status} ${response.statusText}`,
          details: { status: response.status, statusText: response.statusText, errorText }
        }
      }
      
      const data = await response.json()
      
      if (data.stocks && data.stocks.length > 0) {
        return {
          success: true,
          message: 'Connection successful - API is responding correctly',
          details: { stocksCount: data.stocks.length, status: data.status }
        }
      } else {
        return {
          success: false,
          message: 'API responded but returned no data',
          details: { response: data }
        }
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      
      if (this.isNetworkError(error)) {
        return {
          success: false,
          message: 'Network connection failed - unable to reach the API server',
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          message: 'Connection test timed out - API server may be slow or unresponsive',
          details: { error: 'Timeout after 5 seconds' }
        }
      }
      
      return {
        success: false,
        message: 'Connection test failed with unexpected error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

export const marketViewApiService = new MarketViewApiService()
