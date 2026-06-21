// Finish the convention→series matching for the 18 leftovers, with an explicit,
// reviewed mapping (no fuzzy guessing). Idempotent; only touches still-orphaned
// conventions. Dry-run by default.
//
//   node scripts/finish-series-matching.mjs                 # DEV dry-run
//   node scripts/finish-series-matching.mjs --apply         # DEV write
//   PROD_DATABASE_URL="postgresql://…" node scripts/finish-series-matching.mjs [--apply]   # PROD

import { readFileSync } from 'fs';
const args = (() => { const a = process.argv.slice(2), o = {}; for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) o[a[i].slice(2)] = true; return o; })();
const APPLY = !!args.apply;
const OWNER_EMAIL = 'jafo@getjafo.com';

const envLocal = (n) => { try { const e = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); return e.match(new RegExp(`^${n}="?([^"\\r\\n]+)"?`, 'm'))?.[1]; } catch { return undefined; } };
const prodUrl = process.env.PROD_DATABASE_URL;
const url = prodUrl || envLocal('DATABASE_URL');
const TARGET = prodUrl ? 'PROD' : 'DEV';
if (!url) { console.error('No DATABASE_URL / PROD_DATABASE_URL.'); process.exit(1); }

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url } } });

// convention name -> existing series slug
const LINKS = {
    "Abbott's Get Together 2026": 'cs-abbotts',
    'FCM International Convention 2026': 'cs-fcm',
    'Festival de Magie de Québec 2026': 'cs-festival-de-magie-de-quebec',
    'Fröhlich Magic Convention 2026': 'cs-frohlich-magic-convention',
    'IBM British Ring Convention 2026': 'cs-ibm-british-ring',
    'KIDAbra, the Grand Finale 2026': 'cs-kidabra',
    'MAGICA & Nordic Nobel 2026': 'cs-magica',
    'MAWNY Convention 2027': 'cs-mawny',
    "Magicians' Alliance of Eastern States Convention 2026": 'cs-maes',
    "Obie's 4F (Fechter's Finger Flicking Frolic) 2027": 'cs-ffff',
    'TRICS (Carolina Close-Up Convention) 2026': 'cs-trics',
    'Texas Association of Magicians (T.A.O.M.) 2026': 'cs-taom',
};
// convention name -> { name, slug } for a brand-new series
const CREATES = {
    'Atlanta Harvest of Magic 2026': { name: 'Atlanta Harvest of Magic', slug: 'cs-atlanta-harvest' },
    'MAGiCon 2027': { name: 'MAGiCon', slug: 'cs-magicon' },
    'Magic Festival Dreamfactory 2026': { name: 'Magic Festival Dreamfactory', slug: 'cs-magic-festival-dreamfactory' },
    'Magic in Orlando': { name: 'Daytona Magic', slug: 'cs-daytona-magic' },
    'Magic in Orlando 2026': { name: 'Daytona Magic', slug: 'cs-daytona-magic' }, // prod variant (has year)
    'New England Magicians Conference 2027': { name: 'New England Magicians Conference', slug: 'cs-new-england-magicians-conference' },
    'S.A.M. National Convention 2026': { name: 'S.A.M. National Convention', slug: 'cs-sam' },
};

const nfc = (s) => s.normalize('NFC');
const linkMap = new Map(Object.entries(LINKS).map(([k, v]) => [nfc(k), v]));
const createMap = new Map(Object.entries(CREATES).map(([k, v]) => [nfc(k), v]));

const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL }, select: { id: true } });
if (!owner) { console.error(`Owner not found: ${OWNER_EMAIL}`); process.exit(1); }

const orphans = await prisma.convention.findMany({ where: { seriesId: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
const seriesBySlug = new Map((await prisma.conventionSeries.findMany({ select: { id: true, slug: true } })).map((s) => [s.slug, s.id]));

console.log(`\nTarget: ${TARGET}   Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}   Orphans: ${orphans.length}\n`);

const planLinks = [], planCreates = [], uncovered = [];
for (const c of orphans) {
    const key = nfc(c.name);
    if (linkMap.has(key)) {
        const slug = linkMap.get(key);
        if (!seriesBySlug.has(slug)) { console.error(`  ✗ series slug not found: ${slug} (for "${c.name}")`); process.exit(1); }
        planLinks.push({ c, slug });
    } else if (createMap.has(key)) {
        planCreates.push({ c, ...createMap.get(key) });
    } else uncovered.push(c.name);
}

console.log(`── LINK (${planLinks.length}) ──`);
for (const { c, slug } of planLinks) console.log(`  "${c.name}"  →  ${slug}`);
console.log(`\n── CREATE (${planCreates.length}) ──`);
for (const { c, name, slug } of planCreates) console.log(`  "${c.name}"  →  new series "${name}" (${slug})`);
if (uncovered.length) { console.log(`\n⚠ UNCOVERED orphans (${uncovered.length}) — not in mapping:`); uncovered.forEach((n) => console.log(`  "${n}"`)); }

if (!APPLY) { console.log('\nDRY-RUN — re-run with --apply to write.\n'); await prisma.$disconnect(); process.exit(0); }

let linked = 0, created = 0;
for (const { c, slug } of planLinks) { await prisma.convention.update({ where: { id: c.id }, data: { seriesId: seriesBySlug.get(slug) } }); linked++; }
for (const { c, name, slug } of planCreates) {
    let sid = seriesBySlug.get(slug);
    if (!sid) { const s = await prisma.conventionSeries.create({ data: { name, slug, organizerUserId: owner.id } }); sid = s.id; seriesBySlug.set(slug, sid); created++; }
    await prisma.convention.update({ where: { id: c.id }, data: { seriesId: sid } }); linked++;
}
console.log(`\nApplied: ${linked} linked, ${created} series created.\n`);
await prisma.$disconnect();
