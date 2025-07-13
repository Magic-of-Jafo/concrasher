import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';


/**
 * POST /api/organizer/conventions/{id}/initialize-keywords
 * @summary Initializes the keywords for a convention from the default SEO settings.
 * @tags Conventions
 * @param {object} context - The context containing the convention ID.
 * @return {object} 200 - The updated convention with initialized keywords.
 * @return {object} 401 - Unauthorized if the user is not an organizer.
 * @return {object} 403 - Forbidden if the user does not own the convention.
 * @return {object} 404 - Not found if the convention or SEO settings don't exist.
 * @return {object} 500 - Internal server error.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.roles?.includes('ORGANIZER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conventionId } = params;

    try {
        // 1. Verify the user owns the convention
        const convention = await db.convention.findFirst({
            where: {
                id: conventionId,
                series: {
                    organizerUserId: session.user.id,
                },
            },
        });

        if (!convention) {
            return NextResponse.json({ error: 'Convention not found or you do not have permission to edit it.' }, { status: 403 });
        }

        // 2. Fetch the default keywords from SEOSettings
        const seoSettings = await (db as any).sEOSetting.findUnique({
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
            } as any,
            select: {
                keywords: true, // Return only the new keywords array
            } as any,
        });

        return NextResponse.json(updatedConvention);
    } catch (error) {
        console.error('[CONVENTION_INITIALIZE_KEYWORDS]', error);
        return new NextResponse('Internal ServerError', { status: 500 });
    }
} 