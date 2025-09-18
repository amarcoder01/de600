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
  Search,
  Download,
  Upload,
  Settings,
  History,
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react'
import { Stock } from '@/types'
import PortfolioAnalytics from './PortfolioAnalytics'

interface Trade {
  id: string
  symbol: string
  type: 'buy' | 'sell'
  quantity: number
  price: number
  amount: number
  date: string
  notes?: string
}

interface Position {
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

export default function EnhancedPortfolioManager() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [searchSymbol, setSearchSymbol] = useState('')
  const [stockData, setStockData] = useState<Stock | null>(null)
  const [activeTab, setActiveTab] = useState('portfolio')
  const [isSearching, setIsSearching] = useState(false)
  const [isUpdatingPositions, setIsUpdatingPositions] = useState(false)
  
  // Trade form state
  const [tradeForm, setTradeForm] = useState({
    symbol: '',
    type: 'buy' as 'buy' | 'sell',
    quantity: 0,
    price: 0,
    notes: ''
  })

  // Load trades from localStorage on component mount
  useEffect(() => {
    const savedTrades = localStorage.getItem('portfolio-trades')
    if (savedTrades) {
      setTrades(JSON.parse(savedTrades))
    }
  }, [])

  // Save trades to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('portfolio-trades', JSON.stringify(trades))
  }, [trades])

    // Calculate positions from trades
  useEffect(() => {
    const calculatePositions = async () => {
      if (trades.length === 0) {
        setPositions([])
        return
      }

      setIsUpdatingPositions(true)
      const positionMap = new Map<string, Position>()
      
      // Group trades by symbol
      trades.forEach(trade => {
        if (!positionMap.has(trade.symbol)) {
          positionMap.set(trade.symbol, {
            id: trade.symbol,
            symbol: trade.symbol,
            name: trade.symbol, // Will be updated with real data
            quantity: 0,
            averagePrice: 0,
            currentPrice: 0,
            marketValue: 0,
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0,
            entryDate: new Date().toISOString(),
            notes: ''
          })
        }
        
        const position = positionMap.get(trade.symbol)!
        
        if (trade.type === 'buy') {
          const newTotalCost = (position.quantity * position.averagePrice) + trade.amount
          const newTotalQuantity = position.quantity + trade.quantity
          position.quantity = newTotalQuantity
          position.averagePrice = newTotalCost / newTotalQuantity
        } else if (trade.type === 'sell') {
          position.quantity -= trade.quantity
          if (position.quantity <= 0) {
            positionMap.delete(trade.symbol)
          } else {
            // Recalculate average price after partial sell
            const remainingCost = (position.quantity * position.averagePrice) * (position.quantity / (position.quantity + trade.quantity))
            position.averagePrice = remainingCost / position.quantity
          }
        }
      })
      
      // Update current prices and calculate P&L
      const updatedPositions = await Promise.all(
        Array.from(positionMap.values()).map(async (position) => {
          try {
            const response = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(position.symbol)}`)
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.data) {
                return {
                  ...position,
                  name: data.data.name,
                  currentPrice: data.data.price,
                  marketValue: position.quantity * data.data.price,
                  unrealizedPnL: (data.data.price - position.averagePrice) * position.quantity,
                  unrealizedPnLPercent: ((data.data.price - position.averagePrice) / position.averagePrice) * 100,
                  entryDate: new Date().toISOString()
                }
              }
            }
          } catch (error) {
            console.error(`Error updating price for ${position.symbol}:`, error)
          }
          return position
        })
      )
      
      setPositions(updatedPositions)
      setIsUpdatingPositions(false)
    }
    
    calculatePositions()
  }, [trades])

  // Search for stock data
  const searchStock = async () => {
    if (!searchSymbol.trim()) return
    
    setIsSearching(true)
    setStockData(null) // Clear previous data while searching
    
    try {
      console.log(`🔍 Fetching stock data for ${searchSymbol} in Portfolio Manager...`)
      const response = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(searchSymbol.toUpperCase())}`)
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch stock data for ${searchSymbol}:`, response.status)
        alert(`Failed to fetch stock data for ${searchSymbol}. Please check the symbol and try again.`)
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        console.log(`✅ Stock data fetched for ${searchSymbol}: $${data.data.price}`)
        setStockData(data.data)
        setTradeForm(prev => ({ ...prev, symbol: data.data.symbol, price: data.data.price }))
      } else {
        console.error(`❌ No stock data for ${searchSymbol}:`, data.error)
        alert(`Stock data not available for ${searchSymbol}. Please check the symbol and try again.`)
      }
    } catch (error) {
      console.error(`❌ Error fetching stock data for ${searchSymbol}:`, error)
      alert('Error fetching stock data. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  // Add new trade
  const addTrade = () => {
    if (!tradeForm.symbol || tradeForm.quantity <= 0 || tradeForm.price <= 0) {
      alert('Please fill in all required fields with valid values.')
      return
    }

    // Check if selling more than owned
    if (tradeForm.type === 'sell') {
      const currentPosition = positions.find(p => p.symbol === tradeForm.symbol.toUpperCase())
      if (!currentPosition || currentPosition.quantity < tradeForm.quantity) {
        alert(`You only own ${currentPosition?.quantity || 0} shares of ${tradeForm.symbol.toUpperCase()}. Cannot sell ${tradeForm.quantity}.`)
        return
      }
    }

    const trade: Trade = {
      id: Date.now().toString(),
      symbol: tradeForm.symbol.toUpperCase(),
      type: tradeForm.type,
      quantity: tradeForm.quantity,
      price: tradeForm.price,
      amount: tradeForm.quantity * tradeForm.price,
      date: new Date().toISOString().split('T')[0],
      notes: tradeForm.notes
    }

    setTrades([...trades, trade])
    
    // Reset form
    setTradeForm({
      symbol: '',
      type: 'buy',
      quantity: 0,
      price: 0,
      notes: ''
    })
    setStockData(null)
    setSearchSymbol('')
    
    // Show success message
    alert(`${tradeForm.type === 'buy' ? 'Buy' : 'Sell'} trade recorded successfully!`)
  }

  // Delete trade
  const deleteTrade = (tradeId: string) => {
    if (window.confirm('Are you sure you want to delete this trade? This action cannot be undone.')) {
      setTrades(trades.filter(trade => trade.id !== tradeId))
    }
  }

  // Calculate portfolio statistics
  const portfolioStats = {
    totalValue: positions.reduce((sum, pos) => sum + pos.marketValue, 0),
    totalCost: positions.reduce((sum, pos) => sum + (pos.quantity * pos.averagePrice), 0),
    totalPnL: positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0),
    totalPnLPercent: positions.length > 0 ? 
      (positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0) / 
       positions.reduce((sum, pos) => sum + (pos.quantity * pos.averagePrice), 0)) * 100 : 0
  }

  // Export portfolio data
  const exportPortfolio = () => {
    const data = {
      trades,
      positions,
      exportDate: new Date().toISOString(),
      portfolioStats
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Import portfolio data
  const importPortfolio = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (data.trades) setTrades(data.trades)
      } catch (error) {
        console.error('Error importing portfolio:', error)
        alert('Error importing portfolio data. Please check the file format.')
      }
    }
    reader.readAsText(file)
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
            Track your real stock investments with detailed trade history
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="trades" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Trades
          </TabsTrigger>
                           <TabsTrigger value="buy" className="flex items-center gap-2">
                   <ArrowUp className="h-4 w-4" />
                   Buy
                 </TabsTrigger>
                 <TabsTrigger value="sell" className="flex items-center gap-2">
                   <ArrowDown className="h-4 w-4" />
                   Sell
                 </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Portfolio Tab - Shows aggregated positions */}
        <TabsContent value="portfolio" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Current Positions</h3>
            <Button onClick={() => setActiveTab('buy')} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Trade
            </Button>
          </div>
          
                     {isUpdatingPositions ? (
             <Card>
               <CardContent className="text-center py-8">
                 <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                 <p className="text-gray-600">Updating portfolio positions...</p>
               </CardContent>
             </Card>
           ) : positions.length === 0 ? (
             <Card>
               <CardContent className="text-center py-8">
                 <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                 <p className="text-gray-500">No positions yet. Add your first trade to get started.</p>
               </CardContent>
             </Card>
           ) : (
            <div className="grid gap-4">
              {positions.map((position) => (
                <Card key={position.symbol}>
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
                        Last updated: {new Date(position.entryDate).toLocaleDateString()}
                      </div>
                      <Button 
                        onClick={() => {
                          setTradeForm({
                            symbol: position.symbol,
                            type: 'sell',
                            quantity: 0,
                            price: position.currentPrice,
                            notes: ''
                          })
                          setActiveTab('sell')
                        }}
                        variant="outline" 
                        size="sm"
                      >
                        <ArrowDown className="h-4 w-4 mr-2" />
                        Sell
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Trades Tab - Shows all individual trades */}
        <TabsContent value="trades" className="space-y-4">
          <h3 className="text-lg font-semibold">Trade History</h3>
          
          {trades.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No trades yet. Your buy and sell transactions will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {trades
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((trade) => (
                <Card key={trade.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <Badge variant={trade.type === 'buy' ? 'default' : 'secondary'}>
                          {trade.type.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-semibold">{trade.symbol}</div>
                          <div className="text-sm text-gray-600">
                            {trade.quantity.toLocaleString()} shares @ ${trade.price.toFixed(2)}
                          </div>
                          {trade.notes && (
                            <div className="text-xs text-gray-500 mt-1">{trade.notes}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${trade.amount.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(trade.date).toLocaleDateString()}
                        </div>
                        <Button 
                          onClick={() => deleteTrade(trade.id)}
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 mt-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Buy Tab */}
        <TabsContent value="buy" className="space-y-4">
          <Card>
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <ArrowUp className="h-5 w-5 text-green-600" />
                  Record Buy Trade
                </CardTitle>
              <CardDescription>
                Record buying shares at a specific price
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
                     disabled={isSearching}
                   />
                   <Button 
                     onClick={searchStock} 
                     disabled={!searchSymbol.trim() || isSearching}
                     className="min-w-[100px]"
                   >
                     {isSearching ? (
                       <>
                         <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                         Searching...
                       </>
                     ) : (
                       <>
                         <Search className="h-4 w-4 mr-2" />
                         Search
                       </>
                     )}
                   </Button>
                 </div>
                 {isSearching && (
                   <div className="flex items-center gap-2 text-sm text-blue-600">
                     <Loader2 className="h-4 w-4 animate-spin" />
                     Searching for {searchSymbol}...
                   </div>
                 )}
               </div>

              {/* Stock Data Display */}
              {stockData && (
                <Card className="bg-green-50">
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

              {/* Buy Form */}
              {stockData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="Number of shares"
                        value={tradeForm.quantity}
                        onChange={(e) => setTradeForm({...tradeForm, quantity: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Buy Price</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        placeholder="Price per share"
                        value={tradeForm.price}
                        onChange={(e) => setTradeForm({...tradeForm, price: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Add notes about this trade"
                      value={tradeForm.notes}
                      onChange={(e) => setTradeForm({...tradeForm, notes: e.target.value})}
                    />
                  </div>
                  <Button 
                    onClick={addTrade} 
                    className="w-full"
                    disabled={tradeForm.quantity <= 0 || tradeForm.price <= 0}
                  >
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Record Buy Trade
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sell Tab */}
        <TabsContent value="sell" className="space-y-4">
          <Card>
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <ArrowDown className="h-5 w-5 text-red-600" />
                  Record Sell Trade
                </CardTitle>
              <CardDescription>
                Record selling shares at a specific price
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                             {/* Stock Search */}
               <div className="space-y-2">
                 <Label htmlFor="sell-symbol">Stock Symbol</Label>
                 <div className="flex gap-2">
                   <Input
                     id="sell-symbol"
                     placeholder="Enter stock symbol (e.g., AAPL)"
                     value={searchSymbol}
                     onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                     onKeyPress={(e) => e.key === 'Enter' && searchStock()}
                     disabled={isSearching}
                   />
                   <Button 
                     onClick={searchStock} 
                     disabled={!searchSymbol.trim() || isSearching}
                     className="min-w-[100px]"
                   >
                     {isSearching ? (
                       <>
                         <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                         Searching...
                       </>
                       ) : (
                       <>
                         <Search className="h-4 w-4 mr-2" />
                         Search
                       </>
                     )}
                   </Button>
                 </div>
                 {isSearching && (
                   <div className="flex items-center gap-2 text-sm text-blue-600">
                     <Loader2 className="h-4 w-4 animate-spin" />
                     Searching for {searchSymbol}...
                   </div>
                 )}
               </div>

              {/* Stock Data Display */}
              {stockData && (
                <Card className="bg-red-50">
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

              {/* Sell Form */}
              {stockData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sell-quantity">Quantity</Label>
                      <Input
                        id="sell-quantity"
                        type="number"
                        placeholder="Number of shares"
                        value={tradeForm.quantity}
                        onChange={(e) => setTradeForm({...tradeForm, quantity: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sell-price">Sell Price</Label>
                      <Input
                        id="sell-price"
                        type="number"
                        step="0.01"
                        placeholder="Price per share"
                        value={tradeForm.price}
                        onChange={(e) => setTradeForm({...tradeForm, price: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sell-notes">Notes (Optional)</Label>
                    <Input
                      id="sell-notes"
                      placeholder="Add notes about this trade"
                      value={tradeForm.notes}
                      onChange={(e) => setTradeForm({...tradeForm, notes: e.target.value})}
                    />
                  </div>
                  <Button 
                    onClick={addTrade} 
                    className="w-full"
                    disabled={tradeForm.quantity <= 0 || tradeForm.price <= 0}
                  >
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Record Sell Trade
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <PortfolioAnalytics 
            portfolio={null}
            positions={positions}
            trades={trades}
            onRefresh={() => {
              // Refresh data if needed
            }}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Settings</CardTitle>
              <CardDescription>
                Manage your portfolio data and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Export Portfolio</Label>
                  <Button onClick={exportPortfolio} className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  <p className="text-sm text-gray-600">
                    Download your portfolio data as JSON file
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Import Portfolio</Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={importPortfolio}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button className="w-full" variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Data
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Import portfolio data from JSON file
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Data Storage</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Your portfolio data is stored locally in your browser. Clearing browser data will remove your portfolio.
                </p>
                <div className="text-sm text-gray-500">
                  <p>Trades: {trades.length}</p>
                  <p>Positions: {positions.length}</p>
                  <p>Last updated: {new Date().toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
