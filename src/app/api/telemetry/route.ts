import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { events, performanceMetrics, securityEvents, sessionId, userId, timestamp } = body

    // Validate required fields
    if (!sessionId || !timestamp) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Process events in batches to avoid overwhelming the database
    const batchSize = 100
    const allEvents = [
      ...(events || []),
      ...(performanceMetrics || []).map((metric: any) => ({
        ...metric,
        event: `performance_${metric.name}`,
        category: 'performance' as const
      })),
      ...(securityEvents || []).map((security: any) => ({
        ...security,
        event: `security_${security.event}`,
        category: 'security' as const
      }))
    ]

    // Process events in batches
    for (let i = 0; i < allEvents.length; i += batchSize) {
      const batch = allEvents.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (event) => {
          try {
            // Store event in database (you might want to use a different table structure)
            await prisma.telemetryEvent.create({
              data: {
                sessionId,
                userId: userId || null,
                event: event.event,
                category: event.category,
                timestamp: new Date(event.timestamp),
                properties: JSON.stringify(event.properties || {}),
                metadata: JSON.stringify(event.metadata || {}),
                severity: event.severity || null,
                value: event.value || null,
                unit: event.unit || null
              }
            })
          } catch (error) {
            console.error('Error storing telemetry event:', error)
            // Don't fail the entire request for individual event failures
          }
        })
      )
    }

    // Log important events to console for development
    if (process.env.NODE_ENV === 'development') {
      const importantEvents = allEvents.filter(event => 
        event.category === 'security' || 
        event.category === 'error' ||
        event.event.includes('auth')
      )
      
      if (importantEvents.length > 0) {
        console.log('🔍 Telemetry - Important Events:', importantEvents)
      }
    }

    // Send to external analytics services if configured
    await sendToExternalServices(body)

    return NextResponse.json({ 
      success: true, 
      message: 'Telemetry data processed successfully',
      eventsProcessed: allEvents.length
    })

  } catch (error) {
    console.error('Telemetry processing error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process telemetry data' },
      { status: 500 }
    )
  }
}

async function sendToExternalServices(data: any) {
  try {
    // Send to Google Analytics if configured
    if (process.env.GA_MEASUREMENT_ID) {
      await sendToGoogleAnalytics(data)
    }

    // Send to Mixpanel if configured
    if (process.env.MIXPANEL_TOKEN) {
      await sendToMixpanel(data)
    }

    // Send to custom webhook if configured
    if (process.env.TELEMETRY_WEBHOOK_URL) {
      await sendToWebhook(data)
    }

  } catch (error) {
    console.error('Error sending to external services:', error)
    // Don't fail the main request for external service failures
  }
}

async function sendToGoogleAnalytics(data: any) {
  // Implementation for Google Analytics 4
  const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA_MEASUREMENT_ID}&api_secret=${process.env.GA_API_SECRET}`
  
  const events = data.events?.map((event: any) => ({
    name: event.event,
    params: {
      ...event.properties,
      session_id: data.sessionId,
      user_id: data.userId,
      timestamp: event.timestamp
    }
  })) || []

  if (events.length > 0) {
    await fetch(gaEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: data.sessionId,
        events
      })
    })
  }
}

async function sendToMixpanel(data: any) {
  const mixpanelEndpoint = 'https://api.mixpanel.com/track'
  
  const events = data.events?.map((event: any) => ({
    event: event.event,
    properties: {
      ...event.properties,
      sessionId: data.sessionId,
      userId: data.userId,
      timestamp: event.timestamp,
      category: event.category
    }
  })) || []

  if (events.length > 0) {
    await fetch(mixpanelEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events)
    })
  }
}

async function sendToWebhook(data: any) {
  await fetch(process.env.TELEMETRY_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
}
