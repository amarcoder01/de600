'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Plus, CheckCircle, XCircle, AlertTriangle, Settings, Clock, Target } from 'lucide-react'

interface Alert {
  id: number
  type: 'price' | 'volume' | 'technical' | 'news'
  symbol: string
  condition: string
  value: number | string
  status: 'active' | 'triggered' | 'expired'
  time: string
  priority?: 'low' | 'medium' | 'high'
}

interface AlertsPanelProps {
  alerts: Alert[]
  onAddAlert?: () => void
  onDismissAlert?: (id: number) => void
  onEditAlert?: (id: number) => void
}

export function AlertsPanel({ 
  alerts, 
  onAddAlert, 
  onDismissAlert, 
  onEditAlert 
}: AlertsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'triggered'>('all')

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true
    return alert.status === filter
  })

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'price':
        return <Target className="w-4 h-4" />
      case 'volume':
        return <AlertTriangle className="w-4 h-4" />
      case 'technical':
        return <Settings className="w-4 h-4" />
      case 'news':
        return <Bell className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status: Alert['status']) => {
    switch (status) {
      case 'active':
        return <Bell className="w-4 h-4" />
      case 'triggered':
        return <CheckCircle className="w-4 h-4" />
      case 'expired':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: Alert['status']) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-600'
      case 'triggered':
        return 'bg-green-100 text-green-600'
      case 'expired':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getPriorityColor = (priority?: Alert['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-600'
      case 'medium':
        return 'bg-yellow-100 text-yellow-600'
      case 'low':
        return 'bg-green-100 text-green-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Price Alerts</span>
              <Badge variant="outline" className="text-xs">
                {alerts.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={onAddAlert}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg mt-4">
            {[
              { id: 'all', label: 'All', count: alerts.length },
              { id: 'active', label: 'Active', count: alerts.filter(a => a.status === 'active').length },
              { id: 'triggered', label: 'Triggered', count: alerts.filter(a => a.status === 'triggered').length }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={filter === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(tab.id as any)}
                className="flex items-center space-x-1"
              >
                <span>{tab.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {tab.count}
                </Badge>
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {filteredAlerts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground"
              >
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No alerts found</p>
                <p className="text-sm">Create your first alert to get started</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(alert.status)}`}>
                        {getStatusIcon(alert.status)}
                      </div>
                      <div className="flex items-center space-x-2">
                        {getAlertIcon(alert.type)}
                        <div>
                          <div className="font-semibold">{alert.symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            {alert.condition} {typeof alert.value === 'number' ? `$${alert.value}` : alert.value}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">{alert.time}</div>
                        <Badge variant={alert.status === 'active' ? 'default' : 'secondary'}>
                          {alert.status}
                        </Badge>
                        {alert.priority && (
                          <Badge variant="outline" className="ml-1 text-xs">
                            {alert.priority}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditAlert?.(alert.id)}
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDismissAlert?.(alert.id)}
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Sample alerts data
export const sampleAlerts: Alert[] = [
  {
    id: 1,
    type: 'price',
    symbol: 'AAPL',
    condition: 'above',
    value: 190.00,
    status: 'active',
    time: '2 min ago',
    priority: 'high'
  },
  {
    id: 2,
    type: 'volume',
    symbol: 'TSLA',
    condition: 'spike',
    value: 5000000,
    status: 'triggered',
    time: '5 min ago',
    priority: 'medium'
  },
  {
    id: 3,
    type: 'technical',
    symbol: 'NVDA',
    condition: 'rsi_oversold',
    value: 30,
    status: 'active',
    time: '10 min ago',
    priority: 'low'
  },
  {
    id: 4,
    type: 'price',
    symbol: 'MSFT',
    condition: 'below',
    value: 300.00,
    status: 'expired',
    time: '1 hour ago',
    priority: 'medium'
  }
]
