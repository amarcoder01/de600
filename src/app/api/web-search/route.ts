import { NextRequest, NextResponse } from 'next/server'

interface WebSearchResult {
  title: string
  link: string
  snippet: string
  source: string
}

interface GoogleSearchResponse {
  items?: Array<{
    title: string
    link: string
    snippet: string
    displayLink: string
  }>
  searchInformation?: {
    totalResults: string
    searchTime: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query) {
      return NextResponse.json(
        { success: false, message: 'Query parameter is required' },
        { status: 400 }
      )
    }

    // Get API credentials from environment variables
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID
    
    if (!apiKey || !searchEngineId) {
      return NextResponse.json(
        { success: false, message: 'Google Search API credentials not configured' },
        { status: 500 }
      )
    }

    console.log('🔍 Using search API key:', apiKey.substring(0, 10) + '...')
    console.log('🔍 Using search engine ID:', searchEngineId)

    // Construct the Google Custom Search API URL
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${Math.min(limit, 10)}`

    console.log('🔍 Performing web search:', { query, limit })

    const response = await fetch(searchUrl)
    const data: GoogleSearchResponse = await response.json()

    if (!response.ok) {
      console.error('❌ Google Search API error:', data)
      throw new Error(`Google Search API error: ${response.status}`)
    }

    // Transform the results
    const results: WebSearchResult[] = (data.items || []).map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      source: item.displayLink
    }))

    console.log(`✅ Web search completed: ${results.length} results found`)

    return NextResponse.json({
      success: true,
      results: results,
      count: results.length,
      totalResults: data.searchInformation?.totalResults || '0',
      searchTime: data.searchInformation?.searchTime || 0,
      query,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Web search error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to perform web search',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, maxResults = 10 } = body

    if (!query) {
      return NextResponse.json(
        { success: false, message: 'Query is required' },
        { status: 400 }
      )
    }

    // Get API credentials from environment variables
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID
    
    if (!apiKey || !searchEngineId) {
      return NextResponse.json(
        { success: false, message: 'Google Search API credentials not configured' },
        { status: 500 }
      )
    }

    console.log('🔍 Using search API key:', apiKey.substring(0, 10) + '...')
    console.log('🔍 Using search engine ID:', searchEngineId)

    // Construct the Google Custom Search API URL
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${Math.min(maxResults, 10)}`

    console.log('🔍 Performing web search (POST):', { query, maxResults })

    const response = await fetch(searchUrl)
    const data: GoogleSearchResponse = await response.json()

    if (!response.ok) {
      console.error('❌ Google Search API error:', data)
      throw new Error(`Google Search API error: ${response.status}`)
    }

    // Transform the results
    const results: WebSearchResult[] = (data.items || []).map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      source: item.displayLink
    }))

    console.log(`✅ Web search completed: ${results.length} results found`)

    return NextResponse.json({
      success: true,
      results: results,
      count: results.length,
      totalResults: data.searchInformation?.totalResults || '0',
      searchTime: data.searchInformation?.searchTime || 0,
      query,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Web search error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to perform web search',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
