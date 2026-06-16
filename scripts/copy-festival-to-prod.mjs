// One-off: copy a festival (convention + venues + scheduleDays + productions +
// performances + talent links) from the DEV database to PROD, faithfully (no
// AI re-run). Idempotent: replaces the festival's children on prod.
//
//   PROD_DATABASE_URL="postgresql://…" node scripts/copy-festival-to-prod.mjs
//   (dev URL read from .env.local; --slug to target a different festival)

import { readFileSync } from 'fs';
const args = (() => { const a = process.argv.slice(2), o = {}; for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { const k = a[i].slice(2), n = a[i + 1]; if (n && !n.startsWith('--')) { o[k] = n; i++; } else o[k] = true; } } return o; })();
const SLUG = args.slug ?? 'melbourne-magic-festival-2026';

const devUrl = (() => { const e = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); return e.match(/^DATABASE_URL="?([^"\r\n]+)"?/m)?.[1]; })();
const prodUrl = process.env.PROD_DATABASE_URL || args.prod;
if (!devUrl) { console.error('No dev DATABASE_URL in .env.local'); process.exit(1); }
if (!prodUrl) { console.error('No PROD_DATABASE_URL'); process.exit(1); }

const { PrismaClient } = await import('@prisma/client');
const dev = new PrismaClient({ datasources: { db: { url: devUrl } } });
const prod = new PrismaClient({ datasources: { db: { url: prodUrl } } });

const norm = s => (s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’.\-]/g, '').replace(/\s+/g, ' ').trim();

const c = await dev.convention.findFirst({
    where: { slug: SLUG },
    include: {
        venues: true,
        scheduleDays: true,
        productions: { include: { performances: { include: { talentLinks: { include: { talentProfile: true } } } } }, orderBy: { order: 'asc' } },
    },
});
if (!c) { console.error('Dev festival not found: ' + SLUG); process.exit(1); }
console.log(`Dev festival: ${c.name} — ${c.productions.length} shows, ${c.venues.length} venues`);

// resolve timezone on prod by ianaId (dev timezoneId won't match prod's id)
let prodTimezoneId = null;
if (c.timezoneId) {
    const devTz = await dev.timezone.findUnique({ where: { id: c.timezoneId }, select: { ianaId: true } });
    if (devTz) { const pt = await prod.timezone.findFirst({ where: { ianaId: devTz.ianaId }, select: { id: true } }); prodTimezoneId = pt?.id ?? null; }
}

const scalars = {
    name: c.name, slug: c.slug, type: c.type, status: c.status, startDate: c.startDate, endDate: c.endDate,
    city: c.city, country: c.country, stateAbbreviation: c.stateAbbreviation, stateName: c.stateName,
    descriptionShort: c.descriptionShort, descriptionMain: c.descriptionMain, websiteUrl: c.websiteUrl,
    registrationUrl: c.registrationUrl, timezoneId: prodTimezoneId,
};
const pc = await prod.convention.upsert({ where: { slug: SLUG }, update: scalars, create: scalars });
console.log('Prod convention id:', pc.id);

// clear festival children on prod
await prod.conventionScheduleItem.deleteMany({ where: { conventionId: pc.id } });
await prod.production.deleteMany({ where: { conventionId: pc.id } });
await prod.scheduleDay.deleteMany({ where: { conventionId: pc.id } });
await prod.conventionTalent.deleteMany({ where: { conventionId: pc.id } });
await prod.venue.deleteMany({ where: { conventionId: pc.id } });

// venues (map by dev id)
const venueMap = {};
for (const v of c.venues) {
    const created = await prod.venue.create({ data: { conventionId: pc.id, venueName: v.venueName, isPrimaryVenue: v.isPrimaryVenue, streetAddress: v.streetAddress, city: v.city, stateRegion: v.stateRegion, postalCode: v.postalCode, country: v.country } });
    venueMap[v.id] = created.id;
}
// schedule days (map by dayOffset)
const dayMap = {};
for (const d of c.scheduleDays) { const cd = await prod.scheduleDay.create({ data: { conventionId: pc.id, dayOffset: d.dayOffset, isOfficial: d.isOfficial, label: d.label } }); dayMap[d.dayOffset] = cd.id; }

// talent: find-or-create on prod by normalized name; map dev talentId -> prod talentId
const talentMap = {};
async function prodTalent(tp) {
    if (talentMap[tp.id]) return talentMap[tp.id];
    const key = (tp.normalizedNames && tp.normalizedNames[0]) || norm(tp.displayName);
    let hit = await prod.talentProfile.findFirst({ where: { normalizedNames: { has: key } }, select: { id: true } });
    if (!hit) hit = await prod.talentProfile.create({ data: { displayName: tp.displayName, aliases: tp.aliases || [], normalizedNames: tp.normalizedNames?.length ? tp.normalizedNames : [norm(tp.displayName)], userId: null }, select: { id: true } });
    talentMap[tp.id] = hit.id;
    return hit.id;
}

const convTalent = new Set();
let prodOrder = 0, perfCount = 0;
for (const p of c.productions) {
    const np = await prod.production.create({ data: { conventionId: pc.id, title: p.title, tagline: p.tagline, ageRating: p.ageRating, description: p.description, coverImageUrl: p.coverImageUrl, detailsUrl: p.detailsUrl, priceTiers: p.priceTiers ?? undefined, priceNote: p.priceNote, order: p.order ?? prodOrder++ } });
    for (const perf of p.performances) {
        const item = await prod.conventionScheduleItem.create({
            data: {
                conventionId: pc.id, scheduleDayId: perf.dayOffset != null ? dayMap[perf.dayOffset] : null, dayOffset: perf.dayOffset,
                productionId: np.id, title: perf.title, eventType: perf.eventType, description: perf.description,
                startTimeMinutes: perf.startTimeMinutes, durationMinutes: perf.durationMinutes, atPrimaryVenue: perf.atPrimaryVenue,
                venueId: perf.venueId ? venueMap[perf.venueId] : null, locationName: perf.locationName, soldOut: perf.soldOut, order: perf.order,
            },
        });
        perfCount++;
        for (const l of perf.talentLinks) {
            if (!l.talentProfile) continue;
            const tid = await prodTalent(l.talentProfile);
            await prod.scheduleEventTalentLink.create({ data: { scheduleItemId: item.id, talentProfileId: tid, role: l.role, order: l.order, nameAsListed: l.nameAsListed } });
            if (!convTalent.has(tid)) { await prod.conventionTalent.create({ data: { conventionId: pc.id, talentProfileId: tid } }); convTalent.add(tid); }
        }
    }
}
console.log(`Copied: ${c.productions.length} shows, ${perfCount} performances, ${Object.keys(venueMap).length} venues, ${Object.keys(talentMap).length} talent → prod.`);
await dev.$disconnect(); await prod.$disconnect();
