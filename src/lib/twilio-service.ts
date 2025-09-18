import twilio from 'twilio'

class TwilioService {
  private client?: twilio.Twilio
  private accountSid: string
  private authToken: string
  private fromNumber: string
  private whatsappNumber: string

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || ''
    this.authToken = process.env.TWILIO_AUTH_TOKEN || ''
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || ''
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || ''

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.warn('⚠️ Twilio credentials not configured. Notifications will be logged only.')
      return
    }

    this.client = twilio(this.accountSid, this.authToken)
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      if (!this.client) {
        console.log(`📱 [SMS] To: ${to}, Message: ${message}`)
        return true
      }

      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      })

      console.log(`✅ SMS sent successfully. SID: ${result.sid}`)
      return true
    } catch (error) {
      console.error('❌ Error sending SMS:', error)
      return false
    }
  }

  async sendWhatsApp(to: string, message: string): Promise<boolean> {
    try {
      if (!this.client) {
        console.log(`📱 [WhatsApp] To: ${to}, Message: ${message}`)
        return true
      }

      // Format phone number for WhatsApp (remove + if present and add whatsapp: prefix)
      const formattedNumber = to.startsWith('+') ? to.substring(1) : to
      const whatsappTo = `whatsapp:+${formattedNumber}`

      const result = await this.client.messages.create({
        body: message,
        from: `whatsapp:${this.whatsappNumber}`,
        to: whatsappTo
      })

      console.log(`✅ WhatsApp message sent successfully. SID: ${result.sid}`)
      return true
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error)
      return false
    }
  }

  async sendNotification(
    phoneNumber: string, 
    notificationMethod: 'sms' | 'whatsapp', 
    message: string
  ): Promise<boolean> {
    try {
      switch (notificationMethod) {
        case 'sms':
          return await this.sendSMS(phoneNumber, message)
        case 'whatsapp':
          return await this.sendWhatsApp(phoneNumber, message)
        default:
          console.error('❌ Invalid notification method:', notificationMethod)
          return false
      }
    } catch (error) {
      console.error('❌ Error sending notification:', error)
      return false
    }
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic validation - should be a valid phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''))
  }

  // Format phone number for display
  formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    return phoneNumber
  }
}

export const twilioService = new TwilioService()
