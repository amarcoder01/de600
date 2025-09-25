import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch query history for the user
    const queryHistory = await prisma.queryHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limit to last 20 queries
      select: {
        id: true,
        naturalQuery: true,
        parsedCriteria: true,
        resultCount: true,
        createdAt: true
      }
    });

    return NextResponse.json(queryHistory);
  } catch (error) {
    console.error('Error fetching query history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch query history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');

    if (queryId) {
      // Delete specific query
      await prisma.queryHistory.delete({
        where: {
          id: queryId,
          userId: user.id // Ensure user can only delete their own queries
        }
      });
    } else {
      // Clear all query history for user
      await prisma.queryHistory.deleteMany({
        where: { userId: user.id }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting query history:', error);
    return NextResponse.json(
      { error: 'Failed to delete query history' },
      { status: 500 }
    );
  }
}