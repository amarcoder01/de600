import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

interface BookmarkData {
  newsId: string
  title: string
  summary?: string
  source: string
  url: string
  publishedAt: string
  category?: string
  sentiment?: string
  impact?: string
  symbols?: string[]
}

// GET - Fetch user's bookmarked news
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, true)
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.statusCode }
      )
    }

    const bookmarks = await prisma.newsBookmark.findMany({
      where: { userId: authResult.user.id },
      orderBy: { createdAt: 'desc' }
    })

    // Transform bookmarks to match NewsItem interface
    const formattedBookmarks = bookmarks.map(bookmark => ({
      id: bookmark.newsId,
      title: bookmark.title,
      summary: bookmark.summary || '',
      content: bookmark.summary || '',
      source: bookmark.source,
      url: bookmark.url,
      publishedAt: bookmark.publishedAt.toISOString(),
      category: bookmark.category as any || 'market',
      sentiment: bookmark.sentiment as any || 'neutral',
      impact: bookmark.impact as any || 'medium',
      symbols: JSON.parse(bookmark.symbols || '[]'),
      bookmarkedAt: bookmark.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      bookmarks: formattedBookmarks
    })

  } catch (error) {
    console.error('Error fetching bookmarks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookmarks' },
      { status: 500 }
    )
  }
}

// POST - Add bookmark
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, true)
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.statusCode }
      )
    }

    const body = await request.json()
    const bookmarkData: BookmarkData = body

    if (!bookmarkData.newsId || !bookmarkData.title || !bookmarkData.source || !bookmarkData.url) {
      return NextResponse.json(
        { success: false, error: 'Missing required bookmark data' },
        { status: 400 }
      )
    }

    // Check if bookmark already exists
    const existingBookmark = await prisma.newsBookmark.findUnique({
      where: {
        userId_newsId: {
          userId: authResult.user.id,
          newsId: bookmarkData.newsId
        }
      }
    })

    if (existingBookmark) {
      return NextResponse.json(
        { success: false, error: 'News article already bookmarked' },
        { status: 409 }
      )
    }

    // Create bookmark
    const bookmark = await prisma.newsBookmark.create({
      data: {
        userId: authResult.user.id,
        newsId: bookmarkData.newsId,
        title: bookmarkData.title,
        summary: bookmarkData.summary,
        source: bookmarkData.source,
        url: bookmarkData.url,
        publishedAt: new Date(bookmarkData.publishedAt),
        category: bookmarkData.category,
        sentiment: bookmarkData.sentiment,
        impact: bookmarkData.impact,
        symbols: JSON.stringify(bookmarkData.symbols || [])
      }
    })

    return NextResponse.json({
      success: true,
      bookmark: {
        id: bookmark.newsId,
        bookmarkedAt: bookmark.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error creating bookmark:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create bookmark' },
      { status: 500 }
    )
  }
}

// DELETE - Remove bookmark
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, true)
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.statusCode }
      )
    }

    const url = new URL(request.url)
    const newsId = url.searchParams.get('newsId')

    if (!newsId) {
      return NextResponse.json(
        { success: false, error: 'News ID is required' },
        { status: 400 }
      )
    }

    // Delete bookmark
    const deletedBookmark = await prisma.newsBookmark.delete({
      where: {
        userId_newsId: {
          userId: authResult.user.id,
          newsId: newsId
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Bookmark removed successfully'
    })

    } catch (error: any) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'Bookmark not found' },
          { status: 404 }
        )
      }

    console.error('Error deleting bookmark:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete bookmark' },
      { status: 500 }
    )
  }
}
