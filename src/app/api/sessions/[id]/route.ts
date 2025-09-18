import { NextRequest, NextResponse } from 'next/server'
import { UserDataService } from '@/lib/user-data-service'
import { authenticateRequest } from '@/lib/auth-middleware'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the request and get user
    const authResult = await authenticateRequest(request, false) // Allow unauthenticated for demo
    
    // Extract token from Authorization header
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || undefined
    
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Get current sessions for the authenticated user
    const currentSessions = await UserDataService.getStockComparisonSessions(token)
    
    // Remove the session with the specified ID
    const updatedSessions = currentSessions.filter((session: any) => String(session?.id) !== String(id))
    
    // Save the updated sessions back to the database using set API
    const result = await UserDataService.setStockComparisonSessions(updatedSessions, token)
    
    return NextResponse.json({ success: true, sessions: result })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}
