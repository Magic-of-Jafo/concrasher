import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/seo-settings
 * @summary Fetches the global SEO settings.
 * @tags SEO Settings
 * @return {object} 200 - The SEO settings.
 * @return {object} 500 - Internal server error.
 */
export async function GET() {
    const session = await getServerSession(authOptions);
    if (session?.user?.roles?.includes('ADMIN') === false) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const seoSettings = await db.sEOSetting.findUnique({
            where: { id: 'singleton' },
        });

        if (!seoSettings) {
            // If no settings exist, return default values
            return NextResponse.json({
                defaultKeywords: [],
                siteTitleTemplate: '',
                siteDescription: '',
            });
        }

        return NextResponse.json(seoSettings);
    } catch (error) {
        console.error('[SEO_SETTINGS_GET]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}

/**
 * POST /api/admin/seo-settings
 * @summary Creates or updates the global SEO settings.
 * @tags SEO Settings
 * @param {object} request.body - The SEO settings to save.
 * @return {object} 200 - The updated SEO settings.
 * @return {object} 400 - Bad request.
 * @return {object} 500 - Internal server error.
 */
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.roles?.includes('ADMIN') === false) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const values = await req.json();
        console.log('[SEO_SETTINGS_POST] Received values:', values);

        const seoSettings = await db.sEOSetting.upsert({
            where: { id: 'singleton' },
            update: {
                ...values,
            },
            create: {
                id: 'singleton',
                ...values,
            },
        });

        return NextResponse.json(seoSettings);
    } catch (error) {
        console.error('[SEO_SETTINGS_POST]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
} 