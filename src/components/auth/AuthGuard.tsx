'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Shield, Lock } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/watchlist',
  '/paper-trading',
  '/portfolio',
  '/alerts',
  '/settings',
  '/profile',
  '/news',
  '/market',
  '/qlib',
  '/tools'
]

// Routes that should redirect authenticated users to dashboard
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/about',
  '/help',
  '/privacy',
  '/terms'
]

export function AuthGuard({ 
  children, 
  requireAuth = false, 
  redirectTo = '/dashboard' 
}: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, checkAuth, authModalOpen } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  const [redirectCount, setRedirectCount] = useState(0)
  const [lastPath, setLastPath] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Prevent redirect loops
  const MAX_REDIRECTS = 3

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsChecking(true)
        
        // Only check authentication if we're on a protected route or require auth
        // For public routes like landing page, skip the auth check to prevent interference
        // This prevents checkAuth from setting isAuthenticated: false and triggering redirects
        if (requireAuth || (pathname && PROTECTED_ROUTES.some(route => pathname.startsWith(route)))) {
          await checkAuth()
          // Add a small delay to ensure state is properly set
          await new Promise(resolve => setTimeout(resolve, 100))
        } else {
          // For public routes, just set initialized without checking auth
          console.log('🔐 AuthGuard: Skipping auth check on public route:', pathname)
        }
        
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setIsChecking(false)
        setHasInitialized(true)
      }
    }

    initializeAuth()
  }, [checkAuth, requireAuth, pathname])

  // Handle authentication state changes and redirects
  useEffect(() => {
    // Don't process redirects until initialization is complete
    if (!hasInitialized || isChecking || isLoading) {
      return
    }

    // If an auth modal is open, do not redirect; let the modal UX complete
    if (authModalOpen) {
      return
    }

    // Prevent infinite redirects
    if (redirectCount >= MAX_REDIRECTS) {
      console.error('Maximum redirects reached. Stopping to prevent loop.')
      return
    }

    // Don't redirect if we're already on the target path
    if (pathname === redirectTo && isAuthenticated) {
      return
    }

    // Don't redirect if we're already on the landing page and not authenticated
    if (pathname === '/' && !isAuthenticated) {
      return
    }

    // Prevent redirect loops by checking if we're bouncing between paths
    if (lastPath === pathname) {
      return
    }

    setLastPath(pathname)

    // Check if current route requires authentication
    const isProtectedRoute = pathname ? PROTECTED_ROUTES.some(route => 
      pathname.startsWith(route)
    ) : false

    // Check if current route is public (should redirect authenticated users)
    const isPublicRoute = pathname ? PUBLIC_ROUTES.some(route => 
      pathname === route
    ) : false

    console.log('🔐 AuthGuard: Processing redirect logic:', {
      isAuthenticated,
      pathname,
      isProtectedRoute,
      isPublicRoute,
      redirectCount
    })

    // Handle authentication routing
    if (isAuthenticated) {
      // If user is authenticated and on a public route, redirect to dashboard
      if (isPublicRoute && pathname === '/') {
        console.log('🔐 AuthGuard: Authenticated user on landing page, redirecting to dashboard')
        setRedirectCount(prev => prev + 1)
        
        // Use a longer delay to ensure modal operations complete
        setTimeout(() => {
          router.replace('/dashboard')
        }, 1000)
        return
      }
      
      // If user is authenticated and on protected route, allow access
      if (isProtectedRoute) {
        console.log('🔐 AuthGuard: Authenticated user accessing protected route')
        return
      }
    } else {
      // If user is not authenticated and on protected route, add a short grace
      // period if we detect an OAuth bridge cookie that will be migrated into
      // localStorage by the store. This avoids redirecting too early right
      // after Google OAuth completes.
      if (isProtectedRoute || requireAuth) {
        try {
          const hasBridgeCookie = typeof document !== 'undefined' && document.cookie.split('; ').some(r => r.startsWith('token_client='))
          if (hasBridgeCookie) {
            console.log('🔐 AuthGuard: Detected token_client cookie, delaying redirect and re-checking auth')
            setTimeout(() => {
              checkAuth()
            }, 800)
            return
          }
        } catch (e) {}

        console.log('🔐 AuthGuard: Unauthenticated user accessing protected route, redirecting to landing')
        setRedirectCount(prev => prev + 1)
        router.replace('/')
        return
      }
    }

    // Reset redirect count if we're on a stable path
    if (pathname === '/' || pathname === '/dashboard') {
      setRedirectCount(0)
    }

  }, [isAuthenticated, isLoading, isChecking, pathname, router, redirectCount, lastPath, requireAuth, redirectTo, hasInitialized, authModalOpen])

  // Additional effect to handle authentication state changes specifically
  useEffect(() => {
    if (hasInitialized && !isChecking && !isLoading) {
      if (authModalOpen) {
        return
      }
      console.log('🔐 AuthGuard: Authentication state changed:', {
        isAuthenticated,
        pathname,
        hasInitialized
      })
      
      // If user just became authenticated and is on landing page, redirect to dashboard
      if (isAuthenticated && pathname === '/' && hasInitialized) {
        console.log('🔐 AuthGuard: User just authenticated on landing page, redirecting to dashboard')
        setRedirectCount(prev => prev + 1)
        
        // Use a delay to ensure modal operations complete
        setTimeout(() => {
          router.replace('/dashboard')
        }, 1000)
      }
    }
  }, [isAuthenticated, pathname, hasInitialized, isChecking, isLoading, router, authModalOpen])

  // Show loading state while checking authentication
  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </motion.div>
      </div>
    )
  }

  // Show error state if too many redirects
  if (redirectCount >= MAX_REDIRECTS) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto p-6"
        >
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">
            Too many redirects detected. Please refresh the page or clear your browser cache.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Refresh Page
          </button>
        </motion.div>
      </div>
    )
  }

  // Render children if authentication check passes
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: { redirectTo?: string } = {}
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <AuthGuard requireAuth={true} redirectTo={options.redirectTo}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}

// Higher-order component for public routes (redirects authenticated users)
export function withPublic<P extends object>(
  Component: React.ComponentType<P>,
  options: { redirectTo?: string } = {}
) {
  return function PublicComponent(props: P) {
    return (
      <AuthGuard requireAuth={false} redirectTo={options.redirectTo || '/dashboard'}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}
