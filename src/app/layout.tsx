import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@/lib/startup' // Initialize price alert scheduler
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import NoSSR from '@/components/NoSSR'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Vidality - Professional Trading Platform',
  description: 'Advanced trading platform with real-time data, AI-powered analysis, and professional tools for US stock market traders.',
  keywords: 'vidality, trading, US stocks, NYSE, NASDAQ, real-time data, AI trading',
  authors: [{ name: 'Vidality Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Vidality - Professional Trading Platform',
    description: 'Advanced trading platform with real-time data, AI-powered analysis, and professional tools for US stock market traders.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vidality - Professional Trading Platform',
    description: 'Advanced trading platform with real-time data, AI-powered analysis, and professional tools for US stock market traders.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <NoSSR>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </NoSSR>
      </body>
    </html>
  )
} 