import { priceAlertScheduler } from './price-alert-scheduler'

// Auto-start the price alert scheduler
export function initializePriceAlertScheduler() {
  // Only start in production runtime, not during build
  if (process.env.NODE_ENV === 'production' && process.env.RENDER === 'true') {
    console.log('🚀 Initializing Price Alert Scheduler...')
    priceAlertScheduler.start()
  } else {
    console.log('⏸️ Skipping price alert scheduler initialization (not in production runtime)')
  }
}

// Initialize on module load only in production runtime
if (typeof window === 'undefined') { // Server-side only
  initializePriceAlertScheduler()
}
