/**
 * Pricing extraction comprehension test (no DB writes).
 *
 * Fetches a convention pricing page and asks the configured OpenAI model to
 * map its pricing onto ConventionCrasher's composable paradigm:
 *   - attendee categories  -> price tiers
 *   - purchase/registration variants -> channels (the price toggle)
 *   - date/month thresholds -> "good through" cutoffs within a channel
 * Prints the parsed grid so we can eyeball it against the real table before
 * wiring extraction into the production agent. Nothing is saved.
 *
 * Usage:
 *   node scripts/pricing-extract-test.mjs --url <pricing page> --name "<convention>" [--model gpt-5.5]
 */

import { readFileSync } from 'fs';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith('--')) args[a.slice(2)] = process.argv[++i];
}
if (!args.url) { console.error('Usage: --url <pricing page> [--name "..."] [--model ...]'); process.exit(1); }

// ── key/model resolution (env → .env.local → admin AI Settings in DB) ─────
function readEnvLocal(name) {
    try {
        const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
        return env.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'))?.[1];
    } catch { return undefined; }
}
if (!process.env.DATABASE_URL) {
    const dbUrl = readEnvLocal('DATABASE_URL');
    if (dbUrl) process.env.DATABASE_URL = dbUrl;
}
let dbSettings = {};
try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: ['openai_api_key', 'openai_model'] } } });
    dbSettings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    await prisma.$disconnect();
} catch { /* fall back to env */ }

const model = args.model ?? dbSettings.openai_model ?? 'gpt-5.5';
const openaiKey = process.env.OPENAI_API_KEY ?? readEnvLocal('OPENAI_API_KEY') ?? dbSettings.openai_api_key;
if (!openaiKey) { console.error('No OpenAI API key found'); process.exit(1); }

// ── helpers ───────────────────────────────────────────────────────────────
function htmlToText(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<\/(td|th)>/gi, ' | ')          // keep table cells separated
        .replace(/<\/(tr|p|div|li|h[1-6])>/gi, '\n')
        .replace(/<br\s*\/?>(?=.)/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#?\w+;/g, ' ')
        .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n')
        .trim()
        .slice(0, 40000);
}

async function callOpenAI(messages, responseFormat) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model, messages, response_format: responseFormat }),
        signal: AbortSignal.timeout(180000),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(json.error ?? json)}`);
    return { content: json.choices[0].message.content, usage: json.usage };
}

const SCHEMA = {
    name: 'pricing_grid',
    strict: true,
    schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
            currency: { type: ['string', 'null'], description: 'ISO 4217, e.g. USD' },
            attendeeCategories: {
                type: 'array',
                items: { type: 'string' },
                description: 'Ticket/attendee types that become price tiers, e.g. "Member", "Member Spouse", "Non Member Youth".',
            },
            channels: {
                type: 'array',
                items: { type: 'string' },
                description: 'Purchase/registration variants that become a price toggle. List the primary/full option FIRST (it is the default view), e.g. ["Weekly","Daily"].',
            },
            prices: {
                type: 'array',
                description: 'One row per (category × channel × period). Include EVERY combination shown on the page.',
                items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        category: { type: 'string' },
                        channel: { type: 'string' },
                        goodThrough: {
                            type: ['string', 'null'],
                            description: 'YYYY-MM-DD this price is good THROUGH (its last valid day). A month range uses the last day of the range (e.g. "May and June" -> 2026-06-30; "Until May 1" -> 2026-04-30). Use null for the standard / at-the-door price that applies after all deadlines.',
                        },
                        amount: { type: 'number' },
                        perDay: { type: 'boolean', description: 'true if charged per day (e.g. Daily passes)' },
                    },
                    required: ['category', 'channel', 'goodThrough', 'amount', 'perDay'],
                },
            },
            notes: { type: ['string', 'null'] },
        },
        required: ['currency', 'attendeeCategories', 'channels', 'prices', 'notes'],
    },
};

// ── run ─────────────────────────────────────────────────────────────────
const name = args.name ?? args.url;
console.log(`\nExtracting pricing for: ${name}\n  url: ${args.url}\n  model: ${model}\n`);

const res = await fetch(args.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConventionCrasherBot/0.1)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
});
const text = htmlToText(await res.text());

const extraction = await callOpenAI([
    {
        role: 'system',
        content: [
            'You map a magic convention\'s published pricing onto a 3-dimensional model:',
            '  - attendeeCategories: the ticket/attendee types (price tiers).',
            '  - channels: a SECONDARY way prices are split that should become a toggle the visitor switches between (e.g. Weekly vs Daily, Online vs At-the-door). Pick the dimension that best works as a toggle; list the primary/full option first. Membership tiers (Member vs Non-Member) are CATEGORIES, not channels.',
            '  - prices: every category × channel × time-period price point.',
            'Rules:',
            '- Only report prices actually stated on the page. Never invent combinations.',
            '- Month ranges become a goodThrough = last day of that range; the standard / at-the-door price has goodThrough = null.',
            '- This is the 2026 edition, so dates are in 2026.',
            '- Set perDay = true for prices charged per day (e.g. Daily passes), false otherwise.',
        ].join('\n'),
    },
    { role: 'user', content: `Convention: ${name}\n\nPricing page text:\n${text}` },
], { type: 'json_schema', json_schema: SCHEMA });

const data = JSON.parse(extraction.content);

// ── pretty print as a grid per channel ────────────────────────────────────
const fmt = (n) => `$${Number(n).toFixed(2)}`;
const periodLabel = (gt) => (gt === null ? 'At the door' : `thru ${gt}`);

console.log(`Currency: ${data.currency}`);
console.log(`Categories (tiers): ${data.attendeeCategories.join(', ')}`);
console.log(`Channels (toggle): ${data.channels.join(' | ')}`);
if (data.notes) console.log(`Notes: ${data.notes}`);

for (const channel of data.channels) {
    const rows = data.prices.filter((p) => p.channel === channel);
    const periods = [...new Set(rows.map((r) => r.goodThrough))]
        .sort((a, b) => (a === null ? 1 : b === null ? -1 : a.localeCompare(b)));
    const perDay = rows.some((r) => r.perDay);
    console.log(`\n=== ${channel}${perDay ? ' (per day)' : ''} ===`);
    console.log(['Category'.padEnd(22), ...periods.map((p) => periodLabel(p).padStart(14))].join(''));
    for (const cat of data.attendeeCategories) {
        const cells = periods.map((p) => {
            const row = rows.find((r) => r.category === cat && r.goodThrough === p);
            return (row ? fmt(row.amount) : '—').padStart(14);
        });
        console.log([cat.padEnd(22), ...cells].join(''));
    }
}

console.log(`\nTotal price points extracted: ${data.prices.length}`);
console.log(`Tokens: ${extraction.usage?.total_tokens ?? '?'}`);
