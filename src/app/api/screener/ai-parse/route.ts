import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { OpenAIService } from '@/lib/services/openai-service'
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { FilterCriteria } from '@/types/screener'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json().catch(() => ({}))
    const { query } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Natural language query is required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const openaiService = new OpenAIService()

    try {
      // Parse the natural language query into structured criteria
      const parseResult = await openaiService.parseQuery(query)
      const parsedCriteria: FilterCriteria = parseResult.filters
      const executionTime = Date.now() - startTime

      // Log the query to history (optional user association)
      try {
        await prisma.queryHistory.create({
          data: {
            userId: session?.user?.id || null,
            naturalQuery: query,
            parsedCriteria: parsedCriteria as any,
            resultCount: 0, // Will be updated when search is performed
            executionTime,
            success: true,
          },
        })
      } catch (dbError) {
        console.warn('Failed to log query history:', dbError)
        // Continue execution even if logging fails
      }

      return NextResponse.json({
        success: true,
        criteria: parsedCriteria,
        confidence: parseResult.confidence,
        suggestions: parseResult.suggestions,
        executionTime,
        originalQuery: query,
      })
    } catch (parseError: any) {
      const executionTime = Date.now() - startTime

      // Log the failed query
      try {
        await prisma.queryHistory.create({
          data: {
            userId: session?.user?.id || null,
            naturalQuery: query,
            parsedCriteria: {} as any,
            resultCount: 0,
            executionTime,
            success: false,
            errorMessage: parseError.message || 'Failed to parse query',
          },
        })
      } catch (dbError) {
        console.warn('Failed to log failed query history:', dbError)
      }

      return NextResponse.json(
        {
          error: 'Failed to parse natural language query',
          message: parseError.message || 'Unknown parsing error',
          originalQuery: query,
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('AI Parse API Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}