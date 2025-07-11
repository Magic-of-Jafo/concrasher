import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Use shared Prisma client
import { VenueSchema, VenueData } from '@/lib/validators';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // Import authOptions
import { Role } from '@prisma/client'; // Import Role enum for type safety

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } } // Convention ID
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized: No active session' }, { status: 401 });
  }

  // Type assertion for session.user.roles if you're sure it exists and is an array of Role
  // Or handle it more gracefully if session.user.roles might be undefined
  const userRoles = session.user.roles as Role[] | undefined;
  if (!userRoles || !userRoles.includes(Role.ORGANIZER)) {
    return NextResponse.json({ message: 'Forbidden: User is not an ORGANIZER' }, { status: 403 });
  }

  const conventionId = params.id;

  try {
    const convention = await prisma.convention.findUnique({
      where: { id: conventionId },
      include: { series: true }, // To get series.organizerUserId
    });

    if (!convention) {
      return NextResponse.json({ message: 'Convention not found' }, { status: 404 });
    }

    if (convention.series && convention.series.organizerUserId !== session.user.id) {
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

  const validationResult = VenueSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      { message: 'Invalid request data', errors: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // photos are for input, venue.photos is the relation to VenuePhoto model
  const { photos: inputPhotos, ...venueData } = validationResult.data as VenueData;

  try {
    const newVenueWithPhotos = await prisma.$transaction(async (tx) => {
      const createdVenue = await tx.venue.create({
        data: {
          ...venueData,
          conventionId: conventionId,
          description: venueData.description || undefined,
          websiteUrl: venueData.websiteUrl || undefined,
          googleMapsUrl: venueData.googleMapsUrl || undefined,
          streetAddress: venueData.streetAddress || undefined,
          city: venueData.city || undefined,
          stateRegion: venueData.stateRegion || undefined,
          postalCode: venueData.postalCode || undefined,
          country: venueData.country || undefined,
          contactEmail: venueData.contactEmail || undefined,
          contactPhone: venueData.contactPhone || undefined,
          parkingInfo: venueData.parkingInfo || undefined,
          publicTransportInfo: venueData.publicTransportInfo || undefined,
          overallAccessibilityNotes: venueData.overallAccessibilityNotes || undefined,
          // amenities & isPrimaryVenue use defaults from Zod schema if not provided, or values from input
        },
      });

      if (inputPhotos && inputPhotos.length > 0) {
        await tx.venuePhoto.createMany({
          data: inputPhotos.map(photo => ({
            url: photo.url, // id is optional in schema, not needed for createMany if auto-generated
            caption: photo.caption || undefined,
            venueId: createdVenue.id,
          })),
        });
      }

      return tx.venue.findUnique({
        where: { id: createdVenue.id },
        include: { photos: true }, // Include the created photos in the response
      });
    });

    return NextResponse.json(newVenueWithPhotos, { status: 201 });
  } catch (error) {
    console.error('Error creating venue:', error);
    // Add more specific error handling if needed (e.g., Prisma unique constraint errors)
    return NextResponse.json({ message: 'Failed to create venue' }, { status: 500 });
  }
  // No prisma.$disconnect() needed if using shared client, connection managed globally
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
    const convention = await prisma.convention.findUnique({
      where: { id: conventionId },
    });
    if (!convention) {
      return NextResponse.json({ message: 'Convention not found' }, { status: 404 });
    }
    const venues = await prisma.venue.findMany({
      where: { conventionId },
      orderBy: { isPrimaryVenue: 'desc' }, // Primary first, then others
    });
    return NextResponse.json(venues, { status: 200 });
  } catch (error) {
    console.error('Error fetching venues:', error);
    return NextResponse.json({ message: 'Failed to fetch venues' }, { status: 500 });
  }
} 