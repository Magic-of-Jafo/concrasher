import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { getOpenAIConfig, saveOpenAISettings, maskApiKey } from '@/lib/ai-settings';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.roles?.includes(Role.ADMIN)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return null;
}

const SaveSchema = z.object({
    apiKey: z.string().min(20).max(300).optional(),
    model: z.string().min(2).max(100).optional(),
}).refine(data => data.apiKey !== undefined || data.model !== undefined, {
    message: 'Provide apiKey and/or model',
});

export async function GET() {
    const denied = await requireAdmin();
    if (denied) return denied;

    const config = await getOpenAIConfig();
    return NextResponse.json({
        keyConfigured: !!config.apiKey,
        maskedKey: maskApiKey(config.apiKey),
        model: config.model,
    });
}

export async function PUT(req: Request) {
    const denied = await requireAdmin();
    if (denied) return denied;

    try {
        const body = await req.json();
        const validation = SaveSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        await saveOpenAISettings(validation.data);
        const config = await getOpenAIConfig();
        return NextResponse.json({
            keyConfigured: !!config.apiKey,
            maskedKey: maskApiKey(config.apiKey),
            model: config.model,
        });
    } catch (error) {
        console.error('[AI_SETTINGS_PUT]', error);
        return NextResponse.json({ error: 'Could not save settings' }, { status: 500 });
    }
}
