// yfinance API Service - Reliable Python-based stock data
import { Stock } from '@/types'

export class YFinanceAPI {
  private static cache = new Map<string, { data: Stock; timestamp: number }>()
  private static CACHE_DURATION = 60000 // 1 minute cache

  // Get stock data from yfinance via direct Python script execution (server-side only)
  async getStockData(symbol: string): Promise<Stock | null> {
    try {
      // Check cache first
      const cached = YFinanceAPI.cache.get(symbol)
      if (cached && Date.now() - cached.timestamp < YFinanceAPI.CACHE_DURATION) {
        return cached.data
      }

      console.log(`📡 Fetching data for ${symbol} from yfinance...`)

      // Only use Python script execution on server-side
      if (typeof window === 'undefined') {
        // Server-side: Use direct Python script execution
        const { spawn } = await import('child_process')
        const path = await import('path')
        
        const scriptPath = path.join(process.cwd(), 'scripts', 'yfinance_api.py')
        
        const result = await new Promise<any>((resolve, reject) => {
          const pythonProcess = spawn('python3', [scriptPath, 'quote', symbol])
          
          let stdout = ''
          let stderr = ''
          
          pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString()
          })
          
          pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString()
            console.log(`🐍 Python stderr: ${data.toString()}`)
          })
          
          pythonProcess.on('close', (code) => {
            if (code === 0) {
              try {
                const result = JSON.parse(stdout)
                resolve(result)
              } catch (error) {
                console.error('❌ Error parsing Python output:', error)
                reject(new Error('Failed to parse Python script output'))
              }
            } else {
              console.error(`❌ Python script failed with code ${code}`)
              console.error('Python stderr:', stderr)
              reject(new Error(`Python script failed with code ${code}`))
            }
          })
          
          pythonProcess.on('error', (error) => {
            console.error('❌ Error executing Python script:', error)
            reject(error)
          })
        })

        if (!result.success || !result.stock) {
          console.log(`❌ No yfinance data for ${symbol}`)
          return null
        }

        const stock = result.stock

        // Cache the result
        YFinanceAPI.cache.set(symbol, { data: stock, timestamp: Date.now() })
        
        console.log(`✅ yfinance data fetched for ${symbol}: $${stock.price} (${stock.changePercent.toFixed(2)}%)`)
        return stock
      } else {
        // Client-side: Use API route (fallback)
        const response = await fetch(`/api/yfinance/quote?symbol=${encodeURIComponent(symbol)}`)
        
        if (!response.ok) {
          console.log(`❌ yfinance failed for ${symbol}:`, response.status)
          return null
        }

        const data = await response.json()
        
        if (!data.success || !data.stock) {
          console.log(`❌ No yfinance data for ${symbol}`)
          return null
        }

        const stock = data.stock

        // Cache the result
        YFinanceAPI.cache.set(symbol, { data: stock, timestamp: Date.now() })
        
        console.log(`✅ yfinance data fetched for ${symbol}: $${stock.price} (${stock.changePercent.toFixed(2)}%)`)
        return stock
      }

    } catch (error) {
      console.error(`❌ Error fetching yfinance data for ${symbol}:`, error)
      return null
    }
  }

  // Search stocks using yfinance via direct Python script execution (server-side only)
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      console.log(`🔍 Searching stocks for "${query}" via yfinance...`)
      
      // Only use Python script execution on server-side
      if (typeof window === 'undefined') {
        // Server-side: Use direct Python script execution
        const { spawn } = await import('child_process')
        const path = await import('path')
        
        const scriptPath = path.join(process.cwd(), 'scripts', 'yfinance_api.py')
        
        const result = await new Promise<any>((resolve, reject) => {
          const pythonProcess = spawn('python3', [scriptPath, 'search', query])
          
          let stdout = ''
          let stderr = ''
          
          pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString()
          })
          
          pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString()
            console.log(`🐍 Python stderr: ${data.toString()}`)
          })
          
          pythonProcess.on('close', (code) => {
            if (code === 0) {
              try {
                const result = JSON.parse(stdout)
                resolve(result)
              } catch (error) {
                console.error('❌ Error parsing Python output:', error)
                reject(new Error('Failed to parse Python script output'))
              }
            } else {
              console.error(`❌ Python script failed with code ${code}`)
              console.error('Python stderr:', stderr)
              reject(new Error(`Python script failed with code ${code}`))
            }
          })
          
          pythonProcess.on('error', (error) => {
            console.error('❌ Error executing Python script:', error)
            reject(error)
          })
        })

        if (!result.success || !result.results) {
          console.log(`❌ No yfinance search results for "${query}"`)
          return []
        }

        console.log(`✅ yfinance search found ${result.results.length} stocks`)
        return result.results
      } else {
        // Client-side: Use API route (fallback)
        const response = await fetch(`/api/yfinance/search?q=${encodeURIComponent(query)}`)
        
        if (!response.ok) {
          console.log(`❌ yfinance search failed:`, response.status)
          return []
        }

        const data = await response.json()
        
        if (!data.success || !data.stocks) {
          console.log(`❌ No yfinance search results for "${query}"`)
          return []
        }

        console.log(`✅ yfinance search found ${data.stocks.length} stocks`)
        return data.stocks
      }

    } catch (error) {
      console.error(`❌ Error searching stocks via yfinance:`, error)
      return []
    }
  }
}

export const yfinanceAPI = new YFinanceAPI()
