import { NextRequest, NextResponse } from 'next/server'
import { Stock } from '@/types'
import { MultiSourceAPI } from '@/lib/multi-source-api'
import { spawn } from 'child_process'
import path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

// Cache for search results to improve performance
const searchCache = new Map<string, { results: Stock[], timestamp: number }>()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

// Function to execute Python script
function executePythonScript(command: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'yfinance_api.py')
    
    console.log(`🐍 Executing Python script: ${scriptPath} ${command} ${args.join(' ')}`)
    
    const pythonProcess = spawn('python', [scriptPath, command, ...args])
    
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
}

// Enhanced search function with multiple fallbacks
async function searchStocksWithFallbacks(query: string): Promise<Stock[]> {
  const searchTerm = query.toUpperCase().trim()
  
  if (searchTerm.length < 1) {
    return []
  }

  // Check cache first
  const cacheKey = searchTerm
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`✅ Returning cached results for "${searchTerm}"`)
    return cached.results
  }

  console.log(`🔍 Searching for: "${searchTerm}" using multi-source system`)

  let results: Stock[] = []

  // 1. Try yfinance first (if available and not rate limited)
  try {
    console.log(`📡 Trying yfinance for "${searchTerm}"...`)
    const yfinanceResult = await executePythonScript('search', [searchTerm])
    
    if (yfinanceResult.success && yfinanceResult.results && yfinanceResult.results.length > 0) {
      results = yfinanceResult.results as Stock[]
      console.log(`✅ yfinance found ${results.length} results`)
    } else {
      console.log(`⚠️ yfinance returned no results or failed`)
    }
  } catch (error) {
    console.log(`❌ yfinance failed:`, error)
  }

  // 2. If yfinance failed or returned no results, try MultiSourceAPI
  if (results.length === 0) {
    try {
      console.log(`📡 Trying MultiSourceAPI for "${searchTerm}"...`)
      const multiSourceAPI = new MultiSourceAPI()
      const multiSourceResults = await multiSourceAPI.searchStocks(searchTerm)
      
      if (multiSourceResults && multiSourceResults.length > 0) {
        results = multiSourceResults
        console.log(`✅ MultiSourceAPI found ${results.length} results`)
      } else {
        console.log(`⚠️ MultiSourceAPI returned no results`)
      }
    } catch (error) {
      console.log(`❌ MultiSourceAPI failed:`, error)
    }
  }

  // 3. If still no results, provide a fallback response
  if (results.length === 0) {
    console.log(`⚠️ No results found from any source, providing fallback`)
    
    // Create a basic fallback result for common symbols
    const commonSymbols: { [key: string]: Partial<Stock> } = {
      'TSLA': { symbol: 'TSLA', name: 'Tesla, Inc.', price: 0, change: 0, changePercent: 0 },
      'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', price: 0, change: 0, changePercent: 0 },
      'MSFT': { symbol: 'MSFT', name: 'Microsoft Corporation', price: 0, change: 0, changePercent: 0 },
      'GOOGL': { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 0, change: 0, changePercent: 0 },
      'NVDA': { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 0, change: 0, changePercent: 0 },
      'AMZN': { symbol: 'AMZN', name: 'Amazon.com, Inc.', price: 0, change: 0, changePercent: 0 },
      'META': { symbol: 'META', name: 'Meta Platforms, Inc.', price: 0, change: 0, changePercent: 0 },
      'NFLX': { symbol: 'NFLX', name: 'Netflix, Inc.', price: 0, change: 0, changePercent: 0 }
    }

    const fallbackSymbol = commonSymbols[searchTerm]
    if (fallbackSymbol) {
      results = [fallbackSymbol as Stock]
      console.log(`✅ Using fallback data for ${searchTerm}`)
    }
  }

  // Cache the results
  if (results.length > 0) {
    searchCache.set(cacheKey, { results, timestamp: Date.now() })

    // Clean old cache entries (keep only last 50)
    if (searchCache.size > 50) {
      const entries = Array.from(searchCache.entries())
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      const newCache = new Map(entries.slice(0, 50))
      searchCache.clear()
      newCache.forEach((value, key) => searchCache.set(key, value))
    }
  }

  return results
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 1) {
      return NextResponse.json({ 
        success: false, 
        results: [], 
        message: 'Query parameter required' 
      })
    }

    console.log('🔍 API: Searching for stocks with fallback system:', query)

    // Use enhanced search with fallbacks
    const results = await searchStocksWithFallbacks(query)
    
    console.log(`✅ API: Search completed: ${results.length} results found`)
    return NextResponse.json({ 
      success: true, 
      results: results,
      message: `Found ${results.length} stocks using multi-source data`,
      source: results.length > 0 ? 'multi-source' : 'fallback'
    })

  } catch (error) {
    console.error('❌ API: Search error:', error)
    return NextResponse.json({ 
      success: false, 
      results: [], 
      message: 'Search failed' 
    }, { status: 500 })
  }
}