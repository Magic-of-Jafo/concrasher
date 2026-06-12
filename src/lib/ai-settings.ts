import { db } from '@/lib/db';

export const AI_SETTING_KEYS = {
    openAiApiKey: 'openai_api_key',
    openAiModel: 'openai_model',
} as const;

export const DEFAULT_OPENAI_MODEL = 'gpt-5';

/**
 * Resolve the OpenAI configuration for server-side AI features
 * (enrichment agents, etc.). The admin-saved SiteSetting wins; the
 * OPENAI_API_KEY env var is the fallback so the app still works before
 * the setting is ever saved.
 */
export async function getOpenAIConfig(): Promise<{ apiKey: string | null; model: string }> {
    const settings = await db.siteSetting.findMany({
        where: { key: { in: [AI_SETTING_KEYS.openAiApiKey, AI_SETTING_KEYS.openAiModel] } },
    });
    const byKey = Object.fromEntries(settings.map(s => [s.key, s.value]));

    return {
        apiKey: byKey[AI_SETTING_KEYS.openAiApiKey] || process.env.OPENAI_API_KEY || null,
        model: byKey[AI_SETTING_KEYS.openAiModel] || DEFAULT_OPENAI_MODEL,
    };
}

export async function saveOpenAISettings({ apiKey, model }: { apiKey?: string; model?: string }) {
    const writes = [];
    if (apiKey !== undefined) {
        writes.push(
            db.siteSetting.upsert({
                where: { key: AI_SETTING_KEYS.openAiApiKey },
                update: { value: apiKey },
                create: { key: AI_SETTING_KEYS.openAiApiKey, value: apiKey },
            })
        );
    }
    if (model !== undefined) {
        writes.push(
            db.siteSetting.upsert({
                where: { key: AI_SETTING_KEYS.openAiModel },
                update: { value: model },
                create: { key: AI_SETTING_KEYS.openAiModel, value: model },
            })
        );
    }
    await db.$transaction(writes);
}

/** Last-4 mask for displaying a stored key without exposing it. */
export function maskApiKey(key: string | null): string | null {
    if (!key) return null;
    return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
