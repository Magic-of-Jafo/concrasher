import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { HotelSchema, HotelData } from '@/lib/validators';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role, Prisma } from '@prisma/client';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; hotelId: string } } // conventionId is 'id'
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
  const hotelIdToUpdate = params.hotelId;

  try {
    const convention = await prisma.convention.findUnique({
      where: { id: conventionId },
      include: { series: true },
    });
    if (!convention) {
      return NextResponse.json({ message: 'Convention not found' }, { status: 404 });
    }
    if (convention.series?.organizerUserId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: You are not the organizer of this convention series' }, { status: 403 });
    }

    const existingHotel = await prisma.hotel.findUnique({
      where: { id: hotelIdToUpdate },
    });
    if (!existingHotel || existingHotel.conventionId !== conventionId) {
      return NextResponse.json({ message: 'Hotel not found for this convention or access denied.' }, { status: 404 });
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

  const validationResult = HotelSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { message: 'Invalid request data', errors: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { photos: inputPhotos, ...hotelDataToUpdate } = validationResult.data as HotelData;

  try {
    const updatedHotelWithPhotos = await prisma.$transaction(async (tx) => {
      const { conventionId: _convId, isPrimaryHotel: _isPrimary, isAtPrimaryVenueLocation: _isAtPVL, id: _id, ...dataForUpdate } = hotelDataToUpdate;

      await tx.hotel.update({
        where: { id: hotelIdToUpdate },
        data: {
          ...dataForUpdate,
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
          groupRateOrBookingCode: dataForUpdate.groupRateOrBookingCode || undefined,
          groupPrice: dataForUpdate.groupPrice || undefined,
          bookingLink: dataForUpdate.bookingLink || undefined,
          bookingCutoffDate: dataForUpdate.bookingCutoffDate || undefined,
          parkingInfo: dataForUpdate.parkingInfo || undefined,
          publicTransportInfo: dataForUpdate.publicTransportInfo || undefined,
          overallAccessibilityNotes: dataForUpdate.overallAccessibilityNotes || undefined,
          amenities: dataForUpdate.amenities || [],
        },
      });

      await tx.hotelPhoto.deleteMany({
        where: { hotelId: hotelIdToUpdate },
      });

      if (inputPhotos && inputPhotos.length > 0) {
        await tx.hotelPhoto.createMany({
          data: inputPhotos.map(photo => ({
            url: photo.url,
            caption: photo.caption || undefined,
            hotelId: hotelIdToUpdate,
          })),
        });
      }

      return tx.hotel.findUnique({
        where: { id: hotelIdToUpdate },
        include: { photos: true },
      });
    });

    return NextResponse.json(updatedHotelWithPhotos, { status: 200 });
  } catch (error) {
    console.error(`Error updating hotel ${hotelIdToUpdate}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: 'Hotel not found for update' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Failed to update hotel' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; hotelId: string } }
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
  const hotelIdToDelete = params.hotelId;

  try {
    const convention = await prisma.convention.findUnique({
      where: { id: conventionId },
      include: { series: true },
    });
    if (!convention) {
      return NextResponse.json({ message: 'Convention not found' }, { status: 404 });
    }
    if (convention.series?.organizerUserId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: You are not the organizer of this convention series' }, { status: 403 });
    }

    const hotel = await prisma.hotel.findFirst({
      where: {
        id: hotelIdToDelete,
        conventionId: conventionId,
      },
    });

    if (!hotel) {
      return NextResponse.json({ message: 'Hotel not found for this convention or access denied.' }, { status: 404 });
    }

    await prisma.hotel.delete({
      where: { id: hotelIdToDelete },
    });

    return NextResponse.json({ message: 'Hotel deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting hotel ${hotelIdToDelete}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: 'Hotel not found for deletion' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Failed to delete hotel' }, { status: 500 });
  }
} 