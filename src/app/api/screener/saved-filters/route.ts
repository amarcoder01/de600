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

    // Fetch saved filters for the user
    const savedFilters = await prisma.savedFilter.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        criteria: true,
        createdAt: true
      }
    });

    return NextResponse.json(savedFilters);
  } catch (error) {
    console.error('Error fetching saved filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved filters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const { name, description, criteria } = await request.json();

    if (!name || !criteria) {
      return NextResponse.json(
        { error: 'Name and criteria are required' },
        { status: 400 }
      );
    }

    // Create saved filter
    const savedFilter = await prisma.savedFilter.create({
      data: {
        userId: user.id,
        name,
        description,
        criteria: criteria as any // Prisma Json type
      },
      select: {
        id: true,
        name: true,
        description: true,
        criteria: true,
        createdAt: true
      }
    });

    return NextResponse.json(savedFilter);
  } catch (error) {
    console.error('Error creating saved filter:', error);
    return NextResponse.json(
      { error: 'Failed to create saved filter' },
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
    const filterId = searchParams.get('id');

    if (!filterId) {
      return NextResponse.json(
        { error: 'Filter ID is required' },
        { status: 400 }
      );
    }

    // Delete saved filter
    await prisma.savedFilter.delete({
      where: {
        id: filterId,
        userId: user.id // Ensure user can only delete their own filters
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved filter:', error);
    return NextResponse.json(
      { error: 'Failed to delete saved filter' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const { id, name, description, criteria } = await request.json();

    if (!id || !name || !criteria) {
      return NextResponse.json(
        { error: 'ID, name, and criteria are required' },
        { status: 400 }
      );
    }

    // Update saved filter
    const updatedFilter = await prisma.savedFilter.update({
      where: {
        id,
        userId: user.id // Ensure user can only update their own filters
      },
      data: {
        name,
        description,
        criteria: criteria as any // Prisma Json type
      },
      select: {
        id: true,
        name: true,
        description: true,
        criteria: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json(updatedFilter);
  } catch (error) {
    console.error('Error updating saved filter:', error);
    return NextResponse.json(
      { error: 'Failed to update saved filter' },
      { status: 500 }
    );
  }
}