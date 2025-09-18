import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/db'
import { AuthService } from '@/lib/auth-service'

// POST - Migrate localStorage data to database
export async function POST(request: NextRequest) {
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

    const localStorageData = await request.json()
    
    if (!localStorageData || typeof localStorageData !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Invalid localStorage data' },
        { status: 400 }
      )
    }

    const migratedData = await DatabaseService.migrateLocalStorageData(user.id, localStorageData)
    
    return NextResponse.json({
      success: true,
      message: 'Data migrated successfully',
      data: migratedData
    })
  } catch (error) {
    console.error('Error migrating data:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to migrate data' },
      { status: 500 }
    )
  }
}
