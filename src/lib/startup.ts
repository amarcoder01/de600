import { priceAlertScheduler } from './price-alert-scheduler'

// Auto-start the price alert scheduler
export function initializePriceAlertScheduler() {
  // Guard: never run during Next.js build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('⏸️ Skipping price alert scheduler (build phase)')
    return
  }

  // Only start in production Node.js runtime on Render web service
  const isProduction = process.env.NODE_ENV === 'production'
  const isRender = process.env.RENDER === 'true' || process.env.RENDER === '1'
  const isNodeRuntime = process.env.NEXT_RUNTIME !== 'edge'

  if (isProduction && isRender && isNodeRuntime) {
    console.log('🚀 Initializing Price Alert Scheduler...')
    priceAlertScheduler.start()
  } else {
    console.log('⏸️ Skipping price alert scheduler initialization (not in production Node.js runtime)')
  }
}

// Initialize on module load only in production runtime
if (typeof window === 'undefined') { // Server-side only
  initializePriceAlertScheduler()
}
