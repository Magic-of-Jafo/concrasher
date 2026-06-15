// One-off loader for the TAOM 2026 schedule (source:
// https://www.taom.org/assoc/2026-convention/schedule/). Turns the published
// schedule into ConventionScheduleItem records (relative day/time, taxonomy
// eventType) and links performers as Talent via the same matching logic as
// src/lib/talent.ts (find-or-create unclaimed, alias-aware, de-duped).
//
// Idempotent: clears TAOM's existing schedule items/days + convention-talent
// links first (talent PROFILES persist and de-dup on re-run).
//
//   node scripts/load-taom-schedule.mjs

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config({ path: '.env.local' });

const SLUG = 'texas-association-of-magicians-taom-2026';
const TZ_IANA = 'America/Chicago'; // Texas

const prisma = new PrismaClient();

// ── talent matching (mirrors src/lib/talent.ts) ─────────────────────────────
const norm = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’.\-]/g, '').replace(/\s+/g, ' ').trim();
const variants = (display, aliases = []) => Array.from(new Set([display, ...aliases].map(norm).filter(Boolean)));

async function findOrCreateTalent(displayName) {
    const name = displayName.trim();
    const hit = await prisma.talentProfile.findFirst({ where: { normalizedNames: { has: norm(name) } }, select: { id: true } });
    if (hit) return hit.id;
    const created = await prisma.talentProfile.create({
        data: { displayName: name, aliases: [], normalizedNames: variants(name), userId: null },
        select: { id: true },
    });
    return created.id;
}

// ── time parsing ────────────────────────────────────────────────────────────
function toMinutes(t) {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) throw new Error('bad time: ' + t);
    let h = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[3])) h += 12;
    return h * 60 + parseInt(m[2], 10);
}
function duration(start, end) {
    let d = toMinutes(end) - toMinutes(start);
    if (d < 0) d += 24 * 60; // crosses midnight
    return d;
}

// ── the schedule (day 0 = Friday Sep 4) ─────────────────────────────────────
// people: [name, role]
const DAYS = [
    { day: 0, label: 'Friday', items: [
        { s: '9:00 AM', e: '7:00 PM', title: 'Registration Open', type: 'Registration', people: [] },
        { s: '4:00 PM', e: '5:00 PM', title: 'TAOM Board Meeting', type: 'Other', people: [] },
        { s: '5:00 PM', e: '7:00 PM', title: 'Dinner', type: 'Meal/Banquet', people: [] },
        { s: '7:00 PM', e: '9:00 PM', title: 'Stage Show', type: 'Stage/Gala Show', people: [['Jamie Salinas', 'MC'], ['David Rangel', 'Performer'], ['Jake Rangel', 'Performer'], ['Geoff Williams', 'Performer']] },
        { s: '9:30 PM', e: '11:00 PM', title: 'Lecture', type: 'Lecture', people: [['John Shryock', 'Lecturer']] },
    ]},
    { day: 1, label: 'Saturday', items: [
        { s: '8:00 AM', e: '8:30 AM', title: 'General Meeting', type: 'Other', people: [] },
        { s: '9:00 AM', e: '6:30 PM', title: 'Registration Open', type: 'Registration', people: [] },
        { s: '9:30 AM', e: '11:00 AM', title: 'Lecture', type: 'Lecture', people: [['John Bannon', 'Lecturer']] },
        { s: '10:00 AM', e: '3:00 PM', title: "Dealer's Room Open", type: 'Dealer Hall', people: [] },
        { s: '11:00 AM', e: '12:30 PM', title: 'Lecture', type: 'Lecture', people: [['Mike Pisciotta', 'Lecturer']] },
        { s: '12:30 PM', e: '2:00 PM', title: 'Lunch & Williard Luncheon', type: 'Meal/Banquet', people: [] },
        { s: '2:00 PM', e: '3:30 PM', title: 'Lecture', type: 'Lecture', people: [['Geoff Williams', 'Lecturer']] },
        { s: '3:00 PM', e: '5:00 PM', title: 'Stage Rehearsals', type: 'Other', people: [] },
        { s: '3:30 PM', e: '5:00 PM', title: 'Lecture', type: 'Lecture', people: [['Jared Kopf', 'Lecturer']] },
        { s: '5:00 PM', e: '7:30 PM', title: "Dinner & Dealer's Room Open", type: 'Meal/Banquet', people: [] },
        { s: '7:30 PM', e: '9:00 PM', title: 'Stage Show', type: 'Stage/Gala Show', people: [['Caesar', 'MC'], ['Chip Romero', 'Performer'], ['John Shryock', 'Performer'], ['Mari Shryock', 'Performer']] },
        { s: '9:30 PM', e: '11:00 PM', title: 'Lecture', type: 'Lecture', people: [['Paul Vigil', 'Lecturer']] },
        { s: '11:30 PM', e: '12:30 AM', title: 'Midnight Madness', type: 'Jam Session', people: [] },
    ]},
    { day: 2, label: 'Sunday', items: [
        { s: '8:00 AM', e: '8:30 AM', title: 'General Meeting', type: 'Other', people: [] },
        { s: '10:00 AM', e: '3:00 PM', title: "Dealer's Room Open", type: 'Dealer Hall', people: [] },
        { s: '10:00 AM', e: '12:30 PM', title: 'Lecture', type: 'Lecture', people: [['Eric DeCamps', 'Lecturer']] },
        { s: '12:30 PM', e: '1:15 PM', title: 'Meet and Greet Guest of Honor', type: 'Social/Party', people: [] },
        { s: '12:30 PM', e: '2:00 PM', title: 'Lunch', type: 'Meal/Banquet', people: [] },
        { s: '2:30 PM', e: '4:00 PM', title: 'Professional Close-up Show', type: 'Close-up Show', people: [['John Bannon', 'Performer'], ['Mike Pisciotta', 'Performer'], ['Jared Kopf', 'Performer'], ['Eric DeCamps', 'Performer']] },
        { s: '3:00 PM', e: '5:00 PM', title: 'Stage Rehearsals', type: 'Other', people: [] },
        { s: '5:00 PM', e: '7:00 PM', title: "Dinner & Dealer's Room Open", type: 'Meal/Banquet', people: [] },
        { s: '7:00 PM', e: '9:00 PM', title: 'Stage Show', type: 'Stage/Gala Show', people: [['Chip Romero', 'MC'], ['Paul Vigil', 'Performer'], ['Armando Lucero', 'Performer']] },
        { s: '9:30 PM', e: '11:00 PM', title: 'Panel Discussion (Wizard Way)', type: 'Panel/Q&A', people: [['Paul Vigil', 'Panelist'], ['Jared Kopf', 'Panelist'], ['Mike Pisciotta', 'Panelist']] },
        { s: '9:30 PM', e: '12:30 AM', title: "President's Party", type: 'Social/Party', people: [] },
    ]},
    { day: 3, label: 'Monday', items: [
        { s: '8:00 AM', e: '8:30 AM', title: 'General Meeting', type: 'Other', people: [] },
        { s: '10:00 AM', e: '12:00 PM', title: 'Lecture', type: 'Lecture', people: [['Armando Lucero', 'Lecturer']] },
    ]},
];

async function main() {
    const c = await prisma.convention.findFirst({ where: { slug: SLUG }, select: { id: true, name: true } });
    if (!c) throw new Error('TAOM convention not found');

    // Reset TAOM schedule (cascades talent links via the item FK) + convention-talent.
    await prisma.conventionScheduleItem.deleteMany({ where: { conventionId: c.id } });
    await prisma.scheduleDay.deleteMany({ where: { conventionId: c.id } });
    await prisma.conventionTalent.deleteMany({ where: { conventionId: c.id } });

    // Set the convention timezone (Texas) if not already set.
    const tz = await prisma.timezone.findFirst({ where: { OR: [{ ianaId: TZ_IANA }, { utcAliases: { has: TZ_IANA } }] }, select: { id: true } });
    if (tz) await prisma.convention.update({ where: { id: c.id }, data: { timezoneId: tz.id } });

    let eventCount = 0;
    const talentCache = new Map(); // name -> talentId (within this run)
    const conventionTalentIds = new Set();

    for (const d of DAYS) {
        const day = await prisma.scheduleDay.create({ data: { conventionId: c.id, dayOffset: d.day, isOfficial: true, label: d.label } });
        let order = 0;
        for (const it of d.items) {
            const item = await prisma.conventionScheduleItem.create({
                data: {
                    conventionId: c.id,
                    scheduleDayId: day.id,
                    dayOffset: d.day,
                    title: it.title,
                    eventType: it.type,
                    startTimeMinutes: toMinutes(it.s),
                    durationMinutes: duration(it.s, it.e),
                    atPrimaryVenue: true,
                    order: order++,
                },
            });
            eventCount++;
            let pOrder = 0;
            for (const [name, role] of it.people) {
                let talentId = talentCache.get(norm(name));
                if (!talentId) { talentId = await findOrCreateTalent(name); talentCache.set(norm(name), talentId); }
                await prisma.scheduleEventTalentLink.create({ data: { scheduleItemId: item.id, talentProfileId: talentId, role, order: pOrder++, nameAsListed: name } });
                if (!conventionTalentIds.has(talentId)) {
                    await prisma.conventionTalent.create({ data: { conventionId: c.id, talentProfileId: talentId } });
                    conventionTalentIds.add(talentId);
                }
            }
        }
    }

    console.log(`${c.name}: ${DAYS.length} days, ${eventCount} events, ${talentCache.size} distinct talent linked.`);
}

main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
