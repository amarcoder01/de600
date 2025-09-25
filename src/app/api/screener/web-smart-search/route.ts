import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { WebSearchScreenerService } from '@/lib/screener/WebSearchScreenerService'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json().catch(() => ({})) as any
    const rawQuery = typeof body?.query === 'string' ? body.query : ''
    const limitRaw = body?.limit
    const skipEnrichmentRaw = body?.skipEnrichment

    // Validate inputs
    const query = rawQuery.trim().slice(0, 500)
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 80
    const skipEnrichment = typeof skipEnrichmentRaw === 'boolean' ? skipEnrichmentRaw : false

    if (!query) {
      return NextResponse.json(
        { error: 'Natural language query is required', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Check env only to give clearer errors (service also handles this)
    const hasApiKey = !!(process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY)
    const hasCx = !!(process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.SEARCH_ENGINE_ID)
    if (!hasApiKey || !hasCx) {
      return NextResponse.json(
        { error: 'Web search is not configured', errorCode: 'MISSING_GOOGLE_CONFIG' },
        { status: 503 }
      )
    }

    const service = new WebSearchScreenerService()
    const start = Date.now()

    let result
    try {
      result = await service.webSmartSearch(query, {
        limit,
        skipEnrichment,
        maxTickersToEnrich: 60,
      })
    } catch (svcErr: any) {
      // Convert to safe response
      return NextResponse.json(
        {
          error: 'Web smart search failed',
          errorCode: 'SERVICE_ERROR',
          message: svcErr?.message || 'Unknown error',
        },
        { status: 500 }
      )
    }

    const executionTime = Date.now() - start

    // Log query history (optional association with user)
    try {
      await prisma.queryHistory.create({
        data: {
          userId: session?.user?.id || null,
          naturalQuery: `[WEB] ${query}`,
          parsedCriteria: result.parsedCriteria as any,
          resultCount: result.totalCount,
          executionTime,
          success: true,
        },
      })
    } catch (dbError) {
      console.warn('Failed to log web-smart-search query history:', dbError)
    }

    return NextResponse.json({
      success: true,
      ...result,
      executionTime,
    })
  } catch (error: any) {
    console.error('Web Smart Search API Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to perform web smart search',
        errorCode: 'UNHANDLED_SERVER_ERROR',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
