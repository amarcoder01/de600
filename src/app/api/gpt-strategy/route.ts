import { NextRequest, NextResponse } from 'next/server'
import { GPTStrategyGenerator, GPTStrategyRequest, GPTStrategyConfig } from '@/lib/gpt-strategy-generator'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'getModels':
        return NextResponse.json({
          success: true,
          models: [
            { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Fast and efficient' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Cost-effective option' }
          ]
        })

      case 'getStrategyTypes':
        return NextResponse.json({
          success: true,
          strategyTypes: [
            { id: 'momentum', name: 'Momentum', description: 'Follow the trend' },
            { id: 'mean_reversion', name: 'Mean Reversion', description: 'Return to average' },
            { id: 'breakout', name: 'Breakout', description: 'Break resistance/support' },
            { id: 'ai_ml', name: 'AI/ML', description: 'Machine learning based' },
            { id: 'multi_factor', name: 'Multi-Factor', description: 'Multiple indicators' },
            { id: 'custom', name: 'Custom', description: 'Custom strategy' }
          ]
        })

      case 'getRiskLevels':
        return NextResponse.json({
          success: true,
          riskLevels: [
            { id: 'conservative', name: 'Conservative', description: 'Low risk, steady returns' },
            { id: 'moderate', name: 'Moderate', description: 'Balanced risk and return' },
            { id: 'aggressive', name: 'Aggressive', description: 'High risk, high potential' }
          ]
        })

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('GPT Strategy API GET error:', error)
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

    const generator = new GPTStrategyGenerator()

    switch (action) {
      case 'generateStrategy':
        const strategyRequest: GPTStrategyRequest = {
          symbol: data.symbol || 'AAPL',
          description: data.description || 'AI-generated trading strategy',
          config: {
            model: data.model || 'gpt-4',
            strategyType: data.strategyType || 'momentum',
            riskLevel: data.riskLevel || 'moderate',
            timeHorizon: data.timeHorizon || 'medium',
            temperature: data.temperature || 0.3,
            maxTokens: data.maxTokens || 1000,
            confidenceThreshold: data.confidenceThreshold || 0.7
          },
          marketConditions: data.marketConditions
        }

        const result = await generator.generateGPTStrategy(strategyRequest)
        
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error || 'Strategy generation failed' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            strategy: result.strategy,
            analysis: result.analysis,
            confidence: result.confidence,
            riskAssessment: result.riskAssessment,
            recommendations: result.recommendations
          }
        })

      case 'generateMarketAnalysis':
        const symbol = data.symbol || 'AAPL'
        const analysis = await generator.generateMarketAnalysis(symbol)
        
        if (!analysis) {
          return NextResponse.json(
            { success: false, error: 'Market analysis generation failed' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: analysis
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('GPT Strategy API POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
