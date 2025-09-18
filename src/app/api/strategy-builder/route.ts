import { NextRequest, NextResponse } from 'next/server'
import StrategyBuilderService from '@/lib/strategy-builder-service'

const strategyService = new StrategyBuilderService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const strategyId = searchParams.get('strategyId')

    switch (action) {
      case 'getStrategies':
        const strategies = strategyService.getStrategies()
        return NextResponse.json({ success: true, data: strategies })

      case 'getStrategy':
        if (!strategyId) {
          return NextResponse.json({ success: false, error: 'Strategy ID is required' }, { status: 400 })
        }
        const strategy = strategyService.getStrategy(strategyId)
        if (!strategy) {
          return NextResponse.json({ success: false, error: 'Strategy not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true, data: strategy })

      case 'getBacktestResults':
        const backtestResults = strategyService.getBacktestResults()
        return NextResponse.json({ success: true, data: backtestResults })

      case 'getRealTimeData':
        if (!strategyId) {
          return NextResponse.json({ success: false, error: 'Strategy ID is required' }, { status: 400 })
        }
        const realTimeData = await strategyService.getStrategyRealTimeData(strategyId)
        return NextResponse.json({ success: true, data: realTimeData })

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Strategy Builder API error:', error)
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
      case 'createStrategy':
        const newStrategy = await strategyService.createStrategy(data)
        return NextResponse.json({ success: true, data: newStrategy })

      case 'updateStrategy':
        const { id, ...updates } = data
        const updatedStrategy = await strategyService.updateStrategy(id, updates)
        if (!updatedStrategy) {
          return NextResponse.json({ success: false, error: 'Strategy not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true, data: updatedStrategy })

      case 'runBacktest':
        const { strategyId, startDate, endDate, initialCapital } = data
        const backtestResult = await strategyService.runBacktest(strategyId, startDate, endDate, initialCapital)
        return NextResponse.json({ success: true, data: backtestResult })

      case 'updateStrategyStatus':
        const { strategyId: statusStrategyId, status } = data
        const statusUpdatedStrategy = await strategyService.updateStrategyStatus(statusStrategyId, status)
        if (!statusUpdatedStrategy) {
          return NextResponse.json({ success: false, error: 'Strategy not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true, data: statusUpdatedStrategy })

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Strategy Builder API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const strategyId = searchParams.get('strategyId')

    if (!strategyId) {
      return NextResponse.json({ success: false, error: 'Strategy ID is required' }, { status: 400 })
    }

    const deleted = strategyService.deleteStrategy(strategyId)
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Strategy not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Strategy deleted successfully' })
  } catch (error) {
    console.error('Strategy Builder API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
