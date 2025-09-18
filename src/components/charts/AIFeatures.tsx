'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { 
  Brain, 
  Sparkles, 
  Zap, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Lightbulb,
  MessageSquare,
  BarChart3,
  Activity,
  Eye,
  Cpu,
  Rocket,
  Crown,
  Star,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign
} from 'lucide-react'

interface AIFeature {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  status: 'active' | 'beta' | 'coming-soon'
  category: 'analysis' | 'prediction' | 'automation' | 'insights'
  powerLevel: number
  features: string[]
}

export function AIFeatures() {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)

  const aiFeatures: AIFeature[] = [
    {
      id: 'market-prediction',
      name: 'Market Prediction Engine',
      description: 'Advanced AI-powered price predictions using machine learning models trained on historical data patterns.',
      icon: Target,
      status: 'active',
      category: 'prediction',
      powerLevel: 95,
      features: [
        'Price target predictions',
        'Support/resistance levels',
        'Trend reversal signals',
        'Confidence scoring',
        'Risk assessment'
      ]
    },
    {
      id: 'pattern-recognition',
      name: 'Pattern Recognition AI',
      description: 'Real-time detection of technical chart patterns using computer vision and deep learning.',
      icon: Eye,
      status: 'active',
      category: 'analysis',
      powerLevel: 90,
      features: [
        'Candlestick pattern detection',
        'Chart formation analysis',
        'Volume pattern recognition',
        'Breakout prediction',
        'Pattern strength scoring'
      ]
    },
    {
      id: 'sentiment-analysis',
      name: 'Market Sentiment AI',
      description: 'Comprehensive sentiment analysis from news, social media, and market data sources.',
      icon: Activity,
      status: 'active',
      category: 'insights',
      powerLevel: 85,
      features: [
        'News sentiment analysis',
        'Social media monitoring',
        'Institutional flow tracking',
        'Market mood indicators',
        'Sentiment scoring'
      ]
    },
    {
      id: 'trading-assistant',
      name: 'AI Trading Assistant',
      description: 'Intelligent trading assistant that provides personalized recommendations and strategy suggestions.',
      icon: MessageSquare,
      status: 'active',
      category: 'automation',
      powerLevel: 88,
      features: [
        'Natural language queries',
        'Strategy recommendations',
        'Risk management advice',
        'Entry/exit suggestions',
        'Portfolio optimization'
      ]
    },
    {
      id: 'risk-analyzer',
      name: 'Risk Analysis AI',
      description: 'Advanced risk assessment using AI to evaluate market conditions and portfolio exposure.',
      icon: AlertTriangle,
      status: 'beta',
      category: 'analysis',
      powerLevel: 82,
      features: [
        'Portfolio risk assessment',
        'Market volatility analysis',
        'Correlation tracking',
        'Stress testing',
        'Risk scoring'
      ]
    },
    {
      id: 'auto-trading',
      name: 'Automated Trading AI',
      description: 'Fully automated trading system with AI-driven decision making and execution.',
      icon: Rocket,
      status: 'coming-soon',
      category: 'automation',
      powerLevel: 75,
      features: [
        'Automated order execution',
        'Strategy backtesting',
        'Performance optimization',
        'Risk controls',
        'Real-time monitoring'
      ]
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'beta': return 'bg-yellow-500'
      case 'coming-soon': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'prediction': return 'text-blue-600 bg-blue-100'
      case 'analysis': return 'text-green-600 bg-green-100'
      case 'automation': return 'text-purple-600 bg-purple-100'
      case 'insights': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const selectedFeatureData = aiFeatures.find(f => f.id === selectedFeature)

  return (
    <div className="space-y-6">
      {/* AI Features Header */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Brain className="h-8 w-8 text-purple-600" />
            AI-Powered Trading Platform
            <Badge variant="secondary" className="ml-2">
              <Sparkles className="h-4 w-4 mr-1" />
              Powered by OpenAI
            </Badge>
          </CardTitle>
          <CardDescription className="text-lg">
            Advanced artificial intelligence features designed to enhance your trading experience with cutting-edge technology
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <Cpu className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold">Machine Learning</h3>
              <p className="text-sm text-muted-foreground">Advanced algorithms trained on millions of data points</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <Zap className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="font-semibold">Real-time Analysis</h3>
              <p className="text-sm text-muted-foreground">Instant insights and predictions as markets move</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <Crown className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <h3 className="font-semibold">Professional Grade</h3>
              <p className="text-sm text-muted-foreground">Institutional-level analysis for retail traders</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiFeatures.map((feature) => (
          <Card 
            key={feature.id} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
              selectedFeature === feature.id ? 'ring-2 ring-purple-500' : ''
            }`}
            onClick={() => setSelectedFeature(feature.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                {feature.icon && <feature.icon className="h-6 w-6 text-purple-600" />}
                <CardTitle className="text-lg">{feature.name}</CardTitle>
              </div>
                <Badge 
                  className={`${getStatusColor(feature.status)} text-white`}
                >
                  {feature.status}
                </Badge>
              </div>
              <Badge variant="outline" className={getCategoryColor(feature.category)}>
                {feature.category}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {feature.description}
              </p>
              
              {/* Power Level */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">AI Power Level</span>
                  <span className="text-sm text-muted-foreground">{feature.powerLevel}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${feature.powerLevel}%` }}
                  />
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-1">
                {feature.features.slice(0, 3).map((feat, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>{feat}</span>
                  </div>
                ))}
                {feature.features.length > 3 && (
                  <div className="text-sm text-muted-foreground">
                    +{feature.features.length - 3} more features
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Feature Details */}
      {selectedFeatureData && (
        <Card className="border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedFeatureData.icon && <selectedFeatureData.icon className="h-6 w-6 text-purple-600" />}
              {selectedFeatureData.name}
              <Badge className={getStatusColor(selectedFeatureData.status)}>
                {selectedFeatureData.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              {selectedFeatureData.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Features */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Key Features
                </h4>
                <div className="space-y-2">
                  {selectedFeatureData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance Stats
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                    <span className="text-sm font-medium">AI Power Level</span>
                    <Badge variant="outline">{selectedFeatureData.powerLevel}%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                    <span className="text-sm font-medium">Accuracy Rate</span>
                    <Badge variant="outline">85%+</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                    <span className="text-sm font-medium">Processing Speed</span>
                    <Badge variant="outline">&lt;100ms</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Try Now
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Learn More
              </Button>
              {selectedFeatureData.status === 'coming-soon' && (
                <Button variant="outline" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Get Notified
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Platform Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Platform Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">6</div>
              <div className="text-sm text-blue-700">AI Features</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-2xl font-bold text-green-600">95%</div>
              <div className="text-sm text-green-700">Accuracy Rate</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">&lt;100ms</div>
              <div className="text-sm text-purple-700">Response Time</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">24/7</div>
              <div className="text-sm text-orange-700">Availability</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
