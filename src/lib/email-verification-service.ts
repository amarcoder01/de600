/**
 * Email Verification Service
 * Handles email verification code generation, storage, and sending
 */

import crypto from 'crypto'
import { EmailService } from './email-service'
import { secureQuery, SecureUserOperations } from './secure-database'
import { logSecurityEvent, SecurityEventType, SecuritySeverity } from './security-monitoring'

export interface VerificationCode {
  id: string
  userId: string
  email: string
  code: string
  expiresAt: Date
  attempts: number
  isUsed: boolean
  createdAt: Date
}

export interface VerificationResult {
  success: boolean
  error?: string
  remainingAttempts?: number
}

/**
 * Email Verification Service Class
 */
export class EmailVerificationService {
  
  /**
   * Generate a secure 6-digit verification code
   */
  static generateVerificationCode(): string {
    // Generate a 6-digit code with leading zeros if necessary
    const code = crypto.randomInt(100000, 999999).toString()
    return code
  }
  
  /**
   * Create and store verification code for user
   */
  static async createVerificationCode(userId: string, email: string): Promise<{
    success: boolean
    codeId?: string
    code?: string
    error?: string
  }> {
    try {
      // Generate verification code
      const code = this.generateVerificationCode()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      const codeId = crypto.randomUUID()
      
      // Store verification code in database
      const result = await secureQuery(
        `INSERT INTO "EmailVerificationCode" (
          "id", "userId", "email", "code", "expiresAt", "attempts", "isUsed", "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING "id"`,
        [codeId, userId, email.toLowerCase().trim(), code, expiresAt.toISOString(), 0, false, new Date().toISOString()]
      )
      
      if (!result.success) {
        console.error('❌ Failed to create verification code:', result.error)
        return {
          success: false,
          error: 'Failed to create verification code'
        }
      }
      
      return {
        success: true,
        codeId: result.rows[0].id,
        code
      }
      
    } catch (error) {
      console.error('Error creating verification code:', error)
      return {
        success: false,
        error: 'Failed to create verification code'
      }
    }
  }
  
  /**
   * Send verification email
   */
  static async sendVerificationEmail(
    email: string, 
    firstName: string, 
    code: string
  ): Promise<boolean> {
    try {
      const verificationEmailHtml = this.generateVerificationEmailHtml(firstName, code)
      const verificationEmailText = this.generateVerificationEmailText(firstName, code)
      
      const emailSent = await EmailService.sendEmail({
        to: email,
        subject: 'Verify Your Email - Vidality Trading Platform',
        html: verificationEmailHtml,
        text: verificationEmailText
      })
      
      if (emailSent) {
        console.log(`✅ Verification email sent to ${email}`)
        return true
      } else {
        console.error(`❌ Failed to send verification email to ${email}`)
        return false
      }
      
    } catch (error) {
      console.error('Error sending verification email:', error)
      return false
    }
  }
  
  /**
   * Verify email code
   */
  static async verifyCode(
    userId: string, 
    email: string, 
    inputCode: string
  ): Promise<VerificationResult> {
    try {
      // Get the most recent unused verification code for this user
      const codeResult = await secureQuery(
        `SELECT * FROM "EmailVerificationCode" 
         WHERE "userId" = $1 AND "email" = $2 AND "isUsed" = false 
         ORDER BY "createdAt" DESC 
         LIMIT 1`,
        [userId, email.toLowerCase().trim()]
      )
      
      if (!codeResult.success || codeResult.rows.length === 0) {
        return {
          success: false,
          error: 'No verification code found. Please request a new one.'
        }
      }
      
      const verificationCode = codeResult.rows[0]
      
      // Check if code is expired
      if (new Date() > new Date(verificationCode.expiresAt)) {
        return {
          success: false,
          error: 'Verification code has expired. Please request a new one.'
        }
      }
      
      // Check if too many attempts
      if (verificationCode.attempts >= 5) {
        return {
          success: false,
          error: 'Too many verification attempts. Please request a new code.',
          remainingAttempts: 0
        }
      }
      
      // Verify the code
      if (verificationCode.code !== inputCode) {
        // Increment attempts
        await secureQuery(
          `UPDATE "EmailVerificationCode" 
           SET "attempts" = "attempts" + 1 
           WHERE "id" = $1`,
          [verificationCode.id]
        )
        
        const remainingAttempts = 5 - (verificationCode.attempts + 1)
        
        return {
          success: false,
          error: 'Invalid verification code. Please try again.',
          remainingAttempts
        }
      }
      
      // Code is valid - mark as used and update user
      await secureQuery(
        `UPDATE "EmailVerificationCode" 
         SET "isUsed" = true 
         WHERE "id" = $1`,
        [verificationCode.id]
      )
      
      // Update user's email verification status
      const updateResult = await secureQuery(
        `UPDATE "User" 
         SET "isEmailVerified" = true, "updatedAt" = NOW() 
         WHERE "id" = $1`,
        [userId]
      )
      
      if (!updateResult.success) {
        return {
          success: false,
          error: 'Failed to update email verification status'
        }
      }
      
      return {
        success: true
      }
      
    } catch (error) {
      console.error('Error verifying code:', error)
      return {
        success: false,
        error: 'Failed to verify code'
      }
    }
  }
  
  /**
   * Resend verification code
   */
  static async resendVerificationCode(
    userId: string, 
    email: string
  ): Promise<{
    success: boolean
    error?: string
    cooldownRemaining?: number
  }> {
    try {
      // Check if user has sent a code recently (cooldown period)
      const recentCodeResult = await secureQuery(
        `SELECT "createdAt" FROM "EmailVerificationCode" 
         WHERE "userId" = $1 AND "email" = $2 
         ORDER BY "createdAt" DESC 
         LIMIT 1`,
        [userId, email.toLowerCase().trim()]
      )
      
      if (recentCodeResult.success && recentCodeResult.rows.length > 0) {
        const lastSent = new Date(recentCodeResult.rows[0].createdAt)
        const cooldownPeriod = 60 * 1000 // 1 minute cooldown
        const timeSinceLastSent = Date.now() - lastSent.getTime()
        
        if (timeSinceLastSent < cooldownPeriod) {
          const remainingCooldown = Math.ceil((cooldownPeriod - timeSinceLastSent) / 1000)
          return {
            success: false,
            error: 'Please wait before requesting another verification code',
            cooldownRemaining: remainingCooldown
          }
        }
      }
      
      // Get user info for email
      const userResult = await SecureUserOperations.getUserById(userId)
      if (!userResult.success || userResult.rows.length === 0) {
        return {
          success: false,
          error: 'User not found'
        }
      }
      
      const user = userResult.rows[0]
      
      // Create new verification code
      const codeResult = await this.createVerificationCode(userId, email)
      if (!codeResult.success || !codeResult.code) {
        console.error('❌ Failed to create verification code for resend:', codeResult.error)
        return {
          success: false,
          error: 'Failed to create verification code'
        }
      }
      
      // Send verification email
      const emailSent = await this.sendVerificationEmail(
        email, 
        user.firstName, 
        codeResult.code
      )
      
      if (!emailSent) {
        return {
          success: false,
          error: 'Failed to send verification email'
        }
      }
      
      return {
        success: true
      }
      
    } catch (error) {
      console.error('Error resending verification code:', error)
      return {
        success: false,
        error: 'Failed to resend verification code'
      }
    }
  }
  
  /**
   * Clean up expired verification codes
   */
  static async cleanupExpiredCodes(): Promise<void> {
    try {
      await secureQuery(
        `DELETE FROM "EmailVerificationCode" 
         WHERE "expiresAt" < NOW()`,
        []
      )
      console.log('✅ Cleaned up expired verification codes')
    } catch (error) {
      console.error('Error cleaning up expired codes:', error)
    }
  }
  
  /**
   * Generate verification email HTML template
   */
  private static generateVerificationEmailHtml(firstName: string, code: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - Vidality</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-box { background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .verification-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: monospace; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔒 Email Verification</h1>
          <p>Welcome to Vidality Trading Platform</p>
        </div>
        
        <div class="content">
          <h2>Hello ${firstName}!</h2>
          
          <p>Thank you for signing up for Vidality Trading Platform. To complete your registration and start trading, please verify your email address using the code below:</p>
          
          <div class="code-box">
            <p style="margin: 0 0 10px 0; font-weight: bold;">Your verification code:</p>
            <div class="verification-code">${code}</div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul style="margin: 10px 0;">
              <li>This code will expire in <strong>15 minutes</strong></li>
              <li>You have <strong>5 attempts</strong> to enter the correct code</li>
              <li>If you didn't request this code, please ignore this email</li>
            </ul>
          </div>
          
          <p>Once verified, you'll have full access to:</p>
          <ul>
            <li>📊 Real-time market data and charts</li>
            <li>🤖 AI-powered trading insights</li>
            <li>💼 Portfolio management tools</li>
            <li>📈 Advanced analytics and backtesting</li>
          </ul>
          
          <p>If you have any questions, feel free to contact our support team.</p>
          
          <p>Happy Trading!<br>
          <strong>The Vidality Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This email was sent to you because you signed up for Vidality Trading Platform.</p>
          <p>© 2024 Vidality Trading Platform. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }
  
  /**
   * Generate verification email text template
   */
  private static generateVerificationEmailText(firstName: string, code: string): string {
    return `
Email Verification - Vidality Trading Platform

Hello ${firstName}!

Thank you for signing up for Vidality Trading Platform. To complete your registration and start trading, please verify your email address using the code below:

Your verification code: ${code}

IMPORTANT:
- This code will expire in 15 minutes
- You have 5 attempts to enter the correct code
- If you didn't request this code, please ignore this email

Once verified, you'll have full access to:
- Real-time market data and charts
- AI-powered trading insights
- Portfolio management tools
- Advanced analytics and backtesting

If you have any questions, feel free to contact our support team.

Happy Trading!
The Vidality Team

---
This email was sent to you because you signed up for Vidality Trading Platform.
© 2025 Vidality Trading Platform. All rights reserved.
    `
  }
}

