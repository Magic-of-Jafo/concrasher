import { NextRequest, NextResponse } from 'next/server';
import { ConventionStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import { stateAbbreviations } from '@/lib/stateUtils';

export const dynamic = 'force-dynamic';

const IMPORTED_KEYWORD = 'imported';

const ConventionAgentCreateSchema = z.object({
    name: z.string().min(3).max(200),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    city: z.string().max(100).optional(),
    stateName: z.string().max(100).optional(),
    stateAbbreviation: z.string().max(10).optional(),
    country: z.string().max(100).optional(),
    venueName: z.string().max(200).optional(),
    websiteUrl: z.string().url().max(500).optional(),
    descriptionShort: z.string().max(1000).optional(),
    status: z.nativeEnum(ConventionStatus).optional(),
});

function checkApiKey(request: NextRequest): NextResponse | null {
    const expected = process.env.AGENT_API_KEY;
    if (!expected) {
        return NextResponse.json(
            { error: 'Agent API key not configured on server' },
            { status: 500 }
        );
    }
    const provided = request.headers.get('x-api-key');
    if (provided !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return null;
}

// Reconcile state name/abbreviation so either one fills in the other (US states).
function normalizeState(stateName?: string, stateAbbreviation?: string) {
    let abbr = stateAbbreviation?.toUpperCase();
    let name = stateName;
    if (abbr && !name) {
        name = stateAbbreviations[abbr];
    } else if (name && !abbr) {
        const match = Object.entries(stateAbbreviations).find(
            ([, full]) => full.toLowerCase() === name!.toLowerCase()
        );
        abbr = match?.[0];
    }
    return { stateName: name, stateAbbreviation: abbr };
}

async function findDuplicate(name: string, slug: string, startDate?: Date) {
    const bySlug = await prisma.convention.findUnique({ where: { slug } });
    if (bySlug) return bySlug;

    const byName = await prisma.convention.findFirst({
        where: {
            name: { equals: name, mode: 'insensitive' },
            deletedAt: null,
        },
    });
    if (!byName) return null;

    // Same name in the same year is a duplicate; same name with no dates on
    // either side is also treated as one so re-runs stay idempotent.
    const existingYear = byName.startDate?.getUTCFullYear();
    const incomingYear = startDate?.getUTCFullYear();
    if (existingYear === incomingYear) return byName;
    return null;
}

export async function POST(request: NextRequest) {
    const authError = checkApiKey(request);
    if (authError) return authError;

    try {
        const body = await request.json();
        const validation = ConventionAgentCreateSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const data = validation.data;
        const slug = slugify(data.name);

        const existing = await findDuplicate(data.name, slug, data.startDate);
        if (existing) {
            return NextResponse.json(
                {
                    duplicate: true,
                    message: 'A convention with this name/slug already exists',
                    convention: {
                        id: existing.id,
                        name: existing.name,
                        slug: existing.slug,
                        startDate: existing.startDate,
                        status: existing.status,
                    },
                },
                { status: 200 }
            );
        }

        const { stateName, stateAbbreviation } = normalizeState(
            data.stateName,
            data.stateAbbreviation
        );

        const isOneDayEvent =
            !!data.startDate &&
            !!data.endDate &&
            data.startDate.getTime() === data.endDate.getTime();

        const convention = await prisma.convention.create({
            data: {
                name: data.name,
                slug,
                startDate: data.startDate,
                endDate: data.endDate ?? data.startDate,
                isOneDayEvent,
                isTBD: !data.startDate,
                city: data.city,
                stateName,
                stateAbbreviation,
                country: data.country ?? 'United States',
                venueName: data.venueName,
                websiteUrl: data.websiteUrl,
                descriptionShort: data.descriptionShort,
                status: data.status ?? ConventionStatus.PUBLISHED,
                keywords: [IMPORTED_KEYWORD],
            },
        });

        return NextResponse.json({ duplicate: false, convention }, { status: 201 });
    } catch (error) {
        console.error('Agent API: error creating convention:', error);
        return NextResponse.json(
            { error: 'Could not create convention' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const authError = checkApiKey(request);
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name') ?? undefined;
        const year = searchParams.get('year') ?? undefined;
        const importedOnly = searchParams.get('imported') === 'true';

        const conventions = await prisma.convention.findMany({
            where: {
                deletedAt: null,
                ...(name
                    ? { name: { contains: name, mode: 'insensitive' as const } }
                    : {}),
                ...(year
                    ? {
                        startDate: {
                            gte: new Date(`${year}-01-01T00:00:00Z`),
                            lt: new Date(`${Number(year) + 1}-01-01T00:00:00Z`),
                        },
                    }
                    : {}),
                ...(importedOnly ? { keywords: { has: IMPORTED_KEYWORD } } : {}),
            },
            orderBy: { startDate: 'asc' },
            select: {
                id: true,
                name: true,
                slug: true,
                startDate: true,
                endDate: true,
                city: true,
                stateAbbreviation: true,
                country: true,
                websiteUrl: true,
                status: true,
                keywords: true,
            },
            take: 200,
        });

        return NextResponse.json({ count: conventions.length, items: conventions });
    } catch (error) {
        console.error('Agent API: error listing conventions:', error);
        return NextResponse.json(
            { error: 'Could not list conventions' },
            { status: 500 }
        );
    }
}
