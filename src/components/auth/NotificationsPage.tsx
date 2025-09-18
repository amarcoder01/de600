'use client'

import React, { useState } from 'react'
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Settings,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Trash2,
  Filter
} from 'lucide-react'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
  category: 'trading' | 'system' | 'news' | 'alert'
}

export function NotificationsPage() {
  const { user } = useAuthStore()
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'trading' | 'system'>('all')
  
  // Mock notifications data
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'success',
      title: 'Order Executed',
      message: 'Your buy order for AAPL has been successfully executed at $150.25',
      timestamp: '2024-01-15T10:30:00Z',
      read: false,
      category: 'trading'
    },
    {
      id: '2',
      type: 'info',
      title: 'Market Update',
      message: 'S&P 500 has reached a new all-time high. Consider reviewing your portfolio.',
      timestamp: '2024-01-15T09:15:00Z',
      read: true,
      category: 'news'
    },
    {
      id: '3',
      type: 'warning',
      title: 'Price Alert',
      message: 'TSLA has dropped below your alert threshold of $200.00',
      timestamp: '2024-01-15T08:45:00Z',
      read: false,
      category: 'alert'
    },
    {
      id: '4',
      type: 'info',
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM EST',
      timestamp: '2024-01-14T16:00:00Z',
      read: true,
      category: 'system'
    }
  ])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">User not found</p>
        </div>
      </div>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-800">Info</Badge>
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'unread') return !notification.read
    if (activeFilter === 'trading') return notification.category === 'trading'
    if (activeFilter === 'system') return notification.category === 'system'
    return true
  })

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600 mt-2">Stay updated with your trading activities and platform alerts</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
              <Button
                variant="outline"
                onClick={() => setNotifications([])}
                disabled={notifications.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Filter className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeFilter === 'all' 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>All Notifications</span>
                    <Badge variant="secondary">{notifications.length}</Badge>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveFilter('unread')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeFilter === 'unread' 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Unread</span>
                    <Badge variant="secondary">{unreadCount}</Badge>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveFilter('trading')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeFilter === 'trading' 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Trading</span>
                    <Badge variant="secondary">
                      {notifications.filter(n => n.category === 'trading').length}
                    </Badge>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveFilter('system')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeFilter === 'system' 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>System</span>
                    <Badge variant="secondary">
                      {notifications.filter(n => n.category === 'system').length}
                    </Badge>
                  </div>
                </button>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">Email Notifications</span>
                  </div>
                  <Badge className={user?.preferences?.notifications?.email ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {user?.preferences?.notifications?.email ? 'On' : 'Off'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">Push Notifications</span>
                  </div>
                  <Badge className={user?.preferences?.notifications?.push ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {user?.preferences?.notifications?.push ? 'On' : 'Off'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">SMS Notifications</span>
                  </div>
                  <Badge className={user?.preferences?.notifications?.sms ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {user?.preferences?.notifications?.sms ? 'On' : 'Off'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                  <p className="text-gray-500">You're all caught up! Check back later for new updates.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-6 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {getTypeIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </h3>
                              {getTypeBadge(notification.type)}
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                {new Date(notification.timestamp).toLocaleDateString()}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notification.id)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="mt-2 text-blue-600 hover:text-blue-700"
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
