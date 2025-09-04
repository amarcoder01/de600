import { PrismaClient } from '@prisma/client'
import { EmailService } from './email-service'
import { RealTimePriceService } from './real-time-price-service'

const prisma = new PrismaClient()

export class PriceAlertService {
  // Check all active price alerts
  static async checkAllAlerts(): Promise<void> {
    try {
      console.log('🔍 Checking all active price alerts...')
      
      // Get all active alerts
      const activeAlerts = await prisma.priceAlert.findMany({
        where: {
          status: 'active',
          isActive: true
        }
      })

      console.log(`📊 Found ${activeAlerts.length} active alerts to check`)

      // Group alerts by symbol to minimize API calls
      const symbolGroups = this.groupAlertsBySymbol(activeAlerts)

      for (const [symbol, alerts] of Object.entries(symbolGroups)) {
        await this.checkAlertsForSymbol(symbol, alerts)
      }

      console.log('✅ Price alert check completed')
    } catch (error) {
      console.error('❌ Error checking price alerts:', error)
    }
  }

  // Group alerts by symbol to optimize API calls
  private static groupAlertsBySymbol(alerts: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {}
    
    for (const alert of alerts) {
      if (!groups[alert.symbol]) {
        groups[alert.symbol] = []
      }
      groups[alert.symbol].push(alert)
    }
    
    return groups
  }

  // Check alerts for a specific symbol
  private static async checkAlertsForSymbol(symbol: string, alerts: any[]): Promise<void> {
    try {
      console.log(`📈 Checking ${alerts.length} alerts for ${symbol}`)
      
      // Get current price for the symbol
      const priceData = await this.getCurrentPrice(symbol)
      
      if (!priceData || !priceData.price) {
        console.warn(`⚠️ Could not get price data for ${symbol}`)
        return
      }

      const currentPrice = priceData.price
      console.log(`💰 Current price for ${symbol}: $${currentPrice}`)

      // Check each alert
      for (const alert of alerts) {
        await this.checkSingleAlert(alert, currentPrice)
      }
    } catch (error) {
      console.error(`❌ Error checking alerts for ${symbol}:`, error)
    }
  }

  // Check a single alert
  private static async checkSingleAlert(alert: any, currentPrice: number): Promise<void> {
    try {
      const shouldTrigger = this.shouldTriggerAlert(alert, currentPrice)
      
      if (shouldTrigger) {
        console.log(`🚨 Alert triggered for ${alert.symbol}: ${alert.condition} $${alert.targetPrice} (Current: $${currentPrice})`)
        await this.triggerAlert(alert, currentPrice)
      } else {
        // Update last checked time
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { lastChecked: new Date() }
        })
      }
    } catch (error) {
      console.error(`❌ Error checking alert ${alert.id}:`, error)
    }
  }

  // Determine if an alert should be triggered
  private static shouldTriggerAlert(alert: any, currentPrice: number): boolean {
    if (alert.condition === 'above') {
      return currentPrice >= alert.targetPrice
    } else if (alert.condition === 'below') {
      return currentPrice <= alert.targetPrice
    }
    return false
  }

  // Trigger an alert and send notification
  private static async triggerAlert(alert: any, currentPrice: number): Promise<void> {
    try {
      console.log(`🚨 Triggering alert for ${alert.symbol} (ID: ${alert.id})`)
      console.log(`📧 Sending email to: ${alert.userEmail}`)
      
      // Get asset name from price data
      const priceData = await RealTimePriceService.getRealTimePrice(alert.symbol)
      const assetName = priceData?.name || alert.symbol
      
      console.log(`📊 Alert details: ${alert.symbol} ${alert.condition} $${alert.targetPrice} (Current: $${currentPrice})`)
      
      // First, mark the alert as triggered regardless of email status
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: {
          status: 'triggered',
          isActive: false,
          triggeredAt: new Date(),
          lastChecked: new Date()
        }
      })

      // Try sending the email notification (best-effort)
      let emailSent = false
      try {
        emailSent = await EmailService.sendPriceAlertEmail({
          symbol: alert.symbol,
          assetName: assetName,
          currentPrice: currentPrice,
          targetPrice: alert.targetPrice,
          condition: alert.condition,
          userEmail: alert.userEmail
        })
        if (emailSent) {
          console.log(`✅ Email sent successfully to ${alert.userEmail}`)
        } else {
          console.warn(`⚠️ Email service returned false for alert ${alert.id}`)
        }
      } catch (emailError) {
        console.error(`❌ Error sending email for alert ${alert.id}:`, emailError)
      }

      // Record a single history entry indicating the alert triggered, noting email status
      await prisma.priceAlertHistory.create({
        data: {
          alertId: alert.id,
          action: 'triggered',
          price: currentPrice,
          message: `Alert triggered: ${alert.symbol} ${alert.condition} $${alert.targetPrice} (Current: $${currentPrice}) - Email ${emailSent ? 'sent' : 'not sent'}`
        }
      })

      console.log(`✅ Alert ${alert.id} marked as triggered and history recorded`)
    } catch (error) {
      console.error(`❌ Error triggering alert ${alert.id}:`, error)
      console.error(`📧 Email address: ${alert.userEmail}`)
      console.error(`🔍 Error details:`, error instanceof Error ? error.message : String(error))
      
      // Create history entry for error
      await prisma.priceAlertHistory.create({
        data: {
          alertId: alert.id,
          action: 'triggered',
          price: currentPrice,
          message: `Alert triggered but error occurred during processing: ${error instanceof Error ? error.message : String(error)}`
        }
      })
    }
  }



  // Get current price for a symbol using real-time service
  private static async getCurrentPrice(symbol: string): Promise<{ price: number; name?: string; change?: number; changePercent?: number } | null> {
    try {
      // Use real-time price service for fresh data
      const priceData = await RealTimePriceService.getRealTimePrice(symbol)
      
      if (priceData && priceData.price > 0) {
        return {
          price: priceData.price,
          name: priceData.name,
          change: priceData.change,
          changePercent: priceData.changePercent
        }
      }

      return null
    } catch (error) {
      console.error(`❌ Error getting real-time price for ${symbol}:`, error)
      return null
    }
  }



  // Manual trigger for testing
  static async manualTrigger(alertId: string): Promise<boolean> {
    try {
      const alert = await prisma.priceAlert.findUnique({
        where: { id: alertId }
      })

      if (!alert) {
        console.error('❌ Alert not found:', alertId)
        return false
      }

      const priceData = await this.getCurrentPrice(alert.symbol)
      if (!priceData) {
        console.error('❌ Could not get price data for manual trigger')
        return false
      }

      await this.triggerAlert(alert, priceData.price)
      return true
    } catch (error) {
      console.error('❌ Error in manual trigger:', error)
      return false
    }
  }

  // Get alert statistics
  static async getAlertStats(): Promise<{
    total: number
    active: number
    triggered: number
    cancelled: number
  }> {
    try {
      const [total, active, triggered, cancelled] = await Promise.all([
        prisma.priceAlert.count(),
        prisma.priceAlert.count({ where: { status: 'active', isActive: true } }),
        prisma.priceAlert.count({ where: { status: 'triggered' } }),
        prisma.priceAlert.count({ where: { status: 'cancelled' } })
      ])

      return { total, active, triggered, cancelled }
    } catch (error) {
      console.error('❌ Error getting alert stats:', error)
      return { total: 0, active: 0, triggered: 0, cancelled: 0 }
    }
  }

  // Get current prices for multiple symbols using real-time service
  static async getCurrentPrices(symbols: string[]): Promise<Record<string, { price: number; name?: string; change?: number; changePercent?: number }>> {
    try {
      // Use real-time price service for fresh data
      const realTimePrices = await RealTimePriceService.getRealTimePrices(symbols)
      
      // Convert to expected format
      const prices: Record<string, { price: number; name?: string; change?: number; changePercent?: number }> = {}
      
      for (const [symbol, priceData] of Object.entries(realTimePrices)) {
        prices[symbol] = {
          price: priceData.price,
          name: priceData.name,
          change: priceData.change,
          changePercent: priceData.changePercent
        }
      }
      
      return prices
    } catch (error) {
      console.error('❌ Error getting real-time prices:', error)
      return {}
    }
  }
}
