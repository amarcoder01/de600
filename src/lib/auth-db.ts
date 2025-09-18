import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  isEmailVerified: boolean
  lastLoginAt?: Date
  preferences: any
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserData {
  email: string
  password: string
  firstName: string
  lastName: string
}

// Find user by email
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })
    
    if (!user) return null
    
    // Return user without password
    const { password, ...userWithoutPassword } = user
    return userWithoutPassword as User
  } catch (error) {
    console.error('Error finding user by email:', error)
    return null
  }
}

// Find user by ID
export async function findUserById(id: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id }
    })
    
    if (!user) return null
    
    // Return user without password
    const { password, ...userWithoutPassword } = user
    return userWithoutPassword as User
  } catch (error) {
    console.error('Error finding user by ID:', error)
    return null
  }
}

// Create new user
export async function createUser(userData: CreateUserData): Promise<User> {
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    
    const user = await prisma.user.create({
      data: {
        email: userData.email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        isEmailVerified: false,
        preferences: JSON.stringify({
          theme: 'system',
          currency: 'USD',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            sms: false
          }
        })
      }
    })
    
    // Return user without password
    const { password, ...userWithoutPassword } = user
    return userWithoutPassword as User
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

// Update user
export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    })
    
    if (!user) return null
    
    // Return user without password
    const { password, ...userWithoutPassword } = user
    return userWithoutPassword as User
  } catch (error) {
    console.error('Error updating user:', error)
    return null
  }
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Update last login
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    })
  } catch (error) {
    console.error('Error updating last login:', error)
  }
}

// Check if user exists
export async function userExists(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true }
    })
    return !!user
  } catch (error) {
    console.error('Error checking if user exists:', error)
    return false
  }
}

// Get user with password for authentication
export async function getUserWithPassword(email: string): Promise<{ user: User; password: string } | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })
    
    if (!user) return null
    
    const { password, ...userWithoutPassword } = user
    return {
      user: userWithoutPassword as User,
      password
    }
  } catch (error) {
    console.error('Error getting user with password:', error)
    return null
  }
}
