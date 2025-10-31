'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  DollarSign,
  Lightbulb,
  AlertTriangle,
  Target,
  Minimize2,
  Maximize2
} from 'lucide-react'
import { PaperTradingAccount, PaperPosition, PaperTransaction, Stock } from '@/types'

interface PaperTradingAIProps {
  account: PaperTradingAccount
  realTimeData: Map<string, Stock>
  onClose?: () => void
  allAccounts?: PaperTradingAccount[]
}

interface AIMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  suggestions?: string[]
}

export default function PaperTradingAI({ 
  account, 
  realTimeData, 
  onClose,
  allAccounts = []
}: PaperTradingAIProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: AIMessage = {
      id: '1',
      type: 'ai',
      content: `Hello! I'm your Paper Trading AI Assistant. I can help you analyze your trading performance, understand your P&L, and provide insights about your positions. What would you like to know about your trading account?`,
      timestamp: new Date(),
      suggestions: [
        'Analyze my current positions',
        'What are my best performing stocks?',
        'How is my risk management?',
        'Give me trading insights'
      ]
    }
    setMessages([welcomeMessage])
  }, [])

  const analyzeAccount = () => {
    const positions = account.positions || []
    const transactions = account.transactions || []
    const orders = account.orders || []
    
    // Enhanced Position Analysis
    let totalUnrealizedPnL = 0
    let profitablePositions = 0
    let losingPositions = 0
    let bestPosition = { symbol: '', pnl: 0, percentage: 0 }
    let worstPosition = { symbol: '', pnl: 0, percentage: 0 }
    let totalInvested = 0
    let totalMarketValue = 0
    let largestPosition = { symbol: '', value: 0, percentage: 0 }
    let smallestPosition = { symbol: '', value: 0, percentage: 0 }
    
    // Sector and position size analysis
    const sectorExposure: { [key: string]: number } = {}
    const positionSizes: number[] = []
    
    positions.forEach(position => {
      const realTimePrice = realTimeData.get(position.symbol)?.price || position.currentPrice
      const unrealizedPnL = (realTimePrice - position.averagePrice) * position.quantity
      const unrealizedPnLPercent = ((realTimePrice - position.averagePrice) / position.averagePrice) * 100
      const positionValue = realTimePrice * position.quantity
      const investedAmount = position.averagePrice * position.quantity
      
      totalUnrealizedPnL += unrealizedPnL
      totalInvested += investedAmount
      totalMarketValue += positionValue
      positionSizes.push(positionValue)
      
      // Track largest and smallest positions
      if (!largestPosition.symbol || positionValue > largestPosition.value) {
        largestPosition = { 
          symbol: position.symbol, 
          value: positionValue,
          percentage: 0 // Will calculate after total
        }
      }
      if (!smallestPosition.symbol || positionValue < smallestPosition.value) {
        smallestPosition = { 
          symbol: position.symbol, 
          value: positionValue,
          percentage: 0 // Will calculate after total
        }
      }

      if (unrealizedPnL > 0) {
        profitablePositions++
        if (unrealizedPnL > bestPosition.pnl) {
          bestPosition = { symbol: position.symbol, pnl: unrealizedPnL, percentage: unrealizedPnLPercent }
        }
      } else if (unrealizedPnL < 0) {
        losingPositions++
        if (unrealizedPnL < worstPosition.pnl) {
          worstPosition = { symbol: position.symbol, pnl: unrealizedPnL, percentage: unrealizedPnLPercent }
        }
      }
    })
    
    // Calculate position percentages
    if (totalMarketValue > 0) {
      largestPosition.percentage = (largestPosition.value / totalMarketValue) * 100
      smallestPosition.percentage = (smallestPosition.value / totalMarketValue) * 100
    }

    // Transaction Analysis
    const buyTransactions = transactions.filter(t => t.type === 'buy')
    const sellTransactions = transactions.filter(t => t.type === 'sell')
    const totalCommissions = transactions.reduce((sum, t) => sum + (t.commission || 0), 0)
    
    // Trading frequency analysis
    const tradingDays = new Set(transactions.map(t => new Date(t.timestamp).toDateString())).size
    const avgTradesPerDay = tradingDays > 0 ? transactions.length / tradingDays : 0
    
    // Time-based analysis
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const recentTransactions = {
      today: transactions.filter(t => new Date(t.timestamp) >= dayAgo).length,
      thisWeek: transactions.filter(t => new Date(t.timestamp) >= weekAgo).length,
      thisMonth: transactions.filter(t => new Date(t.timestamp) >= monthAgo).length
    }

    // Order Analysis
    const pendingOrders = orders.filter(o => o.status === 'pending').length
    const filledOrders = orders.filter(o => o.status === 'filled').length
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length
    const orderFillRate = orders.length > 0 ? (filledOrders / orders.length) * 100 : 0
    
    // Risk Metrics
    const portfolioConcentration = positions.length > 0 ? Math.max(...positionSizes) / totalMarketValue * 100 : 0
    const avgPositionSize = positions.length > 0 ? totalMarketValue / positions.length : 0
    const cashUtilization = account.initialBalance > 0 ? ((account.initialBalance - (account.availableCash || 0)) / account.initialBalance) * 100 : 0
    
    // Performance Metrics
    const winRate = positions.length > 0 ? (profitablePositions / positions.length) * 100 : 0
    const totalValue = account.totalValue || 0
    const initialBalance = account.initialBalance || 0
    const returnPercent = initialBalance > 0 ? ((totalValue - initialBalance) / initialBalance) * 100 : 0
    const sharpeRatio = calculateSharpeRatio(transactions)
    const maxDrawdown = calculateMaxDrawdown(transactions)
    
    // Diversification Score (1-10)
    const diversificationScore = calculateDiversificationScore(positions.length, portfolioConcentration)

    return {
      // Basic metrics
      totalUnrealizedPnL,
      profitablePositions,
      losingPositions,
      bestPosition,
      worstPosition,
      winRate,
      returnPercent,
      totalPositions: positions.length,
      totalTransactions: transactions.length,
      
      // Enhanced metrics
      totalInvested,
      totalMarketValue,
      largestPosition,
      smallestPosition,
      totalCommissions,
      tradingDays,
      avgTradesPerDay,
      recentTransactions,
      
      // Order metrics
      pendingOrders,
      filledOrders,
      cancelledOrders,
      orderFillRate,
      
      // Risk metrics
      portfolioConcentration,
      avgPositionSize,
      cashUtilization,
      sharpeRatio,
      maxDrawdown,
      diversificationScore,
      
      // P&L metrics (will be calculated later)
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      dayPnL: 0,
      weekPnL: 0,
      monthPnL: 0,
      
      // Account details
      availableCash: account.availableCash || 0,
      initialBalance,
      totalValue
    }
  }
  
  // Helper function to calculate Sharpe ratio (simplified)
  const calculateSharpeRatio = (transactions: any[]) => {
    if (transactions.length < 2) return 0
    
    const returns: number[] = []
    let previousValue = account.initialBalance || 10000
    
    transactions.forEach(transaction => {
      if (transaction.type === 'sell' && transaction.price && transaction.quantity) {
        const currentReturn = ((transaction.price * transaction.quantity) - previousValue) / previousValue
        returns.push(currentReturn)
        previousValue = transaction.price * transaction.quantity
      }
    })
    
    if (returns.length === 0) return 0
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
    
    return stdDev > 0 ? (avgReturn / stdDev) : 0
  }
  
  // Helper function to calculate maximum drawdown
  const calculateMaxDrawdown = (transactions: any[]) => {
    if (transactions.length === 0) return 0
    
    let peak = account.initialBalance || 10000
    let maxDrawdown = 0
    let currentValue = peak
    
    transactions.forEach(transaction => {
      if (transaction.amount) {
        currentValue += transaction.amount
        if (currentValue > peak) {
          peak = currentValue
        }
        const drawdown = ((peak - currentValue) / peak) * 100
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown
        }
      }
    })
    
    return maxDrawdown
  }
  
  // Helper function to calculate diversification score
  const calculateDiversificationScore = (numPositions: number, concentration: number) => {
    let score = 0
    
    // Points for number of positions (max 5 points)
    if (numPositions >= 10) score += 5
    else if (numPositions >= 7) score += 4
    else if (numPositions >= 5) score += 3
    else if (numPositions >= 3) score += 2
    else if (numPositions >= 1) score += 1
    
    // Points for low concentration (max 5 points)
    if (concentration <= 10) score += 5
    else if (concentration <= 20) score += 4
    else if (concentration <= 30) score += 3
    else if (concentration <= 40) score += 2
    else if (concentration <= 50) score += 1
    
    return Math.min(score, 10)
  }

  const generateAIResponse = async (userMessage: string) => {
    const analysis = analyzeAccount()
    const lowerMessage = userMessage.toLowerCase()

    let response = ''
    let suggestions: string[] = []

    // Handle general AI questions first
    if (lowerMessage.includes('name') || lowerMessage.includes('who are you')) {
      response = `👋 **Hello! I'm your Paper Trading AI Assistant.**

I'm an intelligent assistant specialized in helping you with:
• 📊 **Paper trading analysis** and insights
• 💡 **Trading advice** and recommendations  
• 📈 **Portfolio performance** evaluation
• 🎯 **Risk management** guidance

I can also answer general questions, but my expertise is in helping you become a better trader through data-driven insights from your paper trading account.

**What would you like to know?**`

      suggestions = ['Analyze my portfolio', 'Trading tips', 'Risk assessment', 'General question']
    }
    else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      response = `👋 **Hello there!**

Great to see you! I'm here to help you with your paper trading journey. I can:

• **Analyze your current positions** and performance
• **Provide personalized trading insights** 
• **Help with risk management** strategies
• **Answer general questions** about trading or anything else

**Quick Info:**
• You have **${analysis.totalPositions}** active positions
• Current stocks: ${account.positions?.slice(0, 5).map(p => p.symbol).join(', ')}${analysis.totalPositions > 5 ? '...' : ''}
• Overall return: ${analysis.returnPercent >= 0 ? '+' : ''}${analysis.returnPercent.toFixed(2)}%

**How can I assist you today?**`

      suggestions = ['Show my performance', 'How many stocks do I have', 'Detail about all positions', 'Trading advice']
    }
    else if (lowerMessage.includes('help') && !lowerMessage.includes('trading')) {
      response = `🤖 **I'm your AI Trading Assistant!**

**I can help you with:**

**📊 Paper Trading Specific:**
• Portfolio analysis and performance review
• Position-by-position breakdown
• Risk management assessment
• Trading recommendations and insights
• Win rate and profit factor analysis

**🌐 General Questions:**
• Trading concepts and strategies
• Market terminology explanations
• Investment principles
• General knowledge questions
• Math calculations and more

**Just ask me anything!** I'll do my best to provide helpful answers, with special expertise in your paper trading performance.`

      suggestions = ['Analyze everything', 'Explain trading terms', 'General question', 'Portfolio insights']
    }
    else if (lowerMessage.includes('weather') || lowerMessage.includes('time') || lowerMessage.includes('date')) {
      response = `🤖 **I'm focused on helping with your trading!**

While I can discuss general topics, I don't have access to real-time information like weather or current time. 

**However, I can help you with:**
• Your paper trading performance analysis
• Market concepts and trading strategies  
• Investment principles and risk management
• General knowledge questions about finance

**What would you like to explore about your trading or investments?**`

      suggestions = ['My trading performance', 'Market concepts', 'Investment strategies', 'Portfolio analysis']
    }
    else if (lowerMessage.includes('calculate') || lowerMessage.includes('math')) {
      response = `🧮 **I can help with calculations!**

I can assist with various calculations, especially trading-related ones:

**Trading Calculations:**
• Position sizing and risk calculations
• Profit/loss percentages
• Return on investment (ROI)
• Risk-reward ratios

**General Math:**
• Basic arithmetic operations
• Percentage calculations
• Financial formulas

**What calculation do you need help with?**`

      suggestions = ['Position sizing help', 'Calculate my ROI', 'Risk calculations', 'General math']
    }
    else if (lowerMessage.includes('market') || lowerMessage.includes('economy') || lowerMessage.includes('finance')) {
      response = `📈 **Happy to discuss markets and finance!**

I can help explain various financial and market concepts:

**Market Topics:**
• Stock market basics and terminology
• Investment strategies and principles
• Risk management concepts
• Trading psychology and discipline

**For your specific situation:**
• Your current portfolio has ${analysis.totalPositions} positions
• Win rate: ${analysis.winRate.toFixed(1)}%
• Overall return: ${analysis.returnPercent.toFixed(2)}%

**What specific market topic interests you?**`

      suggestions = ['Explain market terms', 'Investment strategies', 'My portfolio analysis', 'Trading psychology']
    }
    else if (lowerMessage.includes('analyze everything') || lowerMessage.includes('complete analysis') || lowerMessage.includes('full analysis')) {
      response = `📊 **COMPREHENSIVE PAPER TRADING ANALYSIS**

**🏦 Account Overview:**
• Initial Balance: $${analysis.initialBalance.toFixed(2)}
• Current Value: $${analysis.totalValue.toFixed(2)}
• Available Cash: $${analysis.availableCash.toFixed(2)}
• Cash Utilization: ${analysis.cashUtilization.toFixed(1)}%
• Overall Return: ${analysis.returnPercent >= 0 ? '+' : ''}${analysis.returnPercent.toFixed(2)}%

**📈 Portfolio Composition:**
• Total Positions: ${analysis.totalPositions}
• Total Invested: $${analysis.totalInvested.toFixed(2)}
• Market Value: $${analysis.totalMarketValue.toFixed(2)}
• Unrealized P&L: ${analysis.totalUnrealizedPnL >= 0 ? '+' : ''}$${analysis.totalUnrealizedPnL.toFixed(2)}
• Average Position Size: $${analysis.avgPositionSize.toFixed(2)}

**🎯 Position Analysis:**
• Profitable Positions: ${analysis.profitablePositions} (${analysis.totalPositions > 0 ? ((analysis.profitablePositions / analysis.totalPositions) * 100).toFixed(1) : 0}%)
• Losing Positions: ${analysis.losingPositions} (${analysis.totalPositions > 0 ? ((analysis.losingPositions / analysis.totalPositions) * 100).toFixed(1) : 0}%)
• Win Rate: ${analysis.winRate.toFixed(1)}%
${analysis.largestPosition.symbol ? `• Largest Position: ${analysis.largestPosition.symbol} ($${analysis.largestPosition.value.toFixed(2)} - ${analysis.largestPosition.percentage.toFixed(1)}%)` : ''}
${analysis.smallestPosition.symbol ? `• Smallest Position: ${analysis.smallestPosition.symbol} ($${analysis.smallestPosition.value.toFixed(2)} - ${analysis.smallestPosition.percentage.toFixed(1)}%)` : ''}

**🏆 Performance Leaders:**
${analysis.bestPosition.symbol ? `• Best Performer: ${analysis.bestPosition.symbol} (+$${analysis.bestPosition.pnl.toFixed(2)}, ${analysis.bestPosition.percentage >= 0 ? '+' : ''}${analysis.bestPosition.percentage.toFixed(2)}%)` : '• No profitable positions yet'}
${analysis.worstPosition.symbol ? `• Worst Performer: ${analysis.worstPosition.symbol} ($${analysis.worstPosition.pnl.toFixed(2)}, ${analysis.worstPosition.percentage.toFixed(2)}%)` : '• No losing positions'}

**📊 Trading Activity:**
• Total Transactions: ${analysis.totalTransactions}
• Trading Days: ${analysis.tradingDays}
• Avg Trades/Day: ${analysis.avgTradesPerDay.toFixed(1)}
• Total Commissions: $${analysis.totalCommissions.toFixed(2)}
• Recent Activity: ${analysis.recentTransactions.today} today, ${analysis.recentTransactions.thisWeek} this week

**📋 Order Management:**
• Pending Orders: ${analysis.pendingOrders}
• Filled Orders: ${analysis.filledOrders}
• Cancelled Orders: ${analysis.cancelledOrders}
• Order Fill Rate: ${analysis.orderFillRate.toFixed(1)}%

**⚠️ Risk Assessment:**
• Portfolio Concentration: ${analysis.portfolioConcentration.toFixed(1)}% ${analysis.portfolioConcentration > 25 ? '(High Risk)' : analysis.portfolioConcentration > 15 ? '(Medium Risk)' : '(Low Risk)'}
• Diversification Score: ${analysis.diversificationScore}/10 ${analysis.diversificationScore >= 8 ? '(Excellent)' : analysis.diversificationScore >= 6 ? '(Good)' : analysis.diversificationScore >= 4 ? '(Fair)' : '(Poor)'}
• Max Drawdown: ${analysis.maxDrawdown.toFixed(2)}%
• Sharpe Ratio: ${analysis.sharpeRatio.toFixed(3)} ${analysis.sharpeRatio > 1 ? '(Excellent)' : analysis.sharpeRatio > 0.5 ? '(Good)' : '(Needs Improvement)'}

**🎯 Performance Grade: ${analysis.returnPercent > 15 ? 'A+ (Outstanding)' : analysis.returnPercent > 10 ? 'A (Excellent)' : analysis.returnPercent > 5 ? 'B (Good)' : analysis.returnPercent > 0 ? 'C (Average)' : analysis.returnPercent > -5 ? 'D (Below Average)' : 'F (Poor)'}**

**💡 Key Insights:**
${analysis.portfolioConcentration > 30 ? '• ⚠️ High concentration risk - consider diversifying' : '• ✅ Good portfolio diversification'}
${analysis.cashUtilization < 70 ? '• 💰 Consider increasing position sizes with available cash' : '• ⚠️ High cash utilization - maintain some reserves'}
${analysis.winRate > 60 ? '• 🎯 Strong stock selection - maintain your approach' : '• 📚 Focus on improving entry timing and research'}
${analysis.avgTradesPerDay > 5 ? '• ⚡ High trading frequency - ensure quality over quantity' : '• 📈 Measured trading approach - good discipline'}

**🚀 Strategic Recommendations:**
1. ${analysis.worstPosition.symbol ? `Consider reviewing ${analysis.worstPosition.symbol} position (${analysis.worstPosition.percentage.toFixed(1)}% loss)` : 'Monitor positions for exit opportunities'}
2. ${analysis.bestPosition.symbol ? `Take partial profits on ${analysis.bestPosition.symbol} (${analysis.bestPosition.percentage.toFixed(1)}% gain)` : 'Look for new profitable opportunities'}
3. ${analysis.portfolioConcentration > 25 ? 'Reduce concentration by diversifying into more positions' : 'Maintain current diversification level'}
4. ${analysis.cashUtilization < 50 ? 'Consider deploying more capital into quality positions' : 'Maintain cash reserves for opportunities'}
5. Set stop-losses at -10% and take profits at +20% for risk management

**📈 Next Steps:**
• Review and rebalance portfolio monthly
• Set clear profit targets and stop-loss levels
• Continue learning and refining your strategy
• Track performance against market benchmarks`

      suggestions = ['Position sizing strategy', 'Risk management plan', 'Diversification advice', 'Trading psychology tips']
    }
    else if (lowerMessage.includes('all position') || lowerMessage.includes('all my position') || lowerMessage.includes('detail about position') || lowerMessage.includes('every position')) {
      // Comprehensive all positions analysis
      const positionsWithPnL = account.positions?.map(position => {
        const realTimePrice = realTimeData.get(position.symbol)?.price || position.currentPrice
        const unrealizedPnL = (realTimePrice - position.averagePrice) * position.quantity
        const unrealizedPnLPercent = ((realTimePrice - position.averagePrice) / position.averagePrice) * 100
        const positionValue = realTimePrice * position.quantity
        const investedAmount = position.averagePrice * position.quantity
        
        return {
          ...position,
          realTimePrice,
          unrealizedPnL,
          unrealizedPnLPercent,
          positionValue,
          investedAmount
        }
      }).sort((a, b) => b.unrealizedPnL - a.unrealizedPnL) || []
      
      response = `📊 **DETAILED ALL POSITIONS ANALYSIS**

**📈 Portfolio Summary:**
• Total Positions: ${positionsWithPnL.length}
• Total Invested: $${positionsWithPnL.reduce((sum, p) => sum + p.investedAmount, 0).toFixed(2)}
• Current Value: $${positionsWithPnL.reduce((sum, p) => sum + p.positionValue, 0).toFixed(2)}
• Total Unrealized P&L: ${analysis.totalUnrealizedPnL >= 0 ? '📈 +' : '📉 '}$${Math.abs(analysis.totalUnrealizedPnL).toFixed(2)}
• Overall Return: ${analysis.returnPercent >= 0 ? '+' : ''}${analysis.returnPercent.toFixed(2)}%

**🎯 Position Performance:**
• Profitable: ${analysis.profitablePositions} positions (${analysis.totalPositions > 0 ? ((analysis.profitablePositions / analysis.totalPositions) * 100).toFixed(1) : 0}%)
• Losing: ${analysis.losingPositions} positions (${analysis.totalPositions > 0 ? ((analysis.losingPositions / analysis.totalPositions) * 100).toFixed(1) : 0}%)
• Win Rate: ${analysis.winRate.toFixed(1)}%

**📋 COMPLETE POSITION DETAILS:**

${positionsWithPnL.map((pos, index) => {
  const pnlEmoji = pos.unrealizedPnL > 0 ? '📈' : pos.unrealizedPnL < 0 ? '📉' : '➖'
  const statusEmoji = pos.unrealizedPnL > 0 ? '✅' : pos.unrealizedPnL < 0 ? '❌' : '⚪'
  
  return `**${statusEmoji} ${index + 1}. ${pos.symbol}** ${pos.name ? `(${pos.name})` : ''}
• Quantity: ${pos.quantity.toLocaleString()} shares
• Entry Price: $${pos.averagePrice.toFixed(2)}
• Current Price: $${pos.realTimePrice.toFixed(2)} ${realTimeData.get(pos.symbol)?.price ? '(Live)' : ''}
• Position Value: $${pos.positionValue.toFixed(2)}
• Invested Amount: $${pos.investedAmount.toFixed(2)}
• Unrealized P&L: ${pnlEmoji} ${pos.unrealizedPnL >= 0 ? '+' : ''}$${pos.unrealizedPnL.toFixed(2)} (${pos.unrealizedPnLPercent >= 0 ? '+' : ''}${pos.unrealizedPnLPercent.toFixed(2)}%)
• Entry Date: ${new Date(pos.entryDate).toLocaleDateString()}
• Holding Period: ${Math.floor((Date.now() - new Date(pos.entryDate).getTime()) / (1000 * 60 * 60 * 24))} days
${pos.sector ? `• Sector: ${pos.sector}` : ''}
• Portfolio Weight: ${((pos.positionValue / positionsWithPnL.reduce((sum, p) => sum + p.positionValue, 0)) * 100).toFixed(2)}%
• Recommendation: ${pos.unrealizedPnLPercent > 20 ? 'Consider taking partial profits' : pos.unrealizedPnLPercent < -15 ? 'Review for stop-loss' : pos.unrealizedPnLPercent < -10 ? 'Monitor closely' : 'Hold and monitor'}`
}).join('\n\n')}

**💡 Position-Level Insights:**
${positionsWithPnL.filter(p => p.unrealizedPnLPercent > 25).length > 0 ? `• 🎯 ${positionsWithPnL.filter(p => p.unrealizedPnLPercent > 25).map(p => p.symbol).join(', ')} showing strong gains - consider profit-taking` : ''}
${positionsWithPnL.filter(p => p.unrealizedPnLPercent < -15).length > 0 ? `• ⚠️ ${positionsWithPnL.filter(p => p.unrealizedPnLPercent < -15).map(p => p.symbol).join(', ')} showing significant losses - review positions` : ''}
${positionsWithPnL.filter(p => Math.abs(p.unrealizedPnLPercent) < 5).length > 0 ? `• ➖ ${positionsWithPnL.filter(p => Math.abs(p.unrealizedPnLPercent) < 5).map(p => p.symbol).join(', ')} near breakeven - monitor for direction` : ''}

**🚀 Portfolio Recommendations:**
1. **Strongest Position**: ${positionsWithPnL[0]?.symbol} (+${positionsWithPnL[0]?.unrealizedPnLPercent.toFixed(2)}%) - ${positionsWithPnL[0]?.unrealizedPnLPercent > 20 ? 'Consider taking 25-50% profits' : 'Let it run with trailing stop'}
2. **Weakest Position**: ${positionsWithPnL[positionsWithPnL.length - 1]?.symbol} (${positionsWithPnL[positionsWithPnL.length - 1]?.unrealizedPnLPercent.toFixed(2)}%) - ${positionsWithPnL[positionsWithPnL.length - 1]?.unrealizedPnLPercent < -10 ? 'Set stop-loss at -15%' : 'Monitor closely'}
3. **Position Sizing**: ${positionsWithPnL.some(p => (p.positionValue / positionsWithPnL.reduce((sum, pos) => sum + pos.positionValue, 0)) > 0.25) ? 'Rebalance oversized positions (<20% each)' : 'Position sizing is balanced'}
4. **Diversification**: ${positionsWithPnL.length < 5 ? 'Add 2-3 more positions for better diversification' : 'Good diversification maintained'}
5. **Risk Management**: Set stop-losses at -10% to -15% for all positions to protect capital`

      suggestions = ['Rebalancing strategy', 'Profit-taking plan', 'Stop-loss recommendations', 'Individual stock analysis']
    }
    else if (lowerMessage.includes('position') || lowerMessage.includes('stock')) {
      response = `📊 **Position Analysis:**

You currently have ${analysis.totalPositions} positions with a total unrealized P&L of ${analysis.totalUnrealizedPnL >= 0 ? '+' : ''}$${Math.abs(analysis.totalUnrealizedPnL).toFixed(2)}.

**Performance Breakdown:**
• ✅ Profitable: ${analysis.profitablePositions} positions
• ❌ Losing: ${analysis.losingPositions} positions  
• 📈 Win Rate: ${analysis.winRate.toFixed(1)}%

${analysis.bestPosition.symbol ? `**Best Performer:** ${analysis.bestPosition.symbol} (+$${analysis.bestPosition.pnl.toFixed(2)})` : ''}
${analysis.worstPosition.symbol ? `**Needs Attention:** ${analysis.worstPosition.symbol} ($${analysis.worstPosition.pnl.toFixed(2)})` : ''}`

      suggestions = ['Show me risk analysis', 'How can I improve?', 'Market trends for my stocks', 'Detail about all positions']
    }
    else if (lowerMessage.includes('risk') || lowerMessage.includes('management')) {
      const riskLevel = analysis.portfolioConcentration > 25 ? 'High' : analysis.portfolioConcentration > 15 ? 'Medium' : 'Low'
      
      response = `🛡️ **COMPREHENSIVE RISK MANAGEMENT ANALYSIS**

**📊 Current Risk Profile: ${riskLevel} Risk**

**🎯 Portfolio Risk Metrics:**
• Portfolio Concentration: ${analysis.portfolioConcentration.toFixed(1)}% ${analysis.portfolioConcentration > 25 ? '(⚠️ High Risk)' : analysis.portfolioConcentration > 15 ? '(⚠️ Medium Risk)' : '(✅ Low Risk)'}
• Diversification Score: ${analysis.diversificationScore}/10 ${analysis.diversificationScore >= 7 ? '(✅ Excellent)' : analysis.diversificationScore >= 5 ? '(⚠️ Good)' : '(❌ Poor)'}
• Cash Utilization: ${analysis.cashUtilization.toFixed(1)}% ${analysis.cashUtilization > 90 ? '(⚠️ Very High)' : analysis.cashUtilization > 75 ? '(⚠️ High)' : '(✅ Healthy)'}
• Max Drawdown: ${analysis.maxDrawdown.toFixed(2)}% ${analysis.maxDrawdown > 20 ? '(❌ High Risk)' : analysis.maxDrawdown > 10 ? '(⚠️ Medium Risk)' : '(✅ Low Risk)'}

**📈 Performance Risk Indicators:**
• Win Rate: ${analysis.winRate.toFixed(1)}% ${analysis.winRate > 60 ? '(✅ Strong)' : analysis.winRate > 40 ? '(⚠️ Average)' : '(❌ Weak)'}
• Sharpe Ratio: ${analysis.sharpeRatio.toFixed(3)} ${analysis.sharpeRatio > 1 ? '(✅ Excellent)' : analysis.sharpeRatio > 0.5 ? '(⚠️ Good)' : '(❌ Poor)'}
• Largest Position: ${analysis.largestPosition.percentage.toFixed(1)}% of portfolio ${analysis.largestPosition.percentage > 20 ? '(⚠️ High concentration)' : '(✅ Balanced)'}

**⚠️ Risk Factors Identified:**
${analysis.portfolioConcentration > 30 ? '• 🚨 CRITICAL: Over-concentration in single position' : ''}
${analysis.cashUtilization > 95 ? '• 🚨 CRITICAL: Insufficient cash reserves' : ''}
${analysis.diversificationScore < 5 ? '• ❌ Poor diversification across positions' : ''}
${analysis.maxDrawdown > 15 ? '• ❌ High maximum drawdown experienced' : ''}
${analysis.winRate < 40 ? '• ❌ Low win rate indicates poor stock selection' : ''}
${analysis.avgTradesPerDay > 10 ? '• ⚠️ Very high trading frequency (overtrading risk)' : ''}

**🛡️ Risk Mitigation Strategies:**
1. **Position Sizing:** ${analysis.portfolioConcentration > 20 ? 'Reduce largest position to <15% of portfolio' : 'Maintain current position sizing discipline'}
2. **Diversification:** ${analysis.totalPositions < 5 ? 'Add 3-5 more positions across different sectors' : 'Good diversification - maintain spread'}
3. **Cash Management:** ${analysis.cashUtilization > 80 ? 'Keep 15-20% cash for opportunities and emergencies' : 'Current cash level is appropriate'}
4. **Stop Losses:** Set stop-losses at -8% to -12% for all positions
5. **Profit Taking:** Take partial profits at +15% to +25% gains

**📋 Immediate Action Items:**
${analysis.worstPosition.symbol && Math.abs(analysis.worstPosition.percentage) > 15 ? `• 🚨 URGENT: Review ${analysis.worstPosition.symbol} (${analysis.worstPosition.percentage.toFixed(1)}% loss)` : ''}
${analysis.largestPosition.percentage > 25 ? `• ⚠️ Reduce ${analysis.largestPosition.symbol} position size (currently ${analysis.largestPosition.percentage.toFixed(1)}%)` : ''}
${analysis.cashUtilization < 50 ? '• Consider deploying more capital gradually' : ''}
• Set stop-loss orders for all positions without them
• Review and rebalance portfolio weekly

**🎯 Target Risk Profile:**
• Portfolio concentration: <20%
• Diversification score: 7+/10  
• Cash utilization: 70-85%
• Max drawdown: <10%
• Win rate: >50%`

      suggestions = ['Position sizing calculator', 'Stop-loss strategy', 'Diversification plan', 'Cash management']
    }
    else if (lowerMessage.includes('performance') || lowerMessage.includes('return')) {
      response = `📈 **Performance Summary:**

**Overall Return:** ${analysis.returnPercent >= 0 ? '+' : ''}${analysis.returnPercent.toFixed(2)}%

**Key Metrics:**
• Total Positions: ${analysis.totalPositions}
• Win Rate: ${analysis.winRate.toFixed(1)}%
• Total Transactions: ${analysis.totalTransactions}
• Unrealized P&L: $${analysis.totalUnrealizedPnL.toFixed(2)}

**Performance Grade:** ${analysis.returnPercent > 10 ? 'A (Excellent)' : analysis.returnPercent > 5 ? 'B (Good)' : analysis.returnPercent > 0 ? 'C (Average)' : 'D (Needs Improvement)'}

${analysis.returnPercent > 0 ? '🎉 You\'re profitable! Keep up the good work.' : '💡 Focus on risk management and position sizing to improve returns.'}`

      suggestions = ['Trading strategy advice', 'How to improve returns', 'Best practices']
    }
    else if (lowerMessage.includes('how many stock') || lowerMessage.includes('stock count') || lowerMessage.includes('number of stock')) {
      // Quick stock count response
      const stockSymbols = Array.from(new Set([
        ...(account.positions?.map(p => p.symbol) || []),
        ...(account.transactions?.map(t => t.symbol) || []),
        ...(account.orders?.map(o => o.symbol) || [])
      ])).sort()
      
      const currentPositions = account.positions?.map(p => p.symbol) || []
      
      response = `📊 **STOCK COUNT IN YOUR ACCOUNT**

**🏢 Total Unique Stocks: ${stockSymbols.length}**
• Current Positions: ${currentPositions.length}
• Ever Traded: ${stockSymbols.length}

**📋 Current Position Symbols:**
${currentPositions.map(symbol => `• **${symbol}**`).join('\n') || '• No current positions'}

**📈 All Stock Symbols (Ever Traded):**
${stockSymbols.map(symbol => `• **${symbol}** ${currentPositions.includes(symbol) ? '✅ (Active)' : '🔴 (Closed)'}`).join('\n')}

**💡 Quick Stats:**
• Active Holdings: ${currentPositions.length} stocks
• Previously Traded: ${stockSymbols.length - currentPositions.length} stocks
• Portfolio Diversity: ${currentPositions.length >= 10 ? 'Excellent' : currentPositions.length >= 5 ? 'Good' : currentPositions.length >= 3 ? 'Moderate' : 'Limited'}

**🎯 What would you like to know about these stocks?**`

      suggestions = ['Detail about all positions', 'Analyze specific stock', 'Stock performance ranking', 'Sector diversification']
    }
    else if (lowerMessage.includes('stock name') || lowerMessage.includes('all stock') || lowerMessage.includes('stock list') || lowerMessage.includes('what stocks') || lowerMessage.includes('give name') || lowerMessage.includes('stock symbol')) {
      const allStocks = new Set<string>()
      const stockDetails: { [symbol: string]: { 
        orders: number, 
        transactions: number, 
        currentPosition: boolean,
        totalInvested: number,
        currentValue: number,
        pnl: number,
        orderTypes: string[]
      } } = {}

      // Collect from orders
      account.orders?.forEach(order => {
        if (order.symbol) {
          allStocks.add(order.symbol)
          if (!stockDetails[order.symbol]) {
            stockDetails[order.symbol] = {
              orders: 0,
              transactions: 0,
              currentPosition: false,
              totalInvested: 0,
              currentValue: 0,
              pnl: 0,
              orderTypes: []
            }
          }
          stockDetails[order.symbol].orders++
          if (order.type && !stockDetails[order.symbol].orderTypes.includes(order.type)) {
            stockDetails[order.symbol].orderTypes.push(order.type)
          }
        }
      })

      // Collect from transactions
      account.transactions?.forEach(transaction => {
        if (transaction.symbol) {
          allStocks.add(transaction.symbol)
          if (!stockDetails[transaction.symbol]) {
            stockDetails[transaction.symbol] = {
              orders: 0,
              transactions: 0,
              currentPosition: false,
              totalInvested: 0,
              currentValue: 0,
              pnl: 0,
              orderTypes: []
            }
          }
          stockDetails[transaction.symbol].transactions++
        }
      })

      // Collect from current positions
      account.positions?.forEach(position => {
        if (position.symbol) {
          allStocks.add(position.symbol)
          if (!stockDetails[position.symbol]) {
            stockDetails[position.symbol] = {
              orders: 0,
              transactions: 0,
              currentPosition: false,
              totalInvested: 0,
              currentValue: 0,
              pnl: 0,
              orderTypes: []
            }
          }
          stockDetails[position.symbol].currentPosition = true
          stockDetails[position.symbol].totalInvested = position.averagePrice * position.quantity
          const realTimePrice = realTimeData.get(position.symbol)?.price || position.currentPrice
          stockDetails[position.symbol].currentValue = realTimePrice * position.quantity
          stockDetails[position.symbol].pnl = (realTimePrice - position.averagePrice) * position.quantity
        }
      })

      const stockList = Array.from(allStocks).sort()
      
      response = `📋 **COMPLETE STOCK ANALYSIS & LIST**

**📊 Total Stocks Traded: ${stockList.length}**

**🏢 All Stock Symbols:**
${stockList.map(symbol => `• **${symbol}**`).join('\n')}

**📈 Detailed Stock Breakdown:**

${stockList.map(symbol => {
  const details = stockDetails[symbol]
  const statusEmoji = details.currentPosition ? '🟢' : '🔴'
  const pnlEmoji = details.pnl > 0 ? '📈' : details.pnl < 0 ? '📉' : '➖'
  
  return `**${statusEmoji} ${symbol}:**
• Status: ${details.currentPosition ? 'Active Position' : 'No Current Position'}
• Orders Placed: ${details.orders}
• Transactions: ${details.transactions}
${details.orderTypes.length > 0 ? `• Order Types: ${details.orderTypes.join(', ')}` : ''}
${details.currentPosition ? `• Invested: $${details.totalInvested.toFixed(2)}` : ''}
${details.currentPosition ? `• Current Value: $${details.currentValue.toFixed(2)}` : ''}
${details.currentPosition ? `• P&L: ${pnlEmoji} $${details.pnl.toFixed(2)} (${((details.pnl / details.totalInvested) * 100).toFixed(2)}%)` : ''}`
}).join('\n\n')}

**📊 Stock Categories:**

**🟢 Current Holdings (${stockList.filter(s => stockDetails[s].currentPosition).length}):**
${stockList.filter(s => stockDetails[s].currentPosition).map(s => `• ${s} (${stockDetails[s].pnl >= 0 ? '+' : ''}$${stockDetails[s].pnl.toFixed(2)})`).join('\n') || '• None'}

**🔴 Previously Traded (${stockList.filter(s => !stockDetails[s].currentPosition).length}):**
${stockList.filter(s => !stockDetails[s].currentPosition).map(s => `• ${s} (${stockDetails[s].transactions} transactions)`).join('\n') || '• None'}

**📈 Performance Summary:**
• Best Performer: ${stockList.length > 0 ? stockList.reduce((best, current) => stockDetails[current].pnl > stockDetails[best].pnl ? current : best) : 'None'}
• Worst Performer: ${stockList.length > 0 ? stockList.reduce((worst, current) => stockDetails[current].pnl < stockDetails[worst].pnl ? current : worst) : 'None'}
• Most Traded: ${stockList.length > 0 ? stockList.reduce((most, current) => stockDetails[current].transactions > stockDetails[most].transactions ? current : most) : 'None'}
• Most Orders: ${stockList.length > 0 ? stockList.reduce((most, current) => stockDetails[current].orders > stockDetails[most].orders ? current : most) : 'None'}

**💡 Trading Insights:**
• Portfolio Diversity: ${stockList.length >= 10 ? 'Excellent' : stockList.length >= 5 ? 'Good' : stockList.length >= 3 ? 'Moderate' : 'Limited'} (${stockList.length} different stocks)
• Trading Activity: ${stockList.reduce((sum, s) => sum + stockDetails[s].transactions, 0)} total transactions across all stocks
• Order Activity: ${stockList.reduce((sum, s) => sum + stockDetails[s].orders, 0)} total orders placed
• Active vs Closed: ${stockList.filter(s => stockDetails[s].currentPosition).length} active, ${stockList.filter(s => !stockDetails[s].currentPosition).length} closed positions`

      suggestions = ['Analyze specific stock', 'Stock performance ranking', 'Trading history details', 'Position management advice']
    }
    else if (lowerMessage.includes('analyze') && (lowerMessage.includes('stock') || /\b[A-Z]{1,5}\b/.test(userMessage))) {
      // Extract stock symbol from message
      const stockSymbol = userMessage.match(/\b[A-Z]{2,5}\b/)?.[0]
      
      if (stockSymbol) {
        // Find all data for this specific stock
        const stockOrders = account.orders?.filter(o => o.symbol === stockSymbol) || []
        const stockTransactions = account.transactions?.filter(t => t.symbol === stockSymbol) || []
        const stockPosition = account.positions?.find(p => p.symbol === stockSymbol)
        const realTimePrice = realTimeData.get(stockSymbol)?.price
        
        if (stockOrders.length === 0 && stockTransactions.length === 0 && !stockPosition) {
          response = `❌ **Stock Not Found: ${stockSymbol}**

I couldn't find any trading activity for **${stockSymbol}** in your paper trading account.

**Possible reasons:**
• You haven't traded this stock yet
• The symbol might be incorrect
• The stock might not be in your current account

**What you can do:**
• Check the correct stock symbol
• Try "give me all stock names" to see your complete list
• Place an order for this stock if you're interested

**Your current stocks:** ${Array.from(new Set([
  ...(account.positions?.map(p => p.symbol) || []),
  ...(account.transactions?.map(t => t.symbol) || [])
])).slice(0, 5).join(', ')}${Array.from(new Set([
  ...(account.positions?.map(p => p.symbol) || []),
  ...(account.transactions?.map(t => t.symbol) || [])
])).length > 5 ? '...' : ''}`

          suggestions = ['Show all my stocks', 'Trading opportunities', 'Portfolio analysis', 'Add new position']
        } else {
          // Comprehensive stock analysis
          const totalOrders = stockOrders.length
          const totalTransactions = stockTransactions.length
          const buyTransactions = stockTransactions.filter(t => t.type === 'buy')
          const sellTransactions = stockTransactions.filter(t => t.type === 'sell')
          const totalBought = buyTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0)
          const totalSold = sellTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0)
          const avgBuyPrice = buyTransactions.length > 0 ? 
            buyTransactions.reduce((sum, t) => sum + ((t.price || 0) * (t.quantity || 0)), 0) / 
            buyTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0) : 0
          
          const currentPrice = stockPosition ? (realTimePrice || stockPosition.currentPrice) : realTimePrice || 0
          const totalInvested = stockPosition ? stockPosition.averagePrice * stockPosition.quantity : 0
          const currentValue = stockPosition ? currentPrice * stockPosition.quantity : 0
          const unrealizedPnL = stockPosition ? (currentPrice - stockPosition.averagePrice) * stockPosition.quantity : 0
          const unrealizedPnLPercent = stockPosition && stockPosition.averagePrice > 0 ? 
            ((currentPrice - stockPosition.averagePrice) / stockPosition.averagePrice) * 100 : 0

          response = `📊 **COMPREHENSIVE ${stockSymbol} ANALYSIS**

**📈 Current Status:**
${stockPosition ? `🟢 **Active Position**` : `🔴 **No Current Position**`}
${stockPosition ? `• Quantity: ${stockPosition.quantity.toLocaleString()} shares` : ''}
${stockPosition ? `• Average Price: $${stockPosition.averagePrice.toFixed(2)}` : ''}
${currentPrice > 0 ? `• Current Price: $${currentPrice.toFixed(2)} ${realTimePrice ? '(Live)' : '(Last Known)'}` : ''}
${stockPosition ? `• Total Invested: $${totalInvested.toFixed(2)}` : ''}
${stockPosition ? `• Current Value: $${currentValue.toFixed(2)}` : ''}
${stockPosition ? `• Unrealized P&L: ${unrealizedPnL >= 0 ? '📈 +' : '📉 '}$${Math.abs(unrealizedPnL).toFixed(2)} (${unrealizedPnLPercent >= 0 ? '+' : ''}${unrealizedPnLPercent.toFixed(2)}%)` : ''}

**📋 Trading History:**
• Total Orders: ${totalOrders}
• Total Transactions: ${totalTransactions}
• Buy Transactions: ${buyTransactions.length}
• Sell Transactions: ${sellTransactions.length}
• Total Shares Bought: ${totalBought.toLocaleString()}
• Total Shares Sold: ${totalSold.toLocaleString()}
${avgBuyPrice > 0 ? `• Average Buy Price: $${avgBuyPrice.toFixed(2)}` : ''}

**📊 Order Breakdown:**
${stockOrders.length > 0 ? stockOrders.map(order => 
  `• ${order.type?.toUpperCase()} ${order.quantity} shares at $${order.price?.toFixed(2)} - ${order.status}`
).join('\n') : '• No order history available'}

**💰 Transaction Details:**
${stockTransactions.length > 0 ? stockTransactions.slice(-5).map(transaction => 
  `• ${transaction.type?.toUpperCase()} ${transaction.quantity} shares at $${transaction.price?.toFixed(2)} on ${new Date(transaction.timestamp).toLocaleDateString()}`
).join('\n') : '• No transaction history available'}
${stockTransactions.length > 5 ? `\n• ... and ${stockTransactions.length - 5} more transactions` : ''}

**🎯 Performance Analysis:**
${stockPosition ? `• Position Performance: ${unrealizedPnL >= 0 ? 'Profitable' : 'Losing'} (${unrealizedPnLPercent >= 0 ? '+' : ''}${unrealizedPnLPercent.toFixed(2)}%)` : ''}
${currentPrice > 0 && avgBuyPrice > 0 ? `• Price vs Avg Buy: ${((currentPrice - avgBuyPrice) / avgBuyPrice * 100).toFixed(2)}% ${currentPrice > avgBuyPrice ? 'above' : 'below'} average` : ''}
• Trading Activity: ${totalTransactions > 10 ? 'Very Active' : totalTransactions > 5 ? 'Active' : totalTransactions > 0 ? 'Moderate' : 'No Activity'}
• Order Efficiency: ${totalOrders > 0 ? `${((totalTransactions / totalOrders) * 100).toFixed(1)}% fill rate` : 'N/A'}

**💡 ${stockSymbol} Insights:**
${stockPosition && unrealizedPnL > 0 ? `• ✅ Strong performer - consider taking partial profits at +20-25%` : ''}
${stockPosition && unrealizedPnL < 0 && Math.abs(unrealizedPnLPercent) > 10 ? `• ⚠️ Significant loss - consider stop-loss or position review` : ''}
${stockPosition && Math.abs(unrealizedPnLPercent) < 5 ? `• ➖ Position near breakeven - monitor for clear direction` : ''}
${totalTransactions > 5 ? `• 📈 Frequently traded stock - ensure quality over quantity` : ''}
${!stockPosition && totalTransactions > 0 ? `• 🔄 Previously traded - consider re-entry if bullish` : ''}

**🚀 Recommendations:**
${stockPosition && unrealizedPnLPercent > 15 ? `1. Consider taking 25-50% profits on ${stockSymbol}` : ''}
${stockPosition && unrealizedPnLPercent < -10 ? `1. Review ${stockSymbol} fundamentals and set stop-loss` : ''}
${stockPosition ? `2. Set ${unrealizedPnL >= 0 ? 'trailing stop-loss' : 'stop-loss'} at appropriate level` : '2. Monitor for re-entry opportunity if interested'}
3. ${stockPosition ? 'Monitor earnings and news catalysts' : 'Research before considering new position'}
4. ${totalOrders > totalTransactions ? 'Review pending orders for this stock' : 'Maintain disciplined position sizing'}`

          suggestions = [`${stockSymbol} price alerts`, `${stockSymbol} news analysis`, 'Position sizing advice', 'Exit strategy planning']
        }
      } else {
        response = `🔍 **Stock Analysis Request**

I'd be happy to analyze a specific stock for you! Please provide the stock symbol (like AAPL, TSLA, GOOGL, etc.).

**Example questions:**
• "Analyze AAPL stock"
• "Tell me about my TSLA position"
• "How is GOOGL performing?"

**Or try these commands:**
• "Give me all stock names" - See your complete stock list
• "Analyze everything" - Complete portfolio analysis
• "Show my positions" - Current holdings overview`

        suggestions = ['Give me all stock names', 'Analyze everything', 'Show my positions', 'Trading opportunities']
      }
    }
    else if (lowerMessage.includes('account overview') || lowerMessage.includes('account analysis') || lowerMessage.includes('account details')) {
      response = `🏦 **COMPREHENSIVE ACCOUNT OVERVIEW ANALYSIS**

**📊 Account Identity & Status:**
• Account Name: **${account.name}**
• Account ID: ${account.id}
• Account Status: ${account.isActive ? '🟢 Active' : '🔴 Inactive'}
• Created: ${account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'Unknown'}

**💰 Financial Overview:**
• Initial Balance: $${account.initialBalance?.toFixed(2) || '0.00'}
• Current Balance: $${account.currentBalance?.toFixed(2) || '0.00'}
• Available Cash: $${account.availableCash?.toFixed(2) || '0.00'}
• Total Portfolio Value: $${account.totalValue?.toFixed(2) || '0.00'}
• Cash Utilization: ${analysis.cashUtilization.toFixed(1)}%

**📈 Performance Metrics:**
• Total Return: ${analysis.returnPercent >= 0 ? '+' : ''}${analysis.returnPercent.toFixed(2)}% (${analysis.returnPercent >= 0 ? '📈' : '📉'})
• Absolute P&L: ${analysis.totalUnrealizedPnL >= 0 ? '+' : ''}$${analysis.totalUnrealizedPnL.toFixed(2)}
• Performance Grade: ${analysis.returnPercent > 15 ? 'A+ (Outstanding)' : analysis.returnPercent > 10 ? 'A (Excellent)' : analysis.returnPercent > 5 ? 'B (Good)' : analysis.returnPercent > 0 ? 'C (Average)' : 'F (Poor)'}

**🎯 Portfolio Composition:**
• Total Positions: ${analysis.totalPositions}
• Profitable Positions: ${analysis.profitablePositions} (${analysis.totalPositions > 0 ? ((analysis.profitablePositions / analysis.totalPositions) * 100).toFixed(1) : 0}%)
• Losing Positions: ${analysis.losingPositions} (${analysis.totalPositions > 0 ? ((analysis.losingPositions / analysis.totalPositions) * 100).toFixed(1) : 0}%)
• Win Rate: ${analysis.winRate.toFixed(1)}%

**📊 Risk Assessment:**
• Portfolio Concentration: ${analysis.portfolioConcentration.toFixed(1)}% ${analysis.portfolioConcentration > 25 ? '(⚠️ High Risk)' : '(✅ Balanced)'}
• Diversification Score: ${analysis.diversificationScore}/10
• Maximum Drawdown: ${analysis.maxDrawdown.toFixed(2)}%
• Sharpe Ratio: ${analysis.sharpeRatio.toFixed(3)}

**💡 Account Health Analysis:**
${analysis.cashUtilization > 95 ? '• 🚨 CRITICAL: Very low cash reserves - maintain 10-15% cash buffer' : ''}
${analysis.returnPercent < -10 ? '• 🚨 CRITICAL: Significant losses - review risk management strategy' : ''}
${analysis.portfolioConcentration > 30 ? '• ⚠️ WARNING: High concentration risk - diversify positions' : ''}
${analysis.diversificationScore < 5 ? '• ⚠️ WARNING: Poor diversification - add more positions' : ''}
${analysis.winRate < 40 ? '• ⚠️ WARNING: Low win rate - improve stock selection process' : ''}
${analysis.returnPercent > 10 ? '• ✅ EXCELLENT: Strong performance - maintain current strategy' : ''}
${analysis.diversificationScore >= 7 ? '• ✅ GOOD: Well-diversified portfolio' : ''}

**🎯 Account Optimization Recommendations:**
1. ${analysis.cashUtilization < 70 ? 'Deploy more capital into quality positions' : 'Maintain current cash allocation'}
2. ${analysis.portfolioConcentration > 20 ? 'Reduce position concentration to <15%' : 'Maintain balanced position sizing'}
3. ${analysis.diversificationScore < 7 ? 'Add 2-3 more positions for better diversification' : 'Maintain current diversification level'}
4. ${analysis.returnPercent < 5 ? 'Focus on improving stock selection and timing' : 'Continue current successful approach'}
5. Regular portfolio rebalancing and performance monitoring`

      suggestions = ['Multi-account comparison', 'Account optimization tips', 'Risk management plan', 'Performance improvement']
    }
    else if (lowerMessage.includes('how many account') || lowerMessage.includes('all account') || lowerMessage.includes('account list') || lowerMessage.includes('multiple account')) {
      const totalAccounts = allAccounts.length
      const activeAccounts = allAccounts.filter(acc => acc.isActive).length
      const inactiveAccounts = totalAccounts - activeAccounts
      
      let totalValue = 0
      let totalPnL = 0
      let bestAccount = { name: '', return: 0 }
      let worstAccount = { name: '', return: 0 }
      
      allAccounts.forEach(acc => {
        totalValue += acc.totalValue || 0
        const accountReturn = acc.initialBalance > 0 ? ((acc.totalValue - acc.initialBalance) / acc.initialBalance) * 100 : 0
        totalPnL += (acc.totalValue - acc.initialBalance) || 0
        
        if (!bestAccount.name || accountReturn > bestAccount.return) {
          bestAccount = { name: acc.name, return: accountReturn }
        }
        if (!worstAccount.name || accountReturn < worstAccount.return) {
          worstAccount = { name: acc.name, return: accountReturn }
        }
      })

      response = `🏦 **MULTI-ACCOUNT PORTFOLIO ANALYSIS**

**📊 Account Summary:**
• Total Accounts: ${totalAccounts}
• Active Accounts: ${activeAccounts} (${totalAccounts > 0 ? ((activeAccounts / totalAccounts) * 100).toFixed(1) : 0}%)
• Inactive Accounts: ${inactiveAccounts}
• Current Account: **${account.name}**

**💰 Combined Portfolio Value:**
• Total Portfolio Value: $${totalValue.toFixed(2)}
• Combined P&L: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}
• Average Account Size: $${totalAccounts > 0 ? (totalValue / totalAccounts).toFixed(2) : '0.00'}

**🏆 Account Performance Rankings:**
${totalAccounts > 0 ? `• Best Performer: **${bestAccount.name}** (${bestAccount.return >= 0 ? '+' : ''}${bestAccount.return.toFixed(2)}%)` : '• No accounts available'}
${totalAccounts > 0 ? `• Worst Performer: **${worstAccount.name}** (${worstAccount.return >= 0 ? '+' : ''}${worstAccount.return.toFixed(2)}%)` : ''}

**📈 Detailed Account Breakdown:**

${allAccounts.map(acc => {
  const accReturn = acc.initialBalance > 0 ? ((acc.totalValue - acc.initialBalance) / acc.initialBalance) * 100 : 0
  const accPnL = (acc.totalValue - acc.initialBalance) || 0
  const statusEmoji = acc.isActive ? '🟢' : '🔴'
  const performanceEmoji = accReturn > 0 ? '📈' : accReturn < 0 ? '📉' : '➖'
  const isCurrentAccount = acc.id === account.id
  
  return `${statusEmoji} **${acc.name}** ${isCurrentAccount ? '← Current' : ''}
• Status: ${acc.isActive ? 'Active' : 'Inactive'}
• Balance: $${acc.totalValue?.toFixed(2) || '0.00'}
• P&L: ${performanceEmoji} ${accPnL >= 0 ? '+' : ''}$${accPnL.toFixed(2)} (${accReturn >= 0 ? '+' : ''}${accReturn.toFixed(2)}%)
• Positions: ${acc.positions?.length || 0}
• Available Cash: $${acc.availableCash?.toFixed(2) || '0.00'}`
}).join('\n\n')}

**💡 Multi-Account Insights:**
• Account Diversification: ${totalAccounts >= 3 ? 'Excellent - Multiple accounts for strategy testing' : totalAccounts === 2 ? 'Good - Dual account setup' : 'Single account focus'}
• Risk Distribution: ${activeAccounts > 1 ? 'Spread across multiple active accounts' : 'Concentrated in single account'}
• Performance Spread: ${Math.abs(bestAccount.return - worstAccount.return).toFixed(2)}% difference between best and worst
• Management Complexity: ${totalAccounts > 3 ? 'High - Consider consolidating underperforming accounts' : 'Manageable'}

**🎯 Multi-Account Strategy:**
1. ${totalAccounts === 1 ? 'Consider creating a second account for strategy testing' : 'Good account diversification'}
2. ${inactiveAccounts > 0 ? `Reactivate or close ${inactiveAccounts} inactive account(s)` : 'All accounts are active'}
3. ${Math.abs(bestAccount.return - worstAccount.return) > 20 ? 'Analyze successful strategies from best performer' : 'Performance is relatively consistent'}
4. Focus primary capital on best-performing account strategies
5. Use separate accounts for different trading strategies or risk levels`

      suggestions = ['Compare account strategies', 'Account consolidation advice', 'Best account analysis', 'Account management tips']
    }
    else if (lowerMessage.includes('order') || lowerMessage.includes('transaction')) {
      response = `📋 **ORDER & TRANSACTION ANALYSIS**

**📊 Order Management Performance:**
• Total Orders Placed: ${analysis.filledOrders + analysis.cancelledOrders + analysis.pendingOrders}
• Filled Orders: ${analysis.filledOrders} (${analysis.orderFillRate.toFixed(1)}% fill rate)
• Pending Orders: ${analysis.pendingOrders}
• Cancelled Orders: ${analysis.cancelledOrders}
• Order Efficiency: ${analysis.orderFillRate > 90 ? 'Excellent' : analysis.orderFillRate > 75 ? 'Good' : 'Needs Improvement'}

**💰 Transaction Analysis:**
• Total Transactions: ${analysis.totalTransactions}
• Buy Transactions: ${account.transactions?.filter(t => t.type === 'buy').length || 0}
• Sell Transactions: ${account.transactions?.filter(t => t.type === 'sell').length || 0}
• Total Commissions Paid: $${analysis.totalCommissions.toFixed(2)}
• Avg Commission per Trade: $${analysis.totalTransactions > 0 ? (analysis.totalCommissions / analysis.totalTransactions).toFixed(2) : '0.00'}

**📈 Trading Activity Patterns:**
• Active Trading Days: ${analysis.tradingDays}
• Average Trades per Day: ${analysis.avgTradesPerDay.toFixed(1)}
• Recent Activity: ${analysis.recentTransactions.today} today, ${analysis.recentTransactions.thisWeek} this week, ${analysis.recentTransactions.thisMonth} this month
• Trading Frequency: ${analysis.avgTradesPerDay > 5 ? 'High (Day Trading Style)' : analysis.avgTradesPerDay > 2 ? 'Moderate (Swing Trading)' : 'Low (Position Trading)'}

**🎯 Transaction Efficiency:**
• Commission Impact: ${((analysis.totalCommissions / analysis.totalInvested) * 100).toFixed(3)}% of invested capital
• Order Success Rate: ${analysis.orderFillRate.toFixed(1)}%
• Trading Discipline: ${analysis.cancelledOrders === 0 ? 'Excellent - No cancelled orders' : `${analysis.cancelledOrders} cancelled orders may indicate indecision`}

**💡 Order Management Insights:**
${analysis.pendingOrders > 5 ? '• ⚠️ High number of pending orders - review and clean up' : '• ✅ Good order management'}
${analysis.orderFillRate < 80 ? '• ⚠️ Low fill rate - consider adjusting order types or prices' : '• ✅ Good order execution rate'}
${analysis.totalCommissions > (analysis.totalInvested * 0.01) ? '• ⚠️ High commission costs impacting returns' : '• ✅ Commission costs are reasonable'}
${analysis.avgTradesPerDay > 10 ? '• ⚠️ Very high trading frequency - risk of overtrading' : '• ✅ Reasonable trading frequency'}

**🚀 Optimization Recommendations:**
1. ${analysis.pendingOrders > 3 ? 'Review and cancel unnecessary pending orders' : 'Continue monitoring pending orders'}
2. ${analysis.orderFillRate < 85 ? 'Use market orders for better fill rates when appropriate' : 'Maintain current order strategy'}
3. ${analysis.totalCommissions > 100 ? 'Consider commission-free brokers to reduce costs' : 'Commission costs are manageable'}
4. ${analysis.avgTradesPerDay > 5 ? 'Focus on quality over quantity in trade selection' : 'Maintain current trading pace'}
5. Set up automated stop-loss and take-profit orders`

      suggestions = ['Order optimization tips', 'Commission reduction', 'Trading frequency advice', 'Execution strategies']
    }
    else if (lowerMessage.includes('history') || lowerMessage.includes('transaction history') || lowerMessage.includes('trading history')) {
      const recentTransactions = account.transactions?.slice(-10) || []
      const transactionsByDate = account.transactions?.reduce((acc, t) => {
        const date = new Date(t.timestamp).toDateString()
        if (!acc[date]) acc[date] = []
        acc[date].push(t)
        return acc
      }, {} as { [key: string]: any[] }) || {}
      
      const mostActiveDay = Object.keys(transactionsByDate).reduce((max, date) => 
        transactionsByDate[date].length > (transactionsByDate[max]?.length || 0) ? date : max, '')
      
      response = `📚 **COMPREHENSIVE TRADING HISTORY ANALYSIS**

**📊 Transaction Overview:**
• Total Transactions: ${analysis.totalTransactions}
• Buy Transactions: ${account.transactions?.filter(t => t.type === 'buy').length || 0}
• Sell Transactions: ${account.transactions?.filter(t => t.type === 'sell').length || 0}
• Trading Days Active: ${analysis.tradingDays}
• Average Trades/Day: ${analysis.avgTradesPerDay.toFixed(1)}

**📈 Recent Trading Activity (Last 10):**
${recentTransactions.length > 0 ? recentTransactions.map(t => 
  `• ${t.type?.toUpperCase()} ${t.quantity} ${t.symbol} at $${t.price?.toFixed(2)} on ${new Date(t.timestamp).toLocaleDateString()}`
).join('\n') : '• No recent transactions'}

**📅 Trading Pattern Analysis:**
• Most Active Day: ${mostActiveDay ? new Date(mostActiveDay).toLocaleDateString() : 'N/A'} (${mostActiveDay ? transactionsByDate[mostActiveDay].length : 0} transactions)
• Trading Frequency: ${analysis.avgTradesPerDay > 5 ? 'High Frequency (Day Trading)' : analysis.avgTradesPerDay > 2 ? 'Moderate (Swing Trading)' : 'Low Frequency (Position Trading)'}
• Consistency: ${analysis.tradingDays > 10 ? 'Very Consistent' : analysis.tradingDays > 5 ? 'Moderately Consistent' : 'Occasional Trading'}

**💰 Transaction Value Analysis:**
• Total Volume Traded: $${account.transactions?.reduce((sum, t) => sum + ((t.price || 0) * (t.quantity || 0)), 0).toFixed(2) || '0.00'}
• Average Transaction Size: $${analysis.totalTransactions > 0 ? (account.transactions?.reduce((sum, t) => sum + ((t.price || 0) * (t.quantity || 0)), 0) / analysis.totalTransactions).toFixed(2) : '0.00'}
• Largest Transaction: $${Math.max(...(account.transactions?.map(t => (t.price || 0) * (t.quantity || 0)) || [0])).toFixed(2)}
• Total Commissions Paid: $${analysis.totalCommissions.toFixed(2)}

**📊 Historical Performance Trends:**
${Object.keys(transactionsByDate).slice(-5).map(date => {
  const dayTransactions = transactionsByDate[date]
  const dayVolume = dayTransactions.reduce((sum, t) => sum + ((t.price || 0) * (t.quantity || 0)), 0)
  return `• ${new Date(date).toLocaleDateString()}: ${dayTransactions.length} trades, $${dayVolume.toFixed(2)} volume`
}).join('\n')}

**🎯 Trading Evolution Analysis:**
• Early Stage: ${analysis.totalTransactions < 10 ? 'Still building experience' : 'Experienced trader'}
• Strategy Development: ${analysis.winRate > 50 ? 'Developing successful patterns' : 'Still refining approach'}
• Risk Management: ${analysis.maxDrawdown < 10 ? 'Conservative approach' : 'Aggressive trading style'}
• Learning Curve: ${analysis.avgTradesPerDay > analysis.totalTransactions / Math.max(analysis.tradingDays, 1) ? 'Increasing activity' : 'Consistent pace'}

**💡 Historical Insights:**
${analysis.totalTransactions > 50 ? '• ✅ Extensive trading history - good data for analysis' : '• 📈 Building trading history - continue learning'}
${analysis.avgTradesPerDay > 10 ? '• ⚠️ Very high trading frequency - ensure quality over quantity' : '• ✅ Reasonable trading pace'}
${analysis.totalCommissions > (analysis.totalInvested * 0.02) ? '• ⚠️ High commission costs - consider cost optimization' : '• ✅ Reasonable commission expenses'}
${mostActiveDay && transactionsByDate[mostActiveDay].length > 10 ? '• 📊 High single-day activity detected - review for overtrading' : ''}

**🚀 History-Based Recommendations:**
1. ${analysis.totalTransactions < 20 ? 'Continue building trading experience with small positions' : 'Leverage historical data for strategy refinement'}
2. ${analysis.avgTradesPerDay > 5 ? 'Consider reducing trading frequency for better quality' : 'Maintain current trading pace'}
3. ${analysis.totalCommissions > 100 ? 'Review commission costs and consider optimization' : 'Commission costs are reasonable'}
4. Analyze your most successful trading days for pattern recognition
5. Keep detailed notes on decision-making process for future reference`

      suggestions = ['Pattern recognition analysis', 'Trading journal setup', 'Performance trends', 'Strategy evolution']
    }
    else if (lowerMessage.includes('p&l') || lowerMessage.includes('pnl') || lowerMessage.includes('profit') || lowerMessage.includes('loss')) {
      const profitablePositions = account.positions?.filter(p => {
        const realTimePrice = realTimeData.get(p.symbol)?.price || p.currentPrice
        return (realTimePrice - p.averagePrice) * p.quantity > 0
      }) || []
      
      const losingPositions = account.positions?.filter(p => {
        const realTimePrice = realTimeData.get(p.symbol)?.price || p.currentPrice
        return (realTimePrice - p.averagePrice) * p.quantity < 0
      }) || []

      response = `💰 **COMPREHENSIVE P&L ANALYSIS**

**📊 Overall P&L Summary:**
• Total Unrealized P&L: ${analysis.totalUnrealizedPnL >= 0 ? '📈 +' : '📉 '}$${Math.abs(analysis.totalUnrealizedPnL).toFixed(2)}
• Total Return: ${analysis.returnPercent >= 0 ? '+' : ''}${analysis.returnPercent.toFixed(2)}%
• Performance Grade: ${analysis.returnPercent > 15 ? 'A+ (Outstanding)' : analysis.returnPercent > 10 ? 'A (Excellent)' : analysis.returnPercent > 5 ? 'B (Good)' : analysis.returnPercent > 0 ? 'C (Average)' : analysis.returnPercent > -5 ? 'D (Below Average)' : 'F (Poor)'}

**🎯 Position-Level P&L Breakdown:**

**🟢 Profitable Positions (${profitablePositions.length}):**
${profitablePositions.slice(0, 5).map(pos => {
  const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
  const pnl = (realTimePrice - pos.averagePrice) * pos.quantity
  const pnlPercent = ((realTimePrice - pos.averagePrice) / pos.averagePrice) * 100
  return `• **${pos.symbol}**: +$${pnl.toFixed(2)} (+${pnlPercent.toFixed(2)}%) - ${pos.quantity} shares`
}).join('\n') || '• No profitable positions'}
${profitablePositions.length > 5 ? `\n• ... and ${profitablePositions.length - 5} more profitable positions` : ''}

**🔴 Losing Positions (${losingPositions.length}):**
${losingPositions.slice(0, 5).map(pos => {
  const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
  const pnl = (realTimePrice - pos.averagePrice) * pos.quantity
  const pnlPercent = ((realTimePrice - pos.averagePrice) / pos.averagePrice) * 100
  return `• **${pos.symbol}**: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%) - ${pos.quantity} shares`
}).join('\n') || '• No losing positions'}
${losingPositions.length > 5 ? `\n• ... and ${losingPositions.length - 5} more losing positions` : ''}

**📈 P&L Performance Metrics:**
• Win Rate: ${analysis.winRate.toFixed(1)}% (${analysis.profitablePositions}/${analysis.totalPositions} positions)
• Average Winner: $${analysis.avgWin.toFixed(2)}
• Average Loser: $${analysis.avgLoss.toFixed(2)}
• Profit Factor: ${analysis.profitFactor.toFixed(2)} ${analysis.profitFactor > 2 ? '(Excellent)' : analysis.profitFactor > 1.5 ? '(Good)' : analysis.profitFactor > 1 ? '(Acceptable)' : '(Poor)'}
• Risk-Reward Ratio: ${analysis.avgLoss > 0 ? (analysis.avgWin / analysis.avgLoss).toFixed(2) : 'N/A'}

**🎯 P&L Distribution Analysis:**
• Largest Winner: ${analysis.bestPosition.symbol ? `${analysis.bestPosition.symbol} (+$${analysis.bestPosition.pnl.toFixed(2)})` : 'None'}
• Largest Loser: ${analysis.worstPosition.symbol ? `${analysis.worstPosition.symbol} ($${analysis.worstPosition.pnl.toFixed(2)})` : 'None'}
• P&L Concentration: ${analysis.bestPosition.pnl > Math.abs(analysis.worstPosition.pnl) * 2 ? 'Winner-heavy portfolio' : Math.abs(analysis.worstPosition.pnl) > analysis.bestPosition.pnl * 2 ? 'Loser-heavy portfolio' : 'Balanced P&L distribution'}

**📊 Time-Based P&L Performance:**
• Today's P&L: ${analysis.dayPnL >= 0 ? '+' : ''}$${analysis.dayPnL.toFixed(2)}
• This Week's P&L: ${analysis.weekPnL >= 0 ? '+' : ''}$${analysis.weekPnL.toFixed(2)}
• This Month's P&L: ${analysis.monthPnL >= 0 ? '+' : ''}$${analysis.monthPnL.toFixed(2)}

**💡 P&L Optimization Insights:**
${analysis.profitFactor < 1 ? '• 🚨 CRITICAL: Profit factor below 1 - losses exceed gains' : ''}
${analysis.winRate < 40 ? '• ⚠️ WARNING: Low win rate - improve stock selection' : ''}
${Math.abs(analysis.worstPosition.pnl) > analysis.bestPosition.pnl * 1.5 ? '• ⚠️ WARNING: Large losers vs winners - improve stop-loss discipline' : ''}
${analysis.avgWin < analysis.avgLoss ? '• ⚠️ WARNING: Average losses exceed average wins' : ''}
${analysis.winRate > 60 ? '• ✅ EXCELLENT: Strong win rate - maintain approach' : ''}
${analysis.profitFactor > 2 ? '• ✅ EXCELLENT: Strong profit factor' : ''}

**🚀 P&L Improvement Strategy:**
1. ${analysis.worstPosition.symbol && Math.abs(analysis.worstPosition.percentage) > 15 ? `Urgent: Review ${analysis.worstPosition.symbol} position (${analysis.worstPosition.percentage.toFixed(1)}% loss)` : 'Monitor losing positions closely'}
2. ${analysis.bestPosition.symbol && analysis.bestPosition.percentage > 20 ? `Consider taking profits on ${analysis.bestPosition.symbol} (${analysis.bestPosition.percentage.toFixed(1)}% gain)` : 'Let winners run with trailing stops'}
3. ${analysis.winRate < 50 ? 'Focus on improving stock selection and entry timing' : 'Maintain current stock selection process'}
4. ${analysis.avgLoss > analysis.avgWin ? 'Implement stricter stop-loss discipline' : 'Continue current risk management'}
5. Set systematic profit-taking levels at +20% and stop-losses at -10%`

      suggestions = ['P&L optimization tips', 'Stop-loss strategy', 'Profit-taking rules', 'Risk-reward improvement']
    }
    else if (lowerMessage.includes('trading pattern') || lowerMessage.includes('behavior') || lowerMessage.includes('habit')) {
      response = `🎯 **TRADING BEHAVIOR & PATTERN ANALYSIS**

**📊 Trading Style Profile:**
• Trading Frequency: ${analysis.avgTradesPerDay.toFixed(1)} trades/day (${analysis.avgTradesPerDay > 5 ? 'Day Trader' : analysis.avgTradesPerDay > 1 ? 'Active Trader' : 'Position Trader'})
• Position Holding: ${analysis.totalPositions > 10 ? 'High Diversification' : analysis.totalPositions > 5 ? 'Moderate Diversification' : 'Concentrated Approach'}
• Cash Management: ${analysis.cashUtilization.toFixed(1)}% deployed (${analysis.cashUtilization > 90 ? 'Aggressive' : analysis.cashUtilization > 70 ? 'Balanced' : 'Conservative'})
• Risk Appetite: ${analysis.portfolioConcentration > 25 ? 'High Risk' : analysis.portfolioConcentration > 15 ? 'Moderate Risk' : 'Low Risk'}

**🕒 Timing Patterns:**
• Most Active Period: ${analysis.recentTransactions.thisWeek > analysis.recentTransactions.thisMonth / 2 ? 'Recent surge in activity' : 'Consistent trading pace'}
• Trading Consistency: ${analysis.tradingDays > 10 ? 'Very Active' : analysis.tradingDays > 5 ? 'Moderately Active' : 'Occasional Trader'}
• Decision Speed: ${analysis.cancelledOrders > analysis.filledOrders * 0.2 ? 'Indecisive (many cancellations)' : 'Decisive (few cancellations)'}

**🎭 Behavioral Strengths:**
${analysis.winRate > 60 ? '• ✅ Strong stock selection ability' : ''}
${analysis.diversificationScore >= 7 ? '• ✅ Good diversification discipline' : ''}
${analysis.cashUtilization < 95 ? '• ✅ Maintains cash reserves' : ''}
${analysis.orderFillRate > 85 ? '• ✅ Efficient order execution' : ''}
${analysis.avgTradesPerDay < 5 ? '• ✅ Avoids overtrading' : ''}

**⚠️ Behavioral Risks:**
${analysis.winRate < 40 ? '• ❌ Poor stock selection - may be chasing trends' : ''}
${analysis.portfolioConcentration > 30 ? '• ❌ Over-concentration - emotional attachment to positions' : ''}
${analysis.avgTradesPerDay > 8 ? '• ❌ Overtrading - may be driven by emotions' : ''}
${analysis.cashUtilization > 95 ? '• ❌ No cash reserves - FOMO trading' : ''}
${analysis.cancelledOrders > analysis.filledOrders * 0.3 ? '• ❌ High cancellation rate - indecisive behavior' : ''}

**🧠 Psychological Profile:**
• **Risk Tolerance:** ${analysis.maxDrawdown > 15 ? 'High (willing to accept large losses)' : analysis.maxDrawdown > 8 ? 'Moderate' : 'Conservative'}
• **Patience Level:** ${analysis.avgTradesPerDay > 3 ? 'Low (frequent trading)' : 'High (patient approach)'}
• **Discipline Score:** ${analysis.diversificationScore}/10 based on diversification
• **Emotional Control:** ${analysis.worstPosition.percentage < -20 ? 'Needs improvement (holding big losers)' : 'Good (cutting losses appropriately)'}

**📈 Trading Evolution:**
• Early Stage: ${analysis.totalTransactions < 20 ? 'Still learning and experimenting' : 'Experienced trader'}
• Strategy Development: ${analysis.winRate > 50 ? 'Developing winning approach' : 'Still refining strategy'}
• Risk Management: ${analysis.maxDrawdown < 10 ? 'Strong risk control' : 'Needs better risk management'}

**🎯 Behavioral Improvement Plan:**
1. **Emotional Control:** ${analysis.worstPosition.percentage < -15 ? 'Set strict stop-loss rules to prevent large losses' : 'Maintain current loss management'}
2. **Patience:** ${analysis.avgTradesPerDay > 5 ? 'Reduce trading frequency - focus on quality setups' : 'Continue patient approach'}
3. **Discipline:** ${analysis.diversificationScore < 6 ? 'Stick to diversification rules regardless of emotions' : 'Maintain current discipline'}
4. **Risk Management:** Set maximum position size limits and stick to them
5. **Learning:** Keep a trading journal to track decision-making patterns`

      suggestions = ['Psychology tips', 'Discipline strategies', 'Emotional control', 'Trading journal setup']
    }
    else if (lowerMessage.includes('commission') || lowerMessage.includes('fees') || lowerMessage.includes('cost')) {
      const totalCommissions = analysis.totalCommissions
      const avgCommissionPerTrade = analysis.totalTransactions > 0 ? totalCommissions / analysis.totalTransactions : 0
      const commissionAsPercentOfInvested = analysis.totalInvested > 0 ? (totalCommissions / analysis.totalInvested) * 100 : 0
      
      response = `💰 **COMMISSION & COST ANALYSIS**

**📊 Commission Overview:**
• Total Commissions Paid: $${totalCommissions.toFixed(2)}
• Average per Transaction: $${avgCommissionPerTrade.toFixed(2)}
• Commission as % of Invested: ${commissionAsPercentOfInvested.toFixed(3)}%
• Total Transactions: ${analysis.totalTransactions}

**💡 Cost Impact Analysis:**
${commissionAsPercentOfInvested > 2 ? '• 🚨 CRITICAL: Very high commission costs (>2% of invested capital)' : ''}
${commissionAsPercentOfInvested > 1 ? '• ⚠️ WARNING: High commission costs (>1% of invested capital)' : ''}
${commissionAsPercentOfInvested < 0.5 ? '• ✅ EXCELLENT: Low commission costs (<0.5% of invested capital)' : ''}
${avgCommissionPerTrade > 10 ? '• ⚠️ High average commission per trade' : '• ✅ Reasonable commission per trade'}

**🎯 Cost Optimization:**
• Commission Efficiency: ${commissionAsPercentOfInvested < 0.5 ? 'Excellent' : commissionAsPercentOfInvested < 1 ? 'Good' : 'Needs Improvement'}
• Trading Frequency Impact: ${analysis.avgTradesPerDay > 5 ? 'High frequency increases costs' : 'Reasonable trading frequency'}
• Position Size Impact: ${analysis.avgPositionSize < 1000 ? 'Small positions increase relative costs' : 'Good position sizing for cost efficiency'}

**🚀 Cost Reduction Strategies:**
1. ${avgCommissionPerTrade > 5 ? 'Consider commission-free brokers' : 'Current commission structure is reasonable'}
2. ${analysis.avgPositionSize < 500 ? 'Increase position sizes to reduce relative commission impact' : 'Maintain current position sizing'}
3. ${analysis.avgTradesPerDay > 10 ? 'Reduce trading frequency to lower total costs' : 'Trading frequency is cost-efficient'}
4. Focus on quality trades over quantity to maximize cost efficiency
5. Consider batch trading to reduce transaction costs`

      suggestions = ['Cost optimization tips', 'Commission-free alternatives', 'Position sizing for costs', 'Trading frequency advice']
    }
    else if (lowerMessage.includes('sector') || lowerMessage.includes('diversification') || lowerMessage.includes('allocation')) {
      // Analyze sector diversification
      const sectorAllocation: { [sector: string]: { value: number, positions: number, symbols: string[] } } = {}
      let totalValue = 0
      
      account.positions?.forEach(position => {
        const sector = position.sector || 'Unknown'
        const realTimePrice = realTimeData.get(position.symbol)?.price || position.currentPrice
        const positionValue = realTimePrice * position.quantity
        totalValue += positionValue
        
        if (!sectorAllocation[sector]) {
          sectorAllocation[sector] = { value: 0, positions: 0, symbols: [] }
        }
        sectorAllocation[sector].value += positionValue
        sectorAllocation[sector].positions++
        sectorAllocation[sector].symbols.push(position.symbol)
      })
      
      const sectors = Object.keys(sectorAllocation).sort((a, b) => sectorAllocation[b].value - sectorAllocation[a].value)
      const largestSector = sectors[0]
      const largestSectorPercent = largestSector ? (sectorAllocation[largestSector].value / totalValue) * 100 : 0
      
      response = `🏭 **SECTOR DIVERSIFICATION ANALYSIS**

**📊 Sector Allocation:**
${sectors.map(sector => {
  const allocation = sectorAllocation[sector]
  const percentage = (allocation.value / totalValue) * 100
  return `• **${sector}**: ${percentage.toFixed(1)}% ($${allocation.value.toFixed(2)}) - ${allocation.positions} positions
  Stocks: ${allocation.symbols.join(', ')}`
}).join('\n')}

**🎯 Diversification Metrics:**
• Total Sectors: ${sectors.length}
• Largest Sector: ${largestSector || 'N/A'} (${largestSectorPercent.toFixed(1)}%)
• Diversification Score: ${analysis.diversificationScore}/10
• Sector Concentration Risk: ${largestSectorPercent > 40 ? 'High' : largestSectorPercent > 25 ? 'Medium' : 'Low'}

**💡 Diversification Assessment:**
${sectors.length < 3 ? '• 🚨 CRITICAL: Poor sector diversification - add positions in different sectors' : ''}
${largestSectorPercent > 50 ? '• 🚨 CRITICAL: Over-concentration in single sector' : ''}
${largestSectorPercent > 30 ? '• ⚠️ WARNING: High concentration in single sector' : ''}
${sectors.length >= 5 ? '• ✅ EXCELLENT: Good sector diversification' : ''}
${largestSectorPercent < 25 ? '• ✅ GOOD: Well-balanced sector allocation' : ''}

**🚀 Diversification Strategy:**
1. ${sectors.length < 5 ? `Add positions in ${5 - sectors.length} more sectors for better diversification` : 'Maintain current sector spread'}
2. ${largestSectorPercent > 30 ? `Reduce ${largestSector} allocation to <25% of portfolio` : 'Current sector allocation is balanced'}
3. Consider adding positions in defensive sectors (utilities, consumer staples)
4. Balance growth and value sectors for stability
5. Monitor sector rotation trends for rebalancing opportunities

**📈 Recommended Sector Targets:**
• Technology: 15-25%
• Healthcare: 10-20%
• Financials: 10-15%
• Consumer Discretionary: 10-15%
• Industrials: 5-15%
• Other Sectors: 20-30% combined`

      suggestions = ['Sector rebalancing advice', 'Defensive sector additions', 'Growth vs value balance', 'Sector rotation strategy']
    }
    else if (lowerMessage.includes('market hours') || lowerMessage.includes('trading hours') || lowerMessage.includes('market status')) {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentTime = currentHour * 100 + currentMinute
      
      let marketStatus = 'Closed'
      let nextSession = 'Pre-market opens at 4:00 AM ET'
      
      if (currentTime >= 400 && currentTime < 930) {
        marketStatus = 'Pre-market'
        nextSession = 'Regular market opens at 9:30 AM ET'
      } else if (currentTime >= 930 && currentTime < 1600) {
        marketStatus = 'Regular Hours'
        nextSession = 'After-hours trading starts at 4:00 PM ET'
      } else if (currentTime >= 1600 && currentTime < 2000) {
        marketStatus = 'After-hours'
        nextSession = 'Market closes at 8:00 PM ET'
      }
      
      response = `🕐 **MARKET HOURS & TRADING STATUS**

**📊 Current Market Status:**
• Status: **${marketStatus}**
• Current Time: ${now.toLocaleTimeString()}
• Next Session: ${nextSession}

**⏰ Trading Hours (Eastern Time):**
• **Pre-market**: 4:00 AM - 9:30 AM
• **Regular Hours**: 9:30 AM - 4:00 PM
• **After-hours**: 4:00 PM - 8:00 PM
• **Closed**: 8:00 PM - 4:00 AM

**📈 Your Trading Activity:**
• Recent Transactions: ${analysis.recentTransactions.today} today
• Active Orders: ${analysis.pendingOrders}
• Last Trade: ${account.transactions?.length > 0 ? new Date(account.transactions[account.transactions.length - 1].timestamp).toLocaleString() : 'No recent trades'}

**💡 Market Hours Impact:**
${marketStatus === 'Regular Hours' ? '• ✅ Full liquidity and tight spreads available' : ''}
${marketStatus === 'Pre-market' ? '• ⚠️ Lower liquidity - use limit orders' : ''}
${marketStatus === 'After-hours' ? '• ⚠️ Reduced liquidity - wider spreads possible' : ''}
${marketStatus === 'Closed' ? '• 📊 Market closed - orders will execute at next open' : ''}

**🎯 Trading Recommendations:**
• **Regular Hours**: Best time for large orders and market orders
• **Pre-market**: Use limit orders, watch for news reactions
• **After-hours**: Limited liquidity, avoid market orders
• **Closed**: Plan trades for next session, review positions

**📅 Market Calendar:**
• Weekdays: Normal trading hours
• Weekends: Markets closed
• Holidays: Check exchange calendar for closures`

      suggestions = ['Order timing strategy', 'Pre-market trading tips', 'After-hours risks', 'Market calendar']
    }
    else if (lowerMessage.includes('cash') || lowerMessage.includes('buying power') || lowerMessage.includes('available')) {
      response = `💵 **CASH & BUYING POWER ANALYSIS**

**💰 Cash Position:**
• Available Cash: $${analysis.availableCash.toFixed(2)}
• Initial Balance: $${analysis.initialBalance.toFixed(2)}
• Current Total Value: $${analysis.totalValue.toFixed(2)}
• Cash Utilization: ${analysis.cashUtilization.toFixed(1)}%

**📊 Buying Power Analysis:**
• Unused Buying Power: $${analysis.availableCash.toFixed(2)}
• Percentage of Portfolio: ${((analysis.availableCash / analysis.totalValue) * 100).toFixed(1)}%
• Maximum Position Size: $${(analysis.availableCash * 0.2).toFixed(2)} (20% of available cash)
• Emergency Reserve: $${(analysis.availableCash * 0.1).toFixed(2)} (recommended 10%)

**🎯 Cash Management Assessment:**
${analysis.cashUtilization > 95 ? '• 🚨 CRITICAL: Very low cash reserves - high risk' : ''}
${analysis.cashUtilization > 85 ? '• ⚠️ WARNING: Low cash reserves - maintain buffer' : ''}
${analysis.cashUtilization < 50 ? '• 💰 OPPORTUNITY: Significant unused buying power' : ''}
${analysis.cashUtilization >= 70 && analysis.cashUtilization <= 85 ? '• ✅ OPTIMAL: Good cash utilization balance' : ''}

**💡 Cash Optimization Strategy:**
• **Optimal Range**: 70-85% cash utilization
• **Emergency Buffer**: Keep 10-15% in cash
• **Opportunity Fund**: Reserve 5-10% for market opportunities
• **Risk Management**: Never exceed 95% utilization

**🚀 Deployment Recommendations:**
1. ${analysis.cashUtilization < 60 ? `Deploy $${(analysis.availableCash * 0.3).toFixed(2)} into quality positions` : 'Current cash level is appropriate'}
2. ${analysis.cashUtilization > 90 ? 'Consider taking profits to rebuild cash reserves' : 'Maintain current cash allocation'}
3. ${analysis.availableCash > 1000 ? 'Consider dollar-cost averaging into positions' : 'Focus on smaller position additions'}
4. Keep emergency cash for market opportunities
5. Regular rebalancing to maintain optimal cash levels`

      suggestions = ['Cash deployment strategy', 'Emergency fund planning', 'Position sizing with cash', 'Rebalancing advice']
    }
    else if (lowerMessage.includes('alert') || lowerMessage.includes('notification') || lowerMessage.includes('warning')) {
      // Generate intelligent alerts based on current portfolio state
      const alerts: { type: 'critical' | 'warning' | 'info', message: string }[] = []
      
      // Critical alerts
      if (analysis.cashUtilization > 95) alerts.push({ type: 'critical', message: 'Extremely low cash reserves - immediate risk' })
      if (analysis.portfolioConcentration > 40) alerts.push({ type: 'critical', message: 'Dangerous portfolio concentration detected' })
      if (analysis.maxDrawdown > 25) alerts.push({ type: 'critical', message: 'Excessive maximum drawdown - review risk management' })
      if (analysis.worstPosition.percentage < -25) alerts.push({ type: 'critical', message: `${analysis.worstPosition.symbol} position down >25% - consider stop-loss` })
      
      // Warning alerts
      if (analysis.winRate < 40) alerts.push({ type: 'warning', message: 'Low win rate - improve stock selection process' })
      if (analysis.diversificationScore < 5) alerts.push({ type: 'warning', message: 'Poor diversification - add more positions' })
      if (analysis.avgTradesPerDay > 10) alerts.push({ type: 'warning', message: 'Very high trading frequency - risk of overtrading' })
      if (analysis.totalCommissions > (analysis.totalInvested * 0.02)) alerts.push({ type: 'warning', message: 'High commission costs impacting returns' })
      
      // Info alerts
      if (analysis.bestPosition.percentage > 25) alerts.push({ type: 'info', message: `${analysis.bestPosition.symbol} up >25% - consider taking profits` })
      if (analysis.cashUtilization < 50) alerts.push({ type: 'info', message: 'Significant unused buying power available' })
      if (analysis.returnPercent > 15) alerts.push({ type: 'info', message: 'Excellent performance - maintain current strategy' })
      
      response = `🚨 **INTELLIGENT ALERTS & NOTIFICATIONS**

**📊 Alert Summary:**
• Total Alerts: ${alerts.length}
• Critical: ${alerts.filter(a => a.type === 'critical').length}
• Warnings: ${alerts.filter(a => a.type === 'warning').length}
• Information: ${alerts.filter(a => a.type === 'info').length}

**🚨 Critical Alerts:**
${alerts.filter(a => a.type === 'critical').map(alert => `• ${alert.message}`).join('\n') || '• No critical alerts'}

**⚠️ Warning Alerts:**
${alerts.filter(a => a.type === 'warning').map(alert => `• ${alert.message}`).join('\n') || '• No warning alerts'}

**ℹ️ Information Alerts:**
${alerts.filter(a => a.type === 'info').map(alert => `• ${alert.message}`).join('\n') || '• No information alerts'}

**🎯 Alert Priorities:**
1. **Critical**: Immediate action required to prevent losses
2. **Warning**: Attention needed to improve performance
3. **Information**: Opportunities for optimization

**🔔 Recommended Alert Settings:**
• Position loss >15%: Critical alert
• Portfolio concentration >30%: Warning alert
• Cash utilization >90%: Critical alert
• Win rate <45%: Warning alert
• Large gains >20%: Profit-taking alert

**📱 Alert Management:**
• Review alerts daily before trading
• Set up automated notifications for critical levels
• Monitor warning trends for early intervention
• Use information alerts for optimization opportunities`

      suggestions = ['Set up price alerts', 'Risk threshold alerts', 'Profit-taking alerts', 'Portfolio monitoring']
    }
    else if (lowerMessage.includes('benchmark') || lowerMessage.includes('compare') || lowerMessage.includes('market performance')) {
      // Compare performance to market benchmarks
      const spyReturn = 10 // Assume S&P 500 return for comparison
      const portfolioReturn = analysis.returnPercent
      const outperformance = portfolioReturn - spyReturn
      
      response = `📊 **BENCHMARK PERFORMANCE COMPARISON**

**📈 Performance vs Market:**
• Your Return: ${portfolioReturn >= 0 ? '+' : ''}${portfolioReturn.toFixed(2)}%
• S&P 500 (SPY): +${spyReturn.toFixed(2)}%
• Outperformance: ${outperformance >= 0 ? '+' : ''}${outperformance.toFixed(2)}%
• Performance Grade: ${outperformance > 5 ? 'A (Significantly Outperforming)' : outperformance > 0 ? 'B (Outperforming)' : outperformance > -3 ? 'C (Matching Market)' : 'D (Underperforming)'}

**🎯 Risk-Adjusted Performance:**
• Your Sharpe Ratio: ${analysis.sharpeRatio.toFixed(3)}
• Market Sharpe Ratio: ~0.800 (typical)
• Risk Efficiency: ${analysis.sharpeRatio > 0.8 ? 'Superior' : analysis.sharpeRatio > 0.5 ? 'Good' : 'Needs Improvement'}

**📊 Performance Analysis:**
${outperformance > 5 ? '• 🎉 EXCELLENT: Significantly beating the market' : ''}
${outperformance > 0 && outperformance <= 5 ? '• ✅ GOOD: Outperforming market with reasonable margin' : ''}
${outperformance >= -3 && outperformance <= 0 ? '• ➖ AVERAGE: Matching market performance' : ''}
${outperformance < -3 ? '• ⚠️ UNDERPERFORMING: Trailing market by significant margin' : ''}

**💡 Benchmark Insights:**
• Volatility vs Market: ${analysis.maxDrawdown > 15 ? 'Higher volatility' : 'Similar volatility'}
• Risk-Return Profile: ${analysis.sharpeRatio > 0.8 ? 'Superior risk-adjusted returns' : 'Standard risk-return profile'}
• Consistency: ${analysis.winRate > 60 ? 'More consistent than typical market' : 'Standard consistency levels'}

**🚀 Improvement Strategies:**
1. ${outperformance < 0 ? 'Focus on stock selection to beat market' : 'Maintain current outperformance strategy'}
2. ${analysis.sharpeRatio < 0.5 ? 'Improve risk management for better Sharpe ratio' : 'Continue current risk approach'}
3. ${analysis.maxDrawdown > 20 ? 'Reduce volatility through better diversification' : 'Volatility is well-managed'}
4. Consider index fund allocation for consistent market exposure
5. Regular performance review against benchmarks

**📈 Benchmark Targets:**
• Minimum Target: Match S&P 500 return
• Good Target: Beat market by 2-5%
• Excellent Target: Beat market by >5% with lower risk
• Sharpe Ratio Target: >0.8 for superior risk-adjusted returns`

      suggestions = ['Market beating strategies', 'Risk-adjusted optimization', 'Benchmark tracking', 'Index comparison']
    }
    else if (lowerMessage.includes('tax') || lowerMessage.includes('capital gains') || lowerMessage.includes('loss harvesting')) {
      const profitablePositions = account.positions?.filter(p => {
        const realTimePrice = realTimeData.get(p.symbol)?.price || p.currentPrice
        return (realTimePrice - p.averagePrice) * p.quantity > 0
      }) || []
      
      const losingPositions = account.positions?.filter(p => {
        const realTimePrice = realTimeData.get(p.symbol)?.price || p.currentPrice
        return (realTimePrice - p.averagePrice) * p.quantity < 0
      }) || []
      
      response = `💼 **TAX OPTIMIZATION & CAPITAL GAINS ANALYSIS**

**📊 Tax Position Overview:**
• Profitable Positions: ${profitablePositions.length} (potential capital gains)
• Losing Positions: ${losingPositions.length} (potential tax loss harvesting)
• Unrealized Gains: $${profitablePositions.reduce((sum, p) => {
  const realTimePrice = realTimeData.get(p.symbol)?.price || p.currentPrice
  return sum + Math.max(0, (realTimePrice - p.averagePrice) * p.quantity)
}, 0).toFixed(2)}
• Unrealized Losses: $${Math.abs(losingPositions.reduce((sum, p) => {
  const realTimePrice = realTimeData.get(p.symbol)?.price || p.currentPrice
  return sum + Math.min(0, (realTimePrice - p.averagePrice) * p.quantity)
}, 0)).toFixed(2)}

**🎯 Tax Loss Harvesting Opportunities:**
${losingPositions.slice(0, 3).map(pos => {
  const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
  const loss = (realTimePrice - pos.averagePrice) * pos.quantity
  return `• **${pos.symbol}**: $${Math.abs(loss).toFixed(2)} loss available for harvesting`
}).join('\n') || '• No tax loss harvesting opportunities'}

**💰 Capital Gains Management:**
${profitablePositions.slice(0, 3).map(pos => {
  const realTimePrice = realTimeData.get(pos.symbol)?.price || pos.currentPrice
  const gain = (realTimePrice - pos.averagePrice) * pos.quantity
  return `• **${pos.symbol}**: $${gain.toFixed(2)} unrealized gain`
}).join('\n') || '• No significant capital gains'}

**📅 Holding Period Analysis:**
• Long-term Positions (>1 year): ${account.positions?.filter(p => {
  const entryDate = new Date(p.entryDate)
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  return entryDate <= oneYearAgo
}).length || 0}
• Short-term Positions (<1 year): ${account.positions?.filter(p => {
  const entryDate = new Date(p.entryDate)
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  return entryDate > oneYearAgo
}).length || 0}

**💡 Tax Optimization Strategies:**
• **Tax Loss Harvesting**: Realize losses to offset gains
• **Long-term Holdings**: Hold profitable positions >1 year for better tax treatment
• **Wash Sale Avoidance**: Wait 30 days before repurchasing sold positions
• **Gain Management**: Time capital gains realization strategically

**🚀 Tax-Efficient Recommendations:**
1. ${losingPositions.length > 0 ? 'Consider harvesting losses before year-end' : 'No immediate loss harvesting needed'}
2. ${profitablePositions.length > 0 ? 'Hold profitable positions for long-term capital gains treatment' : 'Focus on building profitable positions'}
3. Coordinate gains and losses for optimal tax efficiency
4. Consider tax-advantaged accounts for frequent trading
5. Maintain detailed records for tax reporting

**⚠️ Important Note:**
This is educational information only. Consult a tax professional for personalized tax advice and strategies specific to your situation.`

      suggestions = ['Loss harvesting strategy', 'Long-term holding benefits', 'Tax-efficient trading', 'Year-end tax planning']
    }
    else if (lowerMessage.includes('expectancy') || lowerMessage.includes('expected value') || lowerMessage.includes('expectation')) {
      // Calculate mathematical expectancy and expected value
      const trades = account.transactions || []
      const wins = trades.filter(t => t.amount > 0)
      const losses = trades.filter(t => t.amount < 0)
      
      const winRate = trades.length > 0 ? (wins.length / trades.length) : 0
      const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.amount, 0) / wins.length : 0
      const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.amount, 0) / losses.length) : 0
      
      // Expectancy = (Win% × Avg Win) - (Loss% × Avg Loss)
      const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss)
      
      response = `🎲 **EXPECTANCY & EXPECTED VALUE ANALYSIS**

**📊 Trading Expectancy:**
• Expectancy per Trade: $${expectancy.toFixed(2)}
• Expected Value: ${expectancy >= 0 ? 'Positive' : 'Negative'} ${expectancy >= 0 ? '✅' : '❌'}
• System Quality: ${expectancy > 0 ? 'Profitable' : 'Unprofitable'} trading system

**🎯 Expectancy Breakdown:**
• Win Rate: ${(winRate * 100).toFixed(1)}%
• Loss Rate: ${((1 - winRate) * 100).toFixed(1)}%
• Average Win: $${avgWin.toFixed(2)}
• Average Loss: $${avgLoss.toFixed(2)}
• Win/Loss Ratio: ${avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A'}

**💰 Expected Value Calculation:**
• Positive Expectancy: $${(winRate * avgWin).toFixed(2)} (${(winRate * 100).toFixed(1)}% × $${avgWin.toFixed(2)})
• Negative Expectancy: $${((1 - winRate) * avgLoss).toFixed(2)} (${((1 - winRate) * 100).toFixed(1)}% × $${avgLoss.toFixed(2)})
• Net Expectancy: $${expectancy.toFixed(2)} per trade

**📈 What This Means:**
${expectancy > 10 ? '• 🎉 EXCELLENT: Strong positive expectancy - very profitable system' : ''}
${expectancy > 0 && expectancy <= 10 ? '• ✅ GOOD: Positive expectancy - profitable over time' : ''}
${expectancy === 0 ? '• ➖ BREAKEVEN: Zero expectancy - breaking even' : ''}
${expectancy < 0 ? '• ❌ NEGATIVE: Negative expectancy - losing money over time' : ''}

**🎯 Expectancy Quality:**
${expectancy > 5 ? '• System has strong edge in the market' : ''}
${expectancy > 0 && expectancy <= 5 ? '• System has moderate edge - room for improvement' : ''}
${expectancy <= 0 ? '• System needs significant improvement or should be avoided' : ''}

**💡 Improving Expectancy:**
1. ${winRate < 0.5 ? 'Increase win rate through better stock selection' : 'Maintain current win rate'}
2. ${avgWin < avgLoss * 1.5 ? 'Let winners run longer to increase average win' : 'Current win/loss ratio is good'}
3. ${avgLoss > avgWin * 0.5 ? 'Tighten stop losses to reduce average loss' : 'Loss management is good'}
4. Focus on high-probability setups to improve overall expectancy
5. Review and eliminate negative expectancy trades from your system

**📊 Expected Performance Over 100 Trades:**
• Expected Profit: $${(expectancy * 100).toFixed(2)}
• Confidence: ${expectancy > 0 ? 'System should be profitable' : 'System likely to lose money'}
• Risk Assessment: ${expectancy > 5 ? 'Low risk of ruin' : expectancy > 0 ? 'Moderate risk' : 'High risk of ruin'}`

      suggestions = ['Win rate improvement', 'Risk-reward optimization', 'Trade quality analysis', 'System refinement']
    }
    else if (lowerMessage.includes('day of week') || lowerMessage.includes('best day') || lowerMessage.includes('monday') || lowerMessage.includes('friday') || lowerMessage.includes('tuesday') || lowerMessage.includes('wednesday') || lowerMessage.includes('thursday')) {
      // Analyze performance by day of week
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayPerformance: { [day: string]: { trades: number, pnl: number, wins: number, losses: number } } = {}
      
      dayNames.forEach(day => {
        dayPerformance[day] = { trades: 0, pnl: 0, wins: 0, losses: 0 }
      })
      
      account.transactions?.forEach(transaction => {
        const dayName = dayNames[new Date(transaction.timestamp).getDay()]
        dayPerformance[dayName].trades++
        dayPerformance[dayName].pnl += transaction.amount || 0
        if ((transaction.amount || 0) > 0) dayPerformance[dayName].wins++
        else if ((transaction.amount || 0) < 0) dayPerformance[dayName].losses++
      })
      
      const tradingDays = dayNames.filter(day => dayPerformance[day].trades > 0)
      const bestDay = tradingDays.reduce((best, day) => 
        dayPerformance[day].pnl > dayPerformance[best].pnl ? day : best, tradingDays[0] || 'Monday')
      const worstDay = tradingDays.reduce((worst, day) => 
        dayPerformance[day].pnl < dayPerformance[worst].pnl ? day : worst, tradingDays[0] || 'Monday')
      
      response = `📅 **DAY OF WEEK PERFORMANCE ANALYSIS**

**🏆 Best Trading Day: ${bestDay}**
• Total Trades: ${dayPerformance[bestDay].trades}
• Total P&L: $${dayPerformance[bestDay].pnl.toFixed(2)}
• Wins: ${dayPerformance[bestDay].wins}
• Losses: ${dayPerformance[bestDay].losses}
• Win Rate: ${dayPerformance[bestDay].trades > 0 ? ((dayPerformance[bestDay].wins / dayPerformance[bestDay].trades) * 100).toFixed(1) : 0}%

**📉 Worst Trading Day: ${worstDay}**
• Total Trades: ${dayPerformance[worstDay].trades}
• Total P&L: $${dayPerformance[worstDay].pnl.toFixed(2)}
• Wins: ${dayPerformance[worstDay].wins}
• Losses: ${dayPerformance[worstDay].losses}
• Win Rate: ${dayPerformance[worstDay].trades > 0 ? ((dayPerformance[worstDay].wins / dayPerformance[worstDay].trades) * 100).toFixed(1) : 0}%

**📊 Complete Day-by-Day Breakdown:**

${tradingDays.map(day => {
  const data = dayPerformance[day]
  const winRate = data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0
  const avgPnL = data.trades > 0 ? (data.pnl / data.trades).toFixed(2) : '0.00'
  const emoji = data.pnl > 0 ? '📈' : data.pnl < 0 ? '📉' : '➖'
  
  return `**${day}:** ${emoji}
• Trades: ${data.trades}
• Total P&L: ${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}
• Avg P&L/Trade: $${avgPnL}
• Win Rate: ${winRate}%
• W/L: ${data.wins}/${data.losses}`
}).join('\n\n')}

**💡 Day-of-Week Insights:**
${dayPerformance[bestDay].pnl > dayPerformance[worstDay].pnl * 2 ? `• 🎯 Strong edge on ${bestDay} - focus more trading on this day` : ''}
${dayPerformance[worstDay].pnl < 0 ? `• ⚠️ Avoid or reduce trading on ${worstDay}` : ''}
${tradingDays.length < 3 ? '• 📊 Trade more days for better diversification' : ''}
${tradingDays.length >= 5 ? '• ✅ Good weekly trading consistency' : ''}

**🎯 Weekly Trading Strategy:**
1. ${dayPerformance[bestDay].pnl > 0 ? `Increase position sizes on ${bestDay}` : 'Identify best performing day patterns'}
2. ${dayPerformance[worstDay].pnl < 0 ? `Reduce or avoid trading on ${worstDay}` : 'Maintain current weekly approach'}
3. Focus on high-probability setups on profitable days
4. Review why certain days perform better than others
5. Consider market patterns (Monday effect, Friday positioning, etc.)`

      suggestions = ['Time of day analysis', 'Monthly performance', 'Intraday patterns', 'Weekly optimization']
    }
    else if (lowerMessage.includes('streak') || lowerMessage.includes('consecutive') || lowerMessage.includes('winning streak') || lowerMessage.includes('losing streak')) {
      // Analyze winning and losing streaks
      const transactions = account.transactions || []
      let currentStreak = 0
      let currentStreakType = ''
      let maxWinStreak = 0
      let maxLossStreak = 0
      let streaks: { type: string, length: number, startDate: Date, endDate: Date }[] = []
      
      transactions.forEach((t, index) => {
        const isWin = (t.amount || 0) > 0
        const streakType = isWin ? 'win' : 'loss'
        
        if (streakType === currentStreakType) {
          currentStreak++
        } else {
          if (currentStreak > 0) {
            streaks.push({
              type: currentStreakType,
              length: currentStreak,
              startDate: transactions[index - currentStreak].timestamp,
              endDate: transactions[index - 1].timestamp
            })
          }
          currentStreak = 1
          currentStreakType = streakType
        }
        
        if (streakType === 'win' && currentStreak > maxWinStreak) maxWinStreak = currentStreak
        if (streakType === 'loss' && currentStreak > maxLossStreak) maxLossStreak = currentStreak
      })
      
      response = `🎯 **WINNING & LOSING STREAK ANALYSIS**

**🏆 Streak Statistics:**
• Maximum Winning Streak: ${maxWinStreak} trades
• Maximum Losing Streak: ${maxLossStreak} trades
• Current Streak: ${currentStreak} ${currentStreakType === 'win' ? 'wins ✅' : 'losses ❌'}
• Total Streaks Analyzed: ${streaks.length}

**📊 Winning Streaks:**
${streaks.filter(s => s.type === 'win').slice(-5).map((s, i) => 
  `• Streak ${i + 1}: ${s.length} consecutive wins (${new Date(s.startDate).toLocaleDateString()} - ${new Date(s.endDate).toLocaleDateString()})`
).join('\n') || '• No significant winning streaks yet'}

**📉 Losing Streaks:**
${streaks.filter(s => s.type === 'loss').slice(-5).map((s, i) => 
  `• Streak ${i + 1}: ${s.length} consecutive losses (${new Date(s.startDate).toLocaleDateString()} - ${new Date(s.endDate).toLocaleDateString()})`
).join('\n') || '• No significant losing streaks yet'}

**💡 Streak Psychology Analysis:**
${maxWinStreak > 5 ? '• 🎉 Strong winning streaks show consistent strategy execution' : ''}
${maxLossStreak > 5 ? '• ⚠️ Long losing streaks indicate need for risk management review' : ''}
${maxWinStreak > maxLossStreak * 2 ? '• ✅ Winning streaks dominate - good system quality' : ''}
${maxLossStreak > maxWinStreak ? '• ⚠️ Losing streaks exceed winning streaks - system needs improvement' : ''}

**🎯 Streak Management Strategy:**
1. ${maxLossStreak > 3 ? 'Implement circuit breaker after 3 consecutive losses' : 'Current streak management is reasonable'}
2. ${maxWinStreak > 5 ? 'Protect profits during winning streaks with trailing stops' : 'Focus on building winning streaks'}
3. ${maxLossStreak > 5 ? 'Take trading break after significant losing streak' : 'Maintain current approach'}
4. Review trades during streaks for pattern recognition
5. Avoid revenge trading after losing streaks

**📈 Statistical Insights:**
• Streak Volatility: ${Math.abs(maxWinStreak - maxLossStreak) > 5 ? 'High - inconsistent performance' : 'Moderate - relatively consistent'}
• Emotional Risk: ${maxLossStreak > 5 ? 'High - manage emotions carefully' : 'Low - good emotional control'}
• System Robustness: ${maxWinStreak > maxLossStreak ? 'Strong - system has positive edge' : 'Needs improvement'}`

      suggestions = ['Emotional control tips', 'Circuit breaker strategy', 'Streak recovery plan', 'Psychology management']
    }
    else if (lowerMessage.includes('best') || lowerMessage.includes('top') || lowerMessage.includes('winner')) {
      const topPositions = account.positions
        .map(pos => ({
          symbol: pos.symbol,
          pnl: ((realTimeData.get(pos.symbol)?.price || pos.currentPrice) - pos.averagePrice) * pos.quantity
        }))
        .sort((a, b) => b.pnl - a.pnl)
        .slice(0, 3)

      response = `🏆 **Top Performing Positions:**

${topPositions.map((pos, index) => 
  `${index + 1}. **${pos.symbol}**: ${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)}`
).join('\n')}

**Analysis:**
${topPositions[0]?.pnl > 0 ? `Your best performer ${topPositions[0].symbol} shows strong momentum. Consider taking partial profits or setting a trailing stop.` : 'Focus on identifying winning patterns from your profitable trades.'}

**Next Steps:**
• Analyze what made these positions successful
• Look for similar opportunities in the market
• Consider position sizing adjustments`

      suggestions = ['Analyze worst performers', 'Exit strategy for winners', 'Find similar opportunities']
    }
    else if (lowerMessage.includes('advice') || lowerMessage.includes('help') || lowerMessage.includes('improve')) {
      response = `💡 **Personalized Trading Advice:**

Based on your current portfolio:

**Strengths:**
${analysis.winRate > 50 ? '✅ Positive win rate - good stock selection' : ''}
${analysis.totalPositions >= 5 ? '✅ Good diversification across positions' : ''}
${analysis.returnPercent > 0 ? '✅ Overall profitable performance' : ''}

**Areas for Improvement:**
${analysis.winRate < 50 ? '• Work on entry timing and stock selection' : ''}
${analysis.totalPositions < 5 ? '• Increase diversification to reduce risk' : ''}
${Math.abs(analysis.worstPosition.pnl) > Math.abs(analysis.bestPosition.pnl) ? '• Implement better stop-loss discipline' : ''}

**Action Items:**
1. Review your losing positions for exit opportunities
2. Set profit targets for winning positions  
3. Research market trends for your holdings
4. Consider paper trading new strategies before implementing`

      suggestions = ['Market analysis', 'Position sizing guide', 'Risk management tips']
    }
    else {
      // Handle general questions with ChatGPT-like responses
      if (lowerMessage.includes('explain') || lowerMessage.includes('what is') || lowerMessage.includes('how does')) {
        response = `🤖 **I'd be happy to explain!**

I can help explain various concepts, especially related to trading and finance. However, I specialize in analyzing your paper trading performance.

**For general explanations:** I'll do my best to provide helpful information.

**For your trading:** I have detailed insights about your current portfolio:
• ${analysis.totalPositions} positions
• ${analysis.winRate.toFixed(1)}% win rate  
• ${analysis.returnPercent >= 0 ? '+' : ''}${analysis.returnPercent.toFixed(2)}% return

**What would you like me to explain?**`

        suggestions = ['Explain trading terms', 'My portfolio analysis', 'Market concepts', 'Investment basics']
      }
      else if (lowerMessage.length < 10) {
        response = `🤖 **I'm here to help!**

I can assist with:
• **Paper trading analysis** - Your portfolio insights and recommendations
• **General questions** - Trading concepts, market explanations, calculations
• **Trading advice** - Risk management and strategy guidance

**Quick question or detailed analysis?** Just let me know what you need!`

        suggestions = ['Analyze everything', 'Quick question', 'Trading help', 'General chat']
      }
      else if (
        // Trading concept definition intent
        (lowerMessage.startsWith('what is') || lowerMessage.startsWith('define') || lowerMessage.startsWith('explain'))
      ) {
        // Extract term (simple heuristic)
        const term = userMessage.replace(/^[Ww]hat is\s+|^[Dd]efine\s+|^[Ee]xplain\s+/,'').trim().replace(/[?!.]$/,'').toLowerCase()

        // Curated trading concepts dictionary
        const tradingConcepts: Record<string, { def: string; why: string; suggestions: string[] }> = {
          'paper trading': {
            def: 'Paper trading is simulated trading with virtual money to practice strategies and execution without risking real capital.',
            why: 'Validates your strategy, execution, and risk management before going live.',
            suggestions: ['Analyze everything', 'Show my win rate', 'Risk management tips']
          },
          'sharpe ratio': {
            def: 'Sharpe ratio = (Return − Risk-free rate) ÷ Volatility. Higher is better; ~0.8+ is strong risk-adjusted performance.',
            why: 'Measures how efficiently you earn returns for the risk taken.',
            suggestions: ['Calculate my Sharpe ratio', 'Max drawdown analysis', 'Risk-adjusted performance tips']
          },
          'profit factor': {
            def: 'Profit factor = Gross profit ÷ Gross loss. >1 means profitable; >2 is strong.',
            why: 'Summarizes the balance between total gains and total losses.',
            suggestions: ['P&L analysis', 'Improve win/loss size', 'Stop-loss strategy']
          },
          'max drawdown': {
            def: 'Maximum drawdown is the largest peak-to-trough decline in your equity curve over a period.',
            why: 'Represents worst-case historical loss and risk tolerance needs.',
            suggestions: ['Drawdown analysis', 'Diversification advice', 'Risk limits setup']
          },
          'expectancy': {
            def: 'Expectancy = (Win% × Avg Win) − (Loss% × Avg Loss). Positive expectancy implies a profitable system over many trades.',
            why: 'Shows mathematical edge of your strategy.',
            suggestions: ['Calculate my expectancy', 'Win rate improvement', 'Risk-reward optimization']
          },
          'risk reward': {
            def: 'Risk-reward ratio compares potential profit to potential loss on a trade (Reward ÷ Risk). Aim for >1.',
            why: 'Helps target setups with favorable payoffs.',
            suggestions: ['Position sizing advice', 'Stop-loss vs take-profit', 'Trade quality checklist']
          },
          'fifo': {
            def: 'FIFO (First-In, First-Out) matches sells to the earliest buys first for cost basis and realized P&L.',
            why: 'Affects realized P&L and tax accounting.',
            suggestions: ['Realized vs unrealized P&L', 'Trade history review']
          },
          'realized pnl': {
            def: 'Realized P&L is profit/loss from closed trades. Unrealized P&L is on open positions based on current price.',
            why: 'Separates booked results from floating gains/losses.',
            suggestions: ['P&L analysis', 'Close vs hold decision support']
          },
          'limit order': {
            def: 'A limit order sets a specific price to buy or sell; it fills only at that price or better.',
            why: 'Controls execution price, useful in low-liquidity periods.',
            suggestions: ['Order analysis', 'Execution strategies']
          },
          'market order': {
            def: 'A market order executes immediately at the best available price.',
            why: 'Ensures fills but can suffer slippage in thin markets.',
            suggestions: ['Order analysis', 'Slippage and costs']
          },
          'pre-market': {
            def: 'Pre-market is trading before the regular session (typically 4:00–9:30am ET) with lower liquidity and wider spreads.',
            why: 'Impacts fill quality—prefer limit orders and smaller sizes.',
            suggestions: ['Market hours & status', 'Order timing strategy']
          },
          'after-hours': {
            def: 'After-hours is trading after regular session (typically 4:00–8:00pm ET) with reduced liquidity and wider spreads.',
            why: 'Use limit orders; be mindful of volatility and news.',
            suggestions: ['Market hours & status', 'Execution strategies']
          }
        }

        // Normalize keys to match
        const keys = Object.keys(tradingConcepts)
        const matchedKey = keys.find(k => term.includes(k))

        if (matchedKey) {
          const tc = tradingConcepts[matchedKey]
          response = `📘 **${matchedKey[0].toUpperCase()}${matchedKey.slice(1)}**\n\n${tc.def}\n\n**Why it matters:** ${tc.why}`
          suggestions = tc.suggestions
        } else {
          // Fall back to general knowledge below
          // Continue chain to next handler
          // eslint-disable-next-line no-extra-semi
          ;
        }
      }
      else if (
        // General knowledge Q&A for non-trading topics
        lowerMessage.startsWith('what is') || lowerMessage.startsWith('define') || lowerMessage.startsWith('explain') ||
        lowerMessage.startsWith('who is') || lowerMessage.includes('who founded')
      ) {
        const term = userMessage.replace(/^[Ww]hat is\s+|^[Dd]efine\s+|^[Ee]xplain\s+|^[Ww]ho is\s+|who founded\s+/,'').trim().replace(/[?!.]$/,'').toLowerCase()

        const generalKnowledge: Record<string, { def: string; note?: string; suggestions?: string[] }> = {
          'ai': { def: 'Artificial Intelligence (AI) is the field of building systems that perform tasks requiring human-like intelligence—learning, reasoning, perception, and language understanding.' },
          'artificial intelligence': { def: 'Artificial Intelligence (AI) enables machines to learn from data, reason about problems, and interact via language and perception.' },
          'machine learning': { def: 'Machine learning is a subfield of AI where models learn patterns from data to make predictions or decisions without explicit programming.' },
          'deep learning': { def: 'Deep learning is a subset of machine learning using multi-layer neural networks to learn complex patterns from large datasets.' },
          'tesla': { def: 'Tesla, Inc. is an American electric vehicle and clean energy company.', note: 'Founders: Martin Eberhard and Marc Tarpenning; Elon Musk joined early as lead investor and later became CEO.' },
          'tesla founder': { def: 'Tesla was founded by Martin Eberhard and Marc Tarpenning.', note: 'Elon Musk joined early as investor and later became CEO.' },
          'elon musk': { def: 'Elon Musk is a technology entrepreneur known for roles at Tesla, SpaceX, and other ventures.' }
        }

        // Try exact, then partial match
        let gk = generalKnowledge[term]
        if (!gk) {
          const gkKey = Object.keys(generalKnowledge).find(k => term.includes(k))
          if (gkKey) gk = generalKnowledge[gkKey]
        }

        if (gk) {
          response = `📘 **${userMessage.replace(/[?!.]$/,'')}**\n\n${gk.def}${gk.note ? `\n\nNote: ${gk.note} (facts can change; not real-time).` : ''}`
          suggestions = gk.suggestions || ['Ask a trading question', 'Analyze everything', 'Portfolio insights']
        } else {
          response = `📘 **General Knowledge**\n\nHere is a concise overview: ${term || 'topic'}.\n\nNote: I don’t use real-time web for general facts, and some details can change.`
          suggestions = ['Ask a trading concept', 'Analyze my account', 'Risk management tips']
        }
      }
      else {
        response = `🤖 **Thanks for your question!**

While I can discuss various topics, I'm specifically designed to excel at paper trading analysis. For general questions, I'll do my best to help, but my expertise shines when analyzing your trading performance.

**Your Current Trading Status:**
• Positions: ${analysis.totalPositions}
• Win Rate: ${analysis.winRate.toFixed(1)}%
• Return: ${analysis.returnPercent.toFixed(2)}%

**I can help with:**
• Detailed portfolio analysis and insights
• Trading strategy recommendations
• Risk management guidance
• General trading and finance questions

**What would you like to explore?**`

        suggestions = [
          'Analyze my complete portfolio',
          'Trading strategy advice', 
          'Risk assessment',
          'General question'
        ]
      }
    }

    return { response, suggestions }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { response, suggestions } = await generateAIResponse(inputValue)
      
      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response,
        timestamp: new Date(),
        suggestions
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full w-12 h-12 shadow-lg"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[600px] bg-background border rounded-lg shadow-xl flex flex-col">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-sm">Trading AI Assistant</CardTitle>
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="h-8 w-8 p-0"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              ×
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.type === 'ai' && (
                  <Bot className="w-4 h-4 mt-0.5 text-blue-600" />
                )}
                {message.type === 'user' && (
                  <User className="w-4 h-4 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="text-sm">
                    {message.content.split('\n').map((line, index) => {
                      // Handle bullet points
                      if (line.trim().startsWith('•')) {
                        return (
                          <div key={index} className="flex items-start space-x-2 my-1">
                            <span className="text-blue-600 mt-1">•</span>
                            <span className="flex-1">
                              {line.trim().substring(1).trim().split(/(\*\*.*?\*\*)/).map((part, partIndex) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return (
                                    <strong key={partIndex} className="font-bold">
                                      {part.slice(2, -2)}
                                    </strong>
                                  )
                                }
                                return part
                              })}
                            </span>
                          </div>
                        )
                      }
                      
                      // Handle regular lines with bold formatting
                      return (
                        <div key={index} className={line.trim() === '' ? 'h-2' : ''}>
                          {line.split(/(\*\*.*?\*\*)/).map((part, partIndex) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return (
                                <strong key={partIndex} className="font-bold">
                                  {part.slice(2, -2)}
                                </strong>
                              )
                            }
                            return part
                          })}
                        </div>
                      )
                    })}
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
              
              {message.suggestions && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs opacity-70">Suggested questions:</div>
                  {message.suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 mr-1 mb-1"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-blue-600" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your trading performance..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
