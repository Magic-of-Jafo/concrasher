// Copy cover/profile image pointers (coverImageUrl, profileImageUrl) from the
// LOCAL dev DB into PROD, matched by slug. The image files already live in the
// shared S3 bucket, so only the URL strings need to move.
//
// Source is ALWAYS local (.env.local DATABASE_URL). Target is PROD when
// PROD_DATABASE_URL is set, else local (for a safe self-test). Dry-run by default.
//
//   node scripts/copy-images-to-prod.mjs                                   # preview source (local)
//   PROD_DATABASE_URL="postgresql://…" node scripts/copy-images-to-prod.mjs           # preview prod diff
//   PROD_DATABASE_URL="postgresql://…" node scripts/copy-images-to-prod.mjs --apply   # write to prod

import { readFileSync } from 'fs';

const args = (() => { const a = process.argv.slice(2), o = {}; for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) o[a[i].slice(2)] = true; return o; })();
const APPLY = !!args.apply;

const envLocal = (n) => { try { const e = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); return e.match(new RegExp(`^${n}="?([^"\\r\\n]+)"?`, 'm'))?.[1]; } catch { return undefined; } };

const srcUrl = envLocal('DATABASE_URL');
if (!srcUrl) { console.error('No local DATABASE_URL in .env.local.'); process.exit(1); }
const prodUrl = process.env.PROD_DATABASE_URL;
const tgtUrl = prodUrl || srcUrl;
const TARGET = prodUrl ? 'PROD' : 'LOCAL (self-test)';

const { PrismaClient } = await import('@prisma/client');
const src = new PrismaClient({ datasources: { db: { url: srcUrl } } });
const tgt = prodUrl ? new PrismaClient({ datasources: { db: { url: tgtUrl } } }) : src;

console.log(`\nSource: LOCAL    Target: ${TARGET}    Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

// Upcoming conventions that have at least one image set locally.
const rows = await src.convention.findMany({
    where: {
        startDate: { gte: new Date() },
        OR: [{ coverImageUrl: { not: null } }, { profileImageUrl: { not: null } }],
    },
    select: { id: true, slug: true, name: true, startDate: true, coverImageUrl: true, profileImageUrl: true },
    orderBy: { startDate: 'asc' },
});

console.log(`Found ${rows.length} upcoming local convention(s) with image(s):\n`);

let toUpdate = 0, missing = 0, noChange = 0;
for (const r of rows) {
    const date = r.startDate?.toISOString().slice(0, 10);
    console.log(`• ${r.name}  [${r.slug}]  ${date}`);
    console.log(`    local cover:   ${r.coverImageUrl ?? '—'}`);
    console.log(`    local profile: ${r.profileImageUrl ?? '—'}`);

    const prodRow = r.slug
        ? await tgt.convention.findUnique({ where: { slug: r.slug }, select: { id: true, coverImageUrl: true, profileImageUrl: true } })
        : null;

    if (!prodRow) {
        console.log(`    ⚠ NO MATCH in target by slug — skipping`);
        missing++;
        console.log('');
        continue;
    }

    const data = {};
    if (r.coverImageUrl && r.coverImageUrl !== prodRow.coverImageUrl) data.coverImageUrl = r.coverImageUrl;
    if (r.profileImageUrl && r.profileImageUrl !== prodRow.profileImageUrl) data.profileImageUrl = r.profileImageUrl;

    if (Object.keys(data).length === 0) {
        console.log(`    = target already matches — no change`);
        noChange++;
    } else {
        console.log(`    → will set: ${Object.keys(data).join(', ')}`);
        toUpdate++;
        if (APPLY) {
            await tgt.convention.update({ where: { id: prodRow.id }, data });
            console.log(`    ✓ updated`);
        }
    }
    console.log('');
}

console.log(`Summary: ${toUpdate} to update, ${noChange} unchanged, ${missing} unmatched.`);
if (!APPLY && toUpdate > 0) console.log(`Dry-run only. Re-run with --apply to write to ${TARGET}.`);

await src.$disconnect();
if (prodUrl) await tgt.$disconnect();
