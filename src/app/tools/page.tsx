'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Brain,
  BarChart3,
  DollarSign,
  BrainCircuit,
  Target,
  ArrowRight
} from 'lucide-react'

export default function ToolsPage() {
  const router = useRouter()

  const tools = [
    {
      title: 'Backtesting Engine',
      description: 'Professional strategy testing with Polygon.io 4+ years of historical data and comprehensive analytics',
      icon: BarChart3,
      href: '/backtesting',
      badge: 'PRO',
      color: 'blue'
    },
    {
      title: 'AI Predictions',
      description: 'Machine learning models for market forecasting',
      icon: Brain,
      href: '/ai-predictions',
      badge: 'ML',
      color: 'purple'
    },
    {
      title: 'Portfolio Manager',
      description: 'Manage your investment portfolio and track performance',
      icon: DollarSign,
      href: '/portfolio-manager',
      badge: 'PRO',
      color: 'green'
    },
    {
      title: 'Strategy Builder',
      description: 'Unified AI-powered strategy creation with GPT and ML integration for comprehensive trading analysis',
      icon: BrainCircuit,
      href: '/strategy-builder',
      badge: 'UNIFIED',
      color: 'orange'
    },
    {
      title: 'Stock Comparison',
      description: 'Compare multiple stocks with comprehensive AI-powered analysis',
      icon: Target,
      href: '/stock-comparison',
      badge: 'COMPARE',
      color: 'red'
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Trading Tools
        </h1>
        <p className="text-muted-foreground">
          Professional trading tools powered by real market data and advanced analytics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const IconComponent = tool.icon
          return (
            <Card key={tool.href} className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    tool.color === 'blue' ? 'bg-blue-100' :
                    tool.color === 'purple' ? 'bg-purple-100' :
                    tool.color === 'green' ? 'bg-green-100' :
                    tool.color === 'orange' ? 'bg-orange-100' :
                    'bg-red-100'
                  }`}>
                    <IconComponent className={`h-6 w-6 ${
                      tool.color === 'blue' ? 'text-blue-600' :
                      tool.color === 'purple' ? 'text-purple-600' :
                      tool.color === 'green' ? 'text-green-600' :
                      tool.color === 'orange' ? 'text-orange-600' :
                      'text-red-600'
                    }`} />
                  </div>
                  {tool.title}
                  <Badge variant="secondary" className="ml-auto">
                    {tool.badge}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => router.push(tool.href)}
                  className="w-full flex items-center gap-2"
                >
                  Access Tool
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-12 p-6 bg-muted/50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">What's New?</h2>
        <p className="text-muted-foreground">
          We've reorganized our professional trading tools into dedicated sections for better user experience. 
          Each tool now has its own focused interface and enhanced features. You can access these tools directly 
          from the sidebar navigation or through the cards above.
        </p>
      </div>
    </div>
  )
}
