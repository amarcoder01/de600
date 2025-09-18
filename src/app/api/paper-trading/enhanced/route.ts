import { NextRequest, NextResponse } from 'next/server'
import { enhancedPaperTrading } from '@/lib/enhanced-paper-trading'
import { prisma } from '@/lib/db'

// Enhanced Paper Trading API with Real Market Data

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const accountId = searchParams.get('accountId')

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 })
    }

    switch (action) {
      case 'market-status':
        const marketStatus = enhancedPaperTrading.getMarketStatus()
        return NextResponse.json({ success: true, data: marketStatus })

      case 'start-updates':
        enhancedPaperTrading.startRealTimeUpdates()
        return NextResponse.json({ success: true, message: 'Real-time updates started' })

      case 'stop-updates':
        enhancedPaperTrading.stopRealTimeUpdates()
        return NextResponse.json({ success: true, message: 'Real-time updates stopped' })

      case 'get-account':
        if (!accountId || !userId) {
          return NextResponse.json({ error: 'Account ID and userId are required' }, { status: 400 })
        }
        // Ownership check
        {
          const acct = await prisma.paperTradingAccount.findUnique({ where: { id: accountId } })
          if (!acct || acct.userId !== userId) {
            return NextResponse.json({ error: 'Account not found or access denied' }, { status: 403 })
          }
        }
        const account = await enhancedPaperTrading.getAccount(accountId)
        return NextResponse.json({ success: true, data: account })

      case 'get-accounts':
        if (!userId) {
          return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }
        const accounts = await enhancedPaperTrading.getAccounts(userId)
        return NextResponse.json({ success: true, data: accounts })

      case 'get-stats':
        if (!accountId || !userId) {
          return NextResponse.json({ error: 'Account ID and userId are required' }, { status: 400 })
        }
        {
          const acct = await prisma.paperTradingAccount.findUnique({ where: { id: accountId } })
          if (!acct || acct.userId !== userId) {
            return NextResponse.json({ error: 'Account not found or access denied' }, { status: 403 })
          }
        }
        const stats = await enhancedPaperTrading.getEnhancedTradingStats(accountId)
        return NextResponse.json({ success: true, data: stats })

      case 'get-real-time-data':
        const symbol = searchParams.get('symbol')
        if (!symbol) {
          return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
        }
        const stockData = await enhancedPaperTrading.getRealTimeData(symbol)
        return NextResponse.json({ success: true, data: stockData })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Enhanced paper trading API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json()

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 })
    }

    switch (action) {
      case 'create-account':
        const { userId, name, initialBalance } = data
        if (!userId || !name) {
          return NextResponse.json({ error: 'User ID and name are required' }, { status: 400 })
        }
        const account = await enhancedPaperTrading.createAccount(userId, name, initialBalance)
        return NextResponse.json({ success: true, data: account })

      case 'place-order':
        const { 
          accountId: orderAccountId, 
          symbol, 
          type, 
          side, 
          quantity, 
          price, 
          stopPrice, 
          notes, 
          userId: orderUserId 
        } = data
        
        if (!orderAccountId || !symbol || !type || !side || !quantity || !orderUserId) {
          return NextResponse.json({ 
            error: 'Account ID, userId, symbol, type, side, and quantity are required' 
          }, { status: 400 })
        }
        // Ownership check
        {
          const acct = await prisma.paperTradingAccount.findUnique({ where: { id: orderAccountId } })
          if (!acct || acct.userId !== orderUserId) {
            return NextResponse.json({ error: 'Account not found or access denied' }, { status: 403 })
          }
        }
        
        const order = await enhancedPaperTrading.placeOrder(
          orderAccountId, 
          symbol, 
          type, 
          side, 
          quantity, 
          price, 
          stopPrice, 
          notes
        )
        return NextResponse.json({ success: true, data: order })

      case 'add-risk-management':
        const { 
          accountId: riskAccountId, 
          symbol: riskSymbol, 
          stopLoss, 
          takeProfit, 
          trailingStop, 
          userId: riskUserId 
        } = data
        
        if (!riskAccountId || !riskSymbol || !riskUserId) {
          return NextResponse.json({ 
            error: 'Account ID, symbol, and userId are required' 
          }, { status: 400 })
        }
        
        // Ownership check
        {
          const acct = await prisma.paperTradingAccount.findUnique({ where: { id: riskAccountId } })
          if (!acct || acct.userId !== riskUserId) {
            return NextResponse.json({ error: 'Account not found or access denied' }, { status: 403 })
          }
        }
        
        await enhancedPaperTrading.addRiskManagement(
          riskAccountId, 
          riskSymbol, 
          stopLoss, 
          takeProfit, 
          trailingStop
        )
        return NextResponse.json({ success: true, message: 'Risk management added successfully' })

      case 'get-enhanced-stats':
        const { accountId: statsAccountId, userId: statsUserId } = data
        
        if (!statsAccountId || !statsUserId) {
          return NextResponse.json({ 
            error: 'Account ID and userId are required' 
          }, { status: 400 })
        }
        
        // Ownership check
        {
          const acct = await prisma.paperTradingAccount.findUnique({ where: { id: statsAccountId } })
          if (!acct || acct.userId !== statsUserId) {
            return NextResponse.json({ error: 'Account not found or access denied' }, { status: 403 })
          }
        }
        
        const stats = await enhancedPaperTrading.getEnhancedTradingStats(statsAccountId)
        return NextResponse.json({ success: true, data: stats })

      case 'get-risk-metrics':
        const { accountId: riskMetricsAccountId, userId: riskMetricsUserId } = data
        
        if (!riskMetricsAccountId || !riskMetricsUserId) {
          return NextResponse.json({ 
            error: 'Account ID and userId are required' 
          }, { status: 400 })
        }
        
        // Ownership check
        {
          const acct = await prisma.paperTradingAccount.findUnique({ where: { id: riskMetricsAccountId } })
          if (!acct || acct.userId !== riskMetricsUserId) {
            return NextResponse.json({ error: 'Account not found or access denied' }, { status: 403 })
          }
        }
        
        const riskMetrics = await enhancedPaperTrading.calculatePortfolioRiskMetrics(riskMetricsAccountId)
        return NextResponse.json({ success: true, data: riskMetrics })

      case 'monitor-orders':
        const { userId: monitorUserId } = data
        
        if (!monitorUserId) {
          return NextResponse.json({ 
            error: 'UserId is required' 
          }, { status: 400 })
        }
        
        // Start order monitoring (this is a background process)
        enhancedPaperTrading.monitorAllOrders()
        return NextResponse.json({ success: true, message: 'Order monitoring started' })

      case 'cancel-order':
        const { orderId, userId: cancelUserId } = data
        if (!orderId || !cancelUserId) {
          return NextResponse.json({ error: 'Order ID and userId are required' }, { status: 400 })
        }
        // Ownership check via order->account
        {
          const ord = await prisma.paperOrder.findUnique({ where: { id: orderId }, include: { account: true } })
          if (!ord || ord.account.userId !== cancelUserId) {
            return NextResponse.json({ error: 'Order not found or access denied' }, { status: 403 })
          }
        }
        await enhancedPaperTrading.cancelOrder(orderId)
        return NextResponse.json({ success: true, message: 'Order cancelled successfully' })

      case 'delete-account':
        const { accountId: deleteAccountId, userId: deleteUserId } = data
        if (!deleteAccountId || !deleteUserId) {
          return NextResponse.json({ error: 'Account ID and userId are required' }, { status: 400 })
        }
        // Ownership check
        {
          const acct = await prisma.paperTradingAccount.findUnique({ where: { id: deleteAccountId } })
          if (!acct || acct.userId !== deleteUserId) {
            return NextResponse.json({ error: 'Account not found or access denied' }, { status: 403 })
          }
        }
        await enhancedPaperTrading.deleteAccount(deleteAccountId)
        return NextResponse.json({ success: true, message: 'Account deleted successfully' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Enhanced paper trading API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { action, ...data } = await request.json()

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 })
    }

    switch (action) {
      case 'update-account':
        // Handle account updates if needed
        return NextResponse.json({ success: true, message: 'Account updated successfully' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Enhanced paper trading API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
