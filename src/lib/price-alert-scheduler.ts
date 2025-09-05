import { PriceAlertService } from './price-alert-service'

class PriceAlertScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private checkInterval = 300000 // 5 minutes to reduce log spam

  // Start the automatic price checking scheduler
  start() {
    if (this.isRunning) {
      console.log('⚠️ Price alert scheduler is already running')
      return
    }

    console.log('🚀 Starting automatic price alert scheduler (every 5 minutes)')
    this.isRunning = true

    // Run initial check immediately
    this.checkAlerts()

    // Set up interval for periodic checks
    this.intervalId = setInterval(() => {
      this.checkAlerts()
    }, this.checkInterval)
  }

  // Stop the automatic price checking scheduler
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Price alert scheduler is not running')
      return
    }

    console.log('🛑 Stopping automatic price alert scheduler')
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  // Check if scheduler is running
  isActive(): boolean {
    return this.isRunning
  }

  // Get the current interval in seconds
  getIntervalSeconds(): number {
    return this.checkInterval / 1000
  }

  // Manual check alerts (can be called independently)
  async checkAlerts() {
    try {
      console.log(`🔍 [${new Date().toLocaleTimeString()}] Running automatic price alert check...`)
      await PriceAlertService.checkAllAlerts()
      console.log(`✅ [${new Date().toLocaleTimeString()}] Automatic price alert check completed`)
    } catch (error) {
      console.error(`❌ [${new Date().toLocaleTimeString()}] Error in automatic price alert check:`, error)
    }
  }

  // Get next check time
  getNextCheckTime(): Date {
    if (!this.isRunning || !this.intervalId) {
      return new Date()
    }
    
    const now = new Date()
    return new Date(now.getTime() + this.checkInterval)
  }
}

// Create singleton instance
export const priceAlertScheduler = new PriceAlertScheduler()

// Auto-start scheduler when this module is imported (only in production)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  priceAlertScheduler.start()
}
