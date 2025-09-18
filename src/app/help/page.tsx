import { Metadata } from 'next'
import { 
  HelpCircle, 
  Search, 
  BookOpen, 
  Video, 
  MessageCircle, 
  Mail, 
  Phone,
  FileText,
  TrendingUp,
  BarChart3,
  Target,
  Bell,
  AlertTriangle,
  Settings,
  Users,
  Globe
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Help Center - Vidality Trading Platform',
  description: 'Get help and support for the Vidality trading platform. Find answers to frequently asked questions and contact our support team.',
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white/20 p-4 rounded-full">
                <HelpCircle className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Help Center
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Find answers to your questions and get the support you need to make the most of Vidality.
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search for help articles, tutorials, or contact support..."
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Quick Help</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <a href="#getting-started" className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Getting Started</h3>
              <p className="text-sm text-gray-600">Learn the basics of using Vidality</p>
            </a>

            <a href="#trading" className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Trading Guide</h3>
              <p className="text-sm text-gray-600">Master trading on our platform</p>
            </a>

            <a href="#charts" className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Charts & Analysis</h3>
              <p className="text-sm text-gray-600">Advanced charting tools guide</p>
            </a>

            <a href="#ai-assistant" className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Assistant</h3>
              <p className="text-sm text-gray-600">Using our AI trading assistant</p>
            </a>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            {/* Getting Started FAQ */}
            <div id="getting-started" className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                Getting Started
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">How do I create an account?</h4>
                <p className="text-gray-700">
                  Click the "Sign Up" button in the top right corner of our homepage. You'll need to provide your email address, 
                  create a password, and verify your email to get started.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Is Vidality free to use?</h4>
                <p className="text-gray-700">
                  We offer both free and premium plans. The free plan includes basic features like market data, 
                  paper trading, and access to our AI assistant. Premium plans unlock advanced features and real-time data.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">What markets do you support?</h4>
                <p className="text-gray-700">
                  We currently support US stock markets including NYSE, NASDAQ, and other major exchanges. 
                  We're continuously expanding our market coverage.
                </p>
              </div>
            </div>

            {/* Trading FAQ */}
            <div id="trading" className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Target className="h-5 w-5 mr-2 text-green-600" />
                Trading
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">How does paper trading work?</h4>
                <p className="text-gray-700">
                  Paper trading allows you to practice trading with virtual money. You can test strategies, 
                  learn the platform, and build confidence without risking real capital.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Can I set up price alerts?</h4>
                <p className="text-gray-700">
                  Yes! You can create price alerts for any stock. Go to the Price Alerts section and set up 
                  notifications for when stocks reach your target prices.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">How do I create a watchlist?</h4>
                <p className="text-gray-700">
                  Navigate to the Watchlist section and click "Add Stock." Search for the stocks you want to track 
                  and add them to your personalized watchlist.
                </p>
              </div>
            </div>

            {/* Charts FAQ */}
            <div id="charts" className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                Charts & Analysis
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">What chart types are available?</h4>
                <p className="text-gray-700">
                  We offer candlestick, line, bar, and area charts. You can also customize timeframes from 
                  1 minute to monthly intervals.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Can I add technical indicators?</h4>
                <p className="text-gray-700">
                  Yes! We support popular indicators like Moving Averages, RSI, MACD, Bollinger Bands, 
                  and many more. You can add multiple indicators to your charts.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Is real-time data available?</h4>
                <p className="text-gray-700">
                  Real-time data is available on premium plans. Free users get delayed data (typically 15-20 minutes).
                </p>
              </div>
            </div>

            {/* AI Assistant FAQ */}
            <div id="ai-assistant" className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <MessageCircle className="h-5 w-5 mr-2 text-orange-600" />
                AI Assistant
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">What can the AI assistant help me with?</h4>
                <p className="text-gray-700">
                  Our AI assistant can help with market analysis, explain trading concepts, provide stock insights, 
                  and answer questions about the platform.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Is the AI advice reliable?</h4>
                <p className="text-gray-700">
                  The AI provides educational information and analysis, but it's not financial advice. 
                  Always do your own research and consult with financial professionals before making investment decisions.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Can I ask the AI about specific stocks?</h4>
                <p className="text-gray-700">
                  Yes! You can ask about specific stocks, market trends, technical analysis, and more. 
                  The AI can provide insights based on available market data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resources Section */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Learning Resources</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="flex items-center mb-6">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Trading Guides</h3>
              <p className="text-gray-600 mb-6">
                Comprehensive guides covering everything from basic trading concepts to advanced strategies.
              </p>
              <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">
                Browse Guides →
              </a>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="flex items-center mb-6">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Video className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Video Tutorials</h3>
              <p className="text-gray-600 mb-6">
                Step-by-step video tutorials showing you how to use every feature of the platform.
              </p>
              <a href="#" className="text-green-600 hover:text-green-800 font-medium">
                Watch Videos →
              </a>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="flex items-center mb-6">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">API Documentation</h3>
              <p className="text-gray-600 mb-6">
                Technical documentation for developers who want to integrate with our platform.
              </p>
              <a href="#" className="text-purple-600 hover:text-purple-800 font-medium">
                View Docs →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Support */}
      <div className="py-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Still Need Help?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Our support team is here to help you succeed with Vidality.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 rounded-lg p-6">
              <Mail className="h-8 w-8 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Email Support</h3>
              <p className="text-blue-100 mb-4">Get help via email</p>
              <a href="mailto:amar@vidality.com" className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                Send Email
              </a>
            </div>

            <div className="bg-white/10 rounded-lg p-6">
              <Phone className="h-8 w-8 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Phone Support</h3>
              <p className="text-blue-100 mb-4">Call us directly</p>
              <a href="tel:+15551234567" className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                Call Now
              </a>
            </div>

            <div className="bg-white/10 rounded-lg p-6">
              <MessageCircle className="h-8 w-8 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Live Chat</h3>
              <p className="text-blue-100 mb-4">Chat with our team</p>
              <a href="/treadgpt" className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                Start Chat
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
