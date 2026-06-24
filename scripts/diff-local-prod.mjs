// Read-only diff of conventions between LOCAL and PROD, scoped to conventions
// whose LOCAL content was touched on/after a cutoff (default 2026-06-23 = yesterday
// + today). "Touched" = convention.updatedAt or any related record's updatedAt.
// No writes. Matches by slug.
//
//   PROD_DATABASE_URL="…" node scripts/diff-local-prod.mjs [SINCE=YYYY-MM-DD]

import { readFileSync } from 'fs';

const envLocal = (n) => { try { const e = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); return e.match(new RegExp(`^${n}="?([^"\\r\\n]+)"?`, 'm'))?.[1]; } catch { return undefined; } };
const localUrl = envLocal('DATABASE_URL');
const prodUrl = process.env.PROD_DATABASE_URL;
if (!localUrl || !prodUrl) { console.error('Need local DATABASE_URL (.env.local) and PROD_DATABASE_URL.'); process.exit(1); }
const SINCE = new Date((process.argv[2] || '2026-06-23') + 'T00:00:00Z');

const { PrismaClient } = await import('@prisma/client');
const L = new PrismaClient({ datasources: { db: { url: localUrl } } });
const P = new PrismaClient({ datasources: { db: { url: prodUrl } } });

const sel = {
    id: true, slug: true, name: true, updatedAt: true,
    coverImageUrl: true, profileImageUrl: true,
    descriptionShort: true, descriptionMain: true,
    websiteUrl: true, registrationUrl: true,
    startDate: true, endDate: true, city: true, stateName: true, country: true,
    guestsStayAtPrimaryVenue: true,
    _count: { select: { venues: true, hotels: true, priceTiers: true, priceDiscounts: true, media: true, productions: true } },
};

const [locals, prods] = await Promise.all([
    L.convention.findMany({ where: { deletedAt: null }, select: sel }),
    P.convention.findMany({ where: { deletedAt: null }, select: sel }),
]);
const prodBySlug = new Map(prods.map((c) => [c.slug, c]));

// Latest related-record updatedAt per local convention, to catch pricing/venue-only edits.
const lastTouched = new Map(locals.map((c) => [c.id, c.updatedAt]));
for (const rel of ['venue', 'hotel', 'priceTier', 'priceDiscount', 'conventionMedia', 'production']) {
    const rows = await L[rel].groupBy({ by: ['conventionId'], _max: { updatedAt: true } });
    for (const r of rows) {
        const cur = lastTouched.get(r.conventionId);
        if (r._max.updatedAt && (!cur || r._max.updatedAt > cur)) lastTouched.set(r.conventionId, r._max.updatedAt);
    }
}

const scalarFields = ['coverImageUrl', 'profileImageUrl', 'descriptionShort', 'descriptionMain', 'websiteUrl', 'registrationUrl', 'city', 'stateName', 'country', 'guestsStayAtPrimaryVenue'];
const norm = (v) => (v == null ? '' : String(v));
const dateEq = (a, b) => norm(a && new Date(a).toISOString()) === norm(b && new Date(b).toISOString());
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—');

const recent = locals
    .filter((l) => (lastTouched.get(l.id) || l.updatedAt) >= SINCE)
    .sort((a, b) => (lastTouched.get(b.id) > lastTouched.get(a.id) ? 1 : -1));

console.log(`\nConventions touched locally since ${day(SINCE)}: ${recent.length}\n`);
let onlyLocal = 0, matched = 0;
for (const l of recent) {
    const p = prodBySlug.get(l.slug);
    const touched = day(lastTouched.get(l.id));
    if (!p) { onlyLocal++; console.log(`🆕 ${l.name} [${l.slug}]  (touched ${touched}) — NOT on prod (would be created)`); continue; }
    matched++;
    const diffs = [];
    for (const f of scalarFields) if (norm(l[f]) !== norm(p[f])) diffs.push(f);
    if (!dateEq(l.startDate, p.startDate)) diffs.push('startDate');
    if (!dateEq(l.endDate, p.endDate)) diffs.push('endDate');
    for (const k of ['venues', 'hotels', 'priceTiers', 'priceDiscounts', 'media', 'productions']) {
        if (l._count[k] !== p._count[k]) diffs.push(`${k}(${p._count[k]}→${l._count[k]})`);
    }
    console.log(`• ${l.name} [${l.slug}]  (touched ${touched})`);
    console.log(`    ${diffs.length ? 'differs: ' + diffs.join(', ') : '(no field differences detected)'}`);
}
console.log(`\n──────\n${matched} matched on prod, ${onlyLocal} only-in-local.`);
await L.$disconnect();
await P.$disconnect();
