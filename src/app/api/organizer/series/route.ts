import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const series = await prisma.conventionSeries.findMany({
      where: {
        organizerUserId: session.user.id
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json({ series });
  } catch (error) {
    console.error('Error fetching series:', error);
    return NextResponse.json(
      { error: 'Failed to fetch series' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { name, slug, description, logoUrl } = data;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug is unique
    const existingSeries = await prisma.conventionSeries.findUnique({
      where: { slug }
    });

    if (existingSeries) {
      return NextResponse.json(
        { error: 'A series with this name already exists' },
        { status: 400 }
      );
    }

    const series = await prisma.conventionSeries.create({
      data: {
        name,
        slug,
        description,
        logoUrl,
        organizerUserId: session.user.id
      }
    });

    return NextResponse.json({ series });
  } catch (error) {
    console.error('Error creating series:', error);
    return NextResponse.json(
      { error: 'Failed to create series' },
      { status: 500 }
    );
  }
} 