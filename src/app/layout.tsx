import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@/lib/startup' // Initialize price alert scheduler
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { NextAuthProvider } from '@/components/auth/NextAuthProvider'
import NoSSR from '@/components/NoSSR'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'

// Force dynamic rendering and disable caching to prevent static prerender errors during build
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

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
      <head>
        {/* Force desktop layout on small screens before first paint while keeping zoom */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var optOut = false;
    try { optOut = (localStorage.getItem('forceDesktopViewport') === 'false'); } catch (e) {}
    var isSmall = Math.min(screen.width, screen.height) < 900;
    if (!optOut && isSmall) {
      var m = document.querySelector('meta[name="viewport"]');
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute('name', 'viewport');
        document.head.appendChild(m);
      }
      m.setAttribute(
        'content',
        'width=1280, initial-scale=0.5, maximum-scale=5, user-scalable=yes, viewport-fit=cover'
      );
    }
  } catch (e) {}
})();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <NoSSR>
          <NextAuthProvider>
            <ThemeProvider>
              {children}
              <Toaster />
              <SonnerToaster />
            </ThemeProvider>
          </NextAuthProvider>
        </NoSSR>
      </body>
    </html>
  )
}

 