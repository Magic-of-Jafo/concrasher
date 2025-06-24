import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ConventionCreateSchema } from '@/lib/validators';
import { z } from 'zod';
import { Role, ConventionStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { ConventionSearchParamsSchema, buildSearchQuery, calculatePagination } from '@/lib/search';
import { NextRequest } from 'next/server';
import { db } from "@/lib/db";
import { getStateVariations } from '@/lib/stateUtils';
import { ConventionSearchParams } from '@/lib/search';
import { Prisma } from '@prisma/client';

type ConventionStatus = 'PUBLISHED' | 'PAST' | 'DRAFT' | 'UPCOMING' | 'ACTIVE' | 'CANCELLED';

// Simple slugify function (replace with a more robust one if needed, e.g., slugify library)
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Explicitly type session.user to include id and roles
    const user = session?.user as { id: string; roles: Role[] } | undefined;

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has either ADMIN or ORGANIZER role
    const hasAccess = user.roles?.includes(Role.ADMIN) || user.roles?.includes(Role.ORGANIZER);
    if (!hasAccess) {
      return NextResponse.json({ message: 'Forbidden - Must be an admin or organizer' }, { status: 403 });
    }

    const organizerUserId = user.id;

    const body = await req.json();

    const validation = ConventionCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, ...dataToCreate } = validation.data;
    let slug = slugify(name);

    // Check for slug uniqueness
    const existingConventionBySlug = await prisma.convention.findUnique({
      where: { slug },
    });

    if (existingConventionBySlug) {
      // If slug exists, append a short unique identifier (e.g., timestamp or random string)
      // This is a simple strategy; more robust might involve iterative checks or user input
      slug = `${slug}-${Date.now().toString().slice(-5)}`;
      // Optionally, re-check if this new slug is unique, though collision is less likely
    }

    const conventionData = {
      ...dataToCreate,
      name,
      slug,
      organizerUserId,
    };

    const newConvention = await prisma.convention.create({
      data: conventionData,
    });

    return NextResponse.json(newConvention, { status: 201 });
  } catch (error) {
    console.error('Error creating convention:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.flatten().fieldErrors }, { status: 400 });
    }
    // Handle potential Prisma errors, e.g., unique constraint violations if not caught by slug check
    if (error instanceof Error && (error as any).code === 'P2002') { // Prisma unique constraint violation
        return NextResponse.json({ message: 'A convention with similar unique fields (e.g., slug after modification) already exists.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Could not create convention' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params: ConventionSearchParams = {
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 10,
      query: searchParams.get('query') || '',
      city: searchParams.get('city') || '',
      state: searchParams.get('state') || '',
      country: searchParams.get('country') || '',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: searchParams.get('status') ? [searchParams.get('status') as ConventionStatus] : undefined,
    };

    const skip = (params.page - 1) * params.limit;
    const searchQuery: Prisma.ConventionWhereInput = params.query ? {
      OR: [
        { name: { contains: params.query, mode: 'insensitive' as const } },
        { city: { contains: params.query, mode: 'insensitive' as const } },
        { stateName: { contains: params.query, mode: 'insensitive' as const } },
        { stateAbbreviation: { contains: params.query, mode: 'insensitive' as const } },
        { country: { contains: params.query, mode: 'insensitive' as const } },
        { venueName: { contains: params.query, mode: 'insensitive' as const } },
        { description: { contains: params.query, mode: 'insensitive' as const } },
      ],
    } : {};

    // Add additional filters
    if (params.city) {
      searchQuery.city = { contains: params.city, mode: 'insensitive' as const };
    }
    if (params.state) {
      searchQuery.OR = [
        { stateName: { contains: params.state, mode: 'insensitive' as const } },
        { stateAbbreviation: { contains: params.state, mode: 'insensitive' as const } },
      ];
    }
    if (params.country) {
      searchQuery.country = { contains: params.country, mode: 'insensitive' as const };
    }
    if (params.startDate) {
      searchQuery.startDate = { gte: new Date(params.startDate) };
    }
    if (params.endDate) {
      searchQuery.endDate = { lte: new Date(params.endDate) };
    }

    // Handle status filter - default to showing PUBLISHED conventions
    const statusParam = searchParams.get('status');
    if (statusParam === 'PAST') {
      searchQuery.status = ConventionStatus.PAST;
    } else {
      // For active view, show PUBLISHED conventions
      searchQuery.status = ConventionStatus.PUBLISHED;
    }

    // Always filter out soft-deleted conventions for public view
    searchQuery.deletedAt = null;

    const [items, total] = await Promise.all([
      prisma.convention.findMany({
        where: searchQuery,
        orderBy: { createdAt: 'desc' },
        skip,
        take: params.limit,
      }),
      prisma.convention.count({
        where: searchQuery,
      }),
    ]);

    return NextResponse.json({
      items,
      total,
      page: params.page,
      totalPages: Math.ceil(total / params.limit),
    });
  } catch (error) {
    console.error('Error fetching conventions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conventions' },
      { status: 500 }
    );
  }
}

// GET handler will be implemented next 