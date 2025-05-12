import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ConventionUpdateSchema } from '@/lib/validators';
import { z } from 'zod';
import { Role, Prisma } from '@prisma/client'; // Import Prisma for error types

interface RouteParams {
  params: {
    id: string; // Can be CUID or slug
  };
}

// Helper function to find convention by ID or Slug
async function findConventionByIdOrSlug(idOrSlug: string) {
  let convention;
  // Try fetching by ID first (assuming it might be a CUID)
  if (idOrSlug.length === 25 && idOrSlug.startsWith('c')) { // Basic check for CUID like structure
    convention = await db.convention.findUnique({ where: { id: idOrSlug } });
  }
  // If not found by ID, or if ID doesn't look like a CUID, try by slug
  if (!convention) {
    convention = await db.convention.findUnique({ where: { slug: idOrSlug } });
  }
  return convention;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; roles: Role[] } | undefined;

    if (!user || !user.roles?.includes(Role.ADMIN)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    let convention;

    // Try fetching by ID first (assuming it might be a CUID)
    if (id.length === 25 && id.startsWith('c')) { // Basic check for CUID like structure
      convention = await db.convention.findUnique({ where: { id } });
    }

    // If not found by ID, or if ID doesn't look like a CUID, try by slug
    if (!convention) {
      convention = await db.convention.findUnique({ where: { slug: id } });
    }

    if (!convention) {
      return NextResponse.json({ message: 'Convention not found' }, { status: 404 });
    }

    return NextResponse.json(convention, { status: 200 });
  } catch (error) {
    console.error(`Error fetching convention ${params.id}:`, error);
    return NextResponse.json({ message: 'Could not fetch convention' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; roles: Role[] } | undefined;

    if (!user || !user.roles?.includes(Role.ADMIN)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    // 1. Validate the body
    const validation = ConventionUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const dataToUpdate = validation.data; // Validated data

    // 2. Find the convention *after* validation
    const conventionToUpdate = await findConventionByIdOrSlug(id);
    if (!conventionToUpdate) {
      return NextResponse.json({ message: 'Convention not found' }, { status: 404 });
    }

    // 3. Try updating using the found ID
    let updatedConvention;
    try {
      updatedConvention = await db.convention.update({
        where: { id: conventionToUpdate.id }, // Use the confirmed ID
        data: dataToUpdate,
      });
    } catch (error) {
      // Handle Prisma errors (P2025 should be less likely now, but P2002 is relevant)
      // Check for real Prisma error OR mocked error structure
      const isPrismaError = error instanceof Prisma.PrismaClientKnownRequestError;
      const isMockedError = typeof error === 'object' && error !== null && 'code' in error;
      
      if (isPrismaError || isMockedError) {
        const errorCode = (error as any).code; // Type assertion to access code

        // P2025 check might be redundant but kept defensively
        if (errorCode === 'P2025') {
          return NextResponse.json({ message: 'Convention not found during update attempt' }, { status: 404 });
        }
        if (errorCode === 'P2002') {
          const target = (error as any).meta?.target?.[0] || 'field';
          return NextResponse.json({ 
            message: `Update failed due to unique constraint violation on ${target}`,
            field: target
          }, { status: 409 });
        }
      }
      // Log unexpected errors during update
      console.error(`Error updating convention ${id} (ID: ${conventionToUpdate.id}):`, error);
      return NextResponse.json({ message: 'Could not update convention' }, { status: 500 });
    }

    // 4. Return updated convention
    return NextResponse.json(updatedConvention, { status: 200 });
  } catch (error) {
    // Catch errors from session check or other unexpected issues before the main logic
    console.error(`Unexpected error in PUT /api/conventions/${params.id}:`, error);
    // Avoid returning ZodError details here if validation is handled above
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; roles: Role[] } | undefined;

    if (!user || !user.roles?.includes(Role.ADMIN)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    let deletedConvention = null;

    // --- Find the convention first ---
    const conventionToDelete = await findConventionByIdOrSlug(id);
    if (!conventionToDelete) {
      return NextResponse.json({ message: 'Convention not found' }, { status: 404 });
    }
    // --- End Find ---

    try {
      // --- Now delete using the found ID ---
      deletedConvention = await db.convention.delete({
        where: { id: conventionToDelete.id } // Use the confirmed ID
      });
      // --- End Delete ---
    } catch (error) {
      // P2025 should ideally be caught by the initial find,
      // but catch here defensively in case of race conditions or other issues.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json({ message: 'Convention not found' }, { status: 404 });
      }
      console.error(`Error deleting convention ${id}:`, error);
      return NextResponse.json({ message: 'Could not delete convention' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Convention deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Error deleting convention ${params.id}:`, error);
    return NextResponse.json({ message: 'Could not delete convention' }, { status: 500 });
  }
}