import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    console.log('API: Loading portfolio:', id)

    // Authn
    const token = request.cookies.get('token')?.value
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

    // Ownership check
    const portfolio = await prisma.portfolio.findFirst({
      where: { id, userId: user.id },
      include: { positions: true }
    })

    if (!portfolio) {
      return NextResponse.json({
        success: false,
        error: 'Portfolio not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: portfolio
    })

  } catch (error) {
    console.error('API: Error loading portfolio:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to load portfolio'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, description } = body

    console.log('API: Updating portfolio:', id, { name, description })

    // Authn
    const token = request.cookies.get('token')?.value
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

    // Ensure portfolio belongs to user
    const existing = await prisma.portfolio.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    const portfolio = await prisma.portfolio.update({
      where: { id },
      data: {
        name,
        updatedAt: new Date()
      },
      include: {
        positions: true
      }
    })

    return NextResponse.json({
      success: true,
      data: portfolio
    })

  } catch (error) {
    console.error('API: Error updating portfolio:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update portfolio'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    console.log('API: Deleting portfolio:', id)

    // Authn
    const token = request.cookies.get('token')?.value
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

    // Ensure portfolio belongs to user
    const existing = await prisma.portfolio.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    await prisma.portfolio.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: 'Portfolio deleted successfully'
    })

  } catch (error) {
    console.error('API: Error deleting portfolio:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete portfolio'
    }, { status: 500 })
  }
}
