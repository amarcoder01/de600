'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Brain, 
  Shield, 
  Zap, 
  BarChart3, 
  Bell, 
  Target,
  ArrowRight,
  Play,
  Star,
  CheckCircle,
  Sparkles,
  Users,
  Award,
  Clock,
  DollarSign,
  BarChart,
  PieChart,
  TrendingDown,
  AlertTriangle,
  Info,
  HelpCircle,
  Activity,
  Globe,
  Lock,
  Settings,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react'

interface FeatureShowcaseProps {
  className?: string
}

const features = [
  {
    id: 'ai-analysis',
    title: 'AI-Powered Analysis',
    description: 'Advanced machine learning models provide intelligent trading insights and predictions.',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
    details: [
      'Real-time market sentiment analysis',
      'Predictive price modeling',
      'Risk assessment algorithms',
      'Pattern recognition',
      'Automated trading signals'
    ],
    stats: {
      accuracy: '87%',
      predictions: '10K+',
      models: '15+'
    }
  },
  {
    id: 'real-time-data',
    title: 'Real-Time Data',
    description: 'Live market data from NYSE, NASDAQ, and other major exchanges with millisecond precision.',
    icon: Activity,
    color: 'from-blue-500 to-cyan-500',
    details: [
      'Millisecond latency',
      '100+ data sources',
      'Level 2 market data',
      'Options flow data',
      'News sentiment integration'
    ],
    stats: {
      latency: '<1ms',
      sources: '100+',
      updates: '1M+/sec'
    }
  },
  {
    id: 'advanced-charts',
    title: 'Advanced Charts',
    description: 'Professional-grade charting with 100+ technical indicators and drawing tools.',
    icon: BarChart3,
    color: 'from-green-500 to-emerald-500',
    details: [
      '100+ technical indicators',
      'Multiple timeframes',
      'Drawing tools',
      'Chart patterns',
      'Volume analysis'
    ],
    stats: {
      indicators: '100+',
      timeframes: '50+',
      patterns: '25+'
    }
  },
  {
    id: 'risk-management',
    title: 'Risk Management',
    description: 'Advanced portfolio risk assessment and automated stop-loss management.',
    icon: Shield,
    color: 'from-red-500 to-orange-500',
    details: [
      'Portfolio stress testing',
      'VaR calculations',
      'Position sizing',
      'Stop-loss automation',
      'Risk alerts'
    ],
    stats: {
      protection: '99.9%',
      alerts: '24/7',
      coverage: '100%'
    }
  }
]

export function FeatureShowcase({ className }: FeatureShowcaseProps) {
  const [activeFeature, setActiveFeature] = useState<string | null>(null)
  const [selectedFeature, setSelectedFeature] = useState(features[0])

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Feature List */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-white mb-6">
            Platform Features
          </h3>
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`cursor-pointer transition-all duration-300 ${
                selectedFeature.id === feature.id 
                  ? 'bg-white/10 border-blue-500/50' 
                  : 'bg-white/5 border-white/10 hover:bg-white/8'
              } border rounded-lg p-4`}
              onClick={() => setSelectedFeature(feature)}
              onMouseEnter={() => setActiveFeature(feature.id)}
              onMouseLeave={() => setActiveFeature(null)}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 bg-gradient-to-r ${feature.color} rounded-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                  <p className="text-sm text-gray-300">{feature.description}</p>
                </div>
                <ArrowRight className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                  selectedFeature.id === feature.id ? 'rotate-90' : ''
                }`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Feature Details */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedFeature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Feature Header */}
              <div className="text-center">
                <div className={`inline-flex p-4 bg-gradient-to-r ${selectedFeature.color} rounded-xl mb-4`}>
                  <selectedFeature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{selectedFeature.title}</h3>
                <p className="text-gray-300">{selectedFeature.description}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(selectedFeature.stats).map(([key, value]) => (
                  <div key={key} className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-white mb-1">{value}</div>
                    <div className="text-xs text-gray-400 capitalize">{key}</div>
                  </div>
                ))}
              </div>

              {/* Feature Details */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Key Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {selectedFeature.details.map((detail, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3"
                      >
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">{detail}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>


            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="mt-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center p-6 bg-white/5 rounded-lg"
          >
            <div className="text-3xl font-bold text-white mb-2">50K+</div>
            <div className="text-gray-400">Active Traders</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center p-6 bg-white/5 rounded-lg"
          >
            <div className="text-3xl font-bold text-white mb-2">99.9%</div>
            <div className="text-gray-400">Uptime</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center p-6 bg-white/5 rounded-lg"
          >
            <div className="text-3xl font-bold text-white mb-2">$2.5B+</div>
            <div className="text-gray-400">Trading Volume</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center p-6 bg-white/5 rounded-lg"
          >
            <div className="text-3xl font-bold text-white mb-2">24/7</div>
            <div className="text-gray-400">Support</div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
