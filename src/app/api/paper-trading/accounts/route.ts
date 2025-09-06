import { NextRequest, NextResponse } from 'next/server'
import { PaperTradingService } from '@/lib/paper-trading'
import { AuthService } from '@/lib/auth-service'

export async function GET(request: NextRequest) {
  try {
    // Get user from authentication token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await AuthService.getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    const accounts = await PaperTradingService.getAccounts(user.id)
    
    return NextResponse.json({
      success: true,
      data: accounts,
    })
  } catch (error) {
    console.error('Error fetching paper trading accounts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch paper trading accounts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, initialBalance = 100000 } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Account name is required' },
        { status: 400 }
      )
    }

    // Get user from authentication token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await AuthService.getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    const account = await PaperTradingService.createAccount(user.id, name, initialBalance)
    
    return NextResponse.json({
      success: true,
      data: account,
    })
  } catch (error) {
    console.error('Error creating paper trading account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create paper trading account' },
      { status: 500 }
    )
  }
}
