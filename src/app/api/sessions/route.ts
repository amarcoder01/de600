import { NextRequest, NextResponse } from 'next/server'
import { UserDataService } from '@/lib/user-data-service'
import { authenticateRequest } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request and get user
    const authResult = await authenticateRequest(request, false) // Allow unauthenticated for demo
    
    // Extract token from Authorization header
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || undefined
    
    const sessions = await UserDataService.getStockComparisonSessions(token)
    // Server-side cleanup: ensure array and normalize minimal shape
    const normalized = (Array.isArray(sessions) ? sessions : []).map((s: any) => ({
      ...s,
      stocks: Array.isArray(s?.stocks) ? s.stocks : [],
      analysis: typeof s?.analysis === 'string' ? s.analysis : (s?.analysis ? JSON.stringify(s.analysis) : ''),
      timestamp: typeof s?.timestamp === 'string' ? s.timestamp : new Date().toISOString(),
    }))
    return NextResponse.json({ success: true, sessions: normalized })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request and get user
    const authResult = await authenticateRequest(request, false) // Allow unauthenticated for demo
    
    // Extract token from Authorization header
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || undefined
    
    const body = await request.json()
    const { session } = body

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session data is required' },
        { status: 400 }
      )
    }

    // If client intends to replace sessions (cleanup), allow array input
    if (Array.isArray(session)) {
      const replaced = await UserDataService.setStockComparisonSessions(session, token)
      return NextResponse.json({ success: true, sessions: replaced })
    }

    const updatedSessions = await UserDataService.saveStockComparisonSession(session, token)
    return NextResponse.json({ success: true, sessions: updatedSessions })
  } catch (error) {
    console.error('Error saving session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save session' },
      { status: 500 }
    )
  }
}
