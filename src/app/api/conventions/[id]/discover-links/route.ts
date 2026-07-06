import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { discoverSiteLinks } from '@/lib/scheduleScraper';

// POST /api/conventions/[id]/discover-links
// Wizard tool: given the convention's main website URL, find its section pages
// (schedule, pricing/registration, hotel/venue, talent) so later wizard steps
// arrive pre-seeded. Read-only; no DB write.
//
// JSON body: { url: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const conv = await prisma.convention.findUnique({
        where: { id: params.id },
        select: { id: true, websiteUrl: true, series: { select: { organizerUserId: true } } },
    });
    if (!conv) return NextResponse.json({ error: 'Convention not found' }, { status: 404 });

    const isAdmin = (session.user as any).roles?.includes('ADMIN');
    const isOwner = conv.series?.organizerUserId === session.user.id;
    if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'You must be the organizer or an admin for this convention.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const url = String(body.url || conv.websiteUrl || '').trim();
    if (!url) return NextResponse.json({ error: 'Provide a website URL.' }, { status: 400 });

    try {
        const links = await discoverSiteLinks(url);
        return NextResponse.json({ success: true, links });
    } catch (e: any) {
        console.error('discover-links failed:', e?.message || e);
        // Discovery is best-effort; an empty result is not an error for the wizard.
        return NextResponse.json({ success: true, links: { schedule: null, pricing: null, hotel: null, talent: null } });
    }
}
