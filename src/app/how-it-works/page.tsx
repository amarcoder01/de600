"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VidalityLogo } from '@/components/ui/VidalityLogo'
import { 
  Brain,
  BarChart3,
  TrendingUp,
  Activity,
  Shield,
  Zap,
  Cpu,
  Target,
  Globe
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function HowItWorksPage() {
  const router = useRouter()
  React.useEffect(() => {
    const routes = [
      '/ai-predictions',
      '/advanced-charts',
      '/strategy-builder',
      '/backtesting',
      '/screener',
      '/stock-comparison',
      '/market-view',
      '/top-movers',
      '/news',
      '/watchlist',
      '/price-alerts',
      '/paper-trading',
      '/portfolio-manager',
      '/treadgpt',
      '/notifications',
      '/register',
      '/login',
    ]
    try {
      routes.forEach((r) => router.prefetch(r))
    } catch (e) {
      // no-op fallback if prefetch is unavailable in this environment
    }
  }, [router])
  const toc = [
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'ai-predictions', label: 'AI Predictions' },
    { id: 'advanced-charts', label: 'Advanced Charts' },
    { id: 'strategy-builder', label: 'Strategy Builder' },
    { id: 'backtesting', label: 'Backtesting' },
    { id: 'screener', label: 'Stock Screener' },
    { id: 'comparison', label: 'Stock Comparison' },
    { id: 'market-view', label: 'Market View' },
    { id: 'top-movers', label: 'Top Movers' },
    { id: 'news', label: 'Market News + AI' },
    { id: 'watchlists', label: 'Watchlists' },
    { id: 'price-alerts', label: 'Price Alerts' },
    { id: 'paper-trading', label: 'Paper Trading' },
    { id: 'portfolio', label: 'Portfolio Manager' },
    { id: 'tradegpt', label: 'TradeGPT Assistant' },
  ]

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <section className="relative px-4 pt-28 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <VidalityLogo className="h-8 w-auto text-white" />
            <span className="text-slate-400">•</span>
            <span className="text-slate-300">How It Works</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left mb-10"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Master Vidality in Minutes</h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl">
              Learn how to get the most from every feature — from AI predictions to paper trading —
              with a production-ready workflow you can repeat daily.
            </p>
          </motion.div>

          {/* Layout: TOC + Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* TOC (sticky on desktop) */}
            <aside className="lg:col-span-3">
              <Card className="bg-white/5 border-white/10 sticky top-24 hidden lg:block">
                <CardHeader>
                  <CardTitle className="text-white text-sm tracking-wide">On this page</CardTitle>
                </CardHeader>
                <CardContent>
                  <nav className="space-y-2">
                    {toc.map((t) => (
                      <a key={t.id} href={`#${t.id}`} className="block text-slate-300 hover:text-white text-sm">
                        {t.label}
                      </a>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            </aside>

            {/* Content */}
            <div className="lg:col-span-9 space-y-8">
              {/* Getting Started */}
              <FeatureSection id="getting-started" title="Getting Started" icon={Globe}>
                <ol className="list-decimal pl-6 space-y-2 text-gray-300">
                  <li>Register an account from the landing page or <Link className="underline hover:text-white" href="/register">/register</Link>.</li>
                  <li>Create your first <Link className="underline hover:text-white" href="/watchlist">watchlist</Link> and add symbols.</li>
                  <li>Enable <Link className="underline hover:text-white" href="/price-alerts">price alerts</Link> for key levels.</li>
                  <li>Open <Link className="underline hover:text-white" href="/advanced-charts">Pro Charts</Link> for your primary symbol.</li>
                </ol>
                <Tips items={[
                  'Use multiple watchlists to separate strategies or sectors.',
                  'Start with paper trading before going live.'
                ]} />
              </FeatureSection>

              {/* AI Predictions */}
              <FeatureSection id="ai-predictions" title="AI Predictions" icon={Brain}>
                <Steps items={[
                  'Go to AI Predictions: ' ,
                  'Select a symbol and timeframe (e.g., 1D or 1H).',
                  'Review predicted direction, confidence, and recent model performance.',
                  'Use predictions with chart support/resistance and risk rules.'
                ]} link={{ href: '/ai-predictions', label: 'Open AI Predictions' }} />
                <Tips items={[
                  'Combine with screener outputs to find candidates faster.',
                  'Treat confidence as context, not a guarantee.'
                ]} />
              </FeatureSection>

              {/* Advanced Charts */}
              <FeatureSection id="advanced-charts" title="Advanced Charts" icon={BarChart3}>
                <Steps items={[
                  'Open Pro Charts and choose a theme and timeframe.',
                  'Add indicators (e.g., RSI, MACD) and draw levels or trendlines.',
                  'Use AI Chart Insights and Pattern Recognition to speed analysis.',
                  'Export or share charts for notes and collaboration.'
                ]} link={{ href: '/advanced-charts', label: 'Open Pro Charts' }} />
                <Tips items={['Save layouts for reuse across symbols.']} />
              </FeatureSection>

              {/* Strategy Builder */}
              <FeatureSection id="strategy-builder" title="Strategy Builder" icon={Target}>
                <Steps items={[
                  'Define entry/exit rules with technical and AI conditions.',
                  'Set risk parameters (stop, take-profit, position sizing).',
                  'Run simulations or send to Backtesting for historical validation.'
                ]} link={{ href: '/strategy-builder', label: 'Open Strategy Builder' }} />
              </FeatureSection>

              {/* Backtesting */}
              <FeatureSection id="backtesting" title="Backtesting" icon={TrendingUp}>
                <Steps items={[
                  'Choose engine (Polygon or qlib) and your strategy.',
                  'Set date range, symbols, and parameters.',
                  'Run and review performance (Sharpe, drawdown, win rate, trades).'
                ]} link={{ href: '/backtesting', label: 'Open Backtesting' }} />
                <Tips items={[
                  'Validate robustness across multiple symbols and regimes.',
                  'Avoid overfitting by keeping parameter counts modest.'
                ]} />
              </FeatureSection>

              {/* Screener */}
              <FeatureSection id="screener" title="Stock Screener" icon={Globe}>
                <Steps items={[
                  'Open Screener and pick your universe or sector.',
                  'Select filters (momentum, volatility, fundamentals, etc.).',
                  'Save and re-run presets for daily scans.'
                ]} link={{ href: '/screener', label: 'Open Screener' }} />
              </FeatureSection>

              {/* Comparison */}
              <FeatureSection id="comparison" title="Stock Comparison" icon={BarChart3}>
                <Steps items={[
                  'Enter multiple symbols to compare performance and key metrics.',
                  'Use relative strength to pick leaders vs laggards.'
                ]} link={{ href: '/stock-comparison', label: 'Open Comparison' }} />
              </FeatureSection>

              {/* Market View */}
              <FeatureSection id="market-view" title="Market View" icon={Globe}>
                <Steps items={[
                  'Browse real-time lists and search for symbols.',
                  'Open the details modal for quick stats and session info.'
                ]} link={{ href: '/market-view', label: 'Open Market View' }} />
              </FeatureSection>

              {/* Top Movers */}
              <FeatureSection id="top-movers" title="Top Movers" icon={TrendingUp}>
                <Steps items={[
                  'Check gainers/losers and session state (pre/regular/after-hours).',
                  'Use as a starting point for deeper analysis.'
                ]} link={{ href: '/top-movers', label: 'Open Top Movers' }} />
              </FeatureSection>

              {/* News */}
              <FeatureSection id="news" title="Market News + AI" icon={Zap}>
                <Steps items={[
                  'Filter by category and sentiment for relevance.',
                  'Bookmark and share; use AI insights for context.'
                ]} link={{ href: '/news', label: 'Open News' }} />
              </FeatureSection>

              {/* Watchlists */}
              <FeatureSection id="watchlists" title="Watchlists" icon={Cpu}>
                <Steps items={[
                  'Create multiple watchlists (e.g., Swing, Earnings, Long-term).',
                  'Add/remove symbols and rely on real-time updates.'
                ]} link={{ href: '/watchlist', label: 'Open Watchlists' }} />
              </FeatureSection>

              {/* Price Alerts */}
              <FeatureSection id="price-alerts" title="Price Alerts" icon={Activity}>
                <Steps items={[
                  'Create alerts with conditions (price hits, crosses, % change).',
                  'Enable the scheduler and monitor active/triggered history.'
                ]} link={{ href: '/price-alerts', label: 'Open Price Alerts' }} />
                <Tips items={['Use alerts to enforce discipline on entries/exits.']} />
              </FeatureSection>

              {/* Paper Trading */}
              <FeatureSection id="paper-trading" title="Paper Trading" icon={Cpu}>
                <Steps items={[
                  'Create a paper account and practice placing orders.',
                  'Monitor positions, orders, and history with real-time refresh.',
                  'Export transactions for analysis.'
                ]} link={{ href: '/paper-trading', label: 'Open Paper Trading' }} />
              </FeatureSection>

              {/* Portfolio Manager */}
              <FeatureSection id="portfolio" title="Portfolio Manager" icon={BarChart3}>
                <Steps items={[
                  'Track performance, allocations, and P&L over time.',
                  'Use insights to rebalance and manage risk.'
                ]} link={{ href: '/portfolio-manager', label: 'Open Portfolio Manager' }} />
              </FeatureSection>

              {/* TradeGPT */}
              <FeatureSection id="tradegpt" title="TradeGPT Assistant" icon={Cpu}>
                <Steps items={[
                  'Open TradeGPT and ask questions about markets or strategies.',
                  'Upload charts or files for AI analysis and explanations.'
                ]} link={{ href: '/treadgpt', label: 'Open TradeGPT' }} />
              </FeatureSection>

              

              {/* CTA Buttons */}
              <div className="pt-4 flex flex-wrap gap-3">
                <Link href="/register">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">Get Started Free</Button>
                </Link>
                <Link href="/advanced-charts">
                  <Button variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10">Pro Charts</Button>
                </Link>
                <Link href="/backtesting">
                  <Button variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10">Backtesting</Button>
                </Link>
                <Link href="/paper-trading">
                  <Button variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10">Paper Trading</Button>
                </Link>
                <Link href="/price-alerts">
                  <Button variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10">Price Alerts</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

// Reusable components
function FeatureSection({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  )
}

function Steps({ items, link }: { items: (string | React.ReactNode)[]; link?: { href: string; label: string } }) {
  return (
    <div className="space-y-3">
      <ol className="list-decimal pl-6 space-y-2 text-gray-300">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
      {link && (
        <div className="pt-2">
          <Link href={link.href} className="inline-flex items-center text-blue-400 hover:text-blue-300 underline">
            {link.label}
          </Link>
        </div>
      )}
    </div>
  )
}

function Tips({ items }: { items: string[] }) {
  return (
    <div className="mt-4">
      <div className="text-slate-300 text-sm font-semibold mb-1">Tips</div>
      <ul className="list-disc pl-6 text-gray-400 space-y-1">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  )
}
