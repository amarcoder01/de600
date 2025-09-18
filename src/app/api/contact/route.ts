import { NextRequest, NextResponse } from 'next/server'

interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
  type: 'general' | 'support' | 'business' | 'technical'
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json()
    
    // Validate required fields
    const { name, email, subject, message, type } = body
    
    if (!name || !email || !subject || !message) {
      return NextResponse.json({
        success: false,
        message: 'All required fields must be provided'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      }, { status: 400 })
    }

    // Log the contact form submission (in production, you'd send this to your backend/database)
    console.log('📧 Contact Form Submission:', {
      name,
      email,
      subject,
      message,
      type,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    })

    // Here you would typically:
    // 1. Save to database
    // 2. Send email notification
    // 3. Send confirmation email to user
    // 4. Route to appropriate team based on type

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Thank you for your message! We will get back to you within 24 hours.',
      data: {
        id: `contact_${Date.now()}`,
        submittedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Contact form error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to submit contact form. Please try again.'
    }, { status: 500 })
  }
}

// Optional: GET method to check if the endpoint is working
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Contact API is working',
    timestamp: new Date().toISOString()
  })
}
