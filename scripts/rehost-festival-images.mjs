// Re-host festival poster images onto our own S3 (so we don't hotlink the
// festival's site), then repoint coverImageUrl in dev AND prod.
//
// Folder system: uploads/festivals/<slug>/posters/<sanitized-title>-<hash>.<ext>
// (slug-based so dev + prod reference the same objects.)
//
//   PROD_DATABASE_URL="postgresql://…" node scripts/rehost-festival-images.mjs [--slug <slug>]
//
// Reads AWS creds + dev DATABASE_URL from .env.local.

import { readFileSync } from 'fs';
import crypto from 'crypto';

const args = (() => { const a = process.argv.slice(2), o = {}; for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { const k = a[i].slice(2), n = a[i + 1]; if (n && !n.startsWith('--')) { o[k] = n; i++; } else o[k] = true; } } return o; })();
const SLUG = args.slug ?? 'melbourne-magic-festival-2026';

const envLocal = name => { try { const e = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); return e.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'))?.[1]; } catch { return undefined; } };
const devUrl = process.env.DATABASE_URL || envLocal('DATABASE_URL');
const prodUrl = process.env.PROD_DATABASE_URL || args.prod;
const REGION = process.env.AWS_REGION || envLocal('AWS_REGION');
const KEY_ID = process.env.AWS_ACCESS_KEY_ID || envLocal('AWS_ACCESS_KEY_ID');
const SECRET = process.env.AWS_SECRET_ACCESS_KEY || envLocal('AWS_SECRET_ACCESS_KEY');
const BUCKET = process.env.S3_BUCKET_NAME || envLocal('S3_BUCKET_NAME');
if (!devUrl) { console.error('No dev DATABASE_URL'); process.exit(1); }
if (!REGION || !KEY_ID || !SECRET || !BUCKET) { console.error('Missing AWS env (AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / S3_BUCKET_NAME)'); process.exit(1); }

const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
const s3 = new S3Client({ region: REGION, credentials: { accessKeyId: KEY_ID, secretAccessKey: SECRET } });
const { PrismaClient } = await import('@prisma/client');
const dev = new PrismaClient({ datasources: { db: { url: devUrl } } });
const prod = prodUrl ? new PrismaClient({ datasources: { db: { url: prodUrl } } }) : null;

const isOurs = u => u.includes('amazonaws.com');
const sanitize = s => (s || 'show').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'show';
const ctOf = ext => ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' })[ext] || 'image/jpeg';

const c = await dev.convention.findFirst({ where: { slug: SLUG }, select: { id: true } });
if (!c) { console.error('Festival not found in dev: ' + SLUG); process.exit(1); }
const prods = await dev.production.findMany({ where: { conventionId: c.id, coverImageUrl: { not: null } }, select: { title: true, coverImageUrl: true } });

const uniq = new Map(); // oldUrl -> a title (for filename)
for (const p of prods) if (p.coverImageUrl && !isOurs(p.coverImageUrl) && !uniq.has(p.coverImageUrl)) uniq.set(p.coverImageUrl, p.title);
console.log(`${uniq.size} external poster(s) to re-host for "${SLUG}".`);

const mapping = [];
for (const [oldUrl, title] of uniq) {
    try {
        const res = await fetch(oldUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
        if (!res.ok) { console.log(`  ! skip (HTTP ${res.status}) ${oldUrl}`); continue; }
        const buf = Buffer.from(await res.arrayBuffer());
        let ext = (oldUrl.split('?')[0].match(/\.([a-z0-9]+)$/i)?.[1] || 'jpg').toLowerCase();
        if (ext === 'jpeg') ext = 'jpg';
        const hash = crypto.createHash('md5').update(oldUrl).digest('hex').slice(0, 6);
        const key = `uploads/festivals/${SLUG}/posters/${sanitize(title)}-${hash}.${ext}`;
        await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buf, ContentType: ctOf(ext) }));
        mapping.push([oldUrl, `https://${BUCKET}.s3.us-east-1.amazonaws.com/${key}`]);
        console.log(`  ✓ ${title} → ${key}`);
    } catch (e) { console.log(`  ! error ${oldUrl}: ${e.message}`); }
}

let devUpd = 0, prodUpd = 0;
for (const [oldUrl, s3Url] of mapping) {
    devUpd += (await dev.production.updateMany({ where: { coverImageUrl: oldUrl }, data: { coverImageUrl: s3Url } })).count;
    if (prod) prodUpd += (await prod.production.updateMany({ where: { coverImageUrl: oldUrl }, data: { coverImageUrl: s3Url } })).count;
}
console.log(`\nRe-hosted ${mapping.length}/${uniq.size}. Repointed productions — dev: ${devUpd}, prod: ${prodUpd}.`);
await dev.$disconnect(); if (prod) await prod.$disconnect();
