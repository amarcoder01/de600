// Paper Trading Service - Virtual Trading Simulation
import { 
  PaperTradingAccount, 
  PaperPosition, 
  PaperOrder, 
  PaperTransaction,
  PaperTradingStats,
  PaperTradingPerformance,
  Stock
} from '@/types'
import { prisma } from './db'
import { polygonAPI } from './polygon-api'

export class PaperTradingService {
  // Create a new paper trading account
  static async createAccount(userId: string, name: string, initialBalance: number = 100000): Promise<PaperTradingAccount> {
    try {
      const account = await prisma.paperTradingAccount.create({
        data: {
          userId,
          name,
          initialBalance,
          currentBalance: initialBalance,
          availableCash: initialBalance,
          totalValue: initialBalance,
          totalPnL: 0,
          totalPnLPercent: 0,
          isActive: true,
        },
        include: {
          positions: true,
          orders: true,
          transactions: true,
        },
      })

      return account as PaperTradingAccount
    } catch (error) {
      console.error('Error creating paper trading account:', error)
      throw new Error('Failed to create paper trading account')
    }
  }

  // Get user's paper trading accounts
  static async getAccounts(userId: string): Promise<PaperTradingAccount[]> {
    try {
      const accounts = await prisma.paperTradingAccount.findMany({
        where: { userId },
        include: {
          positions: true,
          orders: {
            orderBy: { createdAt: 'desc' },
          },
          transactions: {
            orderBy: { timestamp: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return accounts as PaperTradingAccount[]
    } catch (error) {
      console.error('Error fetching paper trading accounts:', error)
      throw new Error('Failed to fetch paper trading accounts')
    }
  }

  // Get a specific paper trading account
  static async getAccount(accountId: string): Promise<PaperTradingAccount | null> {
    try {
      const account = await prisma.paperTradingAccount.findUnique({
        where: { id: accountId },
        include: {
          positions: true,
          orders: {
            orderBy: { createdAt: 'desc' },
          },
          transactions: {
            orderBy: { timestamp: 'desc' },
          },
        },
      })

      return account as PaperTradingAccount | null
    } catch (error) {
      console.error('Error fetching paper trading account:', error)
      throw new Error('Failed to fetch paper trading account')
    }
  }

  // Place a paper trading order
  static async placeOrder(
    accountId: string,
    symbol: string,
    type: 'market' | 'limit' | 'stop' | 'stop-limit',
    side: 'buy' | 'sell',
    quantity: number,
    price?: number,
    stopPrice?: number,
    notes?: string
  ): Promise<PaperOrder> {
    try {
      // Validate order parameters
      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0')
      }

      if (type === 'limit' && !price) {
        throw new Error('Limit orders require a price')
      }

      if (type === 'stop' && !stopPrice) {
        throw new Error('Stop orders require a stop price')
      }

      if (type === 'stop-limit' && (!price || !stopPrice)) {
        throw new Error('Stop-limit orders require both price and stop price')
      }

      // Get current stock data from Polygon.io
      const stockData = await polygonAPI.getUSStockData(symbol)
      if (!stockData) {
        throw new Error(`Stock data not available for ${symbol}`)
      }

      // Get account
      const account = await this.getAccount(accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      // Check if user has enough cash for buy orders (including estimated commission)
      if (side === 'buy') {
        const estPrice = price || stockData.price
        const estimatedCommission = this.calculateCommission(quantity, estPrice)
        const requiredCash = estPrice * quantity + estimatedCommission
        if (account.availableCash < requiredCash) {
          throw new Error('Insufficient cash for this order')
        }
      }

      // Check if user has enough shares for sell orders
      if (side === 'sell') {
        const position = account.positions.find(p => p.symbol === symbol)
        if (!position || position.quantity < quantity) {
          throw new Error('Insufficient shares for this order')
        }
      }

      // Create the order
      const order = await prisma.paperOrder.create({
        data: {
          accountId,
          symbol,
          type,
          side,
          quantity,
          price,
          stopPrice,
          status: 'pending',
          filledQuantity: 0,
          commission: this.calculateCommission(quantity, price || stockData.price),
          notes,
        },
      })

      // Process market orders immediately
      if (type === 'market') {
        await this.processMarketOrder(order.id)
      }

      return order as PaperOrder
    } catch (error) {
      console.error('Error placing paper trading order:', error)
      throw error
    }
  }

  // Process market orders
  static async processMarketOrder(orderId: string): Promise<void> {
    try {
      const order = await prisma.paperOrder.findUnique({
        where: { id: orderId },
        include: { account: true },
      })

      if (!order || order.status !== 'pending') {
        return
      }

      // Get current stock price from Polygon.io
      const stockData = await polygonAPI.getUSStockData(order.symbol)
      if (!stockData) {
        throw new Error(`Stock data not available for ${order.symbol}`)
      }

      const executionPrice = stockData.price
      const totalAmount = executionPrice * order.quantity
      const commission = this.calculateCommission(order.quantity, executionPrice)

      // Update order
      await prisma.paperOrder.update({
        where: { id: orderId },
        data: {
          status: 'filled',
          filledQuantity: order.quantity,
          averagePrice: executionPrice,
        },
      })

      // Create transaction
      await prisma.paperTransaction.create({
        data: {
          accountId: order.accountId,
          orderId: orderId,
          symbol: order.symbol,
          type: order.side,
          quantity: order.quantity,
          price: executionPrice,
          amount: totalAmount + commission,
          commission,
          description: `${order.side.toUpperCase()} ${order.quantity} shares of ${order.symbol} at $${executionPrice.toFixed(2)}`,
        },
      })

      // Update account and positions
      await this.updateAccountAfterTrade(order.accountId, order.symbol, order.side as 'buy' | 'sell', order.quantity, executionPrice, commission)
    } catch (error) {
      console.error('Error processing market order:', error)
      throw error
    }
  }

  // Update account after a trade
  static async updateAccountAfterTrade(
    accountId: string,
    symbol: string,
    side: 'buy' | 'sell',
    quantity: number,
    price: number,
    commission: number
  ): Promise<void> {
    try {
      const account = await this.getAccount(accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      const totalAmount = price * quantity
      const netAmount = side === 'buy' ? totalAmount + commission : totalAmount - commission

      // Update cash
      const newCash = side === 'buy' 
        ? account.availableCash - netAmount 
        : account.availableCash + netAmount

      // Update or create position
      let position = account.positions.find(p => p.symbol === symbol)
      
      if (side === 'buy') {
        if (position) {
          // Update existing position
          const newQuantity = position.quantity + quantity
          const newAveragePrice = ((position.quantity * position.averagePrice) + totalAmount) / newQuantity
          
          await prisma.paperPosition.update({
            where: { id: position.id },
            data: {
              quantity: newQuantity,
              averagePrice: newAveragePrice,
              lastUpdated: new Date(),
            },
          })
        } else {
          // Create new position
          await prisma.paperPosition.create({
            data: {
              accountId,
              symbol,
              name: symbol, // Will be updated with real data
              quantity,
              averagePrice: price,
              currentPrice: price,
              marketValue: totalAmount,
              unrealizedPnL: 0,
              unrealizedPnLPercent: 0,
              type: 'stock',
              entryDate: new Date(),
              lastUpdated: new Date(),
            },
          })
        }
      } else {
        // Sell order
        if (position && position.quantity >= quantity) {
          const newQuantity = position.quantity - quantity
          
          if (newQuantity === 0) {
            // Close position
            await prisma.paperPosition.delete({
              where: { id: position.id },
            })
          } else {
            // Update position
            await prisma.paperPosition.update({
              where: { id: position.id },
              data: {
                quantity: newQuantity,
                lastUpdated: new Date(),
              },
            })
          }
        }
      }

      // Update account cash
      await prisma.paperTradingAccount.update({
        where: { id: accountId },
        data: {
          availableCash: newCash,
          updatedAt: new Date(),
        },
      })

      // Update account totals
      await this.updateAccountTotals(accountId)
    } catch (error) {
      console.error('Error updating account after trade:', error)
      throw error
    }
  }

  // Update account totals (total value, P&L, etc.)
  static async updateAccountTotals(accountId: string): Promise<void> {
    try {
      const account = await this.getAccount(accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      // Update positions with current prices from Polygon.io
      let totalPositionValue = 0
      for (const position of account.positions) {
        const stockData = await polygonAPI.getUSStockData(position.symbol)
        if (stockData) {
          const currentPrice = stockData.price
          const marketValue = currentPrice * position.quantity
          const unrealizedPnL = marketValue - (position.averagePrice * position.quantity)
          const unrealizedPnLPercent = position.averagePrice > 0 
            ? ((currentPrice - position.averagePrice) / position.averagePrice) * 100 
            : 0

          await prisma.paperPosition.update({
            where: { id: position.id },
            data: {
              currentPrice,
              marketValue,
              unrealizedPnL,
              unrealizedPnLPercent,
              lastUpdated: new Date(),
            },
          })

          totalPositionValue += marketValue
        }
      }

      const totalValue = account.availableCash + totalPositionValue
      const totalPnL = totalValue - account.initialBalance
      const totalPnLPercent = account.initialBalance > 0 
        ? (totalPnL / account.initialBalance) * 100 
        : 0

      // Update account
      await prisma.paperTradingAccount.update({
        where: { id: accountId },
        data: {
          totalValue,
          totalPnL,
          totalPnLPercent,
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('Error updating account totals:', error)
      throw error
    }
  }

  // Calculate commission (simplified)
  static calculateCommission(quantity: number, price: number): number {
    const tradeValue = quantity * price
    // Simple commission structure: $0.99 per trade for trades under $1000, otherwise $9.99
    return tradeValue < 1000 ? 0.99 : 9.99
  }

  // Get trading statistics for an account
  static async getTradingStats(accountId: string): Promise<PaperTradingStats> {
    try {
      const account = await this.getAccount(accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      const transactions = await prisma.paperTransaction.findMany({
        where: { 
          accountId,
          type: { in: ['buy', 'sell'] }
        },
        orderBy: { timestamp: 'asc' },
      })

      let totalTrades = 0
      let winningTrades = 0
      let losingTrades = 0
      let totalWins = 0
      let totalLosses = 0
      let maxDrawdown = 0
      let peakValue = account.initialBalance
      let currentValue = account.initialBalance

      // Calculate basic stats from transactions
      const buyTransactions = transactions.filter(t => t.type === 'buy')
      const sellTransactions = transactions.filter(t => t.type === 'sell')

      // Calculate realized P&L from completed trades
      const completedTrades: Array<{
        buyPrice: number
        sellPrice: number
        quantity: number
        profit: number
        profitPercent: number
      }> = []

      // Match buy and sell transactions for the same symbol
      for (const sellTx of sellTransactions) {
        const symbol = sellTx.symbol
        const sellQuantity = sellTx.quantity || 0
        const sellPrice = sellTx.price || 0
        
        // Find corresponding buy transactions
        const buyTxs = buyTransactions.filter(b => b.symbol === symbol)
        let remainingQuantity = sellQuantity
        
        for (const buyTx of buyTxs) {
          if (remainingQuantity <= 0) break
          
          const buyQuantity = buyTx.quantity || 0
          const buyPrice = buyTx.price || 0
          
          const tradeQuantity = Math.min(remainingQuantity, buyQuantity)
          const profit = (sellPrice - buyPrice) * tradeQuantity
          const profitPercent = buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : 0
          
          completedTrades.push({
            buyPrice,
            sellPrice,
            quantity: tradeQuantity,
            profit,
            profitPercent
          })
          
          remainingQuantity -= tradeQuantity
        }
      }

      // Calculate statistics from completed trades
      totalTrades = completedTrades.length
      winningTrades = completedTrades.filter(t => t.profit > 0).length
      losingTrades = completedTrades.filter(t => t.profit < 0).length
      
      totalWins = completedTrades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0)
      totalLosses = Math.abs(completedTrades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0))

      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
      const averageWin = winningTrades > 0 ? totalWins / winningTrades : 0
      const averageLoss = losingTrades > 0 ? totalLosses / losingTrades : 0
      const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0

      // Calculate total return and annualized return
      const totalReturn = account.totalPnL
      const accountAge = (Date.now() - account.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365) // years
      const annualizedReturn = accountAge > 0 ? (totalReturn / account.initialBalance) / accountAge : 0

      // Calculate Sharpe Ratio (simplified - would need more data for accurate calculation)
      const sharpeRatio = accountAge > 0 && account.totalPnLPercent > 0 ? 
        (account.totalPnLPercent / 100) / Math.sqrt(accountAge) : 0

      return {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        averageWin,
        averageLoss,
        profitFactor,
        maxDrawdown,
        sharpeRatio,
        totalReturn,
        annualizedReturn: annualizedReturn * 100, // Convert to percentage
      }
    } catch (error) {
      console.error('Error calculating trading stats:', error)
      throw new Error('Failed to calculate trading statistics')
    }
  }

  // Cancel an order
  static async cancelOrder(orderId: string): Promise<void> {
    try {
      const order = await prisma.paperOrder.findUnique({
        where: { id: orderId },
      })

      if (!order) {
        throw new Error('Order not found')
      }

      if (order.status !== 'pending') {
        throw new Error('Order cannot be cancelled')
      }

      await prisma.paperOrder.update({
        where: { id: orderId },
        data: { status: 'cancelled' },
      })
    } catch (error) {
      console.error('Error cancelling order:', error)
      throw error
    }
  }

  // Get order history
  static async getOrderHistory(accountId: string, limit: number = 50): Promise<PaperOrder[]> {
    try {
      const orders = await prisma.paperOrder.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      return orders as PaperOrder[]
    } catch (error) {
      console.error('Error fetching order history:', error)
      throw new Error('Failed to fetch order history')
    }
  }

  // Get transaction history for an account
  static async getTransactionHistory(accountId: string, limit: number = 50): Promise<PaperTransaction[]> {
    try {
      const transactions = await prisma.paperTransaction.findMany({
        where: { accountId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      })

      return transactions as PaperTransaction[]
    } catch (error) {
      console.error('Error fetching transaction history:', error)
      throw new Error('Failed to fetch transaction history')
    }
  }

  // Delete a paper trading account and all related data
  static async deleteAccount(accountId: string): Promise<void> {
    try {
      // First, check if account exists
      const account = await this.getAccount(accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      // Delete all related data in the correct order (due to foreign key constraints)
      
      // 1. Delete transactions
      await prisma.paperTransaction.deleteMany({
        where: { accountId },
      })

      // 2. Delete orders
      await prisma.paperOrder.deleteMany({
        where: { accountId },
      })

      // 3. Delete positions
      await prisma.paperPosition.deleteMany({
        where: { accountId },
      })

      // 4. Delete the account
      await prisma.paperTradingAccount.delete({
        where: { id: accountId },
      })

      console.log(`✅ Account ${accountId} and all related data deleted successfully`)
    } catch (error) {
      console.error('Error deleting paper trading account:', error)
      throw new Error('Failed to delete account')
    }
  }
}
