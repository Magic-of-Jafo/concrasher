// Backfill User.canonicalEmail (the dedup key) and REPORT collisions — never
// deletes. Two addresses sharing a canonical form are the same inbox: usually
// one person's dot/plus variants, sometimes spam. You decide what to do with
// each group; a unique index on canonicalEmail can be added once they're clean.
//
// Local:  npx dotenv-cli -e .env.local -- node scripts/canonical-email-backfill.mjs
// Prod:   DATABASE_URL="postgresql://…?sslmode=require" node scripts/canonical-email-backfill.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Kept in lockstep with src/lib/email-normalize.ts (scripts can't import the TS lib).
const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);
function canonicalizeEmail(raw) {
    const trimmed = (raw || '').trim().toLowerCase();
    const at = trimmed.lastIndexOf('@');
    if (at <= 0 || at === trimmed.length - 1) return trimmed;
    let local = trimmed.slice(0, at);
    let domain = trimmed.slice(at + 1);
    const plus = local.indexOf('+');
    if (plus !== -1) local = local.slice(0, plus);
    if (GMAIL_DOMAINS.has(domain)) { domain = 'gmail.com'; local = local.replace(/\./g, ''); }
    return `${local}@${domain}`;
}

async function run() {
    const users = await prisma.user.findMany({
        select: { id: true, email: true, canonicalEmail: true, emailVerified: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
    });

    let updated = 0;
    const groups = new Map(); // canonical -> users[]
    for (const u of users) {
        const canon = canonicalizeEmail(u.email);
        if (u.canonicalEmail !== canon) {
            await prisma.user.update({ where: { id: u.id }, data: { canonicalEmail: canon } });
            updated++;
        }
        if (!groups.has(canon)) groups.set(canon, []);
        groups.get(canon).push(u);
    }

    const collisions = [...groups.entries()].filter(([, us]) => us.length > 1);
    console.log(`Users: ${users.length} | canonicalEmail set/updated: ${updated} | collision groups: ${collisions.length}`);
    for (const [canon, us] of collisions) {
        console.log(`\n  ${canon}  (${us.length} accounts share this inbox):`);
        for (const u of us) {
            console.log(`    - ${u.email}  | verified: ${u.emailVerified ? 'yes' : 'no'} | joined ${u.createdAt.toISOString().slice(0, 10)} | id ${u.id}`);
        }
    }
    if (collisions.length === 0) console.log('No collisions — canonicalEmail is safe to make unique.');
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
