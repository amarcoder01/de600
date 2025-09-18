'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Search
} from 'lucide-react'
import { Stock } from '@/types'

interface PortfolioPosition {
  id: string
  symbol: string
  name: string
  quantity: number
  averagePrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  entryDate: string
  notes?: string
}

interface PortfolioTransaction {
  id: string
  symbol: string
  type: 'buy' | 'sell'
  quantity: number
  price: number
  amount: number
  date: string
  notes?: string
}

export default function PortfolioManager() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([])
  const [searchSymbol, setSearchSymbol] = useState('')
  const [stockData, setStockData] = useState<Stock | null>(null)
  const [isAddingPosition, setIsAddingPosition] = useState(false)
  const [newPosition, setNewPosition] = useState({
    symbol: '',
    quantity: 0,
    averagePrice: 0,
    notes: ''
  })

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedPositions = localStorage.getItem('portfolio-positions')
    const savedTransactions = localStorage.getItem('portfolio-transactions')
    
    if (savedPositions) {
      setPositions(JSON.parse(savedPositions))
    }
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions))
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('portfolio-positions', JSON.stringify(positions))
  }, [positions])

  useEffect(() => {
    localStorage.setItem('portfolio-transactions', JSON.stringify(transactions))
  }, [transactions])

  // Calculate portfolio statistics
  const portfolioStats = {
    totalValue: positions.reduce((sum, pos) => sum + pos.marketValue, 0),
    totalCost: positions.reduce((sum, pos) => sum + (pos.quantity * pos.averagePrice), 0),
    totalPnL: positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0),
    totalPnLPercent: positions.length > 0 ? 
      (positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0) / 
       positions.reduce((sum, pos) => sum + (pos.quantity * pos.averagePrice), 0)) * 100 : 0
  }

  // Search for stock data
  const searchStock = async () => {
    if (!searchSymbol.trim()) return
    
    try {
      const response = await fetch(`/api/quote?symbol=${searchSymbol.toUpperCase()}`)
      if (response.ok) {
        const data = await response.json()
        setStockData(data)
      }
    } catch (error) {
      console.error('Error fetching stock data:', error)
    }
  }

  // Add new position
  const addPosition = () => {
    if (!stockData || newPosition.quantity <= 0 || newPosition.averagePrice <= 0) return

    const position: PortfolioPosition = {
      id: Date.now().toString(),
      symbol: stockData.symbol,
      name: stockData.name,
      quantity: newPosition.quantity,
      averagePrice: newPosition.averagePrice,
      currentPrice: stockData.price,
      marketValue: newPosition.quantity * stockData.price,
      unrealizedPnL: (stockData.price - newPosition.averagePrice) * newPosition.quantity,
      unrealizedPnLPercent: ((stockData.price - newPosition.averagePrice) / newPosition.averagePrice) * 100,
      entryDate: new Date().toISOString().split('T')[0],
      notes: newPosition.notes
    }

    const transaction: PortfolioTransaction = {
      id: Date.now().toString(),
      symbol: stockData.symbol,
      type: 'buy',
      quantity: newPosition.quantity,
      price: newPosition.averagePrice,
      amount: newPosition.quantity * newPosition.averagePrice,
      date: new Date().toISOString().split('T')[0],
      notes: newPosition.notes
    }

    setPositions([...positions, position])
    setTransactions([...transactions, transaction])
    
    // Reset form
    setNewPosition({ symbol: '', quantity: 0, averagePrice: 0, notes: '' })
    setStockData(null)
    setSearchSymbol('')
    setIsAddingPosition(false)
  }

  // Remove position
  const removePosition = (positionId: string) => {
    const position = positions.find(p => p.id === positionId)
    if (!position) return

    // Add sell transaction
    const transaction: PortfolioTransaction = {
      id: Date.now().toString(),
      symbol: position.symbol,
      type: 'sell',
      quantity: position.quantity,
      price: position.currentPrice,
      amount: position.quantity * position.currentPrice,
      date: new Date().toISOString().split('T')[0],
      notes: 'Position closed'
    }

    setTransactions([...transactions, transaction])
    setPositions(positions.filter(p => p.id !== positionId))
  }

  // Update position prices (simulate real-time updates)
  const updatePrices = async () => {
    const updatedPositions = await Promise.all(
      positions.map(async (position) => {
        try {
          const response = await fetch(`/api/quote?symbol=${position.symbol}`)
          if (response.ok) {
            const data = await response.json()
            return {
              ...position,
              currentPrice: data.price,
              marketValue: position.quantity * data.price,
              unrealizedPnL: (data.price - position.averagePrice) * position.quantity,
              unrealizedPnLPercent: ((data.price - position.averagePrice) / position.averagePrice) * 100
            }
          }
        } catch (error) {
          console.error(`Error updating price for ${position.symbol}:`, error)
        }
        return position
      })
    )
    setPositions(updatedPositions)
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Portfolio Summary
          </CardTitle>
          <CardDescription>
            Track your real stock investments and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-800">
                ${portfolioStats.totalValue.toLocaleString()}
              </div>
              <div className="text-sm text-blue-600">Total Value</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-800">
                ${portfolioStats.totalCost.toLocaleString()}
              </div>
              <div className="text-sm text-green-600">Total Cost</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="positions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="positions" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Positions
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Position
          </TabsTrigger>
        </TabsList>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Current Positions</h3>
            <Button onClick={updatePrices} variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Update Prices
            </Button>
          </div>
          
          {positions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No positions yet. Add your first stock position to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {positions.map((position) => (
                <Card key={position.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">{position.symbol}</h4>
                          <span className="text-sm text-gray-600">{position.name}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Quantity:</span>
                            <div className="font-medium">{position.quantity.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Avg Price:</span>
                            <div className="font-medium">${position.averagePrice.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Current Price:</span>
                            <div className="font-medium">${position.currentPrice.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Market Value:</span>
                            <div className="font-medium">${position.marketValue.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${position.unrealizedPnL.toLocaleString()}
                        </div>
                        <div className={`text-sm ${position.unrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {position.unrealizedPnLPercent >= 0 ? '+' : ''}{position.unrealizedPnLPercent.toFixed(2)}%
                        </div>
                        <Badge variant={position.unrealizedPnL >= 0 ? 'default' : 'destructive'} className="mt-2">
                          {position.unrealizedPnL >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {position.unrealizedPnL >= 0 ? 'Profit' : 'Loss'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        Entry: {new Date(position.entryDate).toLocaleDateString()}
                      </div>
                      <Button 
                        onClick={() => removePosition(position.id)} 
                        variant="destructive" 
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Close Position
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <h3 className="text-lg font-semibold">Transaction History</h3>
          
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No transactions yet. Your buy and sell transactions will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <Badge variant={transaction.type === 'buy' ? 'default' : 'secondary'}>
                          {transaction.type.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-semibold">{transaction.symbol}</div>
                          <div className="text-sm text-gray-600">
                            {transaction.quantity.toLocaleString()} shares @ ${transaction.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${transaction.amount.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Add Position Tab */}
        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Position</CardTitle>
              <CardDescription>
                Search for a stock and add it to your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stock Search */}
              <div className="space-y-2">
                <Label htmlFor="symbol">Stock Symbol</Label>
                <div className="flex gap-2">
                  <Input
                    id="symbol"
                    placeholder="Enter stock symbol (e.g., AAPL)"
                    value={searchSymbol}
                    onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && searchStock()}
                  />
                  <Button onClick={searchStock} disabled={!searchSymbol.trim()}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>

              {/* Stock Data Display */}
              {stockData && (
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-lg">{stockData.symbol}</h4>
                        <p className="text-gray-600">{stockData.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">${stockData.price}</div>
                        <div className={`text-sm ${stockData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Position Details Form */}
              {stockData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="Number of shares"
                        value={newPosition.quantity}
                        onChange={(e) => setNewPosition({...newPosition, quantity: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Average Price</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        placeholder="Price per share"
                        value={newPosition.averagePrice}
                        onChange={(e) => setNewPosition({...newPosition, averagePrice: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Add notes about this position"
                      value={newPosition.notes}
                      onChange={(e) => setNewPosition({...newPosition, notes: e.target.value})}
                    />
                  </div>
                  <Button 
                    onClick={addPosition} 
                    className="w-full"
                    disabled={newPosition.quantity <= 0 || newPosition.averagePrice <= 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Position
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
