import { NextRequest, NextResponse } from 'next/server'
import { Stock } from '@/types'
import { spawn } from 'child_process'
import path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

// Cache for search results to improve performance
const searchCache = new Map<string, { results: Stock[], timestamp: number }>()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes (shorter cache for real-time data)

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

// Enhanced search function using yfinance via Python script
async function searchStocksWithYFinance(query: string): Promise<Stock[]> {
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

  console.log(`🔍 Searching for: "${searchTerm}" using yfinance via Python`)

  try {
    // Execute Python script to search for stocks
    const result = await executePythonScript('search', [searchTerm])
    
    if (result.success && result.results) {
      const results = result.results as Stock[]
      
      // Cache the results
      searchCache.set(cacheKey, { results, timestamp: Date.now() })

      // Clean old cache entries (keep only last 50)
      if (searchCache.size > 50) {
        const entries = Array.from(searchCache.entries())
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
        const newCache = new Map(entries.slice(0, 50))
        searchCache.clear()
        newCache.forEach((value, key) => searchCache.set(key, value))
      }

      return results
    } else {
      console.error('❌ Python script returned error:', result)
      return []
    }

  } catch (error) {
    console.error('❌ Error in yfinance search:', error)
    return []
  }
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

    console.log('🔍 API: Searching for stocks with yfinance via Python:', query)

    // Use yfinance search via Python script
    const results = await searchStocksWithYFinance(query)
    
    console.log(`✅ API: yfinance search completed: ${results.length} results found`)
    return NextResponse.json({ 
      success: true, 
      results: results,
      message: `Found ${results.length} stocks using real-time data`,
      source: 'yfinance'
    })

  } catch (error) {
    console.error('❌ API: yfinance search error:', error)
    return NextResponse.json({ 
      success: false, 
      results: [], 
      message: 'Search failed' 
    }, { status: 500 })
  }
}
