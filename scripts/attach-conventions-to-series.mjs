// Attach orphan conventions (seriesId IS NULL) to a ConventionSeries.
//
// Strategy: strip the trailing year from the convention name to get a "base"
// (e.g. "IBM Convention 2029" -> "IBM Convention"); match an existing series by
// that base (case/space-insensitive). If none exists, create one owned by the
// admin. Idempotent — re-running only touches still-orphaned conventions.
//
//   node scripts/attach-conventions-to-series.mjs                 # DEV dry-run (default)
//   node scripts/attach-conventions-to-series.mjs --apply         # DEV write
//   PROD_DATABASE_URL="postgresql://…" node scripts/attach-conventions-to-series.mjs            # PROD dry-run
//   PROD_DATABASE_URL="postgresql://…" node scripts/attach-conventions-to-series.mjs --apply    # PROD write
//
// Dev DATABASE_URL is read from .env.local. Owner defaults to jafo@getjafo.com.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const args = (() => { const a = process.argv.slice(2), o = {}; for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { const k = a[i].slice(2), n = a[i + 1]; if (n && !n.startsWith('--')) { o[k] = n; i++; } else o[k] = true; } } return o; })();
const APPLY = !!args.apply;
const LINKS_ONLY = !!args['links-only']; // attach to existing series only; skip creating new ones
const OWNER_EMAIL = args.owner || 'jafo@getjafo.com';

const envLocal = (name) => { try { const e = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); return e.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'))?.[1]; } catch { return undefined; } };
const prodUrl = process.env.PROD_DATABASE_URL || (typeof args.prod === 'string' ? args.prod : undefined);
const url = prodUrl || envLocal('DATABASE_URL');
const TARGET = prodUrl ? 'PROD' : 'DEV';
if (!url) { console.error('No DATABASE_URL (dev) / PROD_DATABASE_URL found.'); process.exit(1); }

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url } } });

// "IBM Convention 2029" -> "IBM Convention";  "MAGIC Live! 2026" -> "MAGIC Live!"
const stripYear = (name) => name.replace(/\s*\(?((19|20)\d{2})\)?\s*$/, '').trim();
const normTight = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
// Loose key for matching: drop accents, punctuation, spacing, &->and — so
// "MagiFest" == "Magi-Fest", "S.A.M." == "SAM", "Québec" == "Quebec".
const normLoose = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '');
const slugify = (s) => (s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'series');

const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL }, select: { id: true } });
if (!owner) { console.error(`Owner user not found: ${OWNER_EMAIL}`); process.exit(1); }

const orphans = await prisma.convention.findMany({ where: { seriesId: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
const allSeries = await prisma.conventionSeries.findMany({ select: { id: true, name: true, slug: true } });
const seriesByName = new Map(allSeries.map((s) => [normLoose(s.name), s]));
const usedSlugs = new Set(allSeries.map((s) => s.slug));

const uniqueSlug = (base) => { let sl = slugify(base), i = 2; while (usedSlugs.has(sl)) sl = `${slugify(base)}-${i++}`; usedSlugs.add(sl); return sl; };

console.log(`\nTarget: ${TARGET}   Mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}   Owner: ${OWNER_EMAIL}`);
console.log(`Orphan conventions (no series): ${orphans.length}\n`);

const links = [];          // { conv, series }
const createsByKey = new Map(); // key -> { base, slug, convs: [] }
const review = [];         // names worth a human check

for (const c of orphans) {
    const base = stripYear(c.name);
    if (base === c.name) review.push(`  ⚠ no trailing year stripped: "${c.name}"`);
    const key = normLoose(base);
    const existing = seriesByName.get(key);
    if (existing) {
        links.push({ conv: c, series: existing, fuzzy: normTight(base) !== normTight(existing.name) });
    } else {
        if (!createsByKey.has(key)) createsByKey.set(key, { base, slug: uniqueSlug(base), convs: [] });
        createsByKey.get(key).convs.push(c);
    }
}

const fuzzyLinks = links.filter((l) => l.fuzzy);
console.log(`── LINK to existing series (${links.length}; ${fuzzyLinks.length} fuzzy) ──`);
for (const { conv, series, fuzzy } of links) console.log(`  ${fuzzy ? '≈' : ' '} "${conv.name}"  →  [${series.name}]`);
if (fuzzyLinks.length) {
    console.log(`\n── FUZZY matches — please double-check (${fuzzyLinks.length}) ──`);
    for (const { conv, series } of fuzzyLinks) console.log(`  "${conv.name}"  →  [${series.name}]`);
}

console.log(`\n── CREATE new series (${createsByKey.size}) ──`);
for (const { base, slug, convs } of createsByKey.values()) {
    console.log(`  + "${base}"  (slug: ${slug})`);
    for (const c of convs) console.log(`      ← "${c.name}"`);
}

if (review.length) { console.log(`\n── REVIEW (${review.length}) ──`); review.forEach((r) => console.log(r)); }

console.log(`\nSummary: ${links.length} link, ${[...createsByKey.values()].reduce((n, g) => n + g.convs.length, 0)} via ${createsByKey.size} new series. Total ${orphans.length}.`);

// Write the mapping to a reviewable CSV.
const csvRows = [['convention', 'action', 'match', 'series_name', 'series_slug']];
for (const { conv, series, fuzzy } of links) csvRows.push([conv.name, 'LINK (existing)', fuzzy ? 'fuzzy' : 'exact', series.name, series.slug]);
for (const { base, slug, convs } of createsByKey.values()) for (const c of convs) csvRows.push([c.name, 'CREATE (new)', '', base, slug]);
const csv = csvRows.map((r) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(',')).join('\r\n');
const outDir = new URL('./enrichment-results/', import.meta.url);
try { mkdirSync(outDir, { recursive: true }); } catch { }
const outFile = new URL(`series-mapping-${TARGET}.csv`, outDir);
writeFileSync(outFile, '﻿' + csv, 'utf8'); // BOM so Excel reads UTF-8 (accents) correctly
console.log(`\nMapping written to: scripts/enrichment-results/series-mapping-${TARGET}.csv`);

if (!APPLY) { console.log('\nDRY-RUN — re-run with --apply to write.\n'); await prisma.$disconnect(); process.exit(0); }

// ── apply ──
let linked = 0, created = 0;
for (const { conv, series } of links) { await prisma.convention.update({ where: { id: conv.id }, data: { seriesId: series.id } }); linked++; }
if (!LINKS_ONLY) {
    for (const { base, slug, convs } of createsByKey.values()) {
        const s = await prisma.conventionSeries.create({ data: { name: base, slug, organizerUserId: owner.id } });
        created++;
        for (const c of convs) { await prisma.convention.update({ where: { id: c.id }, data: { seriesId: s.id } }); linked++; }
    }
} else {
    const skipped = [...createsByKey.values()].reduce((n, g) => n + g.convs.length, 0);
    console.log(`(--links-only) Skipped ${createsByKey.size} new series; ${skipped} conventions left orphaned for review.`);
}
console.log(`\nApplied: ${linked} conventions linked, ${created} series created.\n`);
await prisma.$disconnect();
