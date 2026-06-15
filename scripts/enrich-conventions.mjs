/**
 * Convention enrichment runner.
 *
 * For each imported convention with a website: fetch the site, extract
 * Tier 1 (core facts) + Tier 2 (pricing) data with an OpenAI model, and
 * PATCH the results into ConventionCrasher through the agent API, which
 * enforces the fill-don't-clobber provenance rules and logs every change.
 *
 * Usage:
 *   node scripts/enrich-conventions.mjs --slug magic-live-2026      # one convention
 *   node scripts/enrich-conventions.mjs --limit 5                   # first 5 imported
 *   node scripts/enrich-conventions.mjs --all                       # everything imported
 *   ... --tier3                                                     # venue/hotel pass instead of tier 1+2
 *   ... [--model gpt-5.5] [--dry-run]                               # dry-run: extract but don't PATCH
 *   API_BASE=https://conventioncrasher.com node scripts/...         # target production
 *
 * Key/model resolution: --model flag → admin AI Settings (DB) → default.
 * OPENAI_API_KEY: env → .env.local → admin AI Settings (DB).
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000';
const MAX_EXTRA_PAGES = 3;
const MAX_PAGE_CHARS = 30000;

const args = parseArgs(process.argv.slice(2));

// ── settings resolution (mirrors enrichment-model-test.mjs) ───────────────

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
    const rows = await prisma.siteSetting.findMany({
        where: { key: { in: ['openai_api_key', 'openai_model'] } },
    });
    dbSettings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    await prisma.$disconnect();
} catch { /* DB not reachable — fall back to env/flags */ }

const model = args.model ?? dbSettings.openai_model ?? 'gpt-5';
const openaiKey = process.env.OPENAI_API_KEY ?? readEnvLocal('OPENAI_API_KEY') ?? dbSettings.openai_api_key;
const agentKey = process.env.AGENT_API_KEY ?? readEnvLocal('AGENT_API_KEY');

if (!openaiKey) { console.error('No OpenAI API key (env, .env.local, or Admin → AI Settings)'); process.exit(1); }
if (!agentKey) { console.error('No AGENT_API_KEY (env or .env.local)'); process.exit(1); }

// ── extraction schema (matches PATCH /api/v1/conventions/:id) ─────────────

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
                    stateOrRegion: { type: ['string', 'null'], description: 'US two-letter abbreviation if a US state, else region name' },
                    country: { type: ['string', 'null'] },
                    venueName: { type: ['string', 'null'] },
                    registrationUrl: { type: ['string', 'null'] },
                    descriptionShort: { type: ['string', 'null'], description: 'One or two sentences, neutral tone, max 300 chars' },
                    keywords: { type: 'array', items: { type: 'string' } },
                    timezone: { type: ['string', 'null'], description: 'IANA timezone id for the venue location, inferred from the city/country, e.g. "America/New_York", "Europe/London", "Australia/Melbourne". null if the location is unknown.' },
                },
                required: ['officialName', 'startDate', 'endDate', 'city', 'stateOrRegion', 'country', 'venueName', 'registrationUrl', 'descriptionShort', 'keywords', 'timezone'],
            },
            tier2: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    currency: { type: ['string', 'null'], description: 'ISO 4217' },
                    pricingTables: {
                        type: 'array',
                        description: 'One independent table per pricing tab. Use multiple tables ONLY when the event sells genuinely different ticket sets (e.g. a full-week "All Access" set AND a separate "Daily" set with different categories). Use a SINGLE table when the same tickets are simply sold at two prices by channel (online vs at the door) — put both prices on each row via amount + amountSecondary.',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                name: { type: ['string', 'null'], description: 'Tab name when there are multiple tables (e.g. "Weekly", "Daily", "All Access"). Use null/empty for a single table.' },
                                primaryLabel: { type: ['string', 'null'], description: 'Label for the main price column. For a two-column table this is the dearer channel, e.g. "At the Door". Null for a plain single-price table.' },
                                secondaryLabel: { type: ['string', 'null'], description: 'Label for the second price column when the same ticket has a cheaper channel, e.g. "Online" / "Advance". Null when there is only one price column.' },
                                tiers: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        additionalProperties: false,
                                        properties: {
                                            label: { type: 'string' },
                                            amount: { type: 'number', description: 'Primary price (the dearer / at-the-door price when there is a second column)' },
                                            amountSecondary: { type: ['number', 'null'], description: 'Second-column price (e.g. Online); null when the table has one price column' },
                                            earlyBird: {
                                                type: 'array',
                                                description: 'Date-based discounts where the price rises after a calendar deadline. Empty when none.',
                                                items: {
                                                    type: 'object',
                                                    additionalProperties: false,
                                                    properties: {
                                                        cutoffDate: { type: ['string', 'null'], description: 'YYYY-MM-DD: price applies through this date' },
                                                        price: { type: 'number' },
                                                    },
                                                    required: ['cutoffDate', 'price'],
                                                },
                                            },
                                        },
                                        required: ['label', 'amount', 'amountSecondary', 'earlyBird'],
                                    },
                                },
                            },
                            required: ['name', 'primaryLabel', 'secondaryLabel', 'tiers'],
                        },
                    },
                },
                required: ['currency', 'pricingTables'],
            },
            meta: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    fieldConfidence: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            dates: { type: 'string', enum: ['low', 'medium', 'high', 'not_found'] },
                            location: { type: 'string', enum: ['low', 'medium', 'high', 'not_found'] },
                            venue: { type: 'string', enum: ['low', 'medium', 'high', 'not_found'] },
                            pricing: { type: 'string', enum: ['low', 'medium', 'high', 'not_found'] },
                        },
                        required: ['dates', 'location', 'venue', 'pricing'],
                    },
                    sourcePages: { type: 'array', items: { type: 'string' } },
                    notes: { type: ['string', 'null'] },
                },
                required: ['fieldConfidence', 'sourcePages', 'notes'],
            },
        },
        required: ['tier1', 'tier2', 'meta'],
    },
};

// ── tier 3 extraction schema (venue + hotels) ─────────────────────────────

const venueProps = {
    name: { type: 'string' },
    description: { type: ['string', 'null'] },
    websiteUrl: { type: ['string', 'null'] },
    streetAddress: { type: ['string', 'null'] },
    city: { type: ['string', 'null'] },
    stateRegion: { type: ['string', 'null'] },
    postalCode: { type: ['string', 'null'] },
    country: { type: ['string', 'null'] },
    contactEmail: { type: ['string', 'null'] },
    contactPhone: { type: ['string', 'null'] },
    amenities: { type: 'array', items: { type: 'string' } },
    parkingInfo: { type: ['string', 'null'] },
    publicTransportInfo: { type: ['string', 'null'] },
    accessibilityNotes: { type: ['string', 'null'] },
};

const TIER3_SCHEMA = {
    name: 'venue_hotel_extraction',
    strict: true,
    schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
            tier3: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    guestsStayAtPrimaryVenue: { type: ['boolean', 'null'], description: 'true if the event venue is also the recommended hotel' },
                    venue: {
                        type: ['object', 'null'],
                        additionalProperties: false,
                        description: 'The primary event venue where the convention takes place',
                        properties: { ...venueProps, googleMapsUrl: { type: ['string', 'null'] } },
                        required: [...Object.keys(venueProps), 'googleMapsUrl'],
                    },
                    hotels: {
                        type: 'array',
                        description: 'Recommended guest hotels. Include the venue itself ONLY if guests are told to stay there.',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                ...venueProps,
                                isPrimary: { type: 'boolean' },
                                isAtVenue: { type: 'boolean' },
                                groupRateOrBookingCode: { type: ['string', 'null'], description: 'Group/discount code or rate name attendees use' },
                                groupPrice: { type: ['string', 'null'], description: 'Stated room rate, e.g. "$129/night"' },
                                bookingLink: { type: ['string', 'null'] },
                                bookingCutoffDate: { type: ['string', 'null'], description: 'YYYY-MM-DD deadline to book at the group rate' },
                            },
                            required: [...Object.keys(venueProps), 'isPrimary', 'isAtVenue', 'groupRateOrBookingCode', 'groupPrice', 'bookingLink', 'bookingCutoffDate'],
                        },
                    },
                },
                required: ['guestsStayAtPrimaryVenue', 'venue', 'hotels'],
            },
            meta: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    fieldConfidence: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            dates: { type: 'string', enum: ['low', 'medium', 'high', 'not_found'] },
                            location: { type: 'string', enum: ['low', 'medium', 'high', 'not_found'] },
                            venue: { type: 'string', enum: ['low', 'medium', 'high', 'not_found'] },
                            pricing: { type: 'string', enum: ['low', 'medium', 'high', 'not_found'] },
                            hotels: { type: 'string', enum: ['low', 'medium', 'high', 'not_found'] },
                        },
                        required: ['dates', 'location', 'venue', 'pricing', 'hotels'],
                    },
                    sourcePages: { type: 'array', items: { type: 'string' } },
                    notes: { type: ['string', 'null'] },
                },
                required: ['fieldConfidence', 'sourcePages', 'notes'],
            },
        },
        required: ['tier3', 'meta'],
    },
};

// ── helpers ───────────────────────────────────────────────────────────────

function parseArgs(argv) {
    const out = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--dry-run' || argv[i] === '--all' || argv[i] === '--tier3') out[argv[i].slice(2).replace('-', '')] = true;
        else if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1], i++;
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model, messages, ...(responseFormat ? { response_format: responseFormat } : {}) }),
        signal: AbortSignal.timeout(180000),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(json.error ?? json)}`);
    return { content: json.choices[0].message.content, usage: json.usage };
}

// ── extraction (same pipeline the calibration test validated) ─────────────

async function extract(convention) {
    const { name, websiteUrl } = convention;
    const homepageHtml = await fetchPage(websiteUrl);
    const homepageText = htmlToText(homepageHtml);
    const links = extractLinks(homepageHtml, websiteUrl);
    const usage = [];

    let extraPages = [];
    if (links.length > 0) {
        const pick = await callOpenAI([
            {
                role: 'system',
                content: 'You select which pages of a convention website to read to find registration/pricing, venue/hotel, and event dates. Reply with a JSON object {"urls": [...]} of up to ' + MAX_EXTRA_PAGES + ' URLs from the provided list, most useful first. Reply {"urls": []} if the homepage likely has everything.',
            },
            {
                role: 'user',
                content: `Convention: ${name}\nHomepage text (truncated):\n${homepageText.slice(0, 8000)}\n\nLinks found:\n${links.map(l => `${l.url} — "${l.text}"`).join('\n')}`,
            },
        ], { type: 'json_object' }).catch(() => null);
        if (pick) {
            usage.push(pick.usage);
            try {
                const parsed = JSON.parse(pick.content);
                extraPages = (parsed.urls ?? []).filter(u => typeof u === 'string').slice(0, MAX_EXTRA_PAGES);
            } catch { /* continue with homepage only */ }
        }
    }

    const pageContents = [{ url: websiteUrl, text: homepageText }];
    for (const pageUrl of extraPages) {
        try {
            const html = await fetchPage(pageUrl);
            pageContents.push({ url: pageUrl, text: htmlToText(html) });
        } catch { /* skip unfetchable page */ }
    }

    const extraction = await callOpenAI([
        {
            role: 'system',
            content: [
                'You extract structured data about a specific magic convention from its official website.',
                'Rules:',
                '- Only report facts stated on the provided pages. Use null for anything not found. Never guess.',
                '- Dates must be YYYY-MM-DD. If only a month is given, use null and explain in notes.',
                '- Prices: model the pricing as one or more independent tables (pricingTables). Decide the structure:',
                '  * ONE table, single price column: every ticket has one price. Leave secondaryLabel null, amountSecondary null.',
                '  * ONE table, TWO price columns: the SAME tickets are sold at two prices by channel (e.g. cheaper online, more at the door). Put the dearer price in amount and the cheaper in amountSecondary; set primaryLabel (e.g. "At the Door") and secondaryLabel (e.g. "Online"). Do NOT make two tables for this.',
                '  * MULTIPLE tables: the event sells genuinely different ticket SETS with different categories (e.g. a full-week "All Access" set and a separate "Daily"/"One Day" set). One table per set, each with its own name and its own tiers.',
                '  * earlyBird: when a price rises after a calendar deadline ("$300 until June 30, then $400"), put amount = the final/regular price and add earlyBird entries { cutoffDate, price } for the earlier prices. Otherwise leave earlyBird empty.',
                '  * Two-column channel pricing and earlyBird can combine, but most events use just one. Use nulls/empty when unsure rather than guessing.',
                '- descriptionShort: neutral, factual, no marketing superlatives.',
                '- CRITICAL: if the site shows a DIFFERENT year/edition than the one asked about, set ALL confidence to low, use nulls, and explain in notes.',
                '- For US locations, stateOrRegion must be the two-letter abbreviation.',
                '- timezone: infer the venue\'s IANA timezone id from its city/country (e.g. "America/New_York", "Europe/London"). Use null only if the location is genuinely unknown.',
            ].join('\n'),
        },
        {
            role: 'user',
            content: `Extract data for: ${name}\n\n` + pageContents.map(p => `=== PAGE: ${p.url} ===\n${p.text}`).join('\n\n'),
        },
    ], { type: 'json_schema', json_schema: EXTRACTION_SCHEMA });
    usage.push(extraction.usage);

    const data = JSON.parse(extraction.content);
    data.meta.sourcePages = [websiteUrl, ...extraPages];
    data.meta.model = model;
    // The schema returns "" for missing URL-ish fields sometimes; normalize.
    if (data.tier1.registrationUrl && !/^https?:\/\//.test(data.tier1.registrationUrl)) data.tier1.registrationUrl = null;
    return { data, usage };
}

// ── tier 3 extraction: venue + hotels ─────────────────────────────────────

const nullifyBadUrl = u => (u && /^https?:\/\//.test(u) ? u : null);

async function extractTier3(convention) {
    const { name, websiteUrl } = convention;
    const homepageHtml = await fetchPage(websiteUrl);
    const homepageText = htmlToText(homepageHtml);
    const links = extractLinks(homepageHtml, websiteUrl);
    const usage = [];

    let extraPages = [];
    if (links.length > 0) {
        const pick = await callOpenAI([
            {
                role: 'system',
                content: 'You select which pages of a convention website to read to find VENUE details (address, parking, accessibility) and GUEST HOTEL details (recommended hotels, group rates, booking codes, booking deadlines). Look for pages like Venue, Hotel, Travel, Location, Accommodations, FAQ. Reply with a JSON object {"urls": [...]} of up to ' + MAX_EXTRA_PAGES + ' URLs from the provided list, most useful first. Reply {"urls": []} if the homepage likely has everything.',
            },
            {
                role: 'user',
                content: `Convention: ${name}\nHomepage text (truncated):\n${homepageText.slice(0, 8000)}\n\nLinks found:\n${links.map(l => `${l.url} — "${l.text}"`).join('\n')}`,
            },
        ], { type: 'json_object' }).catch(() => null);
        if (pick) {
            usage.push(pick.usage);
            try {
                const parsed = JSON.parse(pick.content);
                extraPages = (parsed.urls ?? []).filter(u => typeof u === 'string').slice(0, MAX_EXTRA_PAGES);
            } catch { /* continue with homepage only */ }
        }
    }

    const pageContents = [{ url: websiteUrl, text: homepageText }];
    for (const pageUrl of extraPages) {
        try {
            const html = await fetchPage(pageUrl);
            pageContents.push({ url: pageUrl, text: htmlToText(html) });
        } catch { /* skip unfetchable page */ }
    }

    const extraction = await callOpenAI([
        {
            role: 'system',
            content: [
                'You extract VENUE and GUEST HOTEL details for a specific magic convention from its official website.',
                'Rules:',
                '- Only report facts stated on the provided pages. Use null for anything not found. Never guess or infer addresses.',
                '- venue = where the convention itself happens. hotels = where attendees are told to stay (often the same building — then set guestsStayAtPrimaryVenue true and isAtVenue true on that hotel).',
                '- Group rates: capture the stated room price as written (e.g. "$129/night + tax"), any booking/group code, the booking link, and the YYYY-MM-DD cutoff deadline if stated.',
                '- amenities: only items explicitly stated (e.g. "free parking", "free wifi", "airport shuttle").',
                '- CRITICAL: if the site shows a DIFFERENT year/edition than the one asked about, hotel/venue info may still be valid if clearly persistent (same venue every year, stated generically), but set confidence to medium at best and explain in notes. If the venue/hotel is explicitly tied to the wrong year, use null and low confidence.',
                '- Set fieldConfidence.dates/location/pricing to not_found (this pass does not extract them).',
            ].join('\n'),
        },
        {
            role: 'user',
            content: `Extract venue and hotel data for: ${name}\n\n` + pageContents.map(p => `=== PAGE: ${p.url} ===\n${p.text}`).join('\n\n'),
        },
    ], { type: 'json_schema', json_schema: TIER3_SCHEMA });
    usage.push(extraction.usage);

    const data = JSON.parse(extraction.content);
    data.meta.sourcePages = [websiteUrl, ...extraPages];
    data.meta.model = model;

    // Normalize URL-ish fields the schema can't enforce.
    if (data.tier3.venue) {
        data.tier3.venue.websiteUrl = nullifyBadUrl(data.tier3.venue.websiteUrl);
        data.tier3.venue.googleMapsUrl = nullifyBadUrl(data.tier3.venue.googleMapsUrl);
    }
    for (const h of data.tier3.hotels ?? []) {
        h.websiteUrl = nullifyBadUrl(h.websiteUrl);
        h.bookingLink = nullifyBadUrl(h.bookingLink);
    }
    return { data, usage };
}

// ── main ──────────────────────────────────────────────────────────────────

async function main() {
    const listRes = await fetch(`${API_BASE}/api/v1/conventions?imported=true`, {
        headers: { 'x-api-key': agentKey },
    });
    if (!listRes.ok) { console.error(`Could not list conventions: ${listRes.status}`); process.exit(1); }
    let { items } = await listRes.json();

    items = items.filter(c => c.websiteUrl);
    if (args.slug) items = items.filter(c => c.slug === args.slug);
    if (args.limit) items = items.slice(0, Number(args.limit));
    if (!args.slug && !args.limit && !args.all) {
        console.error('Pick a scope: --slug <slug>, --limit <n>, or --all');
        process.exit(1);
    }

    console.log(`Enriching ${items.length} convention(s) with ${model}${args.tier3 ? ' [tier 3: venue/hotel]' : ' [tier 1+2]'}${args.dryrun ? ' (dry run)' : ''}\n`);
    const results = [];
    let totalTokens = 0;
    const extractFn = args.tier3 ? extractTier3 : extract;

    for (const convention of items) {
        process.stdout.write(`• ${convention.name} … `);
        try {
            const { data, usage } = await extractFn(convention);
            totalTokens += usage.reduce((s, u) => s + (u?.total_tokens ?? 0), 0);

            if (args.dryrun) {
                console.log('extracted (dry run, not saved)');
                results.push({ convention: convention.slug, dryRun: true, extraction: data });
                continue;
            }

            const patchRes = await fetch(`${API_BASE}/api/v1/conventions/${convention.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-api-key': agentKey },
                body: JSON.stringify(data),
            });
            const patchJson = await patchRes.json();
            if (!patchRes.ok) throw new Error(`PATCH ${patchRes.status}: ${JSON.stringify(patchJson)}`);

            const applied = patchJson.applied.map(c => c.field).join(', ') || 'nothing new';
            const extras = [
                patchJson.pricingRecordsCreated ? `+${patchJson.pricingRecordsCreated} pricing` : '',
                patchJson.venueHotelRecordsCreated ? `+${patchJson.venueHotelRecordsCreated} venue/hotel` : '',
            ].filter(Boolean).join(', ');
            console.log(`✓ applied: ${applied}${extras ? ` (${extras})` : ''}`);
            if (patchJson.skipped.length) console.log(`    skipped: ${patchJson.skipped.join('; ')}`);
            if (data.meta.notes) console.log(`    notes: ${data.meta.notes}`);
            results.push({ convention: convention.slug, extraction: data, patch: patchJson });
        } catch (err) {
            console.log(`✗ ${err.message}`);
            results.push({ convention: convention.slug, error: err.message });
        }
    }

    mkdirSync(new URL('./enrichment-results/', import.meta.url), { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outName = `enrich-${stamp}-${model.replace(/[^\w.-]/g, '_')}.json`;
    writeFileSync(new URL(`./enrichment-results/${outName}`, import.meta.url), JSON.stringify(results, null, 2));

    const ok = results.filter(r => r.patch || r.dryRun).length;
    console.log(`\nDone. ${ok}/${results.length} succeeded. Tokens: ${totalTokens}. Full report: scripts/enrichment-results/${outName}`);
}

main();
