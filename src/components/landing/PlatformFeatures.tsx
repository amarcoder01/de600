'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Brain,
  Zap,
  BarChart3,
  Bell,
  Target,
  Shield,
  TrendingUp,
  TrendingDown,
  PieChart,
  Activity,
  Globe,
  Lock,
  Settings,
  Smartphone,
  Monitor,
  Tablet,
  Users,
  Award,
  Star,
  CheckCircle,
  ArrowRight,
  Play,
  Clock,
  DollarSign,
  AlertTriangle,
  Info,
  HelpCircle,
  Sparkles,
  Rocket,
  Crown,
  Gift,
  Target as TargetIcon,
  BarChart,
  LineChart,
  CandlestickChart,
  Volume,
  Percent,
  Timer,

  FileText,
  Download,
  Upload,
  Share2,
  Copy,
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  RotateCcw,
  Save,
  Bookmark,
  Heart,
  MessageSquare,
  Phone,
  Mail,
  Video,
  Headphones,
  Wifi,
  WifiOff,
  Signal,
  Battery,
  BatteryCharging,
  Power,
  PowerOff,
  RefreshCw,
  RefreshCcw,
  RotateCw,
  RotateCcw as RotateCcwIcon,
  ZoomIn,
  ZoomOut,
  Move,
  Scissors,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Grid,
  Columns,
  Rows,
  Layers,
  Palette,
  Droplets,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  Gauge,
  Timer as TimerIcon,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarCheck,
  CalendarX,
  CalendarPlus,
  CalendarMinus,
  CalendarRange,
  CalendarSearch,
  CalendarHeart,
  CalendarClock,
  CalendarOff,
  Calendar,















} from 'lucide-react'

interface PlatformFeaturesProps {
  className?: string
}

const featureCategories = [
  {
    id: 'ai-analysis',
    title: 'AI-Powered Analysis',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
    description: 'Advanced machine learning models provide intelligent trading insights and predictions',
    features: [
      {
        name: 'Real-time Market Sentiment Analysis',
        description: 'Analyze market sentiment across social media, news, and financial data',
        icon: Activity,
        stats: 'Real-time processing'
      },
      {
        name: 'Predictive Price Modeling',
        description: 'AI models predict price movements with high accuracy',
        icon: TrendingUp,
        stats: '87% accuracy rate'
      },
      {
        name: 'Risk Assessment Algorithms',
        description: 'Automated risk evaluation for every trade',
        icon: AlertTriangle,
        stats: '24/7 monitoring'
      },
      {
        name: 'Pattern Recognition',
        description: 'Identify complex trading patterns automatically',
        icon: Target,
        stats: '100+ patterns'
      },
      {
        name: 'Automated Trading Signals',
        description: 'Get instant buy/sell signals based on AI analysis',
        icon: Bell,
        stats: 'Millisecond alerts'
      }
    ]
  },
  {
    id: 'real-time-data',
    title: 'Real-Time Data',
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    description: 'Live market data from NYSE, NASDAQ, and other major exchanges with millisecond precision',
    features: [
      {
        name: 'Millisecond Latency',
        description: 'Ultra-fast data delivery for competitive advantage',
        icon: Timer,
        stats: '<1ms latency'
      },
      {
        name: '100+ Data Sources',
        description: 'Comprehensive coverage of global markets',
        icon: Globe,
        stats: '100+ sources'
      },
      {
        name: 'Level 2 Market Data',
        description: 'Deep market depth and order book information',
        icon: BarChart3,
        stats: 'Full depth data'
      },
      {
        name: 'Options Flow Data',
        description: 'Track institutional options activity',
        icon: TrendingUp,
        stats: 'Real-time flow'
      },
      {
        name: 'News Sentiment Integration',
        description: 'AI-powered news analysis and sentiment scoring',
        icon: FileText,
        stats: 'Instant analysis'
      }
    ]
  },
  {
    id: 'advanced-charts',
    title: 'Advanced Charts',
    icon: BarChart3,
    color: 'from-green-500 to-emerald-500',
    description: 'Professional-grade charting with 100+ technical indicators and drawing tools',
    features: [
      {
        name: '100+ Technical Indicators',
        description: 'Complete suite of technical analysis tools',
        icon: BarChart,
        stats: '100+ indicators'
      },
      {
        name: 'Multiple Timeframes',
        description: 'Analyze from 1-minute to monthly charts',
        icon: Clock,
        stats: '50+ timeframes'
      },
      {
        name: 'Drawing Tools',
        description: 'Professional drawing and annotation tools',
        icon: Type,
        stats: '25+ tools'
      },
      {
        name: 'Chart Patterns',
        description: 'Automatic pattern recognition and alerts',
        icon: Target,
        stats: '25+ patterns'
      },
      {
        name: 'Volume Analysis',
        description: 'Advanced volume and VWAP analysis',
        icon: Volume,
        stats: 'Real-time VWAP'
      }
    ]
  },
  {
    id: 'risk-management',
    title: 'Risk Management',
    icon: Shield,
    color: 'from-red-500 to-orange-500',
    description: 'Advanced portfolio risk assessment and automated stop-loss management',
    features: [
      {
        name: 'Portfolio Stress Testing',
        description: 'Simulate market scenarios and stress test your portfolio',
        icon: AlertTriangle,
        stats: 'Multiple scenarios'
      },
      {
        name: 'VaR Calculations',
        description: 'Value at Risk calculations for portfolio protection',
        icon: Percent,
        stats: 'Real-time VaR'
      },
      {
        name: 'Position Sizing',
        description: 'Automated position sizing based on risk tolerance',
        icon: Target,
        stats: 'Smart sizing'
      },
      {
        name: 'Stop-Loss Automation',
        description: 'Automated stop-loss and take-profit orders',
        icon: Lock,
        stats: '24/7 protection'
      },
      {
        name: 'Risk Alerts',
        description: 'Instant alerts for portfolio risk thresholds',
        icon: Bell,
        stats: 'Real-time alerts'
      }
    ]
  },
  {
    id: 'portfolio-tracking',
    title: 'Portfolio Tracking',
    icon: Target,
    color: 'from-indigo-500 to-purple-500',
    description: 'Comprehensive portfolio management with performance analytics and optimization',
    features: [
      {
        name: 'Real-time Portfolio Value',
        description: 'Track your portfolio value with live updates',
        icon: DollarSign,
        stats: 'Live updates'
      },
      {
        name: 'Performance Analytics',
        description: 'Detailed performance metrics and analysis',
        icon: PieChart,
        stats: '20+ metrics'
      },
      {
        name: 'Asset Allocation',
        description: 'Visualize and optimize your asset allocation',
        icon: PieChart,
        stats: 'Sector breakdown'
      },
      {
        name: 'Trade History',
        description: 'Complete trade history and analysis',
        icon: Clock,
        stats: 'Full history'
      },
      {
        name: 'Tax Reporting',
        description: 'Automated tax reporting and documentation',
        icon: FileText,
        stats: 'IRS compliant'
      }
    ]
  },
  {
    id: 'smart-alerts',
    title: 'Smart Alerts',
    icon: Bell,
    color: 'from-yellow-500 to-orange-500',
    description: 'Customizable price alerts and market notifications delivered instantly',
    features: [
      {
        name: 'Price Alerts',
        description: 'Set custom price targets and get instant notifications',
        icon: Bell,
        stats: 'Unlimited alerts'
      },
      {
        name: 'Volume Alerts',
        description: 'Get notified of unusual volume activity',
        icon: Volume,
        stats: 'Volume spikes'
      },
      {
        name: 'News Alerts',
        description: 'Real-time news alerts for your watchlist',
        icon: FileText,
        stats: 'Instant news'
      },
      {
        name: 'Technical Alerts',
        description: 'Alerts based on technical indicators',
        icon: BarChart3,
        stats: '100+ indicators'
      },
      {
        name: 'Portfolio Alerts',
        description: 'Alerts for portfolio performance and risk',
        icon: Target,
        stats: 'Portfolio monitoring'
      }
    ]
  }
]

export function PlatformFeatures({ className }: PlatformFeaturesProps) {
  const [selectedCategory, setSelectedCategory] = useState(featureCategories[0])
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Category Selection */}
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-white mb-6">
            Platform Features
          </h3>
          <div className="space-y-4">
            {featureCategories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`cursor-pointer transition-all duration-300 ${
                  selectedCategory.id === category.id 
                    ? 'bg-white/10 border-blue-500/50' 
                    : 'bg-white/5 border-white/10 hover:bg-white/8'
                } border rounded-xl p-4`}
                onClick={() => setSelectedCategory(category)}
                onMouseEnter={() => setHoveredFeature(category.id)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 bg-gradient-to-r ${category.color} rounded-lg`}>
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">{category.title}</h4>
                    <p className="text-sm text-gray-300">{category.description}</p>
                  </div>
                  <motion.div
                    animate={{ 
                      rotate: selectedCategory.id === category.id ? 90 : 0,
                      scale: hoveredFeature === category.id ? 1.1 : 1
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Feature Details */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCategory.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Category Header */}
              <div className="text-center">
                <div className={`inline-flex p-4 bg-gradient-to-r ${selectedCategory.color} rounded-xl mb-4`}>
                  <selectedCategory.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{selectedCategory.title}</h3>
                <p className="text-gray-300">{selectedCategory.description}</p>
              </div>

              {/* Features List */}
              <div className="space-y-4">
                {selectedCategory.features.map((feature, index) => (
                  <motion.div
                    key={feature.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/8 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg">
                        <feature.icon className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">{feature.name}</h4>
                        <p className="text-sm text-gray-300 mb-2">{feature.description}</p>
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                          {feature.stats}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
