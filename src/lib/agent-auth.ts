import { NextRequest, NextResponse } from 'next/server';

/**
 * Shared auth for the agent API (/api/v1/*): a static key in the
 * X-API-Key header checked against the AGENT_API_KEY env var.
 */
export function checkAgentApiKey(request: NextRequest): NextResponse | null {
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
