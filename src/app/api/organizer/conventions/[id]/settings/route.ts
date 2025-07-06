import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateConventionSettings, getConventionSettings } from '@/lib/actions';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const conventionId = params.id;
        const settings = await getConventionSettings(conventionId);

        if (!settings) {
            // Return default settings if none exist
            return NextResponse.json({
                currency: 'USD',
                timezone: ''
            });
        }

        return NextResponse.json(settings);

    } catch (error) {
        console.error('[API GET /organizer/conventions/:id/settings] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch convention settings' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const conventionId = params.id;
        const settings = await request.json();

        console.log(`[API PUT /organizer/conventions/${conventionId}/settings] Received settings:`, settings);
        console.log(`[API PUT /organizer/conventions/${conventionId}/settings] Convention ID:`, conventionId);
        console.log(`[API PUT /organizer/conventions/${conventionId}/settings] User ID:`, session.user.id);

        // Use the existing updateConventionSettings function
        const result = await updateConventionSettings(conventionId, settings);

        console.log(`[API PUT /organizer/conventions/${conventionId}/settings] Result:`, result);

        if (!result.success) {
            console.error(`[API PUT /organizer/conventions/${conventionId}/settings] Failed:`, result.error);
            return NextResponse.json(
                { error: result.error, fieldErrors: result.fieldErrors },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('[API PUT /organizer/conventions/:id/settings] Error:', error);
        return NextResponse.json(
            { error: 'Failed to update convention settings' },
            { status: 500 }
        );
    }
} 