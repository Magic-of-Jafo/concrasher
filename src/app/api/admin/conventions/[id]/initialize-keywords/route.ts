import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/admin/conventions/{id}/initialize-keywords
 * @summary Initializes the keywords for any convention from the default SEO settings (Admin only).
 * @tags Admin, Conventions
 * @param {object} context - The context containing the convention ID.
 * @return {object} 200 - The updated convention with initialized keywords.
 * @return {object} 401 - Unauthorized if the user is not an admin.
 * @return {object} 404 - Not found if the convention or SEO settings don't exist.
 * @return {object} 500 - Internal server error.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.roles?.includes('ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conventionId } = params;

    try {
        // 1. Verify the convention exists
        const convention = await db.convention.findUnique({
            where: { id: conventionId },
        });

        if (!convention) {
            return NextResponse.json({ error: 'Convention not found.' }, { status: 404 });
        }

        // 2. Fetch the default keywords from SEOSettings
        const seoSettings = await db.sEOSetting.findUnique({
            where: { id: 'singleton' },
        });

        if (!seoSettings || !seoSettings.defaultKeywords) {
            return NextResponse.json({ error: 'Default SEO settings not found.' }, { status: 404 });
        }

        // 3. Update the convention with the default keywords
        const updatedConvention = await db.convention.update({
            where: { id: conventionId },
            data: {
                keywords: seoSettings.defaultKeywords,
            },
            select: {
                keywords: true, // Return only the new keywords array
            },
        });

        return NextResponse.json(updatedConvention);
    } catch (error) {
        console.error('[ADMIN_CONVENTION_INITIALIZE_KEYWORDS]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 