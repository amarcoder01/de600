import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data, prompt } = body

    console.log('🔍 AI Analysis API: Received request', {
      type,
      hasData: !!data,
      hasPrompt: !!prompt,
      dataKeys: data ? Object.keys(data) : []
    })

    if (!type || !data) {
      console.error('🔍 AI Analysis API: Missing required fields', { type, hasData: !!data })
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: type and data'
      }, { status: 400 })
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('🔍 AI Analysis API: OpenAI API key not configured')
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured. Please check your environment variables.'
      }, { status: 500 })
    }

    console.log(`🔍 AI Analysis API: Processing ${type} analysis`)

    let systemPrompt = ''
    let userPrompt = ''

    switch (type) {
      case 'chart':
        systemPrompt = `You are an expert financial analyst specializing in technical chart analysis. Analyze the provided chart data and provide comprehensive insights including trends, patterns, support/resistance levels, and trading recommendations. Be conversational and helpful.`
        userPrompt = `Analyze this chart data for ${data.symbol || 'the given symbol'}:\n\nChart Data: ${JSON.stringify(data.chartData?.slice(-10) || [], null, 2)}\nCurrent Price: $${data.currentPrice}\nPrice Change: ${data.priceChange}%\nTimeframe: ${data.timeframe}\n\nUser Question: ${prompt || data.query || 'Provide detailed technical analysis.'}\n\nPlease provide a helpful, conversational response with specific insights about the chart.`
        break

      case 'financial':
        systemPrompt = `You are an expert financial analyst. Analyze the provided financial data and provide insights including fundamental analysis, valuation metrics, and investment recommendations.`
        userPrompt = `Analyze this financial data:\n${JSON.stringify(data, null, 2)}\n\nAdditional context: ${prompt || 'Provide detailed financial analysis.'}`
        break

      case 'sentiment':
        systemPrompt = `You are an expert market sentiment analyst. Analyze the provided data to determine market sentiment, investor psychology, and potential market movements.`
        userPrompt = `Analyze the sentiment from this data:\n${JSON.stringify(data, null, 2)}\n\nAdditional context: ${prompt || 'Provide sentiment analysis.'}`
        break

      case 'pattern':
        systemPrompt = `You are an expert in technical pattern recognition. Identify chart patterns, trend formations, and provide pattern-based trading insights.`
        userPrompt = `Identify patterns in this data:\n${JSON.stringify(data, null, 2)}\n\nAdditional context: ${prompt || 'Identify technical patterns.'}`
        break

      default:
        systemPrompt = `You are an expert financial AI analyst. Analyze the provided data and provide comprehensive insights.`
        userPrompt = `Analyze this data:\n${JSON.stringify(data, null, 2)}\n\nAdditional context: ${prompt || 'Provide detailed analysis.'}`
    }

    console.log('🔍 AI Analysis API: Calling OpenAI...')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })

    const analysis = completion.choices[0]?.message?.content

    if (!analysis) {
      console.error('🔍 AI Analysis API: No analysis generated from OpenAI')
      throw new Error('No analysis generated')
    }

    console.log('🔍 AI Analysis API: Successfully generated analysis')

    return NextResponse.json({
      success: true,
      analysis,
      type,
      timestamp: new Date().toISOString(),
      model: 'gpt-4o'
    })

  } catch (error) {
    console.error('🔍 AI Analysis API Error:', error)
    
    let errorMessage = 'Analysis failed'
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'OpenAI API key is invalid or expired. Please check your configuration.'
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        errorMessage = 'OpenAI rate limit exceeded. Please try again later.'
      } else if (error.message.includes('500') || error.message.includes('Internal')) {
        errorMessage = 'OpenAI service error. Please try again later.'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Handle GET requests with query parameters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const symbol = searchParams.get('symbol')
    const timeframe = searchParams.get('timeframe') || '1mo'
    const debug = searchParams.get('debug')

    // Debug endpoint to check API key configuration
    if (debug === 'true') {
      const hasApiKey = !!process.env.OPENAI_API_KEY
      const apiKeyLength = process.env.OPENAI_API_KEY?.length || 0
      const apiKeyPrefix = process.env.OPENAI_API_KEY?.substring(0, 10) || 'N/A'
      
      return NextResponse.json({
        success: true,
        debug: {
          hasApiKey,
          apiKeyLength,
          apiKeyPrefix: hasApiKey ? `${apiKeyPrefix}...` : 'N/A',
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        }
      })
    }

    if (!type) {
      return NextResponse.json({
        success: false,
        error: 'Missing analysis type parameter'
      }, { status: 400 })
    }

    // For GET requests, we provide analysis templates or cached results
    const analysisTemplates = {
      chart: {
        description: 'Technical chart analysis including trends, patterns, and indicators',
        requiredData: ['price data', 'volume', 'timeframe'],
        outputFormat: 'Technical analysis report with trading recommendations'
      },
      financial: {
        description: 'Fundamental financial analysis of company metrics',
        requiredData: ['financial statements', 'ratios', 'market data'],
        outputFormat: 'Financial health assessment and valuation analysis'
      },
      sentiment: {
        description: 'Market sentiment analysis from various data sources',
        requiredData: ['news', 'social media', 'market indicators'],
        outputFormat: 'Sentiment score and market psychology insights'
      },
      pattern: {
        description: 'Technical pattern recognition and formation analysis',
        requiredData: ['price history', 'volume patterns', 'chart formations'],
        outputFormat: 'Pattern identification with probability assessments'
      }
    }

    const template = analysisTemplates[type as keyof typeof analysisTemplates]

    if (!template) {
      return NextResponse.json({
        success: false,
        error: `Unknown analysis type: ${type}`
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      type,
      template,
      symbol,
      timeframe,
      instructions: `Send a POST request with data to get AI analysis of type: ${type}`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI Analysis API GET Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}