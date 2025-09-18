'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  Minus,
  Star,
  Zap,
  Shield,
  Brain,
  BarChart3,
  Activity,
  Bell,
  Target,
  Users,
  Award
} from 'lucide-react'

interface ComparisonTableProps {
  className?: string
}

const features = [
  {
    name: 'AI-Powered Analysis',
    vidality: 'Advanced ML models',
    competitor1: 'Basic indicators',
    competitor2: 'Limited AI',
    icon: Brain
  },
  {
    name: 'Real-Time Data',
    vidality: 'Millisecond latency',
    competitor1: '15-second delay',
    competitor2: '1-minute delay',
    icon: Activity
  },
  {
    name: 'Advanced Charts',
    vidality: '100+ indicators',
    competitor1: '50 indicators',
    competitor2: '25 indicators',
    icon: BarChart3
  },
  {
    name: 'Risk Management',
    vidality: 'Automated protection',
    competitor1: 'Manual only',
    competitor2: 'Basic alerts',
    icon: Shield
  },
  {
    name: 'Smart Alerts',
    vidality: 'AI-powered',
    competitor1: 'Price only',
    competitor2: 'Limited',
    icon: Bell
  },
  {
    name: 'Portfolio Analytics',
    vidality: 'Advanced metrics',
    competitor1: 'Basic P&L',
    competitor2: 'Simple tracking',
    icon: Target
  },
  {
    name: 'Customer Support',
    vidality: '24/7 priority',
    competitor1: 'Business hours',
    competitor2: 'Email only',
    icon: Users
  },
  {
    name: 'Mobile App',
    vidality: 'Full featured',
    competitor1: 'Limited features',
    competitor2: 'Basic view',
    icon: Zap
  }
]

const platforms = [
  {
    name: 'Vidality',
    logo: '🎯',
    rating: 5,
    description: 'AI-Powered Trading Platform',
    highlight: true
  },
  {
    name: 'Competitor A',
    logo: '📊',
    rating: 3,
    description: 'Traditional Trading Platform',
    highlight: false
  },
  {
    name: 'Competitor B',
    logo: '💹',
    rating: 2,
    description: 'Basic Trading Tool',
    highlight: false
  }
]

const getFeatureValue = (value: string) => {
  if (value.includes('Advanced') || value.includes('100+') || value.includes('24/7') || value.includes('Full')) {
    return { type: 'excellent', icon: CheckCircle, color: 'text-green-400' }
  } else if (value.includes('Basic') || value.includes('Limited') || value.includes('Manual')) {
    return { type: 'poor', icon: XCircle, color: 'text-red-400' }
  } else {
    return { type: 'average', icon: Minus, color: 'text-yellow-400' }
  }
}

export function ComparisonTable({ className }: ComparisonTableProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Platform Headers */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="text-center">
          <h3 className="font-semibold text-white mb-2">Features</h3>
        </div>
        {platforms.map((platform, index) => (
          <motion.div
            key={platform.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`text-center p-4 rounded-lg ${
              platform.highlight 
                ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30' 
                : 'bg-white/5 border border-white/10'
            }`}
          >
            <div className="text-2xl mb-2">{platform.logo}</div>
            <h3 className={`font-bold mb-1 ${platform.highlight ? 'text-white' : 'text-gray-300'}`}>
              {platform.name}
            </h3>
            <p className="text-sm text-gray-400 mb-2">{platform.description}</p>
            <div className="flex items-center justify-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < platform.rating 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-400'
                  }`}
                />
              ))}
            </div>
            {platform.highlight && (
              <Badge className="mt-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                Recommended
              </Badge>
            )}
          </motion.div>
        ))}
      </div>

      {/* Feature Comparison */}
      <div className="space-y-4">
        {features.map((feature, index) => (
          <motion.div
            key={feature.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="grid grid-cols-4 gap-4 items-center p-4 bg-white/5 rounded-lg hover:bg-white/8 transition-colors"
          >
            {/* Feature Name */}
            <div className="flex items-center space-x-3">
              <feature.icon className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-white">{feature.name}</span>
            </div>

            {/* Vidality */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">{feature.vidality}</span>
              </div>
            </div>

            {/* Competitor A */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                {getFeatureValue(feature.competitor1).icon === CheckCircle ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : getFeatureValue(feature.competitor1).icon === XCircle ? (
                  <XCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <Minus className="w-5 h-5 text-yellow-400" />
                )}
                <span className={`font-medium ${getFeatureValue(feature.competitor1).color}`}>
                  {feature.competitor1}
                </span>
              </div>
            </div>

            {/* Competitor B */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                {getFeatureValue(feature.competitor2).icon === CheckCircle ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : getFeatureValue(feature.competitor2).icon === XCircle ? (
                  <XCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <Minus className="w-5 h-5 text-yellow-400" />
                )}
                <span className={`font-medium ${getFeatureValue(feature.competitor2).color}`}>
                  {feature.competitor2}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg"
        >
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Best Features</h3>
          <p className="text-green-300">Vidality leads in 8/8 categories</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center p-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg"
        >
          <Award className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Highest Rating</h3>
          <p className="text-blue-300">5-star rating from users</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg"
        >
          <Zap className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Most Advanced</h3>
          <p className="text-purple-300">AI-powered trading platform</p>
        </motion.div>
      </div>


    </div>
  )
}
