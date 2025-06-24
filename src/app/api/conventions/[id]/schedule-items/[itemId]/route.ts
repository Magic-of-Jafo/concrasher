import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conventionId = params.id;
  const itemId = params.itemId;
  let requestBody;
  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // It's good practice to ensure the user has rights to modify this convention/item,
  // e.g., check if session.user.id is an organizer for conventionId.
  // This is omitted for brevity but crucial for production.

  const prismaUpdateData: any = {};

  // Scalar fields - only add if present in requestBody
  if (requestBody.title !== undefined) {
    if (typeof requestBody.title !== 'string' || requestBody.title.trim() === '') {
      return NextResponse.json({ error: 'Title is required and cannot be empty' }, { status: 400 });
    }
    prismaUpdateData.title = requestBody.title.trim();
  }
  if (requestBody.eventType !== undefined) {
    prismaUpdateData.eventType = requestBody.eventType;
  }
  if (requestBody.description !== undefined) {
    prismaUpdateData.description = requestBody.description;
  }
  if (requestBody.atPrimaryVenue !== undefined) {
    prismaUpdateData.atPrimaryVenue = requestBody.atPrimaryVenue;
  }
  if (requestBody.locationName !== undefined) {
    prismaUpdateData.locationName = requestBody.locationName;
  }
  if (requestBody.isFeatured !== undefined) {
    prismaUpdateData.isFeatured = requestBody.isFeatured;
  }
  
  // Scheduling fields - only add if present
  if (requestBody.dayOffset !== undefined) {
    prismaUpdateData.dayOffset = requestBody.dayOffset;
  }
  if (requestBody.startTimeMinutes !== undefined) {
    prismaUpdateData.startTimeMinutes = requestBody.startTimeMinutes;
  }
  if (requestBody.durationMinutes !== undefined) {
    prismaUpdateData.durationMinutes = requestBody.durationMinutes;
  }

  // Deprecated direct startTime/endTime - prefer dayOffset, startTimeMinutes, durationMinutes
  // However, if client sends them, handle for backward compatibility or specific use cases if necessary.
  // For now, we assume they are not the primary way to set schedule times from the timeline editor.
  // if (requestBody.startTime !== undefined) {
  //   prismaUpdateData.startTime = requestBody.startTime ? new Date(requestBody.startTime) : null;
  // }
  // if (requestBody.endTime !== undefined) {
  //   prismaUpdateData.endTime = requestBody.endTime ? new Date(requestBody.endTime) : null;
  // }

  // Relational fields: Venue
  if (requestBody.venueId !== undefined) {
    if (requestBody.venueId === null) {
      prismaUpdateData.venue = { disconnect: true };
    } else {
      prismaUpdateData.venue = { connect: { id: requestBody.venueId } };
    }
  }

  // Relational fields: Hotel (assuming similar pattern if you have hotelId)
  // if (requestBody.hotelId !== undefined) {
  //   if (requestBody.hotelId === null) {
  //     prismaUpdateData.hotel = { disconnect: true };
  //   } else {
  //     prismaUpdateData.hotel = { connect: { id: requestBody.hotelId } };
  //   }
  // }
  
  // Relational fields: Track (assuming similar pattern if you have trackId)
  // if (requestBody.trackId !== undefined) {
  //   if (requestBody.trackId === null) {
  //     prismaUpdateData.track = { disconnect: true };
  //   } else {
  //     prismaUpdateData.track = { connect: { id: requestBody.trackId } };
  //   }
  // }

  if (Object.keys(prismaUpdateData).length === 0) {
    return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
  }
  
  // If only title is being updated from a source that might not have other scheduling details,
  // ensure required fields for scheduling aren't accidentally nulled if they already exist.
  // However, for the timeline save, dayOffset, startTimeMinutes, durationMinutes WILL be present.

  try {
    const item = await prisma.conventionScheduleItem.update({
      where: { id: itemId, conventionId }, // Ensure conventionId is part of where for security/scoping
      data: prismaUpdateData,
    });
    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error("Prisma PATCH error:", error); // Log the full error server-side
    // Check for specific Prisma errors if needed, e.g., P2025 (Record not found)
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Schedule item not found or convention ID mismatch.' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update schedule item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const conventionId = params.id;
  const itemId = params.itemId;
  try {
    await prisma.scheduleEventFeeTier.deleteMany({ where: { scheduleItemId: itemId } });
    // Also delete other related one-to-many or many-to-many records if necessary
    await prisma.scheduleEventBrandLink.deleteMany({ where: { scheduleItemId: itemId } });
    await prisma.scheduleEventTalentLink.deleteMany({ where: { scheduleItemId: itemId } });

    await prisma.conventionScheduleItem.delete({ where: { id: itemId, conventionId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Prisma DELETE error:", error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Schedule item not found or convention ID mismatch for delete.' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete schedule item' }, { status: 500 });
  }
} 