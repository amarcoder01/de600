import sgMail from '@sendgrid/mail'

export interface EmailData {
  to: string
  subject: string
  html: string
  text: string
}

export interface PriceAlertEmailData {
  symbol: string
  assetName: string
  currentPrice: number
  targetPrice: number
  condition: 'above' | 'below'
  userEmail: string
}

export class EmailService {
  private static isInitialized = false

  // Initialize SendGrid with API key
  static initialize() {
    if (this.isInitialized) {
      return
    }

    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) {
      console.warn('⚠️ SENDGRID_API_KEY not found in environment variables')
      return
    }

    sgMail.setApiKey(apiKey)
    this.isInitialized = true
    console.log('✅ SendGrid email service initialized')
  }

  // Send a generic email
  static async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      this.initialize()

      if (!this.isInitialized) {
        console.error('❌ Email service not initialized - missing SENDGRID_API_KEY')
        return false
      }

             const msg = {
         to: emailData.to,
         from: process.env.SENDGRID_FROM_EMAIL || 'noreply@vidality.com',
         subject: emailData.subject,
         text: emailData.text,
         html: emailData.html,
       }

      await sgMail.send(msg)
      console.log(`✅ Email sent successfully to ${emailData.to}`)
      return true
    } catch (error) {
      console.error('❌ Error sending email:', error)
      return false
    }
  }

  // Send price alert notification email
  static async sendPriceAlertEmail(alertData: PriceAlertEmailData): Promise<boolean> {
    try {
      const subject = `Price Alert: ${alertData.symbol}`
      const condition = alertData.condition === 'above' ? 'reached' : 'dropped below'
      
      const html = this.createPriceAlertHTML(alertData)
      const text = this.createPriceAlertText(alertData)

      return await this.sendEmail({
        to: alertData.userEmail,
        subject,
        html,
        text
      })
    } catch (error) {
      console.error('❌ Error sending price alert email:', error)
      return false
    }
  }

  // Create HTML email content for price alerts
  private static createPriceAlertHTML(data: PriceAlertEmailData): string {
    const condition = data.condition === 'above' ? 'reached' : 'dropped below'
    const priceColor = data.currentPrice >= data.targetPrice ? '#10b981' : '#ef4444'
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Price Alert: ${data.symbol}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert-box { background: #fff; border-left: 4px solid ${priceColor}; padding: 20px; margin: 20px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .price { font-size: 24px; font-weight: bold; color: ${priceColor}; }
          .symbol { font-size: 28px; font-weight: bold; color: #2d3748; }
          .condition { background: ${priceColor}; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; margin: 10px 0; }
          .footer { text-align: center; margin-top: 30px; color: #718096; font-size: 14px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Price Alert Triggered</h1>
            <p>Your price alert condition has been met!</p>
          </div>
          
          <div class="content">
            <div class="alert-box">
              <div class="symbol">${data.symbol}</div>
              <div style="color: #718096; margin-bottom: 15px;">${data.assetName}</div>
              
              <div class="condition">
                Price has ${condition} your target
              </div>
              
              <div style="margin: 20px 0;">
                <div style="margin-bottom: 10px;">
                  <strong>Current Price:</strong> 
                  <span class="price">$${data.currentPrice.toFixed(2)}</span>
                </div>
                <div style="margin-bottom: 10px;">
                  <strong>Target Price:</strong> 
                  <span style="font-weight: bold; color: #2d3748;">$${data.targetPrice.toFixed(2)}</span>
                </div>
                <div style="margin-bottom: 10px;">
                  <strong>Condition:</strong> 
                  <span style="text-transform: capitalize;">${data.condition}</span>
                </div>
              </div>
              
              <div style="background: #e2e8f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>⚠️ Alert Status:</strong> This alert has been triggered and is now inactive. 
                You can create a new alert if needed.
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/price-alerts" class="button">
                View Price Alerts
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from Vidality Trading Platform</p>
            <p>© 2024 Vidality. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Create plain text email content for price alerts
  private static createPriceAlertText(data: PriceAlertEmailData): string {
    const condition = data.condition === 'above' ? 'reached' : 'dropped below'
    
    return `
🚨 PRICE ALERT TRIGGERED

Your price alert condition has been met!

Symbol: ${data.symbol}
Asset: ${data.assetName}
Current Price: $${data.currentPrice.toFixed(2)}
Target Price: $${data.targetPrice.toFixed(2)}
Condition: ${data.condition.toUpperCase()}

The price has ${condition} your target of $${data.targetPrice.toFixed(2)}.

⚠️ Alert Status: This alert has been triggered and is now inactive. You can create a new alert if needed.

View your price alerts: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/price-alerts

---
This is an automated notification from Vidality Trading Platform
© 2024 Vidality. All rights reserved.
    `.trim()
  }

  // Test email service
  static async testEmail(to: string): Promise<boolean> {
    try {
      const testData: PriceAlertEmailData = {
        symbol: 'TEST',
        assetName: 'Test Asset',
        currentPrice: 100.00,
        targetPrice: 95.00,
        condition: 'above',
        userEmail: to
      }

      return await this.sendPriceAlertEmail(testData)
    } catch (error) {
      console.error('❌ Error in test email:', error)
      return false
    }
  }
}
