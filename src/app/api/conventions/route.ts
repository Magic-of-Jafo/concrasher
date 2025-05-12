import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ConventionCreateSchema } from '@/lib/validators';
import { z } from 'zod';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { ConventionSearchParamsSchema, buildSearchQuery, calculatePagination } from '@/lib/search';

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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; roles: Role[] } | undefined;

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Parse search parameters from URL
    const urlSearchParams = new URL(req.url).searchParams;
    const rawParams: Record<string, any> = {};
    
    // Convert searchParams to object and parse numbers
    urlSearchParams.forEach((value, key) => {
      if (key === 'page' || key === 'limit' || key === 'minPrice' || key === 'maxPrice') {
        rawParams[key] = parseInt(value, 10);
      } else if (key === 'types' || key === 'status') {
        rawParams[key] = value.split(',');
      } else {
        rawParams[key] = value;
      }
    });

    // Validate search parameters
    const validation = ConventionSearchParamsSchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const validatedParams = validation.data;
    const where = buildSearchQuery(validatedParams);

    // Get total count for pagination
    const total = await prisma.convention.count({ where });

    // Get paginated results
    const conventions = await prisma.convention.findMany({
      where,
      skip: (validatedParams.page - 1) * validatedParams.limit,
      take: validatedParams.limit,
      orderBy: { startDate: 'asc' },
    });

    const pagination = calculatePagination(total, validatedParams.page, validatedParams.limit);

    return NextResponse.json({
      items: conventions,
      ...pagination,
    }, { status: 200 });
  } catch (error) {
    console.error('Error searching conventions:', error);
    return NextResponse.json({ message: 'Could not search conventions' }, { status: 500 });
  }
}

// GET handler will be implemented next 