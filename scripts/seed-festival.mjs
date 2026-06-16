// Local test data for festival mode (F2). Creates a FESTIVAL-type convention
// with a couple of venues, scheduleDays, and a handful of Productions (shows),
// each with several performances. Idempotent: re-running clears + rebuilds it.
//
//   node scripts/seed-festival.mjs
//
// (Modeled loosely on the Melbourne Magic Festival daily schedule.)

import { readFileSync } from 'fs';
if (!process.env.DATABASE_URL) {
    try {
        const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
        const m = env.match(/^DATABASE_URL="?([^"\r\n]+)"?/m);
        if (m) process.env.DATABASE_URL = m[1];
    } catch { /* ignore */ }
}
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const SLUG = 'melbourne-magic-festival-2026';
const START = new Date(Date.UTC(2026, 5, 30)); // 30 June 2026 = day 0
const END = new Date(Date.UTC(2026, 6, 11));   // 11 July 2026

const t = (h, m = 0) => h * 60 + m;
const fmtDay = off => new Date(Date.UTC(2026, 5, 30 + off)).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

// venues: building (address) + room handled per-performance via locationName
const VENUES = [
    { key: 'arrow', venueName: 'Arrow on Swanston', streetAddress: '488 Swanston St', city: 'Carlton', stateRegion: 'VIC', country: 'Australia', isPrimaryVenue: true },
    { key: 'malthouse', venueName: 'The Coopers Malthouse', streetAddress: '113 Sturt St', city: 'Southbank', stateRegion: 'VIC', country: 'Australia', isPrimaryVenue: false },
];

// shows: each performance is [dayOffset, startMin, venueKey, room, soldOut?]
const SHOWS = [
    {
        title: 'A Pocketful of Magic', tagline: "Children's show for ages 3–12", ageRating: '3-12',
        description: 'Emma the Storyteller has a pocketful of magic… and so do you! Join her as she helps you find your own pocketful of magic so we can tell spectacular stories and transform everyday things into the extraordinary.',
        cover: 'pocketful', durationMinutes: 50,
        priceTiers: [{ label: 'Adult (17+)', amount: 28 }, { label: 'Concession', amount: 22 }, { label: 'Child (2–17)', amount: 22 }, { label: 'Family of 4', amount: 85 }],
        priceNote: 'Discount Tuesday: $18',
        perfs: [[0, t(10, 45), 'arrow', 'The Slydini Showroom'], [1, t(10, 45), 'arrow', 'The Slydini Showroom'], [2, t(10, 45), 'arrow', 'The Slydini Showroom'], [3, t(10, 45), 'arrow', 'The Slydini Showroom'], [4, t(10, 45), 'arrow', 'The Slydini Showroom'], [5, t(10, 45), 'arrow', 'The Slydini Showroom']],
    },
    {
        title: 'Abracadickhead', tagline: 'Adult show for ages 15+', ageRating: '15+',
        description: 'Remember that budding magician you bullied in high school? He turned professional. Abracadickhead blends razor-sharp comedy with jaw-dropping magic. This is your "must see" show of the festival!',
        cover: 'abra', durationMinutes: 60,
        priceTiers: [{ label: 'Adult (17+)', amount: 30 }, { label: 'Concession', amount: 26 }, { label: 'Child (2–17)', amount: 26 }, { label: 'Family of 4', amount: 105 }],
        priceNote: 'Discount Tuesday: $18',
        perfs: [[0, t(20), 'arrow', 'The Houdini Theatre'], [1, t(20), 'arrow', 'The Houdini Theatre'], [2, t(20), 'arrow', 'The Houdini Theatre', true], [3, t(20), 'arrow', 'The Houdini Theatre'], [4, t(20), 'arrow', 'The Houdini Theatre'], [5, t(20), 'arrow', 'The Houdini Theatre'], [7, t(20), 'arrow', 'The Houdini Theatre'], [8, t(20), 'arrow', 'The Houdini Theatre'], [9, t(20), 'arrow', 'The Houdini Theatre'], [10, t(20), 'arrow', 'The Houdini Theatre'], [11, t(20), 'arrow', 'The Houdini Theatre']],
    },
    {
        title: 'Aiden Schofield: Trivial Trickery', tagline: 'Family show for ages 9+', ageRating: '9+',
        description: 'Aiden Schofield returns to Melbourne for the first time since 2023. Be treated to stunning visual magic and unbelievable surprises in this 60 minute spectacle!',
        cover: 'aiden', durationMinutes: 60,
        priceTiers: [{ label: 'Adult (17+)', amount: 35 }, { label: 'Concession', amount: 30 }, { label: 'Child (2–17)', amount: 30 }, { label: 'Family of 4', amount: 120 }],
        priceNote: 'Discount Tuesday: $18',
        perfs: [[10, t(16), 'arrow', 'The Houdini Theatre'], [11, t(16), 'arrow', 'The Houdini Theatre']],
    },
    {
        title: 'As Above; So Below', tagline: 'Adult show for ages 15+', ageRating: '15+',
        description: 'A dark and beautiful hour of close-up wonder and storytelling, performed across town at the Malthouse.',
        cover: 'asabove', durationMinutes: 60,
        priceTiers: [{ label: 'Adult (17+)', amount: 32 }, { label: 'Concession', amount: 28 }],
        priceNote: 'Discount Tuesday: $18',
        perfs: [[0, t(20, 30), 'malthouse', 'The Beckett Theatre'], [3, t(20, 30), 'malthouse', 'The Beckett Theatre']],
    },
];

async function main() {
    const tz = await prisma.timezone.findFirst({ where: { OR: [{ ianaId: 'Australia/Melbourne' }, { utcAliases: { has: 'Australia/Melbourne' } }] }, select: { id: true } });

    let convention = await prisma.convention.findFirst({ where: { slug: SLUG }, select: { id: true } });
    if (convention) {
        await prisma.conventionScheduleItem.deleteMany({ where: { conventionId: convention.id } });
        await prisma.production.deleteMany({ where: { conventionId: convention.id } });
        await prisma.scheduleDay.deleteMany({ where: { conventionId: convention.id } });
        await prisma.venue.deleteMany({ where: { conventionId: convention.id } });
        await prisma.convention.update({
            where: { id: convention.id },
            data: { type: 'FESTIVAL', status: 'PUBLISHED', startDate: START, endDate: END, ...(tz ? { timezoneId: tz.id } : {}) },
        });
    } else {
        convention = await prisma.convention.create({
            data: {
                name: 'Melbourne Magic Festival 2026', slug: SLUG, type: 'FESTIVAL', status: 'PUBLISHED',
                startDate: START, endDate: END, city: 'Melbourne', stateAbbreviation: 'VIC', country: 'Australia',
                descriptionShort: 'A celebration of magic across Melbourne — dozens of shows, multiple venues, one festival.',
                ...(tz ? { timezoneId: tz.id } : {}),
            },
            select: { id: true },
        });
    }
    const conventionId = convention.id;

    // venues
    const venueId = {};
    for (const v of VENUES) {
        const { key, ...data } = v;
        const created = await prisma.venue.create({ data: { conventionId, ...data } });
        venueId[key] = created.id;
    }

    // schedule days 0..11
    const dayId = {};
    for (let off = 0; off <= 11; off++) {
        const d = await prisma.scheduleDay.create({ data: { conventionId, dayOffset: off, isOfficial: true, label: fmtDay(off) } });
        dayId[off] = d.id;
    }

    // productions + performances
    let order = 0;
    for (const s of SHOWS) {
        const prod = await prisma.production.create({
            data: {
                conventionId, title: s.title, tagline: s.tagline, ageRating: s.ageRating, description: s.description,
                coverImageUrl: `https://picsum.photos/seed/${s.cover}/600/400`,
                detailsUrl: 'https://melbournemagicfestival.com/daily-schedule-2026/',
                priceTiers: s.priceTiers, priceNote: s.priceNote, order: order++,
            },
            select: { id: true },
        });
        let pOrder = 0;
        for (const [off, startMin, vkey, room, soldOut] of s.perfs) {
            await prisma.conventionScheduleItem.create({
                data: {
                    conventionId, scheduleDayId: dayId[off], dayOffset: off,
                    title: s.title, eventType: 'Stage/Gala Show', startTimeMinutes: startMin,
                    durationMinutes: s.durationMinutes, atPrimaryVenue: false, venueId: venueId[vkey],
                    locationName: room, productionId: prod.id, soldOut: !!soldOut, order: pOrder++,
                },
            });
        }
    }

    const counts = {
        productions: await prisma.production.count({ where: { conventionId } }),
        performances: await prisma.conventionScheduleItem.count({ where: { conventionId } }),
        venues: await prisma.venue.count({ where: { conventionId } }),
    };
    console.log('Seeded festival:', SLUG, '| id:', conventionId, '|', JSON.stringify(counts));
    console.log('View: /conventions/' + conventionId);
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
