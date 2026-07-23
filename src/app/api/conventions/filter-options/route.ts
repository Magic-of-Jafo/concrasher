import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Options for the browse page's State/Country filters: only values that occur
// on real (published or past) conventions, so the pickers never offer a
// filter that returns an empty page. Free typing still works client-side;
// these are the suggestions.
export async function GET() {
    try {
        const where = { deletedAt: null, status: { in: ['PUBLISHED', 'PAST'] as any } };

        const [stateRows, countryRows] = await Promise.all([
            prisma.convention.groupBy({
                by: ['stateName', 'stateAbbreviation'],
                where: { ...where, OR: [{ stateName: { not: null } }, { stateAbbreviation: { not: null } }] },
            }),
            prisma.convention.groupBy({
                by: ['country'],
                where: { ...where, country: { not: null } },
            }),
        ]);

        // Collapse name/abbreviation variants ("Ohio"/"OH" rows) onto one entry.
        const byState = new Map<string, { name: string | null; abbreviation: string | null }>();
        for (const r of stateRows) {
            const key = (r.stateAbbreviation || r.stateName || '').toLowerCase();
            if (!key) continue;
            const existing = byState.get(key) || { name: null, abbreviation: null };
            byState.set(key, {
                name: existing.name || r.stateName,
                abbreviation: existing.abbreviation || r.stateAbbreviation,
            });
        }
        const states = [...byState.values()]
            .map((s) => ({ name: s.name || s.abbreviation!, abbreviation: s.abbreviation }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const countries = countryRows
            .map((r) => r.country!)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        return NextResponse.json({ states, countries });
    } catch (error) {
        console.error('filter-options failed:', error);
        return NextResponse.json({ states: [], countries: [] }, { status: 200 });
    }
}
