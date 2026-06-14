import { NextResponse } from 'next/server';
import { expirePastConventions } from '@/lib/conventions/expire';

export const dynamic = 'force-dynamic';

/**
 * Scheduled endpoint that marks finished conventions as PAST. Intended to be
 * called by a scheduler (e.g. a daily Render cron job) rather than a logged-in
 * user, so it is gated by a shared secret instead of a session.
 *
 * Authorize with either:
 *   - `Authorization: Bearer <CRON_SECRET>` header, or
 *   - `?secret=<CRON_SECRET>` query param.
 */
function isAuthorized(request: Request): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false; // never run unauthenticated if no secret is configured

    const authHeader = request.headers.get('authorization');
    if (authHeader === `Bearer ${secret}`) return true;

    const url = new URL(request.url);
    return url.searchParams.get('secret') === secret;
}

async function handle(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const count = await expirePastConventions();
        return NextResponse.json({
            message: `${count} conventions updated to PAST status.`,
            count,
        });
    } catch (error) {
        console.error('Error expiring conventions (cron):', error);
        return NextResponse.json({ error: 'Failed to expire conventions.' }, { status: 500 });
    }
}

// GET so simple schedulers (Render/Vercel cron, curl) can trigger it; POST too.
export async function GET(request: Request) {
    return handle(request);
}

export async function POST(request: Request) {
    return handle(request);
}
