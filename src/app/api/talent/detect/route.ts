import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { detectTalentInText } from '@/lib/talent';

// POST /api/talent/detect  — given free text (an event title + description),
// return existing talent whose name appears in it, so the editor can suggest
// them as performers without the organizer re-typing the name.
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const text = typeof body?.text === 'string' ? body.text : '';
    const results = await detectTalentInText(text);
    return NextResponse.json({ results });
}
