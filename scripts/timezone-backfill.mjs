// Fill Convention.timezoneId from coordinates: lat/lng -> IANA (tz-lookup,
// offline and deterministic) -> the seeded Timezone row (ianaId/utcAliases).
//
// Default: fill-only (rows with coordinates and NO timezone). Idempotent.
// --verify        also report rows whose SET timezone disagrees with coords
// --fix-mismatch  apply the coords-derived timezone to those mismatched rows
//                 (safe for agent-set values; organizer picks usually agree
//                 with the venue's coordinates anyway)
//
// Local:  npx dotenv-cli -e .env.local -- node scripts/timezone-backfill.mjs
// Prod:   DATABASE_URL="postgresql://…?sslmode=require" node scripts/timezone-backfill.mjs
//
// Timezone equivalence note: the seeded table groups zones by UTC rules, so a
// coords-derived id (e.g. America/New_York) may resolve to a row whose ianaId
// is another member of the same group (America/Detroit). Mismatch detection
// therefore compares GROUPS (the resolved row id), not raw IANA strings.

import { PrismaClient } from '@prisma/client';
import tzLookup from 'tz-lookup';

const prisma = new PrismaClient();
const VERIFY = process.argv.includes('--verify') || process.argv.includes('--fix-mismatch');
const FIX = process.argv.includes('--fix-mismatch');

// The seeded table misses some niche US zone ids; map them to the major zone
// with the same rules before resolving. (Indiana/Kentucky sub-zones are
// Eastern except the two Central pockets.)
function normalizeIana(iana) {
    if (iana === 'America/Indiana/Tell_City' || iana === 'America/Indiana/Knox') return 'America/Chicago';
    if (/^America\/(Indiana|Kentucky)\//.test(iana)) return 'America/New_York';
    return iana;
}

async function resolveRow(rawIana) {
    const iana = normalizeIana(rawIana);
    return prisma.timezone.findFirst({
        where: { OR: [{ ianaId: iana }, { utcAliases: { has: iana } }] },
        select: { id: true, ianaId: true },
    });
}

async function run() {
    const conventions = await prisma.convention.findMany({
        where: { deletedAt: null, latitude: { not: null }, longitude: { not: null } },
        select: { id: true, name: true, latitude: true, longitude: true, timezoneId: true, timezone: { select: { ianaId: true, value: true } } },
    });

    let filled = 0, unresolved = 0, mismatched = 0, fixed = 0;
    for (const c of conventions) {
        let iana;
        try { iana = tzLookup(c.latitude, c.longitude); } catch { unresolved++; continue; }
        const row = await resolveRow(iana);
        if (!row) {
            unresolved++;
            console.log(`  ? ${c.name.slice(0, 45)} — no Timezone row for ${iana}`);
            continue;
        }
        if (!c.timezoneId) {
            await prisma.convention.update({ where: { id: c.id }, data: { timezoneId: row.id } });
            filled++;
            console.log(`  ✓ ${c.name.slice(0, 45)} -> ${iana} (${row.ianaId})`);
        } else if (VERIFY && c.timezoneId !== row.id) {
            mismatched++;
            console.log(`  ✗ MISMATCH ${c.name.slice(0, 45)} — set: ${c.timezone?.value || c.timezone?.ianaId} | coords say: ${iana}`);
            if (FIX) {
                await prisma.convention.update({ where: { id: c.id }, data: { timezoneId: row.id } });
                fixed++;
                console.log(`    -> fixed to ${row.ianaId}`);
            }
        }
    }

    console.log(`Done. ${conventions.length} with coords: ${filled} filled, ${mismatched} mismatched${FIX ? ` (${fixed} fixed)` : ''}, ${unresolved} unresolved.`);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
