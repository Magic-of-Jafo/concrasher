/**
 * AI schedule scraper (tier4 prototype).
 *
 * Fetches a convention's published schedule page, has the OpenAI model extract a
 * structured day/event list (relative dayOffset + wall-clock times + taxonomy
 * event type + performers), and rebuilds the convention's ScheduleDay /
 * ConventionScheduleItem / talent links — using the same alias-aware
 * find-or-create talent logic as src/lib/talent.ts.
 *
 * Usage:
 *   node scripts/scrape-schedule.mjs                       # dry-run on TAOM (preview only)
 *   node scripts/scrape-schedule.mjs --apply               # clear + rebuild TAOM schedule
 *   node scripts/scrape-schedule.mjs --slug <slug> --url <scheduleUrl> [--apply] [--model gpt-5.5]
 *
 * Key/model: --model flag → admin AI Settings (DB) → 'gpt-5'.  Reads .env.local for DB/key.
 */

import { readFileSync } from 'fs';

const MAX_PAGE_CHARS = 30000;
const args = parseArgs(process.argv.slice(2));
const APPLY = !!args.apply;
const SLUG = args.slug ?? 'texas-association-of-magicians-taom-2026';
const URL_ = args.url ?? 'https://www.taom.org/assoc/2026-convention/schedule/';

function parseArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--')) {
            const key = a.slice(2);
            const next = argv[i + 1];
            if (next && !next.startsWith('--')) { out[key] = next; i++; } else { out[key] = true; }
        }
    }
    return out;
}

function readEnvLocal(name) {
    try {
        const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
        return env.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'))?.[1];
    } catch { return undefined; }
}

if (!process.env.DATABASE_URL) {
    const dbUrl = readEnvLocal('DATABASE_URL');
    if (dbUrl) process.env.DATABASE_URL = dbUrl;
}

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

let dbSettings = {};
try {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: ['openai_api_key', 'openai_model'] } } });
    dbSettings = Object.fromEntries(rows.map(r => [r.key, r.value]));
} catch { /* fall back to env */ }

const model = args.model ?? dbSettings.openai_model ?? 'gpt-5';
const openaiKey = process.env.OPENAI_API_KEY ?? readEnvLocal('OPENAI_API_KEY') ?? dbSettings.openai_api_key;
if (!openaiKey) { console.error('No OpenAI API key (env, .env.local, or Admin → AI Settings)'); process.exit(1); }

// ── canonical event-type taxonomy (mirrors src/lib/eventTypes.ts) ───────────
const TAXONOMY = [
    'Lecture', 'Workshop', 'Stage/Gala Show', 'Close-up Show', 'Competition', 'Dealer Hall',
    'Registration', 'Meal/Banquet', 'Social/Party', 'Panel/Q&A', 'Screening', 'Auction',
    'Keynote', 'Awards', 'Kids/Youth', 'Jam Session', 'Tour/Excursion', 'Vendor Demo', 'Other',
];

// ── helpers ─────────────────────────────────────────────────────────────────
function htmlToText(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<br\s*\/?>(?=.)/gi, '\n')
        .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#?\w+;/g, ' ')
        .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n')
        .trim().slice(0, MAX_PAGE_CHARS);
}

async function fetchPage(url) {
    const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConventionCrasherBot/0.1; +https://conventioncrasher.com)' },
        signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.text();
}

async function callOpenAI(messages) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model, messages, response_format: { type: 'json_object' } }),
        signal: AbortSignal.timeout(180000),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(json.error ?? json)}`);
    return { content: json.choices[0].message.content, usage: json.usage };
}

function toMinutes(t) {
    const m = String(t).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[3])) h += 12;
    return h * 60 + parseInt(m[2], 10);
}
function duration(startMin, end) {
    const e = toMinutes(end);
    if (e == null || startMin == null) return 0;
    let d = e - startMin;
    if (d < 0) d += 24 * 60; // crosses midnight
    return d;
}

// talent matching (mirrors src/lib/talent.ts)
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

function fmtUTCDay(date, off) {
    const d = new Date(date);
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + off));
    return t.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// ── main ────────────────────────────────────────────────────────────────────
const conv = await prisma.convention.findFirst({ where: { slug: SLUG }, select: { id: true, name: true, startDate: true, endDate: true } });
if (!conv) { console.error(`Convention not found for slug: ${SLUG}`); process.exit(1); }

console.log(`Convention: ${conv.name}`);
console.log(`Start (day 0): ${fmtUTCDay(conv.startDate, 0)}   |   URL: ${URL_}`);
console.log(`Model: ${model}   |   Mode: ${APPLY ? 'APPLY (will rebuild)' : 'DRY-RUN (preview only)'}\n`);

const text = htmlToText(await fetchPage(URL_));

const SYSTEM = `You extract a convention's event schedule from the page text into structured JSON.

Rules:
- "dayOffset" is the number of days after the convention start date (start date = day 0).
- Times are wall-clock local time. Use "h:mm AM/PM" (e.g. "9:00 AM", "7:30 PM").
  Be careful with AM vs PM: end must be after start, and a short morning meeting that ends
  the same morning stays AM (e.g. "8:00 AM" - "8:30 AM"). Avoid durations over ~13 hours
  unless clearly all-day (registration / dealer room).
- "eventType" MUST be exactly one of: ${TAXONOMY.join(', ')}.
- "title": a concise event title. If the event has exactly ONE presenter (a lecture or a
  one-person show), put their name in the title, e.g. "Lecture - John Bannon" (use a hyphen).
  If the event has MULTIPLE performers (a gala or group show), keep the title to the event
  name only (e.g. "Gala Show", "Close-up Show") — do NOT list the cast in the title.
- "description": for an event with MULTIPLE performers, a short natural sentence naming the
  cast (e.g. "Featuring Keith Fields and Lady Sarah (MCs), with Shchukin and Gladwin.").
  For single-presenter or no-performer events, use null.
- "location": the room, area, or stage the event is in — usually a meeting-room name listed
  with the event (e.g. "Grand Ballroom A-E", "Salon F"). Use null if not stated. Do NOT use the
  convention's hotel/venue name itself as the location.
- "performers": real human names presenting/performing in that event, with an optional role
  (Performer, Lecturer, MC, Panelist, Host, Judge, Guest of Honor). Expand shared surnames
  ("David and Jake Rangel" -> two people). Spell each person's name correctly and consistently
  across all events. Empty array if none.
- Include every event with a start time. If end time is missing, omit "end".
- Do NOT invent events or people.

Respond ONLY as JSON:
{"days":[{"dayOffset":0,"label":"Friday"}],
 "events":[{"dayOffset":0,"start":"9:00 AM","end":"7:00 PM","title":"Registration Open","eventType":"Registration","description":null,"location":"North Ballroom Foyer","performers":[{"name":"Full Name","role":"MC"}]}]}`;

const user = `Convention: ${conv.name}\nConvention start date (day 0): ${fmtUTCDay(conv.startDate, 0)}\n\nSchedule page text:\n${text}`;

const { content, usage } = await callOpenAI([{ role: 'system', content: SYSTEM }, { role: 'user', content: user }]);
let parsed;
try { parsed = JSON.parse(content); } catch { console.error('Could not parse model JSON:\n', content); process.exit(1); }

const days = Array.isArray(parsed.days) ? parsed.days : [];
const events = (Array.isArray(parsed.events) ? parsed.events : [])
    .map(e => ({
        dayOffset: Number(e.dayOffset) || 0,
        title: String(e.title || '').trim(),
        eventType: TAXONOMY.includes(e.eventType) ? e.eventType : 'Other',
        description: e.description && String(e.description).trim() ? String(e.description).trim() : null,
        startMin: toMinutes(e.start),
        durationMin: duration(toMinutes(e.start), e.end),
        location: e.location && String(e.location).trim() ? String(e.location).trim() : null,
        performers: Array.isArray(e.performers) ? e.performers.filter(p => p?.name) : [],
    }))
    .filter(e => e.title && e.startMin != null);

// ── corrections (general + a couple TAOM-specific safety nets) ───────────────
// General: normalize "Type: Name" titles to "Type - Name"; ensure a bare
// type-only title gains its performers; fix obvious AM/PM slips on short meetings.
// Known spelling fix is data-specific and would be dropped when generalized.
const NAME_CORRECTIONS = [[/\bArmondo\b/gi, 'Armando']];
const applyNameFixes = s => NAME_CORRECTIONS.reduce((acc, [re, to]) => acc.replace(re, to), s);
for (const e of events) {
    e.performers = e.performers.map(p => ({ ...p, name: applyNameFixes(String(p.name).trim()) }));
    e.title = applyNameFixes(e.title).replace(/^([^:]{2,40}):\s+/, '$1 - ');
    e.description = e.description ? applyNameFixes(e.description) : null;
    const names = e.performers.map(p => p.name);
    // Single presenter → in the title; multiple performers → in the description.
    if (e.performers.length === 1) {
        if (e.title.trim().toLowerCase() === e.eventType.toLowerCase()) {
            e.title = `${e.eventType} - ${names[0]}`;
        }
    } else if (e.performers.length > 1) {
        const dashIdx = e.title.indexOf(' - ');
        if (dashIdx > 0 && names.some(n => e.title.slice(dashIdx + 3).toLowerCase().includes(n.toLowerCase()))) {
            e.title = e.title.slice(0, dashIdx).trim();
        }
        if (!e.description) {
            e.description = `Featuring ${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}.`;
        }
    }
    // "General Meeting" is a short morning meeting — fix the AM/PM end slip.
    if (/general meeting/i.test(e.title) && e.durationMin > 180) e.durationMin = 30;
}

// ── preview ─────────────────────────────────────────────────────────────────
const byDay = new Map();
for (const e of events) { if (!byDay.has(e.dayOffset)) byDay.set(e.dayOffset, []); byDay.get(e.dayOffset).push(e); }
const fmt = m => { const h = Math.floor(m / 60) % 24, mm = (m % 60).toString().padStart(2, '0'), p = h >= 12 ? 'PM' : 'AM', dh = h % 12 || 12; return `${dh}:${mm} ${p}`; };
const talentSet = new Set();
for (const off of [...byDay.keys()].sort((a, b) => a - b)) {
    console.log(`── Day ${off} — ${fmtUTCDay(conv.startDate, off)} ──`);
    for (const e of byDay.get(off).sort((a, b) => a.startMin - b.startMin)) {
        const who = e.performers.map(p => `${p.name}${p.role ? ` (${p.role})` : ''}`).join(', ');
        e.performers.forEach(p => talentSet.add(p.name));
        console.log(`  ${fmt(e.startMin)}${e.durationMin ? `–${fmt(e.startMin + e.durationMin)}` : ''}  [${e.eventType}]  ${e.title}${e.location ? `  @ ${e.location}` : ''}${who ? `  — ${who}` : ''}`);
    }
}
console.log(`\nExtracted: ${events.length} events across ${byDay.size} days, ${talentSet.size} distinct performers.`);
console.log(`Tokens: ${usage?.total_tokens ?? '?'}`);

if (!APPLY) {
    console.log('\nDRY-RUN — nothing written. Re-run with --apply to rebuild the schedule.');
    await prisma.$disconnect();
    process.exit(0);
}

// ── apply: clear + rebuild ──────────────────────────────────────────────────
console.log('\nRebuilding schedule…');
await prisma.conventionScheduleItem.deleteMany({ where: { conventionId: conv.id } });
await prisma.scheduleDay.deleteMany({ where: { conventionId: conv.id } });
await prisma.conventionTalent.deleteMany({ where: { conventionId: conv.id } });

const dayLabels = new Map(days.map(d => [Number(d.dayOffset), d.label]));
const dayIdByOffset = {};
for (const off of [...byDay.keys()].sort((a, b) => a - b)) {
    const label = dayLabels.get(off) || new Date(Date.UTC(new Date(conv.startDate).getUTCFullYear(), new Date(conv.startDate).getUTCMonth(), new Date(conv.startDate).getUTCDate() + off)).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const day = await prisma.scheduleDay.create({ data: { conventionId: conv.id, dayOffset: off, isOfficial: true, label } });
    dayIdByOffset[off] = day.id;
}

const talentCache = new Map();
const convTalentIds = new Set();
let created = 0;
for (const off of [...byDay.keys()].sort((a, b) => a - b)) {
    let order = 0;
    for (const e of byDay.get(off).sort((a, b) => a.startMin - b.startMin)) {
        const item = await prisma.conventionScheduleItem.create({
            data: {
                conventionId: conv.id, scheduleDayId: dayIdByOffset[off], dayOffset: off,
                title: e.title, eventType: e.eventType, description: e.description || null,
                startTimeMinutes: e.startMin, durationMinutes: e.durationMin,
                atPrimaryVenue: true, order: order++, locationName: e.location || null,
            },
        });
        created++;
        let pOrder = 0;
        for (const p of e.performers) {
            let tid = talentCache.get(norm(p.name));
            if (!tid) { tid = await findOrCreateTalent(p.name); talentCache.set(norm(p.name), tid); }
            await prisma.scheduleEventTalentLink.create({ data: { scheduleItemId: item.id, talentProfileId: tid, role: p.role || null, order: pOrder++, nameAsListed: p.name } });
            if (!convTalentIds.has(tid)) { await prisma.conventionTalent.create({ data: { conventionId: conv.id, talentProfileId: tid } }); convTalentIds.add(tid); }
        }
    }
}
console.log(`Done: ${byDay.size} days, ${created} events, ${talentCache.size} talent linked.`);
await prisma.$disconnect();
