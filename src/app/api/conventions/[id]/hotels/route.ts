import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { HotelSchema, HotelData } from '@/lib/validators';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } } // Convention ID
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
  } catch (error) {
    console.error('Error verifying convention ownership:', error);
    return NextResponse.json({ message: 'Error verifying convention ownership' }, { status: 500 });
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

  const { photos: inputPhotos, ...hotelData } = validationResult.data;

  try {
    const newHotelWithPhotos = await prisma.$transaction(async (tx) => {
      const createdHotel = await tx.hotel.create({
        data: {
          conventionId: conventionId,
          hotelName: hotelData.hotelName!, // Non-null assertion
          isPrimaryHotel: hotelData.isPrimaryHotel,
          isAtPrimaryVenueLocation: hotelData.isAtPrimaryVenueLocation,
          description: hotelData.description,
          websiteUrl: hotelData.websiteUrl,
          googleMapsUrl: hotelData.googleMapsUrl,
          streetAddress: hotelData.streetAddress,
          city: hotelData.city,
          stateRegion: hotelData.stateRegion,
          postalCode: hotelData.postalCode,
          country: hotelData.country,
          contactEmail: hotelData.contactEmail,
          contactPhone: hotelData.contactPhone,
          groupRateOrBookingCode: hotelData.groupRateOrBookingCode,
          groupPrice: hotelData.groupPrice,
          bookingLink: hotelData.bookingLink,
          bookingCutoffDate: hotelData.bookingCutoffDate,
          parkingInfo: hotelData.parkingInfo,
          publicTransportInfo: hotelData.publicTransportInfo,
          overallAccessibilityNotes: hotelData.overallAccessibilityNotes,
          amenities: hotelData.amenities,
        },
      });

      if (inputPhotos && inputPhotos.length > 0) {
        await tx.hotelPhoto.createMany({
          data: inputPhotos.map(photo => ({
            url: photo.url,
            caption: photo.caption || undefined,
            hotelId: createdHotel.id,
          })),
        });
      }

      return tx.hotel.findUnique({
        where: { id: createdHotel.id },
        include: { photos: true },
      });
    });

    return NextResponse.json(newHotelWithPhotos, { status: 201 });
  } catch (error) {
    console.error('Error creating hotel:', error);
    return NextResponse.json({ message: 'Failed to create hotel' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized: No active session' }, { status: 401 });
  }
  const conventionId = params.id;
  try {
    // ✅ Optimized: Single query with includes
    const convention = await prisma.convention.findUnique({
      where: { id: conventionId },
      include: {
        hotels: {
          orderBy: { isPrimaryHotel: 'desc' }, // Primary first, then others
          include: {
            photos: true, // Include hotel photos
          },
        },
      },
    });

    if (!convention) {
      return NextResponse.json({ message: 'Convention not found' }, { status: 404 });
    }

    return NextResponse.json(convention.hotels, { status: 200 });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    return NextResponse.json({ message: 'Failed to fetch hotels' }, { status: 500 });
  }
} 