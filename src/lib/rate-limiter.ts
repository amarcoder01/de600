interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export class RateLimiter {
  private windowMs: number
  private maxRequests: number

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 5) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const entry = rateLimitStore.get(identifier)

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      })
      return true
    }

    if (entry.count >= this.maxRequests) {
      return false
    }

    // Increment count
    entry.count++
    return true
  }

  getRemainingTime(identifier: string): number {
    const entry = rateLimitStore.get(identifier)
    if (!entry) return 0
    return Math.max(0, entry.resetTime - Date.now())
  }

  reset(identifier: string): void {
    rateLimitStore.delete(identifier)
  }
}

// Create rate limiters for different endpoints
export const authRateLimiter = new RateLimiter(15 * 60 * 1000, 5) // 5 attempts per 15 minutes
export const registerRateLimiter = new RateLimiter(60 * 60 * 1000, 3) // 3 registrations per hour
