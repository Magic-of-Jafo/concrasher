import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { getOpenAIConfig } from '@/lib/ai-settings';

export const dynamic = 'force-dynamic';

// Hide fine-tunes, embeddings, audio/image/moderation models — the dropdown
// is for text-extraction work, so only chat-capable base models matter.
const EXCLUDE = /embed|audio|whisper|tts|dall-e|image|moderation|realtime|transcribe|search|ft:/i;

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.roles?.includes(Role.ADMIN)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const config = await getOpenAIConfig();
    if (!config.apiKey) {
        return NextResponse.json({ error: 'No OpenAI API key configured' }, { status: 400 });
    }

    try {
        const res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${config.apiKey}` },
            signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) {
            const detail = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: `OpenAI rejected the request (${res.status})`, detail: detail?.error?.message },
                { status: 502 }
            );
        }
        const json = await res.json();
        const models = (json.data ?? [])
            .map((m: { id: string }) => m.id)
            .filter((id: string) => !EXCLUDE.test(id))
            .sort();

        return NextResponse.json({ models, current: config.model });
    } catch (error) {
        console.error('[AI_SETTINGS_MODELS]', error);
        return NextResponse.json({ error: 'Could not reach OpenAI' }, { status: 502 });
    }
}
