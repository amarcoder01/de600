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
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
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
        // Ensure user exists in our app DB when coming via OAuth
        if (user?.email) {
          let dbUser = await prisma.user.findUnique({ where: { email: user.email } })
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email: user.email,
                firstName: user.name?.split(' ')[0] || 'User',
                lastName: user.name?.split(' ').slice(1).join(' ') || '',
                password: '$2a$10$oauth-user-no-password',
                isEmailVerified: true,
                isAccountLocked: false,
                isAccountDisabled: false,
                failedLoginAttempts: 0,
                privacyPolicyAccepted: true,
                privacyPolicyAcceptedAt: new Date(),
                preferences: JSON.stringify({ theme: 'system' })
              }
            })
          }
          // Block locked/disabled
          if (dbUser.isAccountDisabled || dbUser.isAccountLocked) {
            return false
          }
          ;(user as any).id = dbUser.id
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
      const target = typeof url === 'string' ? url : ''
      const isDash = target === '/dashboard' || target === `${baseUrl}/dashboard`
      const isRoot = target === '/' || target === `${baseUrl}`
      if (isDash || isRoot) {
        return `${baseUrl}/auth/post-login`
      }
      if (target.startsWith('/')) return `${baseUrl}${target}`
      try { if (new URL(target).origin === baseUrl) return target } catch {}
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
