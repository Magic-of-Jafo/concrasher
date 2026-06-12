/**
 * Replays locally-applied enrichment data to another environment (production)
 * through the agent API — no re-extraction, no OpenAI calls.
 *
 * Reads the LOCAL database (DATABASE_URL / .env.local): for every convention
 * with an enrichment log, reconstructs a PATCH payload from the fields
 * enrichment owns (per enrichment_fields) plus pricing, and sends it to the
 * target's /api/v1/conventions/:slug. The target endpoint's fill-don't-clobber
 * rules still apply, so this is safe to run any time.
 *
 * Usage:
 *   API_BASE=https://conventioncrasher.com node scripts/sync-enrichment.mjs
 *   node scripts/sync-enrichment.mjs --dry-run          # show payloads, send nothing
 *   node scripts/sync-enrichment.mjs --slug <slug>      # one convention
 */

import { readFileSync } from 'fs';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--dry-run') args.dryrun = true;
    else if (a.startsWith('--')) args[a.slice(2)] = process.argv[++i];
}

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
const agentKey = process.env.AGENT_API_KEY ?? readEnvLocal('AGENT_API_KEY');
if (!agentKey) { console.error('No AGENT_API_KEY available'); process.exit(1); }

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const conventions = await prisma.convention.findMany({
    where: {
        deletedAt: null,
        settings: { some: { key: 'enrichment_fields' } },
        ...(args.slug ? { slug: args.slug } : {}),
    },
    include: {
        settings: true,
        priceTiers: { orderBy: { order: 'asc' }, include: { priceDiscounts: true } },
    },
});

console.log(`Replaying enrichment for ${conventions.length} convention(s) → ${API_BASE}${args.dryrun ? ' (dry run)' : ''}\n`);

const dateStr = d => (d ? new Date(d).toISOString().slice(0, 10) : null);
let ok = 0, failed = 0;

for (const con of conventions) {
    const owned = new Set(JSON.parse(con.settings.find(s => s.key === 'enrichment_fields')?.value ?? '[]'));
    const log = JSON.parse(con.settings.find(s => s.key === 'enrichment_log')?.value ?? '[]');
    const latest = log[0] ?? {};
    const currency = con.settings.find(s => s.key === 'currency')?.value ?? null;

    const tier1 = {};
    if (owned.has('city')) tier1.city = con.city;
    if (owned.has('country')) tier1.country = con.country;
    if (owned.has('venueName')) tier1.venueName = con.venueName;
    if (owned.has('registrationUrl')) tier1.registrationUrl = con.registrationUrl;
    if (owned.has('descriptionShort')) tier1.descriptionShort = con.descriptionShort;
    if (owned.has('stateAbbreviation')) tier1.stateOrRegion = con.stateAbbreviation;
    else if (owned.has('stateName')) tier1.stateOrRegion = con.stateName;
    if (owned.has('startDate')) tier1.startDate = dateStr(con.startDate);
    if (owned.has('endDate')) tier1.endDate = dateStr(con.endDate);
    if (con.keywords.length > 1) tier1.keywords = con.keywords.filter(k => k !== 'imported');

    const tier2 = { currency, priceTiers: [], priceDiscounts: [] };
    for (const t of con.priceTiers) {
        tier2.priceTiers.push({ label: t.label, amount: Number(t.amount) });
        for (const d of t.priceDiscounts) {
            tier2.priceDiscounts.push({
                tierLabel: t.label,
                cutoffDate: dateStr(d.cutoffDate),
                discountedAmount: Number(d.discountedAmount),
            });
        }
    }

    const payload = {
        tier1,
        tier2,
        meta: {
            // Replay uses the source run's confidence so date fills behave
            // identically on the target.
            fieldConfidence: latest.confidence ?? { dates: 'high', location: 'high', venue: 'high', pricing: 'high' },
            sourcePages: latest.sourcePages ?? [],
            notes: `Replayed from local enrichment run ${latest.at ?? 'unknown'}`,
            model: latest.model ?? undefined,
        },
    };

    if (args.dryrun) {
        console.log(`• ${con.slug}: tier1 fields [${Object.keys(tier1).join(', ')}], ${tier2.priceTiers.length} tiers, ${tier2.priceDiscounts.length} discounts`);
        ok++;
        continue;
    }

    try {
        const res = await fetch(`${API_BASE}/api/v1/conventions/${con.slug}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-api-key': agentKey },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json)}`);
        const applied = json.applied.map(c => c.field).join(', ') || 'nothing new';
        console.log(`✓ ${con.slug}: ${applied}${json.pricingRecordsCreated ? ` (+${json.pricingRecordsCreated} pricing)` : ''}`);
        ok++;
    } catch (err) {
        console.log(`✗ ${con.slug}: ${err.message}`);
        failed++;
    }
}

await prisma.$disconnect();
console.log(`\nDone. ${ok} ok, ${failed} failed.`);
if (failed) process.exitCode = 1;
