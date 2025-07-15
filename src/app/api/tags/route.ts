import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/tags
 * @summary Fetches all tags.
 * @tags Tags
 * @return {object} 200 - A list of all tags.
 * @return {object} 500 - Internal server error.
 */
export async function GET() {
    try {
        const tags = await db.tag.findMany({
            orderBy: {
                name: 'asc',
            },
        });
        return NextResponse.json(tags);
    } catch (error) {
        console.error('[TAGS_GET]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
} 