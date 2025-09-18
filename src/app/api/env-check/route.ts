import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      GOOGLE_SEARCH_API_KEY: process.env.GOOGLE_SEARCH_API_KEY ? '✅ Set' : '❌ Not set (using default)',
      GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID ? '✅ Set' : '❌ Not set (using default)',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set',
      POLYGON_API_KEY: process.env.POLYGON_API_KEY ? '✅ Set' : '❌ Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    }

    // Check if default values are being used
    const defaultApiKey = ''
    const defaultEngineId = ''
    
    const actualApiKey = process.env.GOOGLE_SEARCH_API_KEY || defaultApiKey
    const actualEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || defaultEngineId

    return NextResponse.json({
      success: true,
      environment: envCheck,
      webSearch: {
        apiKey: actualApiKey.substring(0, 10) + '...',
        engineId: actualEngineId,
        usingDefaults: !process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID,
        status: 'Ready to use'
      },
      message: 'Environment check completed'
    })
    
  } catch (error) {
    console.error('❌ Environment check failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Environment check failed'
    }, { status: 500 })
  }
}
