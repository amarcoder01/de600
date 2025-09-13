import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import type { Adapter } from 'next-auth/adapters'
import { prisma } from './db'
import { AuthService } from './auth-service'

// Logging helpers to avoid PII exposure in production
const isDev = process.env.NODE_ENV !== 'production'
function redactEmail(email?: string | null): string | undefined {
  if (!email) return email ?? undefined
  const [user, domain] = email.split('@')
  if (!domain) return 'redacted'
  const safeUser = user.length <= 2 ? '*'.repeat(user.length) : user.slice(0, 2) + '***'
  return `${safeUser}@${domain}`
}

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      firstName?: string
      lastName?: string
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    firstName?: string
    lastName?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    firstName?: string
    lastName?: string
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as unknown as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (isDev) {
          console.log('🔐 NextAuth SignIn callback:', { 
            email: redactEmail(user.email), 
            provider: account?.provider,
            profileId: (profile as any)?.id 
          })
        }

        // For Google OAuth, ensure user exists in our database
        if (account?.provider === 'google' && user.email) {
          // Check if user exists in our custom User table
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })

          if (!existingUser) {
            // Create user in our custom User table
            if (isDev) console.log('👤 Creating new user from Google OAuth:', redactEmail(user.email))
            
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                firstName: user.name?.split(' ')[0] || 'User',
                lastName: user.name?.split(' ').slice(1).join(' ') || '',
                password: '$2a$10$google.oauth.user.no.password.required',
                isEmailVerified: true, // Google emails are pre-verified
                isAccountLocked: false,
                isAccountDisabled: false,
                failedLoginAttempts: 0,
                privacyPolicyAccepted: true,
                privacyPolicyAcceptedAt: new Date(),
                preferences: JSON.stringify({
                  theme: 'system',
                  currency: 'USD',
                  timezone: 'UTC',
                  notifications: {
                    email: true,
                    push: true,
                    sms: false
                  },
                  security: {
                    mfaEnabled: false,
                    trustedDevices: [],
                    lastPasswordChange: new Date().toISOString()
                  }
                })
              }
            })
            
            if (isDev) console.log('✅ User created successfully:', newUser.id)
            // Set the user ID for the session
            user.id = newUser.id
          } else {
            if (isDev) console.log('✅ Existing user found:', existingUser.id)
            // Set the user ID for the session
            user.id = existingUser.id
            
            // Check if account is locked or disabled
            if (existingUser.isAccountLocked || existingUser.isAccountDisabled) {
              if (isDev) console.log('❌ Account is locked or disabled:', existingUser.id)
              return false
            }
          }
        }

        return true
      } catch (error) {
        console.error('❌ NextAuth SignIn callback error')
        return false
      }
    },
    async jwt({ token, user, account }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account && user) {
        if (isDev) {
          console.log('🔐 NextAuth JWT callback - new session:', { 
            email: redactEmail(user.email), 
            provider: account.provider 
          })
        }
        
        // Get user from our custom User table
        if (user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email }
          })
          
          if (dbUser) {
            token.userId = dbUser.id
            token.email = dbUser.email
            token.firstName = dbUser.firstName
            token.lastName = dbUser.lastName
          }
        }
      }
      
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token.userId && session.user) {
        session.user.id = token.userId as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
      }
      
      return session
    },
    async redirect({ url, baseUrl }) {
      if (isDev) console.log('🔀 NextAuth redirect callback')

      // If NextAuth is attempting to send the user to the dashboard (or root),
      // first route through our post-login endpoint which converts the
      // NextAuth session into our app's JWT cookies/localStorage expectations.
      const target = typeof url === 'string' ? url : ''
      const isDash = target === '/dashboard' || target === `${baseUrl}/dashboard`
      const isRoot = target === '/' || target === `${baseUrl}`
      if (isDash || isRoot) {
        // Send users to a client page that performs a server exchange
        // to mint app-specific JWT cookies, then navigates to /dashboard.
        return `${baseUrl}/auth/post-login`
      }

      // Allows relative callback URLs
      if (target.startsWith('/')) return `${baseUrl}${target}`
      // Allows callback URLs on the same origin
      else if (new URL(target).origin === baseUrl) return target
      return baseUrl
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      if (isDev) {
        console.log('🎉 NextAuth SignIn event:', { 
          email: redactEmail(user.email), 
          provider: account?.provider,
          isNewUser 
        })
      }
    },
    async signOut({ token }) {
      if (isDev) console.log('👋 NextAuth SignOut event')
    },
    async session({ session, token }) {
      if (isDev) {
        console.log('🔐 NextAuth Session event:', { 
          hasSession: !!session,
          hasToken: !!token
        })
      }
    }
  },
  debug: process.env.NODE_ENV === 'development',
}
