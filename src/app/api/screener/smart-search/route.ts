import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { OpenAIService } from '@/lib/services/openai-service'
import { PolygonApiService } from '@/lib/screener/polygonApi'
import { ScreenerDataService } from '@/lib/screener/ScreenerDataService'
import { WebSearchScreenerService } from '@/lib/screener/WebSearchScreenerService'
import { IntelligentStockSearch } from '@/lib/services/IntelligentStockSearch'
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { FilterCriteria } from '@/types/screener'
import crypto from 'crypto'

// Cache configuration
const CACHE_TTL_MINUTES = 15

function generateQueryHash(criteria: FilterCriteria): string {
  const normalized = JSON.stringify(criteria, Object.keys(criteria).sort())
  return crypto.createHash('md5').update(normalized).digest('hex')
}

function getTradingDateISO(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json().catch(() => ({}))
    const { query, limit = 200, useCache = true, page = 1, pageSize = 20 } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Natural language query is required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const openaiService = new OpenAIService()
    const polygonService = new PolygonApiService()
    const screenerService = new ScreenerDataService()

    try {
      // Step 1: Parse the natural language query
      const parseResult = await openaiService.parseQuery(query)
      const parsedCriteria: FilterCriteria = parseResult.filters
      const queryHash = generateQueryHash(parsedCriteria)

      // Step 1.5: Try intelligent search first (no API quota limits)
      try {
        console.log('🧠 Trying intelligent search (ChatGPT-like, no quota limits)')
        const intelligentSearch = new IntelligentStockSearch()
        const intelligentResult = await intelligentSearch.universalSearch(query)
        
        if (intelligentResult.stocks.length > 0) {
          // Log success
          try {
            await prisma.queryHistory.create({
              data: {
                userId: session?.user?.id || null,
                naturalQuery: `[INTELLIGENT] ${query}`,
                parsedCriteria: { search: query } as any,
                resultCount: intelligentResult.totalFound,
                executionTime: intelligentResult.searchTime,
                success: true,
              },
            })
          } catch (dbErr) {
            console.warn('Failed to log intelligent search history:', dbErr)
          }

          return NextResponse.json({
            success: true,
            stocks: intelligentResult.stocks,
            totalCount: intelligentResult.totalFound,
            hasMore: false,
            parsedCriteria: { search: query },
            originalQuery: query,
            cached: false,
            executionTime: intelligentResult.searchTime,
            tradingDate: getTradingDateISO(),
            usedIntelligentSearch: true,
            query_interpretation: intelligentResult.query_interpretation,
            suggestions: intelligentResult.suggestions,
            confidence: intelligentResult.confidence
          })
        }
      } catch (intelligentErr) {
        console.warn('Intelligent search failed, trying web search:', intelligentErr)
      }

      // Step 1.6: Fallback to web search if available
      try {
        const hasGoogleSearch = !!(process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY)
        const hasSearchEngine = !!(process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.SEARCH_ENGINE_ID)
        if (hasGoogleSearch && hasSearchEngine) {
          const webService = new WebSearchScreenerService()
          
          // Try universal search with reduced queries to conserve quota
          let webResult
          try {
            console.log('🔍 Using web search (quota-aware)')
            webResult = await webService.universalSmartSearch(query, { 
              limit: Math.min(limit, 20), // Reduce load
              skipEnrichment: false, 
              maxTickersToEnrich: 10, // Reduced for quota conservation
              page,
              pageSize
            })
          } catch (enhancedErr) {
            console.warn('Web search failed (likely quota exceeded):', enhancedErr)
            // Don't fallback to basic web search - it will also fail
            throw enhancedErr
          }
          
          if ((webResult?.stocks?.length || 0) > 0) {
            // Log history for web-search success
            try {
              await prisma.queryHistory.create({
                data: {
                  userId: session?.user?.id || null,
                  naturalQuery: `[WEB${webResult.enhanced ? '-ENHANCED' : ''}] ${query}`,
                  parsedCriteria: webResult.parsedCriteria as any,
                  resultCount: webResult.totalCount,
                  executionTime: Date.now() - startTime,
                  success: true,
                },
              })
            } catch (dbErr) {
              console.warn('Failed to log web-smart-search query history:', dbErr)
            }

            return NextResponse.json({
              success: true,
              stocks: webResult.stocks,
              totalCount: webResult.totalCount,
              hasMore: webResult.hasMore,
              parsedCriteria: webResult.parsedCriteria,
              originalQuery: webResult.originalQuery,
              cached: false,
              executionTime: Date.now() - startTime,
              tradingDate: getTradingDateISO(),
              usedWebSearch: true,
              // Pagination fields
              totalPages: webResult.totalPages,
              currentPage: webResult.currentPage,
              page,
              pageSize,
              // Enhanced fields (if available)
              ...(webResult.enhanced && {
                synthesizedData: webResult.synthesizedData,
                sources: webResult.sources,
                confidence: webResult.confidence,
                responseTime: webResult.responseTime,
                enhanced: true
              })
            })
          }
        }
      } catch (webErr) {
        console.warn('Web search failed (quota exceeded), using intelligent fallback:', webErr)
        
        // Final fallback: Use intelligent search
        try {
          console.log('🧠 Final fallback: Using intelligent search')
          const intelligentSearch = new IntelligentStockSearch()
          const intelligentResult = await intelligentSearch.universalSearch(query)
          
          if (intelligentResult.stocks.length > 0) {
            return NextResponse.json({
              success: true,
              stocks: intelligentResult.stocks,
              totalCount: intelligentResult.totalFound,
              hasMore: false,
              parsedCriteria: { search: query },
              originalQuery: query,
              cached: false,
              executionTime: intelligentResult.searchTime,
              tradingDate: getTradingDateISO(),
              usedIntelligentSearch: true,
              fallbackReason: 'Google API quota exceeded',
              query_interpretation: intelligentResult.query_interpretation,
              suggestions: intelligentResult.suggestions,
              confidence: intelligentResult.confidence
            })
          }
        } catch (finalErr) {
          console.error('Final intelligent fallback also failed:', finalErr)
        }
      }

      // Step 2: Check cache if enabled
      let cachedResult = null
      if (useCache) {
        try {
          const cacheExpiry = new Date(Date.now() - CACHE_TTL_MINUTES * 60 * 1000)
          cachedResult = await prisma.queryResultsCache.findUnique({
            where: { queryHash },
          })

          if (cachedResult && cachedResult.createdAt > cacheExpiry) {
            // Update query history with cached result
            try {
              await prisma.queryHistory.create({
                data: {
                  userId: session?.user?.id || null,
                  naturalQuery: query,
                  parsedCriteria: parsedCriteria as any,
                  resultCount: cachedResult.resultCount,
                  executionTime: Date.now() - startTime,
                  success: true,
                },
              })
            } catch (dbError) {
              console.warn('Failed to log cached query history:', dbError)
            }

            return NextResponse.json({
              success: true,
              stocks: cachedResult.results,
              totalCount: cachedResult.resultCount,
              parsedCriteria,
              originalQuery: query,
              cached: true,
              executionTime: Date.now() - startTime,
            })
          }
        } catch (cacheError) {
          console.warn('Cache lookup failed:', cacheError)
          // Continue without cache
        }
      }

      // Step 3: Perform stock search
      let searchResult: { stocks: any[]; totalCount: number; hasMore: boolean }
      try {
        // Try market snapshot first (faster)
        const snap = await polygonService.searchMarketSnapshot(parsedCriteria, limit)
        searchResult = { stocks: snap.stocks, totalCount: snap.totalCount, hasMore: snap.hasMore }
      } catch (snapError) {
        console.warn('Market snapshot failed, falling back to universal screener:', snapError)
        // Fallback to universal screener
        const uni = await polygonService.getUniversalScreenerResults(parsedCriteria, limit)
        searchResult = { stocks: uni.stocks, totalCount: uni.totalCount, hasMore: uni.hasMore }
      }

      // Step 4: Enrich results with unified data
      try {
        const tickers: string[] = (searchResult.stocks || []).map((s: any) => s?.ticker).filter(Boolean)
        if (tickers.length > 0) {
          const unified = await screenerService.getUnifiedSnapshots(tickers, true, 12, 400)
          const byTicker = new Map(unified.map(u => [u.ticker, u]))
          
          searchResult.stocks = (searchResult.stocks || []).map((s: any) => {
            const u = byTicker.get(s?.ticker)
            if (!u) return s
            return {
              ...s,
              price: typeof u.price === 'number' ? u.price : s.price,
              change: u.change !== undefined ? u.change : s.change,
              change_percent: u.change_percent !== undefined ? u.change_percent : s.change_percent,
              volume: u.volume !== undefined ? u.volume : s.volume,
              market_cap: u.market_cap !== undefined ? u.market_cap : s.market_cap,
              has_change: u.has_change ?? s.has_change,
              basis: (u as any).basis ?? (s as any).basis,
              market_state: (u as any).market_state ?? (s as any).market_state,
            }
          })
        }
      } catch (enrichError) {
        console.warn('Result enrichment failed:', enrichError)
        // Continue with original results
      }

      const executionTime = Date.now() - startTime
      const resultCount = searchResult.stocks?.length || 0

      // Step 5: Cache the results
      if (useCache && resultCount > 0) {
        try {
          const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000)
          await prisma.queryResultsCache.upsert({
            where: { queryHash },
            update: {
              criteria: parsedCriteria as any,
              results: searchResult.stocks as any,
              resultCount,
              expiresAt,
            },
            create: {
              queryHash,
              criteria: parsedCriteria as any,
              results: searchResult.stocks as any,
              resultCount,
              expiresAt,
            },
          })
        } catch (cacheError) {
          console.warn('Failed to cache results:', cacheError)
          // Continue without caching
        }
      }

      // Step 6: Log query history
      try {
        await prisma.queryHistory.create({
          data: {
            userId: session?.user?.id || null,
            naturalQuery: query,
            parsedCriteria: parsedCriteria as any,
            resultCount,
            executionTime,
            success: true,
          },
        })
      } catch (dbError) {
        console.warn('Failed to log query history:', dbError)
      }

      return NextResponse.json({
        success: true,
        stocks: searchResult.stocks,
        totalCount: searchResult.totalCount,
        hasMore: searchResult.hasMore,
        parsedCriteria,
        originalQuery: query,
        cached: false,
        executionTime,
        tradingDate: getTradingDateISO(),
      })

    } catch (searchError: any) {
      const executionTime = Date.now() - startTime

      // Log the failed search
      try {
        await prisma.queryHistory.create({
          data: {
            userId: session?.user?.id || null,
            naturalQuery: query,
            parsedCriteria: {} as any,
            resultCount: 0,
            executionTime,
            success: false,
            errorMessage: searchError.message || 'Search failed',
          },
        })
      } catch (dbError) {
        console.warn('Failed to log failed search history:', dbError)
      }

      return NextResponse.json(
        {
          error: 'Failed to perform smart search',
          message: searchError.message || 'Unknown search error',
          originalQuery: query,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Smart Search API Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}