/**
 * Enrichment model test harness.
 *
 * Tests how well an OpenAI model extracts Tier 1 (core facts) and Tier 2
 * (pricing) convention data from an organizer's real website. No database
 * writes — results go to stdout and a JSON file for review.
 *
 * The run mirrors the planned production pipeline:
 *   1. Fetch the convention homepage, reduce HTML to readable text + links.
 *   2. Ask the model which links matter for registration/pricing/venue.
 *   3. Fetch those pages (capped), then ask for a strict-schema extraction.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-...  node scripts/enrichment-model-test.mjs \
 *     --model gpt-5 --url https://www.magicconvention.com/ --name "MAGIC Live! 2026"
 *
 *   node scripts/enrichment-model-test.mjs --preset calibration --model gpt-5
 *     (runs the three calibration conventions: big / international / small-club)
 *
 * OPENAI_API_KEY can also live in .env.local.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';

// ── config ────────────────────────────────────────────────────────────────

const CALIBRATION_PRESET = [
    { name: 'MAGIC Live! 2026', url: 'https://www.magicconvention.com/' },
    { name: 'Blackpool Convention 2027', url: 'https://blackpoolmagicconvention.com/' },
    { name: 'MAWNY Convention 2027', url: 'http://www.mawny.org' },
];

const MAX_EXTRA_PAGES = 3;
const MAX_PAGE_CHARS = 30000;

const args = parseArgs(process.argv.slice(2));

// Settings precedence: CLI flag / env var → admin-saved SiteSetting (DB) → default.
if (!process.env.DATABASE_URL) {
    try {
        const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
        const dbUrl = env.match(/^DATABASE_URL="?([^"\r\n]+)"?/m)?.[1];
        if (dbUrl) process.env.DATABASE_URL = dbUrl;
    } catch { /* no .env.local */ }
}
let dbSettings = {};
try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const rows = await prisma.siteSetting.findMany({
        where: { key: { in: ['openai_api_key', 'openai_model'] } },
    });
    dbSettings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    await prisma.$disconnect();
} catch { /* DB not reachable — fall back to env/flags */ }

const model = args.model ?? dbSettings.openai_model ?? 'gpt-5';

let apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    try {
        const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
        apiKey = env.match(/^OPENAI_API_KEY="?([^"\r\n]+)"?/m)?.[1];
    } catch { /* fall through */ }
}
if (!apiKey) apiKey = dbSettings.openai_api_key;
if (!apiKey) {
    console.error('Set OPENAI_API_KEY in the environment or .env.local, or save a key in Admin → AI Settings');
    process.exit(1);
}

// ── extraction schema (mirrors planned PATCH /api/v1/conventions payload) ──

const EXTRACTION_SCHEMA = {
    name: 'convention_extraction',
    strict: true,
    schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
            tier1: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    officialName: { type: ['string', 'null'] },
                    startDate: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
                    endDate: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
                    city: { type: ['string', 'null'] },
                    stateOrRegion: { type: ['string', 'null'] },
                    country: { type: ['string', 'null'] },
                    venueName: { type: ['string', 'null'] },
                    registrationUrl: { type: ['string', 'null'] },
                    descriptionShort: { type: ['string', 'null'], description: 'One or two sentences, neutral tone, max 300 chars' },
                    keywords: { type: 'array', items: { type: 'string' } },
                },
                required: ['officialName', 'startDate', 'endDate', 'city', 'stateOrRegion', 'country', 'venueName', 'registrationUrl', 'descriptionShort', 'keywords'],
            },
            tier2: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    currency: { type: ['string', 'null'], description: 'ISO 4217, e.g. USD, GBP' },
                    priceTiers: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                label: { type: 'string' },
                                amount: { type: 'number' },
                            },
                            required: ['label', 'amount'],
                        },
                    },
                    priceDiscounts: {
                        type: 'array',
                        description: 'Early-bird or date-based discounts',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                tierLabel: { type: 'string' },
                                cutoffDate: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
                                discountedAmount: { type: 'number' },
                            },
                            required: ['tierLabel', 'cutoffDate', 'discountedAmount'],
                        },
                    },
                },
                required: ['currency', 'priceTiers', 'priceDiscounts'],
            },
            meta: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    fieldConfidence: {
                        type: 'object',
                        additionalProperties: false,
                        description: 'low/medium/high per extracted area',
                        properties: {
                            dates: { type: 'string', enum: ['low', 'medium', 'high', 'not_found'] },
                            location: { type: 'string', enum: ['low', 'medium', 'high', 'not_found'] },
                            venue: { type: 'string', enum: ['low', 'medium', 'high', 'not_found'] },
                            pricing: { type: 'string', enum: ['low', 'medium', 'high', 'not_found'] },
                        },
                        required: ['dates', 'location', 'venue', 'pricing'],
                    },
                    sourcePages: { type: 'array', items: { type: 'string' } },
                    notes: { type: ['string', 'null'], description: 'Anything ambiguous, conflicting, or worth a human look' },
                },
                required: ['fieldConfidence', 'sourcePages', 'notes'],
            },
        },
        required: ['tier1', 'tier2', 'meta'],
    },
};

// ── helpers ───────────────────────────────────────────────────────────────

function parseArgs(argv) {
    const out = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1], i++;
        else out._.push(argv[i]);
    }
    return out;
}

function htmlToText(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<br\s*\/?>(?=.)/gi, '\n')
        .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#?\w+;/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n')
        .trim()
        .slice(0, MAX_PAGE_CHARS);
}

function extractLinks(html, baseUrl) {
    const links = new Set();
    for (const match of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,80}?)</gi)) {
        try {
            const url = new URL(match[1], baseUrl);
            if (!/^https?:/.test(url.protocol)) continue;
            const text = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            links.add(JSON.stringify({ url: url.href, text: text.slice(0, 60) }));
        } catch { /* skip malformed */ }
    }
    return [...links].map(item => JSON.parse(item)).slice(0, 120);
}

async function fetchPage(url) {
    const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConventionCrasherBot/0.1; +https://conventioncrasher.com)' },
        signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.text();
}

async function callOpenAI(messages, responseFormat) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages,
            ...(responseFormat ? { response_format: responseFormat } : {}),
        }),
        signal: AbortSignal.timeout(180000),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(json.error ?? json)}`);
    return { content: json.choices[0].message.content, usage: json.usage };
}

// ── pipeline ──────────────────────────────────────────────────────────────

async function enrich({ name, url }) {
    console.log(`\n━━━ ${name} ━━━\n    site: ${url}\n    model: ${model}`);
    const result = { convention: name, url, model, startedAt: new Date().toISOString(), pages: [], usage: [] };

    // Phase 1: homepage
    let homepageHtml;
    try {
        homepageHtml = await fetchPage(url);
    } catch (err) {
        console.error(`    ✗ homepage fetch failed: ${err.message}`);
        return { ...result, error: `homepage fetch failed: ${err.message}` };
    }
    const homepageText = htmlToText(homepageHtml);
    const links = extractLinks(homepageHtml, url);
    result.pages.push(url);

    // Phase 2: let the model pick follow-up pages
    let extraPages = [];
    if (links.length > 0) {
        const pick = await callOpenAI([
            {
                role: 'system',
                content: 'You select which pages of a convention website to read to find registration/pricing, venue/hotel, and event dates. Reply with a JSON array of up to ' + MAX_EXTRA_PAGES + ' URLs from the provided list, most useful first. Reply with [] if the homepage likely has everything.',
            },
            {
                role: 'user',
                content: `Convention: ${name}\nHomepage text (truncated):\n${homepageText.slice(0, 8000)}\n\nLinks found:\n${links.map(l => `${l.url} — "${l.text}"`).join('\n')}`,
            },
        ], { type: 'json_object' }).catch(() => null);

        if (pick) {
            result.usage.push(pick.usage);
            try {
                const parsed = JSON.parse(pick.content);
                const urls = Array.isArray(parsed) ? parsed : parsed.urls ?? parsed.pages ?? [];
                extraPages = urls.filter(u => typeof u === 'string').slice(0, MAX_EXTRA_PAGES);
            } catch { /* model returned junk; continue with homepage only */ }
        }
    }

    const pageContents = [{ url, text: homepageText }];
    for (const pageUrl of extraPages) {
        try {
            const html = await fetchPage(pageUrl);
            pageContents.push({ url: pageUrl, text: htmlToText(html) });
            result.pages.push(pageUrl);
            console.log(`    + fetched ${pageUrl}`);
        } catch (err) {
            console.log(`    - skipped ${pageUrl} (${err.message})`);
        }
    }

    // Phase 3: strict-schema extraction
    const extraction = await callOpenAI([
        {
            role: 'system',
            content: [
                'You extract structured data about a specific magic convention from its official website.',
                'Rules:',
                '- Only report facts stated on the provided pages. Use null for anything not found. Never guess.',
                '- Dates must be YYYY-MM-DD. If only a month is given, use null and explain in notes.',
                '- Prices: list every registration tier you find. Early-bird prices with deadlines go in priceDiscounts with the full price as the tier.',
                '- descriptionShort: neutral, factual, no marketing superlatives.',
                '- If the site shows a DIFFERENT year/edition than the one asked about, say so in notes and set confidence low.',
            ].join('\n'),
        },
        {
            role: 'user',
            content: `Extract data for: ${name}\n\n` + pageContents.map(p => `=== PAGE: ${p.url} ===\n${p.text}`).join('\n\n'),
        },
    ], { type: 'json_schema', json_schema: EXTRACTION_SCHEMA });

    result.usage.push(extraction.usage);
    result.extraction = JSON.parse(extraction.content);
    result.finishedAt = new Date().toISOString();

    const t1 = result.extraction.tier1;
    const conf = result.extraction.meta.fieldConfidence;
    console.log(`    ✓ dates: ${t1.startDate ?? '—'} → ${t1.endDate ?? '—'} [${conf.dates}]`);
    console.log(`    ✓ where: ${[t1.city, t1.stateOrRegion, t1.country].filter(Boolean).join(', ') || '—'} @ ${t1.venueName ?? '—'} [${conf.location}/${conf.venue}]`);
    console.log(`    ✓ tiers: ${result.extraction.tier2.priceTiers.map(t => `${t.label} ${t.amount}`).join(' | ') || '—'} [${conf.pricing}]`);
    if (result.extraction.meta.notes) console.log(`    ⚠ notes: ${result.extraction.meta.notes}`);
    return result;
}

// ── main ──────────────────────────────────────────────────────────────────

async function main() {
    const targets = args.preset === 'calibration'
        ? CALIBRATION_PRESET
        : [{ name: args.name ?? args.url, url: args.url }];

    if (!targets[0]?.url) {
        console.error('Usage: node scripts/enrichment-model-test.mjs --url <site> --name "<convention>" [--model gpt-5]');
        console.error('   or: node scripts/enrichment-model-test.mjs --preset calibration [--model gpt-5]');
        process.exit(1);
    }

    const results = [];
    for (const target of targets) {
        try {
            results.push(await enrich(target));
        } catch (err) {
            console.error(`    ✗ ${target.name}: ${err.message}`);
            results.push({ convention: target.name, url: target.url, model, error: err.message });
        }
    }

    mkdirSync(new URL('./enrichment-results/', import.meta.url), { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outPath = new URL(`./enrichment-results/${stamp}-${model.replace(/[^\w.-]/g, '_')}.json`, import.meta.url);
    writeFileSync(outPath, JSON.stringify(results, null, 2));

    const totalTokens = results.flatMap(r => r.usage ?? []).reduce((sum, u) => sum + (u?.total_tokens ?? 0), 0);
    console.log(`\nSaved ${results.length} result(s) → scripts/enrichment-results/${stamp}-${model.replace(/[^\w.-]/g, '_')}.json`);
    console.log(`Total tokens used: ${totalTokens}`);
}

main();
