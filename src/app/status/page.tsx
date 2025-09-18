import { Metadata } from 'next'
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Server, 
  Database, 
  Globe, 
  Shield,
  TrendingUp,
  BarChart3,
  MessageCircle,
  Bell,
  Target
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'System Status - Vidality Trading Platform',
  description: 'Check the current status of Vidality trading platform services and systems.',
}

export default function StatusPage() {
  // Mock status data - in a real app, this would come from an API
  const services = [
    {
      name: 'Trading Platform',
      status: 'operational',
      description: 'Core trading functionality',
      icon: TrendingUp
    },
    {
      name: 'Market Data',
      status: 'operational',
      description: 'Real-time stock quotes and data',
      icon: BarChart3
    },
    {
      name: 'AI Assistant',
      status: 'operational',
      description: 'AI-powered trading insights',
      icon: MessageCircle
    },
    {
      name: 'Price Alerts',
      status: 'operational',
      description: 'Stock price notifications',
      icon: Bell
    },
    {
      name: 'Paper Trading',
      status: 'operational',
      description: 'Virtual trading simulation',
      icon: Target
    },
    {
      name: 'API Services',
      status: 'operational',
      description: 'Developer API endpoints',
      icon: Server
    },
    {
      name: 'Database',
      status: 'operational',
      description: 'Data storage and retrieval',
      icon: Database
    },
    {
      name: 'Security',
      status: 'operational',
      description: 'Authentication and encryption',
      icon: Shield
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'outage':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'maintenance':
        return <Clock className="h-5 w-5 text-blue-500" />
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600'
      case 'degraded':
        return 'text-yellow-600'
      case 'outage':
        return 'text-red-600'
      case 'maintenance':
        return 'text-blue-600'
      default:
        return 'text-green-600'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-50 border-green-200'
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200'
      case 'outage':
        return 'bg-red-50 border-red-200'
      case 'maintenance':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-green-50 border-green-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              System Status
            </h1>
            <p className="text-lg text-gray-600">
              All systems operational
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-green-800">
                  All Systems Operational
                </h2>
                <p className="text-green-700">
                  Vidality is running smoothly with no reported issues.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Service Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service, index) => {
              const IconComponent = service.icon
              return (
                <div key={index} className={`border rounded-lg p-4 ${getStatusBg(service.status)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <IconComponent className="h-5 w-5 text-gray-600 mr-3" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-600">{service.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {getStatusIcon(service.status)}
                      <span className={`ml-2 text-sm font-medium ${getStatusColor(service.status)}`}>
                        {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="py-8 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance Metrics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Server className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Uptime</h3>
              <p className="text-3xl font-bold text-green-600">99.9%</p>
              <p className="text-sm text-gray-600 mt-1">Last 30 days</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Globe className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Response Time</h3>
              <p className="text-3xl font-bold text-blue-600">45ms</p>
              <p className="text-sm text-gray-600 mt-1">Average</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Database className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Data Accuracy</h3>
              <p className="text-3xl font-bold text-purple-600">99.99%</p>
              <p className="text-sm text-gray-600 mt-1">Market data</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Incidents</h2>
          
          <div className="bg-white rounded-lg border p-6">
            <div className="text-center text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg">No recent incidents</p>
              <p className="text-sm">All systems have been running smoothly</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscribe to Updates */}
      <div className="py-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
          <p className="text-blue-100 mb-6">
            Get notified about system status updates and maintenance schedules.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:amar@vidality.com?subject=Status Updates"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Subscribe to Updates
            </a>
            <a
              href="/help"
              className="border border-white text-white px-6 py-3 rounded-lg font-medium hover:bg-white hover:text-blue-600 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
