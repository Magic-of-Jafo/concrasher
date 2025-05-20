import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { VenueSchema, VenueData } from '@/lib/validators';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role, Prisma } from '@prisma/client';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; venueId: string } } // conventionId is 'id'
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized: No active session' }, { status: 401 });
  }
  const userRoles = session.user.roles as Role[] | undefined;
  if (!userRoles || !userRoles.includes(Role.ORGANIZER)) {
    return NextResponse.json({ message: 'Forbidden: User is not an ORGANIZER' }, { status: 403 });
  }

  const conventionId = params.id;
  const venueIdToUpdate = params.venueId;

  try {
    const convention = await prisma.convention.findUnique({
      where: { id: conventionId },
      include: { series: true },
    });
    if (!convention) {
      return NextResponse.json({ message: 'Convention not found' }, { status: 404 });
    }
    if (convention.series.organizerUserId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: You are not the organizer of this convention series' }, { status: 403 });
    }

    // Verify the venue exists and belongs to this convention
    const existingVenue = await prisma.venue.findUnique({
      where: { id: venueIdToUpdate },
    });
    if (!existingVenue || existingVenue.conventionId !== conventionId) {
      return NextResponse.json({ message: 'Venue not found for this convention or access denied.' }, { status: 404 });
    }

  } catch (error) {
    console.error('Error during authorization or pre-flight checks:', error);
    return NextResponse.json({ message: 'Server error during authorization checks' }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = VenueSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { message: 'Invalid request data', errors: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { photos: inputPhotos, ...venueDataToUpdate } = validationResult.data as VenueData;

  try {
    const updatedVenueWithPhotos = await prisma.$transaction(async (tx) => {
      // Update core venue details
      // Do not allow changing conventionId or isPrimaryVenue directly here (should be managed by specific logic if needed)
      const { conventionId: _convId, isPrimaryVenue: _isPrimary, id: _id, ...dataForUpdate } = venueDataToUpdate;
      
      await tx.venue.update({
        where: { id: venueIdToUpdate },
        data: {
          ...dataForUpdate,
          // Explicitly set optional fields to undefined if not provided or empty, to avoid issues with Prisma updates
          description: dataForUpdate.description || undefined,
          websiteUrl: dataForUpdate.websiteUrl || undefined,
          googleMapsUrl: dataForUpdate.googleMapsUrl || undefined,
          streetAddress: dataForUpdate.streetAddress || undefined,
          city: dataForUpdate.city || undefined,
          stateRegion: dataForUpdate.stateRegion || undefined,
          postalCode: dataForUpdate.postalCode || undefined,
          country: dataForUpdate.country || undefined,
          contactEmail: dataForUpdate.contactEmail || undefined,
          contactPhone: dataForUpdate.contactPhone || undefined,
          parkingInfo: dataForUpdate.parkingInfo || undefined,
          publicTransportInfo: dataForUpdate.publicTransportInfo || undefined,
          overallAccessibilityNotes: dataForUpdate.overallAccessibilityNotes || undefined,
          amenities: dataForUpdate.amenities || [], // Ensure amenities is an array
        },
      });

      // Manage photos: Delete existing and create new ones
      await tx.venuePhoto.deleteMany({
        where: { venueId: venueIdToUpdate },
      });

      if (inputPhotos && inputPhotos.length > 0) {
        await tx.venuePhoto.createMany({
          data: inputPhotos.map(photo => ({
            url: photo.url,
            caption: photo.caption || undefined,
            venueId: venueIdToUpdate,
          })),
        });
      }

      return tx.venue.findUnique({
        where: { id: venueIdToUpdate },
        include: { photos: true },
      });
    });

    return NextResponse.json(updatedVenueWithPhotos, { status: 200 });
  } catch (error) {
    console.error(`Error updating venue ${venueIdToUpdate}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json({ message: 'Venue not found for update' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Failed to update venue' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest, // req might not be used directly, but good to have for consistency
  { params }: { params: { id: string; venueId: string } } // conventionId is 'id'
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized: No active session' }, { status: 401 });
  }
  const userRoles = session.user.roles as Role[] | undefined;
  if (!userRoles || !userRoles.includes(Role.ORGANIZER)) {
    return NextResponse.json({ message: 'Forbidden: User is not an ORGANIZER' }, { status: 403 });
  }

  const conventionId = params.id;
  const venueIdToDelete = params.venueId;

  try {
    const convention = await prisma.convention.findUnique({
      where: { id: conventionId },
      include: { series: true },
    });
    if (!convention) {
      return NextResponse.json({ message: 'Convention not found' }, { status: 404 });
    }
    if (convention.series.organizerUserId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: You are not the organizer of this convention series' }, { status: 403 });
    }

    // Verify the venue exists and belongs to this convention before attempting delete
    const venue = await prisma.venue.findFirst({
      where: {
        id: venueIdToDelete,
        conventionId: conventionId, // Crucial check
      },
    });

    if (!venue) {
      return NextResponse.json({ message: 'Venue not found for this convention or access denied.' }, { status: 404 });
    }

    await prisma.venue.delete({
      where: { id: venueIdToDelete }, // Prisma will cascade delete photos
    });

    return NextResponse.json({ message: 'Venue deleted successfully' }, { status: 200 }); // Or 204 No Content

  } catch (error) {
    console.error(`Error deleting venue ${venueIdToDelete}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      // Record to delete does not exist.
      return NextResponse.json({ message: 'Venue not found for deletion' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Failed to delete venue' }, { status: 500 });
  }
} 