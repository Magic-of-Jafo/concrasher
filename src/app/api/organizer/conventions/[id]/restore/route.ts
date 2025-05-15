import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ConventionStatus, Role } from '@prisma/client';

// Helper function to check ownership or admin status (can be DRYed up later)
async function authorizeAccess(userId: string, userRoles: Role[], conventionId: string): Promise<{ authorized: boolean, conventionExists: boolean, isDeleted: boolean, currentSlug?: string }> {
  const convention = await prisma.convention.findUnique({
    where: { id: conventionId },
    include: { series: true },
  });

  if (!convention) {
    return { authorized: false, conventionExists: false, isDeleted: false };
  }

  const isDeleted = !!convention.deletedAt;

  if (userRoles.includes(Role.ADMIN)) {
    return { authorized: true, conventionExists: true, isDeleted, currentSlug: convention.slug };
  }

  if (userRoles.includes(Role.ORGANIZER)) {
    if (convention.series?.organizerUserId === userId) {
      return { authorized: true, conventionExists: true, isDeleted, currentSlug: convention.slug };
    }
  }
  return { authorized: false, conventionExists: true, isDeleted, currentSlug: convention.slug };
}

const DELETED_SUFFIX_REGEX = /-DELETED-[0-9a-z]+-[0-9a-z]+$/;

function getOriginalSlug(currentSlug: string): string | null {
  if (DELETED_SUFFIX_REGEX.test(currentSlug)) {
    return currentSlug.replace(DELETED_SUFFIX_REGEX, "");
  }
  return null; // Should not happen if called on a correctly marked deleted slug
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: conventionId } = params;

  if (!conventionId) {
    return NextResponse.json({ error: 'Convention ID is required' }, { status: 400 });
  }

  const access = await authorizeAccess(session.user.id, session.user.roles as Role[], conventionId);

  if (!access.conventionExists) {
    return NextResponse.json({ error: 'Convention not found' }, { status: 404 });
  }

  if (!access.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!access.isDeleted || !access.currentSlug) {
    return NextResponse.json({ error: 'Convention is not deleted or has no slug' }, { status: 400 });
  }

  const originalSlug = getOriginalSlug(access.currentSlug);

  if (!originalSlug) {
    // This case implies the slug wasn't in the expected format, which is an internal issue.
    // Or, it might be an attempt to restore a convention that wasn't soft-deleted with the new mechanism.
    console.error(`Could not parse original slug from: ${access.currentSlug} for convention ID: ${conventionId}`);
    return NextResponse.json({ error: 'Cannot determine original slug. Restoration failed.' }, { status: 500 });
  }

  // Check for conflict: is the originalSlug used by another ACTIVE convention?
  const conflictingConvention = await prisma.convention.findFirst({
    where: {
      slug: originalSlug,
      deletedAt: null,
      id: { not: conventionId }, // Exclude the convention we are trying to restore
    },
  });

  if (conflictingConvention) {
    return NextResponse.json(
      { 
        error: 'Slug conflict', 
        message: `Cannot restore convention. The slug "${originalSlug}" is already in use by an active convention named "${conflictingConvention.name}". Please rename or delete the conflicting convention first then try again.`,
        conflictingConventionId: conflictingConvention.id,
        conflictingConventionName: conflictingConvention.name,
      },
      { status: 409 } // HTTP 409 Conflict
    );
  }

  try {
    const restoredConvention = await prisma.convention.update({
      where: {
        id: conventionId,
      },
      data: {
        deletedAt: null,
        slug: originalSlug, // Restore original slug
        // status: ConventionStatus.DRAFT, // Optional: revert status to DRAFT
      },
    });

    return NextResponse.json(restoredConvention);
  } catch (error) {
    console.error('Error restoring convention:', error);
    return NextResponse.json(
      { error: 'Failed to restore convention' },
      { status: 500 }
    );
  }
} 