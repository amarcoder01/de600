import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/db'
import { AuthService } from '@/lib/auth-service'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

// GET - Get user preferences
export async function GET(request: NextRequest) {
  try {
    // Get user from token
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify token and get user
    const user = await AuthService.getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    const preferences = await DatabaseService.getUserPreferences(user.id)
    
    return NextResponse.json({
      success: true,
      data: preferences
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// PUT - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    // Get user from token
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify token and get user
    const user = await AuthService.getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    const updates = await request.json()
    const updatedPreferences = await DatabaseService.updateUserPreferences(user.id, updates)
    
    return NextResponse.json({
      success: true,
      data: updatedPreferences
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
