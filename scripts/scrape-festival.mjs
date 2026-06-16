// Festival schedule scraper (F4 prototype).
//
// Reads a festival programme (PDF or page text), has the OpenAI model extract
// SHOWS (productions) each with their expanded run of performances, then rebuilds
// the festival's Production / performance / venue / talent records.
//
//   node scripts/scrape-festival.mjs --pdf "C:/path/to/programme.pdf"           # dry-run preview
//   node scripts/scrape-festival.mjs --pdf "..." --apply                        # write
//   node scripts/scrape-festival.mjs --slug <slug> --pdf "..." [--apply] [--model gpt-5.5]

import { readFileSync } from 'fs';

const args = (() => {
    const a = process.argv.slice(2); const o = {};
    for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { const k = a[i].slice(2); const n = a[i + 1]; if (n && !n.startsWith('--')) { o[k] = n; i++; } else o[k] = true; } }
    return o;
})();
const APPLY = !!args.apply;
const SLUG = args.slug ?? 'melbourne-magic-festival-2026';
const PDF = args.pdf ?? 'C:/Users/magic/Desktop/MMF-2026-SCHEDULE.pdf';

function readEnvLocal(name) {
    try { const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); return env.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'))?.[1]; } catch { return undefined; }
}
if (!process.env.DATABASE_URL) { const u = readEnvLocal('DATABASE_URL'); if (u) process.env.DATABASE_URL = u; }

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
let dbSettings = {};
try { const rows = await prisma.siteSetting.findMany({ where: { key: { in: ['openai_api_key', 'openai_model'] } } }); dbSettings = Object.fromEntries(rows.map(r => [r.key, r.value])); } catch { }
const model = args.model ?? dbSettings.openai_model ?? 'gpt-5';
const openaiKey = process.env.OPENAI_API_KEY ?? readEnvLocal('OPENAI_API_KEY') ?? dbSettings.openai_api_key;
if (!openaiKey) { console.error('No OpenAI API key'); process.exit(1); }

// ── talent matching (mirrors src/lib/talent.ts) ──
const norm = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’.\-]/g, '').replace(/\s+/g, ' ').trim();
const variants = (display, aliases = []) => Array.from(new Set([display, ...aliases].map(norm).filter(Boolean)));
async function findOrCreateTalent(name) {
    const n = norm(name);
    const hit = await prisma.talentProfile.findFirst({ where: { normalizedNames: { has: n } }, select: { id: true } });
    if (hit) return hit.id;
    const c = await prisma.talentProfile.create({ data: { displayName: name.trim(), aliases: [], normalizedNames: variants(name), userId: null }, select: { id: true } });
    return c.id;
}
// performer strings that aren't a single bookable act → don't make a talent profile
const NON_TALENT = /\b(acts|many magicians|various|tbc|tba|all)\b/i;

function toMinutes(t) {
    const m = String(t || '').trim().match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)$/i);
    if (!m) { const h = String(t || '').trim().match(/^(\d{1,2})\s*(am|pm)$/i); if (!h) return null; let hh = parseInt(h[1], 10) % 12; if (/pm/i.test(h[2])) hh += 12; return hh * 60; }
    let h = parseInt(m[1], 10) % 12; if (/pm/i.test(m[3])) h += 12; return h * 60 + parseInt(m[2], 10);
}

async function callOpenAI(messages) {
    const body = { model, messages, response_format: { type: 'json_object' } };
    if (/^gpt-5/.test(model)) body.reasoning_effort = 'low';
    const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
    const j = await res.json();
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(j.error ?? j)}`);
    return { content: j.choices[0].message.content, usage: j.usage };
}

async function pdfToText(path) {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(readFileSync(path)));
    const { text } = await extractText(pdf, { mergePages: true });
    return String(Array.isArray(text) ? text.join('\n') : text);
}

const SYSTEM = `You convert a magic festival programme into structured JSON of SHOWS and their PERFORMANCES.

The programme is a grid; a single show usually runs on multiple days. Day-range headers like
"WEEK ONE – Tuesday June 30 to Sunday July 5" give the dates for rows that say "Tue to Sun",
"Sat only", "Fri, Sat, Sun", etc. Single-day section headers like "SATURDAY – June 27" date the
rows beneath them.

Rules:
- A SHOW is a production/act: group ALL its performances under one show entry.
- Expand recurring runs into explicit dated performances: "Tue to Sun" within a labeled week =
  one performance on each of those days at the listed time; "Sat only" = just that Saturday;
  "Fri, Sat, Sun" = those three days. Single-weekday rows = that one date.
- performance: { "date": "YYYY-MM-DD", "start": "h:mm AM/PM", "end": "h:mm AM/PM" }  (year is 2026; include end only if a time range is given)
- show: { "title", "performer" (the act/person as written), "venue" (the space/room name as written),
  "ageRating" (as written, e.g. "9+", "0-12", "All"), "performances": [...] }
- Include EVERY show/row. Do NOT invent shows or dates.

Respond ONLY as JSON: {"shows":[{"title":"...","performer":"...","venue":"...","ageRating":"...","performances":[{"date":"2026-06-30","start":"10:45 AM","end":"11:30 AM"}]}]}`;

// ── run ──
const text = (await pdfToText(PDF)).slice(0, 30000);
console.log(`PDF: ${PDF}  (${text.length} chars)`);
const conv = await prisma.convention.findFirst({ where: { slug: SLUG }, select: { id: true, name: true } });
if (!conv) { console.error('Convention not found for slug ' + SLUG); process.exit(1); }

const { content, usage } = await callOpenAI([{ role: 'system', content: SYSTEM }, { role: 'user', content: `Festival: ${conv.name}\nYear: 2026\n\nProgramme:\n${text}` }]);
let parsed; try { parsed = JSON.parse(content); } catch { console.error('Bad JSON:\n', content.slice(0, 500)); process.exit(1); }
const shows = (Array.isArray(parsed.shows) ? parsed.shows : []).map(s => ({
    title: String(s.title || '').trim(),
    performer: String(s.performer || '').trim(),
    venue: String(s.venue || '').trim(),
    ageRating: s.ageRating ? String(s.ageRating).trim() : null,
    performances: (Array.isArray(s.performances) ? s.performances : []).map(p => ({ date: String(p.date || '').trim(), startMin: toMinutes(p.start), durationMin: (toMinutes(p.end) != null && toMinutes(p.start) != null) ? Math.max(0, toMinutes(p.end) - toMinutes(p.start)) : 60 })).filter(p => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.startMin != null),
})).filter(s => s.title && s.performances.length);

// festival day 0 = earliest performance date
const allDates = shows.flatMap(s => s.performances.map(p => p.date)).sort();
const start = new Date(allDates[0] + 'T00:00:00Z');
const end = new Date(allDates[allDates.length - 1] + 'T00:00:00Z');
const dayOffsetOf = dateStr => Math.round((new Date(dateStr + 'T00:00:00Z') - start) / 86400000);
const fmtWeekday = off => new Date(start.getTime() + off * 86400000).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
const fmt = m => { const h = Math.floor(m / 60) % 24, mm = (m % 60).toString().padStart(2, '0'), p = h >= 12 ? 'PM' : 'AM', dh = h % 12 || 12; return `${dh}:${mm} ${p}`; };

// preview
const venuesSet = new Set(shows.map(s => s.venue).filter(Boolean));
const perfTotal = shows.reduce((n, s) => n + s.performances.length, 0);
console.log(`\nExtracted ${shows.length} shows, ${perfTotal} performances, ${venuesSet.size} venues. Festival ${allDates[0]} → ${allDates[allDates.length - 1]}. Tokens: ${usage?.total_tokens}\n`);
for (const s of shows) {
    const days = s.performances.map(p => p.date).sort();
    console.log(`• ${s.title}  — ${s.performer}  @ ${s.venue}  [${s.ageRating || '—'}]  (${s.performances.length} perf, ${days[0]}→${days[days.length - 1]}, ${fmt(s.performances[0].startMin)})`);
}

if (!APPLY) { console.log('\nDRY-RUN — re-run with --apply to write.'); await prisma.$disconnect(); process.exit(0); }

// ── apply ──
console.log('\nRebuilding festival…');
const cid = conv.id;
await prisma.conventionScheduleItem.deleteMany({ where: { conventionId: cid } });
await prisma.production.deleteMany({ where: { conventionId: cid } });
await prisma.scheduleDay.deleteMany({ where: { conventionId: cid } });
await prisma.conventionTalent.deleteMany({ where: { conventionId: cid } });
await prisma.venue.deleteMany({ where: { conventionId: cid } });
await prisma.convention.update({ where: { id: cid }, data: { startDate: start, endDate: end, type: 'FESTIVAL' } });

// venues
const venueId = {};
let firstVenue = true;
for (const name of venuesSet) {
    const v = await prisma.venue.create({ data: { conventionId: cid, venueName: name, isPrimaryVenue: firstVenue } });
    venueId[name] = v.id; firstVenue = false;
}
// schedule days
const dayId = {};
const maxOff = dayOffsetOf(allDates[allDates.length - 1]);
for (let off = 0; off <= maxOff; off++) { const d = await prisma.scheduleDay.create({ data: { conventionId: cid, dayOffset: off, isOfficial: true, label: fmtWeekday(off) } }); dayId[off] = d.id; }

const talentCache = new Map();
const convTalent = new Set();
let prodOrder = 0, created = 0;
for (const s of shows) {
    const tagline = s.ageRating ? (/^all$/i.test(s.ageRating) ? 'All ages' : `Ages ${s.ageRating}`) : null;
    const prod = await prisma.production.create({ data: { conventionId: cid, title: s.title, tagline, ageRating: s.ageRating, order: prodOrder++ } });
    // talent for the performer (skip group/placeholder strings)
    let tid = null;
    if (s.performer && !NON_TALENT.test(s.performer)) {
        tid = talentCache.get(norm(s.performer));
        if (!tid) { tid = await findOrCreateTalent(s.performer); talentCache.set(norm(s.performer), tid); }
    }
    let pOrder = 0;
    for (const p of s.performances.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)) {
        const off = dayOffsetOf(p.date);
        const item = await prisma.conventionScheduleItem.create({
            data: {
                conventionId: cid, scheduleDayId: dayId[off], dayOffset: off, productionId: prod.id,
                title: s.title, eventType: 'Stage/Gala Show', startTimeMinutes: p.startMin, durationMinutes: p.durationMin,
                atPrimaryVenue: false, venueId: s.venue ? venueId[s.venue] : null, order: pOrder++,
            },
        });
        created++;
        if (tid) {
            await prisma.scheduleEventTalentLink.create({ data: { scheduleItemId: item.id, talentProfileId: tid, role: 'Performer', order: 0, nameAsListed: s.performer } });
            if (!convTalent.has(tid)) { await prisma.conventionTalent.create({ data: { conventionId: cid, talentProfileId: tid } }); convTalent.add(tid); }
        }
    }
}
console.log(`Done: ${shows.length} shows, ${created} performances, ${Object.keys(venueId).length} venues, ${talentCache.size} talent.`);
await prisma.$disconnect();
