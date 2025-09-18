// Enhanced Paper Trading Service - Realistic Trading Simulation
import { 
  PaperTradingAccount, 
  PaperPosition, 
  PaperOrder, 
  PaperTransaction,
  PaperTradingStats,
  Stock
} from '@/types'
import { prisma } from './db'
import { getStockData } from './multi-source-api'
import { getMarketStatus as getClockStatus, isRegularOpen, isPreMarket as clockPre, isAfterHours as clockAfter } from './market-clock'

// Market hours configuration (US Eastern Time)
const MARKET_HOURS = {
  preMarket: { start: '04:00', end: '09:30' },
  regular: { start: '09:30', end: '16:00' },
  afterHours: { start: '16:00', end: '20:00' },
  closed: { start: '20:00', end: '04:00' }
}

// Trading rules and restrictions
const TRADING_RULES = {
  minOrderSize: 1,
  maxOrderSize: 1000000,
  maxPositionSize: 1000000,
  maxCashUsage: 0.95, // Can use up to 95% of available cash
  commission: {
    base: 0.99,
    large: 9.99,
    threshold: 1000
  },
  slippage: {
    small: 0.001, // 0.1% for orders < $10k
    medium: 0.002, // 0.2% for orders $10k-$100k
    large: 0.005  // 0.5% for orders > $100k
  }
}

export class EnhancedPaperTradingService {
  private static instance: EnhancedPaperTradingService
  private static realTimeDataCache = new Map<string, { data: Stock; timestamp: number }>()
  private static updateInterval: NodeJS.Timeout | null = null
  private static orderMonitoringInterval: NodeJS.Timeout | null = null
  private static isRunning = false

  static getInstance(): EnhancedPaperTradingService {
    if (!EnhancedPaperTradingService.instance) {
      EnhancedPaperTradingService.instance = new EnhancedPaperTradingService()
    }
    return EnhancedPaperTradingService.instance
  }

  // Start real-time data updates
  startRealTimeUpdates(): void {
    if (EnhancedPaperTradingService.isRunning) return
    
    EnhancedPaperTradingService.isRunning = true
    console.log('🚀 Starting enhanced paper trading real-time updates...')
    
    // Update positions every 5 seconds during market hours, 30 seconds after hours
    EnhancedPaperTradingService.updateInterval = setInterval(() => {
      this.updateAllPositions()
    }, this.isMarketOpen() ? 5000 : 30000)

    // NEW: Monitor orders every 2 seconds during market hours, 10 seconds after hours
    EnhancedPaperTradingService.orderMonitoringInterval = setInterval(() => {
      this.monitorAllOrders()
    }, this.isMarketOpen() ? 2000 : 10000)
  }

  // Stop real-time data updates
  stopRealTimeUpdates(): void {
    if (!EnhancedPaperTradingService.isRunning) return
    
    EnhancedPaperTradingService.isRunning = false
    console.log('🛑 Stopping enhanced paper trading real-time updates...')
    
    if (EnhancedPaperTradingService.updateInterval) {
      clearInterval(EnhancedPaperTradingService.updateInterval)
      EnhancedPaperTradingService.updateInterval = null
    }

    // NEW: Clear order monitoring interval
    if (EnhancedPaperTradingService.orderMonitoringInterval) {
      clearInterval(EnhancedPaperTradingService.orderMonitoringInterval)
      EnhancedPaperTradingService.orderMonitoringInterval = null
    }
  }

  // Check if market is currently open (regular hours)
  isMarketOpen(): boolean {
    return isRegularOpen()
  }

  // Check if we're in pre-market hours
  isPreMarket(): boolean {
    return clockPre()
  }

  // Check if we're in after-hours
  isAfterHours(): boolean {
    return clockAfter()
  }

  // Get current market status
  getMarketStatus(): {
    isOpen: boolean
    status: 'pre-market' | 'open' | 'after-hours' | 'closed'
    nextOpen: string
    nextClose: string
  } {
    return getClockStatus()
  }

  // Create a new paper trading account with enhanced features
  async createAccount(userId: string, name: string, initialBalance: number = 100000): Promise<PaperTradingAccount> {
    try {
      // Validate initial balance
      if (initialBalance < 1000) {
        throw new Error('Minimum initial balance is $1,000')
      }
      if (initialBalance > 10000000) {
        throw new Error('Maximum initial balance is $10,000,000')
      }

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

      console.log(`✅ Created enhanced paper trading account: ${name} with $${initialBalance.toLocaleString()}`)
      return account as PaperTradingAccount
    } catch (error) {
      console.error('Error creating enhanced paper trading account:', error)
      throw new Error('Failed to create paper trading account')
    }
  }

  // Enhanced order placement with realistic execution
  async placeOrder(
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
      if (quantity < TRADING_RULES.minOrderSize) {
        throw new Error(`Minimum order size is ${TRADING_RULES.minOrderSize} shares`)
      }
      if (quantity > TRADING_RULES.maxOrderSize) {
        throw new Error(`Maximum order size is ${TRADING_RULES.maxOrderSize.toLocaleString()} shares`)
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

      // Get current stock data
      const stockData = await getStockData(symbol)
      if (!stockData) {
        throw new Error(`Stock data not available for ${symbol}`)
      }

      // Get account
      const account = await this.getAccount(accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      // Check trading restrictions based on market hours
      const marketStatus = this.getMarketStatus()
      // Only allow market orders during regular market hours
      if (type === 'market' && !marketStatus.isOpen) {
        throw new Error('Market orders can only be placed during regular market hours')
      }

      // Check if user has enough cash for buy orders (including estimated commission)
      if (side === 'buy') {
        const estimatedPrice = price || stockData.price
        const estimatedCommission = this.calculateCommission(quantity, estimatedPrice)
        const requiredCash = estimatedPrice * quantity + estimatedCommission
        const maxCashUsage = account.availableCash * TRADING_RULES.maxCashUsage
        
        if (requiredCash > maxCashUsage) {
          throw new Error(`Insufficient cash. Required: $${requiredCash.toLocaleString()}, Available: $${maxCashUsage.toLocaleString()}`)
        }
      }

      // Check if user has enough shares for sell orders
      if (side === 'sell') {
        const position = account.positions.find(p => p.symbol === symbol)
        if (!position || position.quantity < quantity) {
          throw new Error(`Insufficient shares. Required: ${quantity}, Available: ${position?.quantity || 0}`)
        }
      }

      // Calculate commission
      const estimatedPrice = price || stockData.price
      const commission = this.calculateCommission(quantity, estimatedPrice)

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
          commission,
          notes,
        },
      })

      console.log(`📋 Created ${type} ${side} order for ${quantity} shares of ${symbol}`)

      // Process market orders immediately
      if (type === 'market') {
        await this.processMarketOrder(order.id)
      }

      return order as PaperOrder
    } catch (error) {
      console.error('Error placing enhanced paper trading order:', error)
      throw error
    }
  }

  // Enhanced market order processing with realistic execution
  async processMarketOrder(orderId: string): Promise<void> {
    try {
      const order = await prisma.paperOrder.findUnique({
        where: { id: orderId },
        include: { account: true },
      })

      if (!order || order.status !== 'pending') {
        return
      }

      // Get current stock price
      const stockData = await getStockData(order.symbol)
      if (!stockData) {
        throw new Error(`Stock data not available for ${order.symbol}`)
      }

      // Calculate execution price with slippage
      const basePrice = stockData.price
      const slippage = this.calculateSlippage(order.quantity * basePrice)
      const executionPrice = order.side === 'buy' 
        ? basePrice * (1 + slippage) 
        : basePrice * (1 - slippage)

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
          description: `${order.side.toUpperCase()} ${order.quantity} shares of ${order.symbol} at $${executionPrice.toFixed(2)} (slippage: ${(slippage * 100).toFixed(2)}%)`,
        },
      })

      // Update account and positions
      await this.updateAccountAfterTrade(order.accountId, order.symbol, order.side as 'buy' | 'sell', order.quantity, executionPrice, commission)
      
      console.log(`✅ Executed market order: ${order.side} ${order.quantity} ${order.symbol} at $${executionPrice.toFixed(2)}`)
    } catch (error) {
      console.error('Error processing enhanced market order:', error)
      throw error
    }
  }

  // NEW: Process limit orders with realistic execution
  async processLimitOrder(orderId: string): Promise<void> {
    try {
      const order = await prisma.paperOrder.findUnique({
        where: { id: orderId },
        include: { account: true },
      })

      if (!order || order.status !== 'pending' || !order.price) {
        return
      }

      // Get current stock price
      const stockData = await getStockData(order.symbol)
      if (!stockData) {
        return // Wait for data to be available
      }

      const currentPrice = stockData.price
      let shouldExecute = false

      // Check if limit order conditions are met
      if (order.side === 'buy' && currentPrice <= order.price) {
        shouldExecute = true
      } else if (order.side === 'sell' && currentPrice >= order.price) {
        shouldExecute = true
      }

      if (shouldExecute) {
        // Add small random delay to simulate market execution time (100-500ms)
        const executionDelay = Math.random() * 400 + 100
        await new Promise(resolve => setTimeout(resolve, executionDelay))

        // Re-check price after delay to ensure conditions still exist
        const updatedStockData = await getStockData(order.symbol)
        if (updatedStockData) {
          const finalPrice = updatedStockData.price
          const finalSlippage = this.calculateSlippage(order.quantity * finalPrice)
          const executionPrice = order.side === 'buy' 
            ? finalPrice * (1 + finalSlippage) 
            : finalPrice * (1 - finalSlippage)

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
              description: `LIMIT ${order.side.toUpperCase()} ${order.quantity} shares of ${order.symbol} at $${executionPrice.toFixed(2)} (triggered at $${finalPrice.toFixed(2)})`,
            },
          })

          // Update account and positions
          await this.updateAccountAfterTrade(order.accountId, order.symbol, order.side as 'buy' | 'sell', order.quantity, executionPrice, commission)
          
          console.log(`✅ Executed limit order: ${order.side} ${order.quantity} ${order.symbol} at $${executionPrice.toFixed(2)}`)
        }
      }
    } catch (error) {
      console.error('Error processing limit order:', error)
    }
  }

  // NEW: Process stop orders with realistic execution
  async processStopOrder(orderId: string): Promise<void> {
    try {
      const order = await prisma.paperOrder.findUnique({
        where: { id: orderId },
        include: { account: true },
      })

      if (!order || order.status !== 'pending' || !order.stopPrice) {
        return
      }

      // Get current stock price
      const stockData = await getStockData(order.symbol)
      if (!stockData) {
        return // Wait for data to be available
      }

      const currentPrice = stockData.price
      let shouldExecute = false

      // Check if stop order conditions are met
      if (order.side === 'buy' && currentPrice >= order.stopPrice) {
        shouldExecute = true
      } else if (order.side === 'sell' && currentPrice <= order.stopPrice) {
        shouldExecute = true
      }

      if (shouldExecute) {
        // Add small random delay to simulate market execution time (100-500ms)
        const executionDelay = Math.random() * 400 + 100
        await new Promise(resolve => setTimeout(resolve, executionDelay))

        // Re-check price after delay
        const updatedStockData = await getStockData(order.symbol)
        if (updatedStockData) {
          const finalPrice = updatedStockData.price
          const finalSlippage = this.calculateSlippage(order.quantity * finalPrice)
          const executionPrice = order.side === 'buy' 
            ? finalPrice * (1 + finalSlippage) 
            : finalPrice * (1 - finalSlippage)

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
              description: `STOP ${order.side.toUpperCase()} ${order.quantity} shares of ${order.symbol} at $${executionPrice.toFixed(2)} (triggered at $${finalPrice.toFixed(2)})`,
            },
          })

          // Update account and positions
          await this.updateAccountAfterTrade(order.accountId, order.symbol, order.side as 'buy' | 'sell', order.quantity, executionPrice, commission)
          
          console.log(`✅ Executed stop order: ${order.side} ${order.quantity} ${order.symbol} at $${executionPrice.toFixed(2)}`)
        }
      }
    } catch (error) {
      console.error('Error processing stop order:', error)
    }
  }

  // NEW: Process stop-limit orders with realistic execution
  async processStopLimitOrder(orderId: string): Promise<void> {
    try {
      const order = await prisma.paperOrder.findUnique({
        where: { id: orderId },
        include: { account: true },
      })

      if (!order || order.status !== 'pending' || !order.stopPrice || !order.price) {
        return
      }

      // Get current stock price
      const stockData = await getStockData(order.symbol)
      if (!stockData) {
        return // Wait for data to be available
      }

      const currentPrice = stockData.price
      let shouldTrigger = false

      // Check if stop condition is met
      if (order.side === 'buy' && currentPrice >= order.stopPrice) {
        shouldTrigger = true
      } else if (order.side === 'sell' && currentPrice <= order.stopPrice) {
        shouldTrigger = true
      }

      if (shouldTrigger) {
        // Add small random delay to simulate market execution time (100-500ms)
        const executionDelay = Math.random() * 400 + 100
        await new Promise(resolve => setTimeout(resolve, executionDelay))

        // Re-check price after delay
        const updatedStockData = await getStockData(order.symbol)
        if (updatedStockData) {
          const finalPrice = updatedStockData.price
          
          // Check if limit price condition is also met
          let shouldExecute = false
          if (order.side === 'buy' && finalPrice <= order.price) {
            shouldExecute = true
          } else if (order.side === 'sell' && finalPrice >= order.price) {
            shouldExecute = true
          }

          if (shouldExecute) {
            const finalSlippage = this.calculateSlippage(order.quantity * finalPrice)
            const executionPrice = order.side === 'buy' 
              ? finalPrice * (1 + finalSlippage) 
              : finalPrice * (1 - finalSlippage)

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
                description: `STOP-LIMIT ${order.side.toUpperCase()} ${order.quantity} shares of ${order.symbol} at $${executionPrice.toFixed(2)} (stop: $${order.stopPrice}, limit: $${order.price})`,
              },
            })

            // Update account and positions
            await this.updateAccountAfterTrade(order.accountId, order.symbol, order.side as 'buy' | 'sell', order.quantity, executionPrice, commission)
            
            console.log(`✅ Executed stop-limit order: ${order.side} ${order.quantity} ${order.symbol} at $${executionPrice.toFixed(2)}`)
          } else {
            // Stop triggered but limit not met - reject order
            await prisma.paperOrder.update({
              where: { id: orderId },
              data: {
                status: 'rejected',
                notes: `Stop triggered at $${finalPrice.toFixed(2)} but limit price $${order.price} not met`,
              },
            })
            console.log(`❌ Stop-limit order rejected: ${order.symbol} - limit price not met`)
          }
        }
      }
    } catch (error) {
      console.error('Error processing stop-limit order:', error)
    }
  }

  // NEW: Comprehensive order monitoring system
  async monitorAllOrders(): Promise<void> {
    try {
      // Get all pending orders
      const pendingOrders = await prisma.paperOrder.findMany({
        where: { status: 'pending' },
        include: { account: true },
      })

      for (const order of pendingOrders) {
        try {
          switch (order.type) {
            case 'market':
              // Market orders should already be processed
              break
            case 'limit':
              await this.processLimitOrder(order.id)
              break
            case 'stop':
              await this.processStopOrder(order.id)
              break
            case 'stop-limit':
              await this.processStopLimitOrder(order.id)
              break
          }
        } catch (error) {
          console.error(`Error monitoring order ${order.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error in order monitoring system:', error)
    }
  }

  // Enhanced account update after trade
  async updateAccountAfterTrade(
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
      console.error('Error updating enhanced account after trade:', error)
      throw error
    }
  }

  // Enhanced account totals update with real-time data
  async updateAccountTotals(accountId: string): Promise<void> {
    try {
      const account = await this.getAccount(accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      // Update positions with current prices
      let totalPositionValue = 0
      for (const position of account.positions) {
        const stockData = await getStockData(position.symbol)
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
      console.error('Error updating enhanced account totals:', error)
      throw error
    }
  }

  // Update all positions with real-time data
  private async updateAllPositions(): Promise<void> {
    try {
      const accounts = await prisma.paperTradingAccount.findMany({
        include: { positions: true }
      })

      for (const account of accounts) {
        for (const position of account.positions) {
          try {
            const stockData = await getStockData(position.symbol)
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

              // Update cache
              EnhancedPaperTradingService.realTimeDataCache.set(position.symbol, {
                data: stockData,
                timestamp: Date.now()
              })
            }
          } catch (error) {
            console.error(`Error updating position ${position.symbol}:`, error)
          }
        }

        // Update account totals after position updates
        await this.updateAccountTotals(account.id)
      }

      // NEW: Check risk management after position updates
      await this.checkRiskManagement()
    } catch (error) {
      console.error('Error updating all positions:', error)
    }
  }

  // Enhanced commission calculation
  private calculateCommission(quantity: number, price: number): number {
    const tradeValue = quantity * price
    if (tradeValue < TRADING_RULES.commission.threshold) {
      return TRADING_RULES.commission.base
    } else {
      return TRADING_RULES.commission.large
    }
  }

  // Calculate slippage based on order size
  private calculateSlippage(tradeValue: number): number {
    if (tradeValue < 10000) {
      return TRADING_RULES.slippage.small
    } else if (tradeValue < 100000) {
      return TRADING_RULES.slippage.medium
    } else {
      return TRADING_RULES.slippage.large
    }
  }

  // Get account with enhanced data
  async getAccount(accountId: string): Promise<PaperTradingAccount | null> {
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
      console.error('Error fetching enhanced paper trading account:', error)
      throw new Error('Failed to fetch paper trading account')
    }
  }

  // Get all accounts for a user
  async getAccounts(userId: string): Promise<PaperTradingAccount[]> {
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
      console.error('Error fetching enhanced paper trading accounts:', error)
      throw new Error('Failed to fetch paper trading accounts')
    }
  }

  // Get real-time data for a symbol
  async getRealTimeData(symbol: string): Promise<Stock | null> {
    try {
      // Check cache first
      const cached = EnhancedPaperTradingService.realTimeDataCache.get(symbol)
      if (cached && Date.now() - cached.timestamp < 5000) { // 5 second cache
        return cached.data
      }

      // Fetch fresh data
      const stockData = await getStockData(symbol)
      if (stockData) {
        EnhancedPaperTradingService.realTimeDataCache.set(symbol, {
          data: stockData,
          timestamp: Date.now()
        })
      }

      return stockData
    } catch (error) {
      console.error(`Error fetching real-time data for ${symbol}:`, error)
      return null
    }
  }

  // Get enhanced trading statistics
  async getEnhancedTradingStats(accountId: string): Promise<PaperTradingStats> {
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

      // Calculate enhanced statistics
      const stats = await this.calculateAdvancedStats(account, transactions)
      return stats
    } catch (error) {
      console.error('Error calculating enhanced trading stats:', error)
      throw new Error('Failed to calculate trading statistics')
    }
  }

  // Calculate advanced trading statistics
  private async calculateAdvancedStats(account: PaperTradingAccount, transactions: any[]): Promise<PaperTradingStats> {
    try {
      // Get risk metrics
      const riskMetrics = await this.calculatePortfolioRiskMetrics(account.id)
      
      // Calculate basic trade statistics
      const buyTransactions = transactions.filter(t => t.type === 'buy')
      const sellTransactions = transactions.filter(t => t.type === 'sell')
      
      let totalTrades = 0
      let winningTrades = 0
      let losingTrades = 0
      let totalWins = 0
      let totalLosses = 0
      
      // Match buy and sell transactions to calculate trade performance
      for (const buy of buyTransactions) {
        const correspondingSell = sellTransactions.find(s => s.symbol === buy.symbol)
        if (correspondingSell) {
          totalTrades++
          const tradePnL = (correspondingSell.price - buy.price) * buy.quantity - buy.commission - correspondingSell.commission
          
          if (tradePnL > 0) {
            winningTrades++
            totalWins += tradePnL
          } else {
            losingTrades++
            totalLosses += Math.abs(tradePnL)
          }
        }
      }
      
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
      const averageWin = winningTrades > 0 ? totalWins / winningTrades : 0
      const averageLoss = losingTrades > 0 ? totalLosses / losingTrades : 0
      const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0
      
      // Calculate annualized return
      const accountAge = (Date.now() - new Date(account.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)
      const annualizedReturn = accountAge > 0 ? (account.totalPnL / account.initialBalance) / accountAge * 100 : 0
      
      return {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate: Math.round(winRate * 100) / 100,
        averageWin: Math.round(averageWin * 100) / 100,
        averageLoss: Math.round(averageLoss * 100) / 100,
        profitFactor: Math.round(profitFactor * 100) / 100,
        maxDrawdown: Math.round(riskMetrics.maxDrawdown * 100) / 100,
        sharpeRatio: Math.round(riskMetrics.sharpeRatio * 100) / 100,
        totalReturn: Math.round(account.totalPnL * 100) / 100,
        annualizedReturn: Math.round(annualizedReturn * 100) / 100,
      }
    } catch (error) {
      console.error('Error calculating advanced stats:', error)
      
      // Return basic stats as fallback
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        totalReturn: account.totalPnL,
        annualizedReturn: 0,
      }
    }
  }

  // Cancel an order with enhanced validation
  async cancelOrder(orderId: string): Promise<void> {
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

      // Only allow cancellation during regular market hours
      const marketStatus = this.getMarketStatus()
      if (!marketStatus.isOpen) {
        throw new Error('Orders can only be cancelled during regular market hours')
      }

      await prisma.paperOrder.update({
        where: { id: orderId },
        data: { status: 'cancelled' },
      })

      console.log(`❌ Cancelled order: ${order.symbol} ${order.quantity} shares`)
    } catch (error) {
      console.error('Error cancelling enhanced order:', error)
      throw error
    }
  }

  // Delete account with enhanced cleanup
  async deleteAccount(accountId: string): Promise<void> {
    try {
      const account = await this.getAccount(accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      // Check if account has open positions
      if (account.positions.length > 0) {
        throw new Error('Cannot delete account with open positions. Please close all positions first.')
      }

      // Check if account has pending orders
      const pendingOrders = account.orders.filter(o => o.status === 'pending')
      if (pendingOrders.length > 0) {
        throw new Error('Cannot delete account with pending orders. Please cancel all orders first.')
      }

      // Delete all related data
      await prisma.paperTransaction.deleteMany({ where: { accountId } })
      await prisma.paperOrder.deleteMany({ where: { accountId } })
      await prisma.paperPosition.deleteMany({ where: { accountId } })
      await prisma.paperTradingAccount.delete({ where: { id: accountId } })

      console.log(`✅ Enhanced account ${accountId} deleted successfully`)
    } catch (error) {
      console.error('Error deleting enhanced paper trading account:', error)
      throw new Error('Failed to delete account')
    }
  }

  // NEW: Enhanced risk management with automatic stop-loss and take-profit
  async addRiskManagement(
    accountId: string,
    symbol: string,
    stopLoss?: number,
    takeProfit?: number,
    trailingStop?: number
  ): Promise<void> {
    try {
      const position = await prisma.paperPosition.findFirst({
        where: { accountId, symbol }
      })

      if (!position) {
        throw new Error('Position not found for risk management')
      }

      // Store risk management parameters in position notes (can be enhanced with a separate table later)
      const riskParams = {
        stopLoss,
        takeProfit,
        trailingStop,
        entryPrice: position.averagePrice,
        lastUpdated: new Date()
      }

      await prisma.paperPosition.update({
        where: { id: position.id },
        data: {
          notes: JSON.stringify(riskParams),
          lastUpdated: new Date()
        }
      })

      console.log(`🛡️ Added risk management for ${symbol}: SL: ${stopLoss}, TP: ${takeProfit}, TS: ${trailingStop}`)
    } catch (error) {
      console.error('Error adding risk management:', error)
      throw error
    }
  }

  // NEW: Check and execute risk management orders
  async checkRiskManagement(): Promise<void> {
    try {
      const positions = await prisma.paperPosition.findMany({
        where: {
          notes: { not: null }
        }
      })

      for (const position of positions) {
        try {
          const riskParams = JSON.parse(position.notes || '{}')
          if (!riskParams.stopLoss && !riskParams.takeProfit && !riskParams.trailingStop) {
            continue
          }

          const stockData = await getStockData(position.symbol)
          if (!stockData) continue

          const currentPrice = stockData.price
          let shouldExecute = false
          let exitReason = ''

          // Check stop-loss
          if (riskParams.stopLoss && currentPrice <= riskParams.stopLoss) {
            shouldExecute = true
            exitReason = 'stop_loss'
          }

          // Check take-profit
          if (riskParams.takeProfit && currentPrice >= riskParams.takeProfit) {
            shouldExecute = true
            exitReason = 'take_profit'
          }

          // Check trailing stop
          if (riskParams.trailingStop && riskParams.entryPrice) {
            const maxPrice = Math.max(riskParams.entryPrice, position.currentPrice)
            const trailingStopPrice = maxPrice * (1 - riskParams.trailingStop / 100)
            
            if (currentPrice <= trailingStopPrice) {
              shouldExecute = true
              exitReason = 'trailing_stop'
            }
          }

          if (shouldExecute) {
            await this.executeRiskExit(position, currentPrice, exitReason)
          }
        } catch (error) {
          console.error(`Error checking risk management for ${position.symbol}:`, error)
        }
      }
    } catch (error) {
      console.error('Error in risk management check:', error)
    }
  }

  // NEW: Execute risk-based exit
  private async executeRiskExit(
    position: any,
    exitPrice: number,
    exitReason: string
  ): Promise<void> {
    try {
      const slippage = this.calculateSlippage(position.quantity * exitPrice)
      const executionPrice = exitPrice * (1 - slippage) // Sell order
      const totalAmount = executionPrice * position.quantity
      const commission = this.calculateCommission(position.quantity, executionPrice)

      // Create sell transaction
      await prisma.paperTransaction.create({
        data: {
          accountId: position.accountId,
          symbol: position.symbol,
          type: 'sell',
          quantity: position.quantity,
          price: executionPrice,
          amount: totalAmount - commission,
          commission,
          description: `RISK EXIT: ${exitReason.toUpperCase()} - ${position.quantity} shares of ${position.symbol} at $${executionPrice.toFixed(2)}`,
        },
      })

      // Update account cash
      await prisma.paperTradingAccount.update({
        where: { id: position.accountId },
        data: {
          availableCash: { increment: totalAmount - commission },
          updatedAt: new Date(),
        },
      })

      // Delete position
      await prisma.paperPosition.delete({
        where: { id: position.id },
      })

      // Update account totals
      await this.updateAccountTotals(position.accountId)

      console.log(`🛡️ Risk exit executed: ${position.symbol} - ${exitReason} at $${executionPrice.toFixed(2)}`)
    } catch (error) {
      console.error('Error executing risk exit:', error)
    }
  }

  // NEW: Calculate enhanced portfolio risk metrics
  async calculatePortfolioRiskMetrics(accountId: string): Promise<{
    volatility: number
    beta: number
    sharpeRatio: number
    maxDrawdown: number
    var95: number
    correlation: number
  }> {
    try {
      const account = await this.getAccount(accountId)
      if (!account || account.positions.length === 0) {
        return {
          volatility: 0,
          beta: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          var95: 0,
          correlation: 0
        }
      }

      // Get historical data for risk calculation (simplified version)
      const riskMetrics = await this.calculateBasicRiskMetrics(account)
      
      return riskMetrics
    } catch (error) {
      console.error('Error calculating portfolio risk metrics:', error)
      return {
        volatility: 0,
        beta: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        var95: 0,
        correlation: 0
      }
    }
  }

  // NEW: Calculate basic risk metrics
  private async calculateBasicRiskMetrics(account: any): Promise<{
    volatility: number
    beta: number
    sharpeRatio: number
    maxDrawdown: number
    var95: number
    correlation: number
  }> {
    // Simplified risk calculation - in production, this would use historical data
    const totalValue = account.totalValue
    const totalPnL = account.totalPnL
    const initialBalance = account.initialBalance

    // Basic volatility estimate based on P&L
    const volatility = Math.abs(totalPnL / totalValue) * 100

    // Simplified beta (market correlation)
    const beta = totalPnL > 0 ? 0.8 : 1.2

    // Basic Sharpe ratio
    const riskFreeRate = 0.02 // 2% annual
    const sharpeRatio = (totalPnL / totalValue - riskFreeRate) / (volatility / 100)

    // Max drawdown estimate
    const maxDrawdown = Math.min(0, totalPnL / initialBalance) * 100

    // Value at Risk (95% confidence)
    const var95 = totalValue * (volatility / 100) * 1.65

    // Portfolio correlation (simplified)
    const correlation = account.positions.length > 1 ? 0.3 : 0

    return {
      volatility: Math.max(0, Math.min(100, volatility)),
      beta: Math.max(0, Math.min(3, beta)),
      sharpeRatio: Math.max(-3, Math.min(3, sharpeRatio)),
      maxDrawdown: Math.max(-100, Math.min(0, maxDrawdown)),
      var95: Math.max(0, var95),
      correlation: Math.max(0, Math.min(1, correlation))
    }
  }
}

// Export singleton instance
export const enhancedPaperTrading = EnhancedPaperTradingService.getInstance()
