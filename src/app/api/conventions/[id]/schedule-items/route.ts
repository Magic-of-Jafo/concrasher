import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conventionId = params.id;
  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Basic validation
  if (!data.title || typeof data.title !== 'string') {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  try {
    const scheduleData: any = {
      conventionId,
      title: data.title,
      eventType: data.eventType || 'Other',
      description: data.description || '',
      atPrimaryVenue: data.atPrimaryVenue ?? true,
      locationName: data.locationName || '',
      venueId: data.venueId || null,
      // Add feeTiers and other relations if needed
    };
    if (data.startTime) scheduleData.startTime = new Date(data.startTime);
    if (data.endTime) scheduleData.endTime = new Date(data.endTime);
    const item = await prisma.conventionScheduleItem.create({
      data: scheduleData,
    });
    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create schedule item' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const conventionId = params.id;
  try {
    console.log('Fetching schedule items for convention:', conventionId);
    const items = await prisma.conventionScheduleItem.findMany({
      where: { conventionId },
      include: { feeTiers: true },
      orderBy: [
        { dayOffset: 'asc' },
        { startTimeMinutes: 'asc' }
      ],
    });
    console.log('Found items:', items);
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error('Error fetching schedule items:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch schedule items',
      details: error.stack
    }, { status: 500 });
  }
} 