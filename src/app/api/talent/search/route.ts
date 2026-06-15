import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchTalent } from '@/lib/talent';

// GET /api/talent/search?q=...  — type-ahead for the event editor's performer
// tagging. Returns existing talent (claimed or unclaimed) matching the query.
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const q = req.nextUrl.searchParams.get('q') ?? '';
    const results = await searchTalent(q, 10);
    return NextResponse.json({
        results: results.map(t => ({
            id: t.id,
            displayName: t.displayName,
            aliases: t.aliases,
            claimed: t.userId !== null,
        })),
    });
}
