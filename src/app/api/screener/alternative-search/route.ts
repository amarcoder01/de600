import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { OpenAIService } from '@/lib/services/openai-service'
import { PolygonApiService } from '@/lib/screener/polygonApi'
import { ScreenerDataService } from '@/lib/screener/ScreenerDataService'
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { FilterCriteria } from '@/types/screener'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json().catch(() => ({}))
    const { originalQuery, originalCriteria, limit = 100 } = body

    if (!originalQuery || typeof originalQuery !== 'string') {
      return NextResponse.json(
        { error: 'Original query is required for alternative search' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const openaiService = new OpenAIService()
    const polygonService = new PolygonApiService()
    const screenerService = new ScreenerDataService()

    try {
      // Step 1: Generate alternative search suggestions
      const alternativeResult = await openaiService.generateAlternativeSearch(originalQuery, originalCriteria || {})
      const alternatives = alternativeResult.suggestions
      
      if (!alternatives || alternatives.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No alternative search suggestions could be generated',
          originalQuery,
        })
      }

      // Step 2: Try each alternative until we find results
      let bestResult: {
        stocks: any[]
        totalCount: number
        hasMore: boolean
        criteria: FilterCriteria
        suggestion: string
      } | null = null

      for (const suggestion of alternatives) {
        try {
          // Parse the alternative suggestion
          const altParseResult = await openaiService.parseQuery(suggestion)
          const altCriteria: FilterCriteria = altParseResult.filters
          
          // Search with the alternative criteria
          let searchResult: { stocks: any[]; totalCount: number; hasMore: boolean }
          try {
            const snap = await polygonService.searchMarketSnapshot(altCriteria, limit)
            searchResult = { stocks: snap.stocks, totalCount: snap.totalCount, hasMore: snap.hasMore }
          } catch (snapError) {
            const uni = await polygonService.getUniversalScreenerResults(altCriteria, limit)
            searchResult = { stocks: uni.stocks, totalCount: uni.totalCount, hasMore: uni.hasMore }
          }

          // If we found results, this is our best alternative
          if (searchResult.stocks && searchResult.stocks.length > 0) {
            bestResult = {
              ...searchResult,
              criteria: altCriteria,
              suggestion,
            }
            break // Use the first successful alternative
          }
        } catch (altError) {
          console.warn(`Alternative search failed for: "${suggestion}"`, altError)
          continue // Try the next alternative
        }
      }

      if (!bestResult) {
        return NextResponse.json({
          success: false,
          message: 'No results found with alternative search strategies',
          originalQuery,
          alternatives,
        })
      }

      // Step 3: Enrich the best results
      try {
        const tickers: string[] = (bestResult.stocks || []).map((s: any) => s?.ticker).filter(Boolean)
        if (tickers.length > 0) {
          const unified = await screenerService.getUnifiedSnapshots(tickers, true, 12, 400)
          const byTicker = new Map(unified.map(u => [u.ticker, u]))
          
          bestResult.stocks = (bestResult.stocks || []).map((s: any) => {
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
        console.warn('Alternative search result enrichment failed:', enrichError)
      }

      const executionTime = Date.now() - startTime
      const resultCount = bestResult.stocks?.length || 0

      // Step 4: Log the alternative search
      try {
        await prisma.queryHistory.create({
          data: {
            userId: session?.user?.id || null,
            naturalQuery: `[ALT] ${originalQuery} -> ${bestResult.suggestion}`,
            parsedCriteria: bestResult.criteria as any,
            resultCount,
            executionTime,
            success: true,
          },
        })
      } catch (dbError) {
        console.warn('Failed to log alternative search history:', dbError)
      }

      return NextResponse.json({
        success: true,
        stocks: bestResult.stocks,
        totalCount: bestResult.totalCount,
        hasMore: bestResult.hasMore,
        originalQuery,
        alternativeQuery: bestResult.suggestion,
        parsedCriteria: bestResult.criteria,
        executionTime,
        isAlternativeSearch: true,
        allAlternatives: alternatives,
      })

    } catch (error: any) {
      const executionTime = Date.now() - startTime

      // Log the failed alternative search
      try {
        await prisma.queryHistory.create({
          data: {
            userId: session?.user?.id || null,
            naturalQuery: `[ALT-FAILED] ${originalQuery}`,
            parsedCriteria: originalCriteria as any || {} as any,
            resultCount: 0,
            executionTime,
            success: false,
            errorMessage: error.message || 'Alternative search failed',
          },
        })
      } catch (dbError) {
        console.warn('Failed to log failed alternative search history:', dbError)
      }

      return NextResponse.json(
        {
          error: 'Failed to perform alternative search',
          message: error.message || 'Unknown alternative search error',
          originalQuery,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Alternative Search API Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}