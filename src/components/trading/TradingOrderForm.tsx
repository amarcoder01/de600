'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Calculator
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Stock } from '@/types'

interface TradingOrderFormProps {
  symbol?: string
  accountId?: string
  onOrderPlaced?: () => void
  onCancel?: () => void
}

export function TradingOrderForm({ symbol = '', accountId, onOrderPlaced, onCancel }: TradingOrderFormProps) {
  // State
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop' | 'stop-limit'>('market')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [quantity, setQuantity] = useState<string>('')
  const [price, setPrice] = useState<number>(0)
  const [stopPrice, setStopPrice] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [stockData, setStockData] = useState<Stock | null>(null)

  // Fetch stock data when symbol changes
  useEffect(() => {
    if (symbol) {
      fetchStockData(symbol)
    }
  }, [symbol])

  // Update price when stock data changes
  useEffect(() => {
    if (stockData) {
      setPrice(stockData.price)
      setStopPrice(stockData.price)
    }
  }, [stockData])

  const fetchStockData = async (symbol: string) => {
    try {
      console.log(`🔍 Fetching stock data for ${symbol} in TradingOrderForm...`)
      const response = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`)
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch stock data for ${symbol}:`, response.status)
        
        // Provide specific error messages based on status code
        if (response.status === 404) {
          setError(`Invalid stock symbol "${symbol}". Please check the symbol and try again.`)
        } else if (response.status === 400) {
          setError(`Invalid stock symbol format. Please enter a valid symbol.`)
        } else if (response.status >= 500) {
          setError('Stock data service is temporarily unavailable. Please try again later.')
        } else {
          setError(`Unable to fetch data for "${symbol}". Please verify the symbol is correct.`)
        }
        setStockData(null)
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        console.log(`✅ Stock data fetched for ${symbol}: $${data.data.price}`)
        setStockData(data.data)
        setError(null)
      } else {
        console.error(`❌ No stock data for ${symbol}:`, data.error)
        
        // Provide specific error message based on the API response
        if (data.error && data.error.toLowerCase().includes('not found')) {
          setError(`Stock symbol "${symbol}" not found. Please check the symbol and try again.`)
        } else if (data.error && data.error.toLowerCase().includes('invalid')) {
          setError(`Invalid stock symbol "${symbol}". Please enter a valid symbol.`)
        } else {
          setError(`Unable to retrieve data for "${symbol}". Please verify the symbol is correct.`)
        }
        setStockData(null)
      }
    } catch (error) {
      console.error(`❌ Error fetching stock data for ${symbol}:`, error)
      
      // Provide user-friendly error message for network issues
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('Network connection error. Please check your internet connection and try again.')
      } else {
        setError(`Unable to fetch data for "${symbol}". Please try again or check your connection.`)
      }
      setStockData(null)
    }
  }

  const calculateTotal = () => {
    const orderPrice = orderType === 'market' ? (stockData?.price || 0) : price
    const qty = parseFloat(quantity) || 0
    return qty * orderPrice
  }

  const calculateCommission = () => {
    const total = calculateTotal()
    return total < 1000 ? 0.99 : 9.99
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!accountId) {
      setError('No account selected')
      return
    }

    const qty = parseFloat(quantity) || 0
    if (qty <= 0) {
      setError('Quantity must be greater than 0')
      return
    }

    if (orderType === 'limit' && price <= 0) {
      setError('Limit price must be greater than 0')
      return
    }

    if (orderType === 'stop' && stopPrice <= 0) {
      setError('Stop price must be greater than 0')
      return
    }

    if (orderType === 'stop-limit' && (price <= 0 || stopPrice <= 0)) {
      setError('Both price and stop price must be greater than 0')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/paper-trading/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          symbol,
          type: orderType,
          side,
          quantity: qty,
          price: orderType === 'market' ? undefined : price,
          stopPrice: orderType === 'stop' || orderType === 'stop-limit' ? stopPrice : undefined,
          notes,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          onOrderPlaced?.()
        }, 2000)
      } else {
        setError(data.error || 'Failed to place order')
      }
    } catch (error) {
      setError('Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Order Placed Successfully!</h3>
            <p className="text-muted-foreground">
              Your {side} order for {parseFloat(quantity) || 0} shares of {symbol} has been placed.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Place Order</span>
          <Badge variant={side === 'buy' ? 'default' : 'destructive'}>
            {side.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Symbol Display */}
          {stockData && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{stockData.symbol}</h4>
                  <p className="text-sm text-muted-foreground">{stockData.name}</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(stockData.price)}</div>
                  <div className={`text-sm ${stockData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stockData.change >= 0 ? '+' : ''}{formatCurrency(stockData.change)} ({stockData.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Order Type */}
          <div>
            <label className="text-sm font-medium">Order Type</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { value: 'market', label: 'Market' },
                { value: 'limit', label: 'Limit' },
                { value: 'stop', label: 'Stop' },
                { value: 'stop-limit', label: 'Stop Limit' },
              ].map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant={orderType === type.value ? 'default' : 'outline'}
                  onClick={() => setOrderType(type.value as any)}
                  className="text-xs"
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Side Selection */}
          <div>
            <label className="text-sm font-medium">Side</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSide('buy')}
                className={
                  side === 'buy'
                    ? 'bg-green-600 text-white hover:bg-green-700 border-green-600'
                    : 'text-green-600 hover:text-green-700 border-green-600/40 hover:bg-accent/50'
                }
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Buy
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSide('sell')}
                className={
                  side === 'sell'
                    ? 'bg-red-600 text-white hover:bg-red-700 border-red-600'
                    : 'text-red-600 hover:text-red-700 border-red-600/40 hover:bg-accent/50'
                }
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Sell
              </Button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => {
                const value = e.target.value
                // Remove leading zeros but keep empty string and valid numbers
                if (value === '' || value === '0') {
                  setQuantity(value)
                } else {
                  // Remove leading zeros from non-zero numbers
                  const cleanValue = value.replace(/^0+/, '') || '0'
                  setQuantity(cleanValue)
                }
              }}
              className="w-full mt-1 p-2 border rounded-md bg-white text-gray-900 placeholder-gray-500 dark:bg-white dark:text-gray-900 dark:placeholder-gray-600"
              placeholder="Enter quantity"
              min="1"
              step="1"
            />
          </div>

          {/* Price (for limit orders) */}
          {(orderType === 'limit' || orderType === 'stop-limit') && (
            <div>
              <label className="text-sm font-medium">Price</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full mt-1 p-2 border rounded-md bg-white text-gray-900 placeholder-gray-500 dark:bg-white dark:text-gray-900 dark:placeholder-gray-600"
                placeholder="Enter price"
                min="0.01"
                step="0.01"
              />
            </div>
          )}

          {/* Stop Price (for stop orders) */}
          {(orderType === 'stop' || orderType === 'stop-limit') && (
            <div>
              <label className="text-sm font-medium">Stop Price</label>
              <input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(Number(e.target.value))}
                className="w-full mt-1 p-2 border rounded-md bg-white text-gray-900 placeholder-gray-500 dark:bg-white dark:text-gray-900 dark:placeholder-gray-600"
                placeholder="Enter stop price"
                min="0.01"
                step="0.01"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md bg-white text-gray-900 placeholder-gray-500 dark:bg-white dark:text-gray-900 dark:placeholder-gray-600"
              placeholder="Add notes about this order"
              rows={2}
            />
          </div>

          {/* Order Summary */}
          {parseFloat(quantity) > 0 && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold">Order Summary</h4>
              <div className="flex justify-between text-sm">
                <span>Quantity:</span>
                <span>{parseFloat(quantity) || 0} shares</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Price:</span>
                <span>{formatCurrency(orderType === 'market' ? (stockData?.price || 0) : price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Commission:</span>
                <span>{formatCurrency(calculateCommission())}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Net Total:</span>
                <span>{formatCurrency(calculateTotal() + calculateCommission())}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || parseFloat(quantity) <= 0}
              className="flex-1"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                `Place ${side.toUpperCase()} Order`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
