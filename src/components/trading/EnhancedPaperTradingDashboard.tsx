'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  PaperTradingAccount, 
  PaperPosition, 
  PaperOrder, 
  Stock,
  PaperTradingStats 
} from '@/types'

interface MarketStatus {
  isOpen: boolean
  status: 'pre-market' | 'open' | 'after-hours' | 'closed'
  nextOpen: string
  nextClose: string
}

interface EnhancedPaperTradingDashboardProps {
  userId: string
}

export default function EnhancedPaperTradingDashboard({ userId }: EnhancedPaperTradingDashboardProps) {
  const [accounts, setAccounts] = useState<PaperTradingAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<PaperTradingAccount | null>(null)
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [realTimeData, setRealTimeData] = useState<Map<string, Stock>>(new Map())
  const [orderForm, setOrderForm] = useState({
    symbol: '',
    type: 'market' as 'market' | 'limit' | 'stop' | 'stop-limit',
    side: 'buy' as 'buy' | 'sell',
    quantity: '',
    price: '',
    stopPrice: '',
    notes: ''
  })

  // NEW: Risk management state
  const [riskManagement, setRiskManagement] = useState({
    symbol: '',
    stopLoss: '',
    takeProfit: '',
    trailingStop: ''
  })

  // NEW: Enhanced statistics state
  const [enhancedStats, setEnhancedStats] = useState<any>(null)
  const [riskMetrics, setRiskMetrics] = useState<any>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // Fetch accounts on component mount
  useEffect(() => {
    fetchAccounts()
    fetchMarketStatus()
    startRealTimeUpdates()
    
    return () => {
      stopRealTimeUpdates()
    }
  }, [userId])

  // Fetch accounts for the user
  const fetchAccounts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/paper-trading/enhanced?action=get-accounts&userId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setAccounts(data.data)
        if (data.data.length > 0) {
          setSelectedAccount(data.data[0])
        }
      } else {
        setError(data.error || 'Failed to fetch accounts')
      }
    } catch (error) {
      setError('Failed to fetch accounts')
      console.error('Error fetching accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch current market status
  const fetchMarketStatus = async () => {
    try {
      const response = await fetch('/api/paper-trading/enhanced?action=market-status')
      const data = await response.json()
      
      if (data.success) {
        setMarketStatus(data.data)
      }
    } catch (error) {
      console.error('Error fetching market status:', error)
    }
  }

  // NEW: Add risk management to a position
  const addRiskManagement = async () => {
    if (!selectedAccount || !riskManagement.symbol) {
      setError('Please select an account and enter a symbol')
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/paper-trading/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-risk-management',
          accountId: selectedAccount.id,
          symbol: riskManagement.symbol,
          stopLoss: riskManagement.stopLoss ? parseFloat(riskManagement.stopLoss) : undefined,
          takeProfit: riskManagement.takeProfit ? parseFloat(riskManagement.takeProfit) : undefined,
          trailingStop: riskManagement.trailingStop ? parseFloat(riskManagement.trailingStop) : undefined,
          userId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setError(null)
        // Reset form
        setRiskManagement({
          symbol: '',
          stopLoss: '',
          takeProfit: '',
          trailingStop: ''
        })
        // Refresh accounts to show updated data
        fetchAccounts()
      } else {
        setError(data.error || 'Failed to add risk management')
      }
    } catch (error) {
      setError('Failed to add risk management')
      console.error('Error adding risk management:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // NEW: Fetch enhanced trading statistics
  const fetchEnhancedStats = async () => {
    if (!selectedAccount) return

    try {
      setIsLoadingStats(true)
      const response = await fetch('/api/paper-trading/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-enhanced-stats',
          accountId: selectedAccount.id,
          userId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setEnhancedStats(data.data)
      } else {
        console.error('Failed to fetch enhanced stats:', data.error)
      }
    } catch (error) {
      console.error('Error fetching enhanced stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  // NEW: Fetch risk metrics
  const fetchRiskMetrics = async () => {
    if (!selectedAccount) return

    try {
      const response = await fetch('/api/paper-trading/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-risk-metrics',
          accountId: selectedAccount.id,
          userId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setRiskMetrics(data.data)
      } else {
        console.error('Failed to fetch risk metrics:', data.error)
      }
    } catch (error) {
      console.error('Error fetching risk metrics:', error)
    }
  }

  // NEW: Start order monitoring
  const startOrderMonitoring = async () => {
    try {
      const response = await fetch('/api/paper-trading/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'monitor-orders',
          userId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        console.log('Order monitoring started')
      } else {
        console.error('Failed to start order monitoring:', data.error)
      }
    } catch (error) {
      console.error('Error starting order monitoring:', error)
    }
  }

  // Start real-time updates
  const startRealTimeUpdates = async () => {
    try {
      await fetch('/api/paper-trading/enhanced?action=start-updates')
    } catch (error) {
      console.error('Error starting real-time updates:', error)
    }
  }

  // Stop real-time updates
  const stopRealTimeUpdates = async () => {
    try {
      await fetch('/api/paper-trading/enhanced?action=stop-updates')
    } catch (error) {
      console.error('Error stopping real-time updates:', error)
    }
  }

  // Create new account
  const createAccount = async () => {
    try {
      setIsLoading(true)
      const accountName = `Paper Trading Account ${accounts.length + 1}`
      const initialBalance = 100000

      const response = await fetch('/api/paper-trading/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-account',
          userId,
          name: accountName,
          initialBalance
        })
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchAccounts()
        setError(null)
      } else {
        setError(data.error || 'Failed to create account')
      }
    } catch (error) {
      setError('Failed to create account')
      console.error('Error creating account:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Place order
  const placeOrder = async () => {
    if (!selectedAccount || !orderForm.symbol || !orderForm.quantity) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/paper-trading/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'place-order',
          accountId: selectedAccount.id,
          symbol: orderForm.symbol.toUpperCase(),
          type: orderForm.type,
          side: orderForm.side,
          quantity: parseInt(orderForm.quantity),
          price: orderForm.price ? parseFloat(orderForm.price) : undefined,
          stopPrice: orderForm.stopPrice ? parseFloat(orderForm.stopPrice) : undefined,
          notes: orderForm.notes
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Reset form
        setOrderForm({
          symbol: '',
          type: 'market',
          side: 'buy',
          quantity: '',
          price: '',
          stopPrice: '',
          notes: ''
        })
        
        // Refresh accounts to show updated data
        await fetchAccounts()
        setError(null)
      } else {
        setError(data.error || 'Failed to place order')
      }
    } catch (error) {
      setError('Failed to place order')
      console.error('Error placing order:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Cancel order
  const cancelOrder = async (orderId: string) => {
    try {
      const response = await fetch('/api/paper-trading/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel-order',
          orderId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchAccounts()
      } else {
        setError(data.error || 'Failed to cancel order')
      }
    } catch (error) {
      setError('Failed to cancel order')
      console.error('Error cancelling order:', error)
    }
  }

  // Delete account
  const deleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/paper-trading/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-account',
          accountId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchAccounts()
      } else {
        setError(data.error || 'Failed to delete account')
      }
    } catch (error) {
      setError('Failed to delete account')
      console.error('Error deleting account:', error)
    }
  }

  // Get market status badge color
  const getMarketStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500'
      case 'pre-market': return 'bg-yellow-500'
      case 'after-hours': return 'bg-orange-500'
      case 'closed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  if (isLoading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading paper trading accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Market Status Header */}
      {marketStatus && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge className={`${getMarketStatusColor(marketStatus.status)} text-white`}>
                  {marketStatus.status.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-600">
                  Market is {marketStatus.isOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>Next Open: {marketStatus.nextOpen}</div>
                <div>Next Close: {marketStatus.nextClose}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <span>⚠️</span>
              <span>{error}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setError(null)}
                className="ml-auto text-red-700 hover:text-red-800"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Paper Trading Accounts</span>
            <Button onClick={createAccount} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create New Account'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No paper trading accounts found.</p>
              <p className="text-sm">Create your first account to start trading!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <Card 
                  key={account.id} 
                  className={`cursor-pointer transition-all ${
                    selectedAccount?.id === account.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedAccount(account)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{account.name}</h3>
                        <p className="text-sm text-gray-600">
                          Created: {new Date(account.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">
                          {formatCurrency(account.totalValue)}
                        </div>
                        <div className={`text-sm ${
                          account.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(account.totalPnL)} ({formatPercentage(account.totalPnLPercent)})
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteAccount(account.id)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Account Details */}
      {selectedAccount && (
        <>
          {/* Account Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Account Summary - {selectedAccount.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(selectedAccount.availableCash)}
                  </div>
                  <div className="text-sm text-gray-600">Available Cash</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedAccount.totalValue)}
                  </div>
                  <div className="text-sm text-gray-600">Total Value</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`text-2xl font-bold ${
                    selectedAccount.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(selectedAccount.totalPnL)}
                  </div>
                  <div className="text-sm text-gray-600">Total P&L</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`text-2xl font-bold ${
                    selectedAccount.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(selectedAccount.totalPnLPercent)}
                  </div>
                  <div className="text-sm text-gray-600">P&L %</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trading Form */}
          <Card>
            <CardHeader>
              <CardTitle>Place Trade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Symbol *
                  </label>
                  <Input
                    placeholder="e.g., AAPL"
                    value={orderForm.symbol}
                    onChange={(e) => setOrderForm({ ...orderForm, symbol: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Type
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={orderForm.type}
                    onChange={(e) => setOrderForm({ ...orderForm, type: e.target.value as any })}
                  >
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                    <option value="stop">Stop</option>
                    <option value="stop-limit">Stop Limit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Side
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={orderForm.side}
                    onChange={(e) => setOrderForm({ ...orderForm, side: e.target.value as any })}
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                  />
                </div>

                {(orderForm.type === 'limit' || orderForm.type === 'stop-limit') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="150.00"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                    />
                  </div>
                )}

                {(orderForm.type === 'stop' || orderForm.type === 'stop-limit') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stop Price
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="145.00"
                      value={orderForm.stopPrice}
                      onChange={(e) => setOrderForm({ ...orderForm, stopPrice: e.target.value })}
                    />
                  </div>
                )}

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <Input
                    placeholder="Optional trade notes..."
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-4">
                <Button 
                  onClick={placeOrder} 
                  disabled={isLoading || !orderForm.symbol || !orderForm.quantity}
                  className="w-full"
                >
                  {isLoading ? 'Placing Order...' : `Place ${orderForm.side.toUpperCase()} Order`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Positions */}
          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAccount.positions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No open positions.</p>
                  <p className="text-sm">Place a trade to see your positions here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Symbol</th>
                        <th className="text-right p-2">Quantity</th>
                        <th className="text-right p-2">Avg Price</th>
                        <th className="text-right p-2">Current Price</th>
                        <th className="text-right p-2">Market Value</th>
                        <th className="text-right p-2">P&L</th>
                        <th className="text-right p-2">P&L %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAccount.positions.map((position) => (
                        <tr key={position.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{position.symbol}</td>
                          <td className="p-2 text-right">{position.quantity.toLocaleString()}</td>
                          <td className="p-2 text-right">{formatCurrency(position.averagePrice)}</td>
                          <td className="p-2 text-right">{formatCurrency(position.currentPrice)}</td>
                          <td className="p-2 text-right">{formatCurrency(position.marketValue)}</td>
                          <td className={`p-2 text-right font-medium ${
                            position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(position.unrealizedPnL)}
                          </td>
                          <td className={`p-2 text-right font-medium ${
                            position.unrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatPercentage(position.unrealizedPnLPercent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAccount.orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No orders found.</p>
                  <p className="text-sm">Place a trade to see your order history here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Symbol</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Side</th>
                        <th className="text-right p-2">Quantity</th>
                        <th className="text-right p-2">Price</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-right p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAccount.orders.map((order) => (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-sm">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-2 font-medium">{order.symbol}</td>
                          <td className="p-2">
                            <Badge variant="outline">{order.type}</Badge>
                          </td>
                          <td className="p-2">
                            <Badge className={order.side === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {order.side.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-2 text-right">{order.quantity.toLocaleString()}</td>
                          <td className="p-2 text-right">
                            {order.price ? formatCurrency(order.price) : 'Market'}
                          </td>
                          <td className="p-2">
                            <Badge className={
                              order.status === 'filled' ? 'bg-green-100 text-green-800' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {order.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-right">
                            {order.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelOrder(order.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* NEW: Risk Management */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
              <CardDescription>Set stop-loss, take-profit, and trailing stops for your positions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Symbol *
                  </label>
                  <Input
                    placeholder="AAPL"
                    value={riskManagement.symbol}
                    onChange={(e) => setRiskManagement({ ...riskManagement, symbol: e.target.value.toUpperCase() })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stop Loss ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="140.00"
                    value={riskManagement.stopLoss}
                    onChange={(e) => setRiskManagement({ ...riskManagement, stopLoss: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Take Profit ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="160.00"
                    value={riskManagement.takeProfit}
                    onChange={(e) => setRiskManagement({ ...riskManagement, takeProfit: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trailing Stop (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="5.0"
                    value={riskManagement.trailingStop}
                    onChange={(e) => setRiskManagement({ ...riskManagement, trailingStop: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-4">
                <Button 
                  onClick={addRiskManagement} 
                  disabled={isLoading || !riskManagement.symbol}
                  className="w-full"
                >
                  {isLoading ? 'Adding...' : 'Add Risk Management'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* NEW: Enhanced Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Trading Statistics</CardTitle>
              <CardDescription>Advanced performance metrics and risk analysis</CardDescription>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchEnhancedStats}
                  disabled={isLoadingStats}
                >
                  {isLoadingStats ? 'Loading...' : 'Refresh Stats'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchRiskMetrics}
                >
                  Risk Metrics
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={startOrderMonitoring}
                >
                  Start Monitoring
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {enhancedStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{enhancedStats.totalTrades}</div>
                    <div className="text-sm text-blue-600">Total Trades</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{enhancedStats.winRate}%</div>
                    <div className="text-sm text-green-600">Win Rate</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{enhancedStats.profitFactor}</div>
                    <div className="text-sm text-purple-600">Profit Factor</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{enhancedStats.sharpeRatio}</div>
                    <div className="text-sm text-orange-600">Sharpe Ratio</div>
                  </div>
                </div>
              )}

              {riskMetrics && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-xl font-bold text-red-600">{riskMetrics.volatility.toFixed(2)}%</div>
                    <div className="text-sm text-red-600">Volatility</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-xl font-bold text-yellow-600">{riskMetrics.beta.toFixed(2)}</div>
                    <div className="text-sm text-yellow-600">Beta</div>
                  </div>
                  <div className="text-center p-3 bg-indigo-50 rounded-lg">
                    <div className="text-xl font-bold text-indigo-600">{riskMetrics.maxDrawdown.toFixed(2)}%</div>
                    <div className="text-sm text-indigo-600">Max Drawdown</div>
                  </div>
                  <div className="text-center p-3 bg-pink-50 rounded-lg">
                    <div className="text-xl font-bold text-pink-600">{riskMetrics.var95.toFixed(2)}</div>
                    <div className="text-sm text-pink-600">VaR (95%)</div>
                  </div>
                  <div className="text-center p-3 bg-teal-50 rounded-lg">
                    <div className="text-xl font-bold text-teal-600">{riskMetrics.correlation.toFixed(2)}</div>
                    <div className="text-sm text-teal-600">Correlation</div>
                  </div>
                </div>
              )}

              {!enhancedStats && !riskMetrics && (
                <div className="text-center py-8 text-gray-500">
                  <p>Click "Refresh Stats" to load enhanced trading statistics.</p>
                  <p className="text-sm">This includes win rate, profit factor, Sharpe ratio, and risk metrics.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
