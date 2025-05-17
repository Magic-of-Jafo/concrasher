import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ConventionStatus } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'ID (slug) is required' }, { status: 400 });
    }

    const convention = await prisma.convention.findUnique({
      where: {
        slug: id,
        deletedAt: null,
        status: {
          in: [ConventionStatus.PUBLISHED, ConventionStatus.PAST]
        }
      },
      include: { 
        series: true, 
      }
    });

    if (!convention) {
      return NextResponse.json({ error: 'Convention not found or not publicly available' }, { status: 404 });
    }

    return NextResponse.json(convention);

  } catch (error) {
    console.error(`Error fetching convention by slug (param named id: ${params.id}):`, error);
    return NextResponse.json(
      { error: 'Failed to fetch convention' },
      { status: 500 }
    );
  }
} 