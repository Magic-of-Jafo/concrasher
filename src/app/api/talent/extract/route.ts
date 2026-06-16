import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOpenAIConfig } from '@/lib/ai-settings';

// POST /api/talent/extract  — Layer 2 of talent tagging. Uses the admin-configured
// OpenAI model to pull performer *person-names* out of an event's title +
// description, including cases plain string-matching can't recover (e.g. shared
// surnames: "David and Jake Rangel" -> two people). Returns candidate names for
// the organizer to confirm; the editor adds them and find-or-create on save
// reuses existing profiles (alias-aware), so this never duplicates known talent.

const SYSTEM_PROMPT = `You extract the names of PEOPLE who are performing or presenting at a single convention event (performers, lecturers, hosts, MCs, panelists, guests of honor, judges).

Rules:
- Return ONLY real human names of people involved in THIS event.
- Expand shared/elided surnames: "David and Jake Rangel" -> "David Rangel", "Jake Rangel".
- Do NOT include: organization/company names, venue or room names, sponsors, the event title itself, generic activities (Registration, Dinner, Dealer's Room, Midnight Madness), or attendees.
- If no people are named, return an empty list. Do not invent names.
- Optionally infer each person's role from context: one of Performer, Lecturer, MC, Panelist, Host, Judge, Guest of Honor. Use null if unclear.

Respond ONLY as JSON of the form: {"performers": [{"name": "Full Name", "role": "Lecturer" | null}]}`;

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

    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const eventType = typeof body?.eventType === 'string' ? body.eventType.trim() : '';
    if (!title && !description) {
        return NextResponse.json({ results: [] });
    }

    const { apiKey, model } = await getOpenAIConfig();
    if (!apiKey) {
        return NextResponse.json(
            { error: 'OpenAI is not configured. Add a key in Admin → AI Settings.' },
            { status: 400 },
        );
    }

    const userContent = [
        `Event title: ${title || '(none)'}`,
        `Event type: ${eventType || '(unknown)'}`,
        `Description: ${description || '(none)'}`,
    ].join('\n');

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userContent },
                ],
                response_format: { type: 'json_object' },
                ...(/^gpt-5/.test(model) ? { reasoning_effort: 'low' } : {}),
            }),
            signal: AbortSignal.timeout(60000),
        });
        const json = await res.json();
        if (!res.ok) {
            console.error('talent/extract OpenAI error:', json.error ?? json);
            return NextResponse.json({ error: 'AI request failed.' }, { status: 502 });
        }

        const content = json.choices?.[0]?.message?.content ?? '{}';
        let parsed: any = {};
        try { parsed = JSON.parse(content); } catch { parsed = {}; }
        const performers = Array.isArray(parsed.performers) ? parsed.performers : [];

        const results = performers
            .map((p: any) => ({
                name: typeof p?.name === 'string' ? p.name.trim() : '',
                role: typeof p?.role === 'string' && p.role.trim() ? p.role.trim() : null,
            }))
            .filter((p: { name: string }) => p.name.length > 0);

        return NextResponse.json({ results, model });
    } catch (err: any) {
        console.error('talent/extract failed:', err?.message ?? err);
        return NextResponse.json({ error: 'AI request failed.' }, { status: 502 });
    }
}
