import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

interface User {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  isEmailVerified: boolean
  createdAt: string
  updatedAt: string
  preferences: {
    theme: string
    currency: string
    timezone: string
    notifications: {
      email: boolean
      push: boolean
      sms: boolean
    }
  }
}

const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json')

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.dirname(USERS_FILE_PATH)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Load users from file
function loadUsers(): User[] {
  try {
    ensureDataDirectory()
    if (!fs.existsSync(USERS_FILE_PATH)) {
      // Create initial users file with demo user
      const initialUsers: User[] = [
        {
          id: '1',
          email: 'demo@vidality.com',
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
          firstName: 'Demo',
          lastName: 'User',
          isEmailVerified: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          preferences: {
            theme: 'system',
            currency: 'USD',
            timezone: 'UTC',
            notifications: {
              email: true,
              push: true,
              sms: false
            }
          }
        }
      ]
      fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(initialUsers, null, 2))
      return initialUsers
    }
    
    const data = fs.readFileSync(USERS_FILE_PATH, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error loading users:', error)
    return []
  }
}

// Save users to file
function saveUsers(users: User[]): void {
  try {
    ensureDataDirectory()
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2))
  } catch (error) {
    console.error('Error saving users:', error)
  }
}

// Find user by email
export function findUserByEmail(email: string): User | undefined {
  const users = loadUsers()
  return users.find(u => u.email === email)
}

// Find user by ID
export function findUserById(id: string): User | undefined {
  const users = loadUsers()
  return users.find(u => u.id === id)
}

// Create new user
export function createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
  const users = loadUsers()
  const newUser: User = {
    ...userData,
    id: (users.length + 1).toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  users.push(newUser)
  saveUsers(users)
  return newUser
}

// Update user
export function updateUser(id: string, updates: Partial<User>): User | null {
  const users = loadUsers()
  const userIndex = users.findIndex(u => u.id === id)
  
  if (userIndex === -1) return null
  
  users[userIndex] = {
    ...users[userIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  }
  
  saveUsers(users)
  return users[userIndex]
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}
