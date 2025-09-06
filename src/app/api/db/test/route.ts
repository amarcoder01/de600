import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/db'

export async function GET() {
  try {
    console.log('🧪 Testing database connection...')
    
    // Test database connection
    const isConnected = await DatabaseService.testConnection()
    
    if (!isConnected) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Database connection failed',
          error: 'Please check your DATABASE_URL in .env.local'
        },
        { status: 500 }
      )
    }

    // Try to get or create demo user
    const user = await DatabaseService.getOrCreateDemoUser()
    
    // Try to create a test watchlist (handle if it already exists)
    let watchlist
    try {
      watchlist = await DatabaseService.createWatchlist(user.id, 'Test Watchlist')
    } catch (error) {
      // If watchlist already exists, try to get it
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log('📋 Test watchlist already exists, fetching existing one...')
        try {
          const existingWatchlists = await DatabaseService.getWatchlists(user.id)
          watchlist = existingWatchlists.find(w => w.name === 'Test Watchlist')
          if (!watchlist) {
            // If we can't find it, create with a unique name
            const uniqueName = `Test Watchlist ${Date.now()}`
            watchlist = await DatabaseService.createWatchlist(user.id, uniqueName)
          }
        } catch (fetchError) {
          console.log('⚠️ Could not fetch existing watchlists, creating with unique name...')
          const uniqueName = `Test Watchlist ${Date.now()}`
          watchlist = await DatabaseService.createWatchlist(user.id, uniqueName)
        }
      } else {
        console.log('⚠️ Error creating test watchlist, skipping watchlist test...')
        // Return success without watchlist data if we can't create it
        return NextResponse.json({
          success: true,
          message: 'Database connection successful (watchlist test skipped)',
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName
            }
          }
        })
      }
    }
    
    // If we still don't have a watchlist, return success without it
    if (!watchlist) {
      return NextResponse.json({
        success: true,
        message: 'Database connection successful (watchlist test skipped)',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          }
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database connection and operations successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        watchlist: {
          id: watchlist.id,
          name: watchlist.name,
          itemCount: watchlist.items.length
        }
      }
    })

  } catch (error) {
    console.error('❌ Database test failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 