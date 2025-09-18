import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Wifi, WifiOff, Info, Database } from 'lucide-react'

interface ConnectionInfo {
  isConnected: boolean
  source: string
  lastUpdate: string
  symbolsCount: number
  status: 'connected' | 'disconnected' | 'error' | 'loading'
}

interface PolygonConnectionStatusProps {
  className?: string
  showDetails?: boolean
}

export function PolygonConnectionStatus({ className = '', showDetails = false }: PolygonConnectionStatusProps) {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const updateConnectionInfo = async () => {
      try {
        // Test multi-source connection by fetching AAPL data
        const response = await fetch('/api/stocks/quote?symbol=AAPL')
        const data = await response.json()
        
        if (data.stock && data.stock.price > 0) {
          setConnectionInfo({
            isConnected: true,
            source: 'yfinance',
            lastUpdate: new Date().toLocaleTimeString(),
            symbolsCount: 0, // Will be updated from store
            status: 'connected'
          })
        } else {
          setConnectionInfo({
            isConnected: false,
            source: 'none',
            lastUpdate: 'Never',
            symbolsCount: 0,
            status: 'error'
          })
        }
      } catch (error) {
        console.error('Error getting connection info:', error)
        setConnectionInfo({
          isConnected: false,
          source: 'none',
          lastUpdate: 'Never',
          symbolsCount: 0,
          status: 'error'
        })
      }
    }

    // Update immediately
    updateConnectionInfo()

    // Update every 30 seconds
    const interval = setInterval(updateConnectionInfo, 30000)

    return () => clearInterval(interval)
  }, [])

  if (!connectionInfo) {
    return null
  }

  const getStatusIcon = () => {
    if (connectionInfo.isConnected) {
      return <Database className="h-4 w-4 text-green-500" />
    } else {
      return <WifiOff className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusText = () => {
    if (connectionInfo.isConnected) {
      return `Live Data (${connectionInfo.source})`
    } else {
      return 'Disconnected'
    }
  }

  const getStatusColor = () => {
    if (connectionInfo.isConnected) {
      return 'text-green-600'
    } else {
      return 'text-red-600'
    }
  }

  const getTierInfo = () => {
    if (connectionInfo.isConnected) {
      return {
        tier: 'Multi-Source',
        description: `Real-time data via ${connectionInfo.source}`,
        color: 'text-green-600 bg-green-50 border-green-200'
      }
    } else {
      return {
        tier: 'Offline',
        description: 'No data source available',
        color: 'text-red-600 bg-red-50 border-red-200'
      }
    }
  }

  const tierInfo = getTierInfo()

  return (
    <div className={`bg-white border rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full border ${tierInfo.color}`}>
            {tierInfo.tier}
          </span>
        </div>
        
        {showDetails && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>

                {showDetails && isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div className="text-xs text-gray-600">
            <div className="font-medium mb-1">Connection Details:</div>
            <div>• Status: {tierInfo.description}</div>
            <div>• Data Source: {connectionInfo.source}</div>
            <div>• Last Update: {connectionInfo.lastUpdate}</div>
            <div>• Symbols Count: {connectionInfo.symbolsCount}</div>
          </div>
          
          {connectionInfo.isConnected && (
            <div className="text-xs p-2 bg-green-50 border border-green-200 rounded">
              <div className="font-medium text-green-800 mb-1">Multi-Source System Active</div>
              <div className="text-green-700">
                Real-time stock data via {connectionInfo.source}. 
                <span className="ml-1">
                  Automatic fallback to Yahoo Finance and other sources.
                </span>
              </div>
            </div>
          )}
          {!connectionInfo.isConnected && (
            <div className="text-xs p-2 bg-red-50 border border-red-200 rounded">
              <div className="font-medium text-red-800 mb-1">Connection Failed</div>
              <div className="text-red-700">
                Unable to connect to any data source. Check your internet connection.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PolygonConnectionStatus