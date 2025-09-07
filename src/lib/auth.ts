import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './db'
import { AuthService } from './auth-service'

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
  adapter: PrismaAdapter(prisma),
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
        console.log('🔐 NextAuth SignIn callback:', { 
          email: user.email, 
          provider: account?.provider,
          profileId: (profile as any)?.id 
        })

        // For Google OAuth, ensure user exists in our database
        if (account?.provider === 'google' && user.email) {
          // Check if user exists in our custom User table
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })

          if (!existingUser) {
            // Create user in our custom User table
            console.log('👤 Creating new user from Google OAuth:', user.email)
            
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
            
            console.log('✅ User created successfully:', newUser.id)
            // Set the user ID for the session
            user.id = newUser.id
          } else {
            console.log('✅ Existing user found:', existingUser.id)
            // Set the user ID for the session
            user.id = existingUser.id
            
            // Check if account is locked or disabled
            if (existingUser.isAccountLocked || existingUser.isAccountDisabled) {
              console.log('❌ Account is locked or disabled:', existingUser.id)
              return false
            }
          }
        }

        return true
      } catch (error) {
        console.error('❌ NextAuth SignIn callback error:', error)
        return false
      }
    },
    async jwt({ token, user, account }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account && user) {
        console.log('🔐 NextAuth JWT callback - new session:', { 
          email: user.email, 
          provider: account.provider 
        })
        
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
      console.log('🔀 NextAuth redirect callback:', { url, baseUrl })
      
      // If redirecting to dashboard, redirect to our custom callback first
      if (url === `${baseUrl}/dashboard` || url === '/dashboard') {
        return `${baseUrl}/api/auth/callback/google`
      }
      
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('🎉 NextAuth SignIn event:', { 
        email: user.email, 
        provider: account?.provider,
        isNewUser 
      })
    },
    async signOut({ token }) {
      console.log('👋 NextAuth SignOut event:', { email: token?.email })
    },
    async session({ session, token }) {
      console.log('🔐 NextAuth Session event:', { 
        hasSession: !!session,
        hasToken: !!token,
        email: session?.user?.email 
      })
    }
  },
  debug: process.env.NODE_ENV === 'development',
}
