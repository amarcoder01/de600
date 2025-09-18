import { NextRequest, NextResponse } from 'next/server'
import MLStrategyGenerator, { type MLStrategyConfig, type MLModelType } from '@/lib/ml-strategy-generator'

const mlGenerator = new MLStrategyGenerator()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const modelType = searchParams.get('modelType') as MLModelType
    const symbol = searchParams.get('symbol')

    switch (action) {
      case 'getModelPerformance':
        if (!modelType) {
          return NextResponse.json({ success: false, error: 'Model type is required' }, { status: 400 })
        }
        const performance = mlGenerator.getModelPerformance(modelType)
        return NextResponse.json({ success: true, data: performance })

      case 'getAllModelPerformances':
        const allPerformances = mlGenerator.getAllModelPerformances()
        return NextResponse.json({ success: true, data: allPerformances })

      case 'compareModels':
        const comparison = mlGenerator.compareModels()
        return NextResponse.json({ success: true, data: comparison })

      case 'makePrediction':
        if (!modelType || !symbol) {
          return NextResponse.json({ success: false, error: 'Model type and symbol are required' }, { status: 400 })
        }
        const lookbackPeriod = parseInt(searchParams.get('lookbackPeriod') || '50')
        const prediction = await mlGenerator.makePrediction(symbol, modelType, lookbackPeriod)
        console.log('🔍 ML Strategy API - Prediction result:', prediction)
        return NextResponse.json({ success: true, data: prediction })

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('ML Strategy API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'generateMLStrategy':
        const { symbol, config, trainingPeriod } = data
        if (!symbol || !config || !trainingPeriod) {
          return NextResponse.json({ 
            success: false, 
            error: 'Symbol, config, and training period are required' 
          }, { status: 400 })
        }
        
        const strategy = await mlGenerator.generateMLStrategy(symbol, config, trainingPeriod)
        return NextResponse.json({ success: true, data: strategy })

      case 'trainModel':
        const { modelType, features, config: trainConfig } = data
        if (!modelType || !features || !trainConfig) {
          return NextResponse.json({ 
            success: false, 
            error: 'Model type, features, and config are required' 
          }, { status: 400 })
        }
        
        // This would be called internally by generateMLStrategy
        return NextResponse.json({ 
          success: false, 
          error: 'Use generateMLStrategy instead of trainModel directly' 
        }, { status: 400 })

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('ML Strategy API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
