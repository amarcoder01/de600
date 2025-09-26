import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { WebSearchScreenerService } from '@/lib/screener/WebSearchScreenerService'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json().catch(() => ({}))
    const {
      query,
      limit = 100,
      useMultiSource = true,
      enableSynthesis = true,
      maxSources = 5,
      includeMetrics = false
    } = body

    // Validate inputs
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Natural language query is required' },
        { status: 400 }
      )
    }

    const sanitizedQuery = query.trim().slice(0, 500)
    const cappedLimit = Math.max(1, Math.min(200, Math.floor(limit)))
    const cappedSources = Math.max(1, Math.min(10, Math.floor(maxSources)))

    if (!sanitizedQuery) {
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      )
    }

    const service = new WebSearchScreenerService()
    const startTime = Date.now()

    try {
      // Use enhanced web search with advanced capabilities
      const result = await service.enhancedWebSearch(sanitizedQuery, {
        limit: cappedLimit,
        useMultiSource,
        enableSynthesis,
        maxSources: cappedSources,
        skipEnrichment: false,
        maxTickersToEnrich: Math.min(cappedLimit, 50)
      })

      const executionTime = Date.now() - startTime

      // Get performance metrics if requested
      let performanceMetrics
      if (includeMetrics) {
        performanceMetrics = service.getPerformanceMetrics()
      }

      // Log enhanced search query history
      try {
        await prisma.queryHistory.create({
          data: {
            userId: session?.user?.id || null,
            naturalQuery: `[ENHANCED] ${sanitizedQuery}`,
            parsedCriteria: result.parsedCriteria as any,
            resultCount: result.totalCount,
            executionTime,
            success: true,
          },
        })
      } catch (dbError) {
        console.warn('Failed to log enhanced search query history:', dbError)
      }

      return NextResponse.json({
        success: true,
        stocks: result.stocks,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        parsedCriteria: result.parsedCriteria,
        originalQuery: result.originalQuery,
        usedWebSearch: result.usedWebSearch,
        // Enhanced fields
        synthesizedData: result.synthesizedData,
        sources: result.sources,
        confidence: result.confidence,
        responseTime: result.responseTime,
        executionTime,
        performanceMetrics,
        enhanced: true
      })

    } catch (searchError: any) {
      const executionTime = Date.now() - startTime

      // Log failed enhanced search
      try {
        await prisma.queryHistory.create({
          data: {
            userId: session?.user?.id || null,
            naturalQuery: `[ENHANCED-FAILED] ${sanitizedQuery}`,
            parsedCriteria: {} as any,
            resultCount: 0,
            executionTime,
            success: false,
            errorMessage: searchError.message || 'Enhanced search failed',
          },
        })
      } catch (dbError) {
        console.warn('Failed to log failed enhanced search history:', dbError)
      }

      console.error('Enhanced search failed:', searchError)
      return NextResponse.json(
        {
          error: 'Enhanced search failed',
          message: searchError.message || 'Unknown search error',
          originalQuery: sanitizedQuery,
          fallbackAvailable: true
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Enhanced Search API Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

// Stock discovery endpoint
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const context = searchParams.get('context')
    const maxResults = parseInt(searchParams.get('maxResults') || '50')
    const includeAnalysis = searchParams.get('includeAnalysis') === 'true'
    const semanticSearch = searchParams.get('semanticSearch') !== 'false'

    if (!context) {
      return NextResponse.json(
        { error: 'Context parameter is required' },
        { status: 400 }
      )
    }

    const service = new WebSearchScreenerService()
    
    try {
      const result = await service.discoverStocks(context, {
        maxResults: Math.min(maxResults, 100),
        includeAnalysis,
        semanticSearch
      })

      return NextResponse.json({
        success: true,
        ...result
      })
    } catch (discoveryError: any) {
      console.error('Stock discovery failed:', discoveryError)
      return NextResponse.json(
        {
          error: 'Stock discovery failed',
          message: discoveryError.message || 'Unknown discovery error'
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Stock Discovery API Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}