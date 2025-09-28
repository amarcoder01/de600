import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import sgMail from '@sendgrid/mail'
import crypto from 'crypto'
import { AUTH_MESSAGES } from '@/lib/auth-messages'

// Enhanced SendGrid configuration with detailed logging
const configureSendGrid = () => {
  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL
  
  console.log('🔧 SendGrid Configuration Check:')
  console.log(`   API Key: ${apiKey ? '✅ Present' : '❌ Missing'}`)
  console.log(`   From Email: ${fromEmail ? '✅ Present' : '❌ Missing'}`)
  
  if (!apiKey) {
    console.log('❌ SENDGRID_API_KEY is not configured')
    return false
  }
  
  if (!fromEmail) {
    console.log('❌ SENDGRID_FROM_EMAIL is not configured')
    return false
  }
  
  try {
    sgMail.setApiKey(apiKey)
    console.log('✅ SendGrid configured successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to configure SendGrid:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  console.log('📧 Password Reset Request Received')
  
  try {
    const { email } = await request.json()
    console.log(`📧 Processing reset for email: ${email}`)

    if (!email) {
      console.log('❌ Email is missing from request')
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    console.log('🔍 Checking if user exists...')
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      console.log('❌ User not found (security: not revealing this to client)')
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { success: true, message: AUTH_MESSAGES.PASSWORD_RESET.GENERIC_SUCCESS }
      )
    }

    console.log(`✅ User found: ${user.firstName} ${user.lastName}`)

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    console.log('🔐 Generated reset token and expiry')

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpiry
      }
    })

    console.log('💾 Reset token saved to database')

    // Create reset URL - debug environment variables
    console.log('🔧 Environment Variables Debug:')
    console.log(`   NEXT_PUBLIC_BASE_URL: ${process.env.NEXT_PUBLIC_BASE_URL}`)
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`)
    console.log(`   RENDER: ${process.env.RENDER}`)
    console.log(`   RENDER_EXTERNAL_URL: ${process.env.RENDER_EXTERNAL_URL}`)
    console.log(`   RENDER_EXTERNAL_HOSTNAME: ${process.env.RENDER_EXTERNAL_HOSTNAME}`)
    
    // Determine the base URL with multiple fallback strategies
    let baseUrl = 'http://localhost:3000' // default fallback
    
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      console.log('🔧 Using NEXT_PUBLIC_BASE_URL:', baseUrl)
    } else if (process.env.RENDER_EXTERNAL_URL) {
      baseUrl = process.env.RENDER_EXTERNAL_URL
      console.log('🔧 Using RENDER_EXTERNAL_URL:', baseUrl)
    } else if (process.env.RENDER_EXTERNAL_HOSTNAME) {
      baseUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
      console.log('🔧 Using RENDER_EXTERNAL_HOSTNAME:', baseUrl)
    } else if (process.env.RENDER) {
      // If we're on Render but no specific URL is set, use the correct domain
      baseUrl = 'https://vidality.com'
      console.log('🔧 Using hardcoded production URL:', baseUrl)
    }
    
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`
    console.log(`🔗 Reset URL: ${resetUrl}`)

    // Check SendGrid configuration
    const sendGridConfigured = configureSendGrid()

    if (!sendGridConfigured) {
      console.log('📧 SendGrid not properly configured')
      
      // In development, return the reset URL directly
      if (process.env.NODE_ENV === 'development') {
        console.log('🛠️ Development mode: returning reset URL for testing')
        return NextResponse.json({
          success: true,
          message: 'Password reset link generated successfully (development mode)',
          resetUrl: resetUrl,
          debug: {
            sendGridConfigured: false,
            environment: process.env.NODE_ENV,
            apiKeyPresent: !!process.env.SENDGRID_API_KEY,
            fromEmailPresent: !!process.env.SENDGRID_FROM_EMAIL
          }
        })
      }
      
      // In production, return generic message
      console.log('🌐 Production mode: returning generic message')
      return NextResponse.json({
        success: true,
        message: AUTH_MESSAGES.PASSWORD_RESET.GENERIC_SUCCESS
      })
    }

    // Send email via SendGrid
    console.log('📧 Attempting to send email via SendGrid...')
    try {
      const msg = {
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: 'Reset Your Vidality Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Reset Your Vidality Password</h2>
            <p>Hello ${user.firstName},</p>
            <p>We received a request to reset your password for your Vidality account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>If you have any questions, contact us at support@vidality.com</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              This email was sent to ${user.email}. If you didn't create a Vidality account, you can safely ignore this email.
            </p>
          </div>
        `
      }

      console.log('📧 Email message prepared:')
      console.log(`   To: ${msg.to}`)
      console.log(`   From: ${msg.from}`)
      console.log(`   Subject: ${msg.subject}`)

      const response = await sgMail.send(msg)
      console.log('✅ Email sent successfully via SendGrid')
      console.log('📊 SendGrid Response:', response[0].statusCode)

    } catch (sendGridError: any) {
      console.error('❌ SendGrid error occurred:')
      console.error('   Error:', sendGridError.message)
      
      // Log detailed error information
      if (sendGridError.response) {
        console.error('   Status:', sendGridError.response.status)
        console.error('   Body:', sendGridError.response.body)
        console.error('   Headers:', sendGridError.response.headers)
      }

      // In development, return the reset URL even if SendGrid fails
      if (process.env.NODE_ENV === 'development') {
        console.log('🛠️ Development mode: returning reset URL despite SendGrid failure')
        return NextResponse.json({
          success: true,
          message: 'Password reset link generated successfully (SendGrid failed, but URL is available in development)',
          resetUrl: resetUrl,
          error: 'SendGrid configuration issue - check your SENDGRID_API_KEY and SENDGRID_FROM_EMAIL environment variables',
          debug: {
            sendGridError: sendGridError.message,
            environment: process.env.NODE_ENV,
            apiKeyPresent: !!process.env.SENDGRID_API_KEY,
            fromEmailPresent: !!process.env.SENDGRID_FROM_EMAIL
          }
        })
      }

      // In production, return generic message
      console.log('🌐 Production mode: returning generic message despite SendGrid failure')
      return NextResponse.json({
        success: true,
        message: AUTH_MESSAGES.PASSWORD_RESET.GENERIC_SUCCESS
      })
    }

    console.log('✅ Password reset request completed successfully')
    return NextResponse.json({
      success: true,
      message: AUTH_MESSAGES.PASSWORD_RESET.GENERIC_SUCCESS
    })

  } catch (error) {
    console.error('❌ Password reset request error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}
