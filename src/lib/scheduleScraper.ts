import prisma from '@/lib/prisma';
import { EVENT_TYPES } from '@/lib/eventTypes';
import { setEventTalent } from '@/lib/talent';

/**
 * Schedule scraper core — turns a schedule source (web page, PDF, or a
 * convention website to search) into structured days/events/talent and writes
 * them under the relative-time model (dayOffset + wall-clock minutes).
 *
 * The LLM prompt is intentionally kept in sync with scripts/scrape-schedule.mjs
 * (the CLI/tier4 prototype). Both call the same OpenAI Chat Completions shape.
 */

const TAXONOMY = EVENT_TYPES.map(t => t.value);
const MAX_TEXT_CHARS = 30000;

export interface ScrapedPerformer { name: string; role: string | null; }
export interface ScrapedEvent {
    dayOffset: number;
    title: string;
    eventType: string;
    description: string | null;
    startTimeMinutes: number;
    durationMinutes: number;
    location: string | null;
    performers: ScrapedPerformer[];
}
export interface ScrapedSchedule {
    days: { dayOffset: number; label?: string | null }[];
    events: ScrapedEvent[];
}

// ── time parsing ──────────────────────────────────────────────────────────────
function toMinutes(t: any): number | null {
    const m = String(t ?? '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[3])) h += 12;
    return h * 60 + parseInt(m[2], 10);
}
function durationFrom(startMin: number | null, end: any): number {
    const e = toMinutes(end);
    if (e == null || startMin == null) return 0;
    let d = e - startMin;
    if (d < 0) d += 24 * 60; // crosses midnight
    return d;
}

function fmtUTCDay(start: Date | string, off: number, pattern: 'full'): string {
    const d = new Date(start);
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + off));
    return t.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// ── LLM extraction ────────────────────────────────────────────────────────────
function systemPrompt(): string {
    return `You extract a convention's event schedule from the provided text into structured JSON.

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
  cast (e.g. "Featuring Keith Fields and Lady Sarah (MCs), with Shchukin, Gladwin, and
  Thompson."). For single-presenter or no-performer events, use null.
- "location": the room, area, or stage the event is in — usually a meeting-room name listed
  with the event (e.g. "Grand Ballroom A-E", "Salon F", "North Ballroom Foyer"). Use null if
  not stated. Do NOT use the convention's hotel/venue name itself as the location.
- "performers": real human names presenting/performing, with an optional role (Performer,
  Lecturer, MC, Panelist, Host, Judge, Guest of Honor). Expand shared surnames ("David and
  Jake Rangel" -> two people). Spell each person's name correctly and consistently. Empty array if none.
- If the source (text or image) is in another language, translate titles and descriptions into
  natural English; keep people's and venue names in their original spelling.
- Include every event with a start time. If end time is missing, omit "end".
- Do NOT invent events or people. If the source contains no schedule, return empty arrays.

Respond ONLY as JSON:
{"days":[{"dayOffset":0,"label":"Friday"}],
 "events":[{"dayOffset":0,"start":"9:00 AM","end":"7:00 PM","title":"Registration Open","eventType":"Registration","description":null,"location":"North Ballroom Foyer","performers":[{"name":"Full Name","role":"MC"}]}]}`;
}

async function callOpenAI(apiKey: string, model: string, messages: any[]): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages,
            response_format: { type: 'json_object' },
            // Extraction needs little reasoning — cap it so big/messy pages don't
            // take minutes. Only reasoning models (gpt-5*) accept this param.
            ...(/^gpt-5/.test(model) ? { reasoning_effort: 'low' } : {}),
        }),
        signal: AbortSignal.timeout(180000),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(json.error ?? json)}`);
    return json.choices?.[0]?.message?.content ?? '{}';
}

// Shape the model's JSON into our schedule structure (shared by text + image paths).
function shapeSchedule(content: string): ScrapedSchedule {
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { return { days: [], events: [] }; }

    const events: ScrapedEvent[] = (Array.isArray(parsed.events) ? parsed.events : [])
        .map((e: any) => {
            const startMin = toMinutes(e.start);
            return {
                dayOffset: Number(e.dayOffset) || 0,
                title: String(e.title || '').trim(),
                eventType: TAXONOMY.includes(e.eventType) ? e.eventType : 'Other',
                description: e.description && String(e.description).trim() ? String(e.description).trim() : null,
                startTimeMinutes: startMin as number,
                durationMinutes: durationFrom(startMin, e.end),
                location: e.location && String(e.location).trim() ? String(e.location).trim() : null,
                performers: (Array.isArray(e.performers) ? e.performers : [])
                    .filter((p: any) => p?.name)
                    .map((p: any) => ({ name: String(p.name).trim(), role: p.role ? String(p.role).trim() : null })),
            };
        })
        .filter((e: ScrapedEvent) => e.title && e.startTimeMinutes != null);

    // Title/description shaping (model-agnostic): normalize "Type: Name" -> "Type - Name";
    // a single presenter goes in the title; multiple performers go in the description.
    for (const e of events) {
        e.title = e.title.replace(/^([^:]{2,40}):\s+/, '$1 - ');
        const names = e.performers.map(p => p.name);
        if (e.performers.length === 1) {
            if (e.title.trim().toLowerCase() === e.eventType.toLowerCase()) {
                e.title = `${e.eventType} - ${names[0]}`;
            }
        } else if (e.performers.length > 1) {
            // If the cast got crammed into the title ("Show - A, B, C"), cut it back
            // to the event name and move the cast to the description.
            const dashIdx = e.title.indexOf(' - ');
            if (dashIdx > 0 && names.some(n => e.title.slice(dashIdx + 3).toLowerCase().includes(n.toLowerCase()))) {
                e.title = e.title.slice(0, dashIdx).trim();
            }
            if (!e.description) {
                e.description = `Featuring ${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}.`;
            }
        }
    }

    const days = (Array.isArray(parsed.days) ? parsed.days : [])
        .map((d: any) => ({ dayOffset: Number(d.dayOffset) || 0, label: d.label ?? null }));

    return { days, events };
}

export async function extractScheduleFromText(
    text: string,
    ctx: { conventionName: string; startDate: Date | string; apiKey: string; model: string },
): Promise<ScrapedSchedule> {
    const trimmed = (text || '').slice(0, MAX_TEXT_CHARS).trim();
    if (!trimmed) return { days: [], events: [] };

    const user = `Convention: ${ctx.conventionName}\nConvention start date (day 0): ${fmtUTCDay(ctx.startDate, 0, 'full')}\n\nSchedule source text:\n${trimmed}`;
    const content = await callOpenAI(ctx.apiKey, ctx.model, [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: user },
    ]);
    return shapeSchedule(content);
}

/** Read a schedule out of one or more images (vision). Handles image-only or
 *  non-English (e.g. Korean) schedules that the text path can't see. */
export async function extractScheduleFromImages(
    images: string[],
    ctx: { conventionName: string; startDate: Date | string; apiKey: string; model: string },
): Promise<ScrapedSchedule> {
    if (!images.length) return { days: [], events: [] };
    const userParts: any[] = [
        { type: 'text', text: `Convention: ${ctx.conventionName}\nConvention start date (day 0): ${fmtUTCDay(ctx.startDate, 0, 'full')}\n\nThe schedule is in the following image(s). Read it and return the JSON.` },
        ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];
    const content = await callOpenAI(ctx.apiKey, ctx.model, [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: userParts },
    ]);
    return shapeSchedule(content);
}

// ── input adapters ────────────────────────────────────────────────────────────
function htmlToText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<br\s*\/?>(?=.)/gi, '\n')
        .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#?\w+;/g, ' ')
        .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n')
        .trim().slice(0, MAX_TEXT_CHARS);
}

export async function pdfToText(data: ArrayBuffer | Uint8Array): Promise<string> {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(data instanceof Uint8Array ? data : new Uint8Array(data));
    const { text } = await extractText(pdf, { mergePages: true });
    return String(Array.isArray(text) ? text.join('\n') : text).slice(0, MAX_TEXT_CHARS);
}

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; ConventionCrasherBot/0.1; +https://conventioncrasher.com)' };

/** Fetch a URL and return its text — auto-detecting HTML vs PDF. */
export async function fetchUrlText(url: string): Promise<{ text: string; kind: 'html' | 'pdf' }> {
    const res = await fetch(url, { redirect: 'follow', headers: UA, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/pdf') || /\.pdf(\?|$)/i.test(url)) {
        return { text: await pdfToText(await res.arrayBuffer()), kind: 'pdf' };
    }
    return { text: htmlToText(await res.text()), kind: 'html' };
}

/** Find the most schedule-like page on a convention website, return its text. */
export async function findScheduleFromWebsite(homepageUrl: string): Promise<{ text: string; chosenUrl: string }> {
    const res = await fetch(homepageUrl, { redirect: 'follow', headers: UA, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    const html = await res.text();

    const KEYWORDS = /schedule|program|agenda|itinerary|line.?up|events|sessions/i;
    let best: { url: string; score: number } | null = null;
    for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,80}?)</gi)) {
        let abs: URL;
        try { abs = new URL(m[1], homepageUrl); } catch { continue; }
        if (!/^https?:/.test(abs.protocol)) continue;
        const linkText = m[2].replace(/<[^>]+>/g, '').trim();
        let score = 0;
        if (KEYWORDS.test(linkText)) score += 2;
        if (KEYWORDS.test(abs.pathname)) score += 2;
        if (/\.pdf$/i.test(abs.pathname) && KEYWORDS.test(abs.pathname)) score += 1;
        if (score > 0 && (!best || score > best.score)) best = { url: abs.href, score };
    }

    if (best) {
        const { text } = await fetchUrlText(best.url);
        if (text.trim().length > 100) return { text, chosenUrl: best.url };
    }
    // Fall back to the homepage text itself (schedule may be inline).
    return { text: htmlToText(html), chosenUrl: homepageUrl };
}

// ── images / auto-detection ─────────────────────────────────────────────────
export function bufferToDataUrl(contentType: string, buf: Buffer): string {
    const mime = (contentType || 'image/jpeg').split(';')[0].trim() || 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
}

/** Fetch an image URL and return it as a base64 data URL (for the vision model). */
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
    try {
        const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(20000) });
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!ct.startsWith('image/') && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 8 * 1024 * 1024) return null; // keep payloads sane
        return bufferToDataUrl(ct || 'image/jpeg', buf);
    } catch { return null; }
}

/** Pull plausible content image URLs out of HTML (skipping logos/icons/ads). */
function candidateImageUrls(html: string, baseUrl: string): string[] {
    const urls: string[] = [];
    const seen = new Set<string>();
    for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
        let abs: URL;
        try { abs = new URL(m[1], baseUrl); } catch { continue; }
        if (!/^https?:/.test(abs.protocol)) continue;
        const u = abs.href;
        if (seen.has(u) || !/\.(jpe?g|png|webp)(\?|$)/i.test(abs.pathname)) continue;
        if (/(logo|icon|sprite|favicon|avatar|profile|btn|button|banner-ad|ad[-_])/i.test(u)) continue;
        seen.add(u);
        urls.push(u);
        if (urls.length >= 12) break;
    }
    return urls;
}

/**
 * Fetch a URL and auto-detect what kind of source it is — letting the caller
 * route to the right extractor:
 *   - a PDF                → text (pdfToText)
 *   - an image (JPEG/PNG)  → vision (images)
 *   - an HTML page         → page text, PLUS its prominent images as a vision
 *                            fallback for image-only / non-text schedules.
 */
export async function gatherFromUrl(url: string): Promise<{ kind: 'pdf' | 'image' | 'html'; text: string; images: string[] }> {
    const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/pdf') || /\.pdf(\?|$)/i.test(url)) {
        return { kind: 'pdf', text: await pdfToText(await res.arrayBuffer()), images: [] };
    }
    if (ct.startsWith('image/') || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) {
        const buf = Buffer.from(await res.arrayBuffer());
        return { kind: 'image', text: '', images: [bufferToDataUrl(ct, buf)] };
    }
    const html = await res.text();
    const text = htmlToText(html);
    const images: string[] = [];
    for (const u of candidateImageUrls(html, url)) {
        const d = await fetchImageAsDataUrl(u);
        if (d) images.push(d);
        if (images.length >= 4) break;
    }
    return { kind: 'html', text, images };
}

// ── apply ──────────────────────────────────────────────────────────────────────
export async function applyScrapedSchedule(
    conventionId: string,
    schedule: ScrapedSchedule,
    opts: { replace: boolean },
): Promise<{ days: number; events: number; talent: number }> {
    if (opts.replace) {
        await prisma.conventionScheduleItem.deleteMany({ where: { conventionId } });
        await prisma.scheduleDay.deleteMany({ where: { conventionId } });
        await prisma.conventionTalent.deleteMany({ where: { conventionId } });
    }

    const offsets = Array.from(new Set(schedule.events.map(e => e.dayOffset))).sort((a, b) => a - b);
    const labelByOffset = new Map(schedule.days.map(d => [d.dayOffset, d.label]));

    const existingDays = await prisma.scheduleDay.findMany({ where: { conventionId }, select: { id: true, dayOffset: true } });
    const dayId = new Map(existingDays.map(d => [d.dayOffset, d.id]));
    for (const off of offsets) {
        if (!dayId.has(off)) {
            const day = await prisma.scheduleDay.create({
                data: { conventionId, dayOffset: off, isOfficial: true, label: labelByOffset.get(off) || `Day ${off + 1}` },
            });
            dayId.set(off, day.id);
        }
    }

    const talentIds = new Set<string>();
    let created = 0;
    for (const off of offsets) {
        const dayEvents = schedule.events.filter(e => e.dayOffset === off).sort((a, b) => a.startTimeMinutes - b.startTimeMinutes);
        let order = await prisma.conventionScheduleItem.count({ where: { conventionId, dayOffset: off } });
        for (const e of dayEvents) {
            const item = await prisma.conventionScheduleItem.create({
                data: {
                    conventionId, scheduleDayId: dayId.get(off)!, dayOffset: off,
                    title: e.title, eventType: e.eventType, description: e.description || null,
                    startTimeMinutes: e.startTimeMinutes, durationMinutes: e.durationMinutes,
                    atPrimaryVenue: true, order: order++, locationName: e.location || null,
                },
            });
            created++;
            if (e.performers.length) {
                await setEventTalent(item.id, conventionId, e.performers.map(p => ({ name: p.name, role: p.role })));
            }
        }
    }

    const links = await prisma.scheduleEventTalentLink.findMany({
        where: { scheduleItem: { conventionId } }, select: { talentProfileId: true },
    });
    links.forEach(l => talentIds.add(l.talentProfileId));

    return { days: offsets.length, events: created, talent: talentIds.size };
}

// ════════════════════════════════════════════════════════════════════════════
// Festival mode — extract SHOWS (productions) with expanded runs of performances
// and write them as Production + performance (ConventionScheduleItem) records.
// Ported from scripts/scrape-festival.mjs into the shared, in-app core.
// ════════════════════════════════════════════════════════════════════════════

const FESTIVAL_EVENT_TYPE = 'Stage/Gala Show';
// performer strings that aren't a single bookable act → don't make a talent profile
const NON_TALENT = /\b(acts|many magicians|various|tbc|tba|all)\b/i;

export interface ScrapedPerformance { date: string; startMin: number; durationMin: number; }
export interface ScrapedShow {
    title: string;
    performer: string | null;
    venue: string | null;
    ageRating: string | null;
    performances: ScrapedPerformance[];
}
export interface ScrapedFestival { shows: ScrapedShow[]; }

function festToMinutes(t: any): number | null {
    const s = String(t ?? '').trim();
    let m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (m) { let h = parseInt(m[1], 10) % 12; if (/pm/i.test(m[3])) h += 12; return h * 60 + parseInt(m[2], 10); }
    m = s.match(/^(\d{1,2})\s*(am|pm)$/i);
    if (m) { let h = parseInt(m[1], 10) % 12; if (/pm/i.test(m[2])) h += 12; return h * 60; }
    return null;
}

function festivalSystemPrompt(year: number): string {
    return `You convert a magic festival programme into structured JSON of SHOWS and their PERFORMANCES.

The programme is usually a grid; a single show often runs on multiple days. Day-range headers like
"WEEK ONE – Tuesday June 30 to Sunday July 5" give the dates for rows that say "Tue to Sun",
"Sat only", "Fri, Sat, Sun", etc. Single-day section headers like "SATURDAY – June 27" date the
rows beneath them.

Rules:
- A SHOW is a production/act: group ALL its performances under one show entry.
- Expand recurring runs into explicit dated performances: "Tue to Sun" within a labeled week =
  one performance on each of those days at the listed time; "Sat only" = just that Saturday;
  "Fri, Sat, Sun" = those three days. Single-weekday rows = that one date.
- performance: { "date": "YYYY-MM-DD", "start": "h:mm AM/PM", "end": "h:mm AM/PM" }  (year is ${year}; include end only if a time range is given)
- show: { "title", "performer" (the act/person as written), "venue" (the space/room name as written),
  "ageRating" (as written, e.g. "9+", "0-12", "All"), "performances": [...] }
- If the programme is in another language, translate the show titles into natural English; keep
  performer and venue names in their original spelling.
- Include EVERY show/row. Do NOT invent shows or dates.

Respond ONLY as JSON:
{"shows":[{"title":"...","performer":"...","venue":"...","ageRating":"...","performances":[{"date":"${year}-06-30","start":"10:45 AM","end":"11:30 AM"}]}]}`;
}

function shapeFestival(content: string): ScrapedFestival {
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { return { shows: [] }; }

    const shows: ScrapedShow[] = (Array.isArray(parsed.shows) ? parsed.shows : [])
        .map((s: any) => ({
            title: String(s.title || '').trim(),
            performer: s.performer && String(s.performer).trim() ? String(s.performer).trim() : null,
            venue: s.venue && String(s.venue).trim() ? String(s.venue).trim() : null,
            ageRating: s.ageRating && String(s.ageRating).trim() ? String(s.ageRating).trim() : null,
            performances: (Array.isArray(s.performances) ? s.performances : [])
                .map((p: any) => {
                    const startMin = festToMinutes(p.start);
                    const endMin = festToMinutes(p.end);
                    return {
                        date: String(p.date || '').trim(),
                        startMin: startMin as number,
                        durationMin: endMin != null && startMin != null ? Math.max(0, endMin - startMin) || 60 : 60,
                    };
                })
                .filter((p: ScrapedPerformance) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.startMin != null),
        }))
        .filter((s: ScrapedShow) => s.title && s.performances.length);

    return { shows };
}

export async function extractFestivalFromText(
    text: string,
    ctx: { festivalName: string; year: number; apiKey: string; model: string },
): Promise<ScrapedFestival> {
    const trimmed = (text || '').slice(0, MAX_TEXT_CHARS).trim();
    if (!trimmed) return { shows: [] };

    const user = `Festival: ${ctx.festivalName}\nYear: ${ctx.year}\n\nProgramme:\n${trimmed}`;
    const content = await callOpenAI(ctx.apiKey, ctx.model, [
        { role: 'system', content: festivalSystemPrompt(ctx.year) },
        { role: 'user', content: user },
    ]);
    return shapeFestival(content);
}

/** Read festival shows out of one or more images (vision). */
export async function extractFestivalFromImages(
    images: string[],
    ctx: { festivalName: string; year: number; apiKey: string; model: string },
): Promise<ScrapedFestival> {
    if (!images.length) return { shows: [] };
    const userParts: any[] = [
        { type: 'text', text: `Festival: ${ctx.festivalName}\nYear: ${ctx.year}\n\nThe programme is in the following image(s). Read it and return the JSON.` },
        ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];
    const content = await callOpenAI(ctx.apiKey, ctx.model, [
        { role: 'system', content: festivalSystemPrompt(ctx.year) },
        { role: 'user', content: userParts },
    ]);
    return shapeFestival(content);
}

const dayDiffUTC = (a: Date, b: Date): number =>
    Math.round((Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()) -
        Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())) / 86400000);

export async function applyScrapedFestival(
    conventionId: string,
    festival: ScrapedFestival,
    opts: { replace: boolean },
): Promise<{ shows: number; performances: number; venues: number; talent: number }> {
    const shows = festival.shows.filter(s => s.title && s.performances.length);
    if (!shows.length) return { shows: 0, performances: 0, venues: 0, talent: 0 };

    // Date math: anchor dayOffset to the convention's start date (relative-time
    // model). If the festival has no dates yet, set them from the programme.
    const allDates = shows.flatMap(s => s.performances.map(p => p.date)).sort();
    const minDate = new Date(allDates[0] + 'T00:00:00Z');
    const maxDate = new Date(allDates[allDates.length - 1] + 'T00:00:00Z');

    const conv = await prisma.convention.findUnique({
        where: { id: conventionId },
        select: { startDate: true, endDate: true },
    });
    const base = conv?.startDate ? new Date(conv.startDate) : minDate;
    const dateUpdates: { startDate?: Date; endDate?: Date } = {};
    if (!conv?.startDate) dateUpdates.startDate = minDate;
    if (!conv?.endDate || new Date(conv.endDate) < maxDate) dateUpdates.endDate = maxDate;
    if (Object.keys(dateUpdates).length) {
        await prisma.convention.update({ where: { id: conventionId }, data: dateUpdates });
    }

    if (opts.replace) {
        // Deleting Productions cascade-deletes their performances (FK onDelete: Cascade).
        await prisma.production.deleteMany({ where: { conventionId } });
    }

    // Venues: find-or-create by name within the convention.
    const venueNames = Array.from(new Set(shows.map(s => s.venue).filter(Boolean))) as string[];
    const existingVenues = await prisma.venue.findMany({ where: { conventionId }, select: { id: true, venueName: true } });
    const venueId = new Map(existingVenues.map(v => [v.venueName, v.id]));
    let createdVenues = 0;
    for (const name of venueNames) {
        if (venueId.has(name)) continue;
        const anyVenueYet = venueId.size > 0;
        const v = await prisma.venue.create({ data: { conventionId, venueName: name, isPrimaryVenue: !anyVenueYet } });
        venueId.set(name, v.id);
        createdVenues++;
    }

    // Schedule days: find-or-create for each offset present.
    const offsets = Array.from(new Set(
        shows.flatMap(s => s.performances.map(p => dayDiffUTC(new Date(p.date + 'T00:00:00Z'), base)))
    ));
    const existingDays = await prisma.scheduleDay.findMany({ where: { conventionId }, select: { id: true, dayOffset: true } });
    const dayId = new Map(existingDays.map(d => [d.dayOffset, d.id]));
    for (const off of offsets) {
        if (dayId.has(off)) continue;
        const label = new Date(base.getTime() + off * 86400000).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        const d = await prisma.scheduleDay.create({ data: { conventionId, dayOffset: off, isOfficial: true, label } });
        dayId.set(off, d.id);
    }

    const talentIds = new Set<string>();
    let prodOrder = await prisma.production.count({ where: { conventionId } });
    let createdPerf = 0;
    for (const s of shows) {
        const tagline = s.ageRating ? (/^all$/i.test(s.ageRating) ? 'All ages' : `Ages ${s.ageRating}`) : null;
        const prod = await prisma.production.create({
            data: { conventionId, title: s.title, tagline, ageRating: s.ageRating, order: prodOrder++ },
        });
        let pOrder = 0;
        const sorted = [...s.performances].sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
        for (const p of sorted) {
            const off = dayDiffUTC(new Date(p.date + 'T00:00:00Z'), base);
            const item = await prisma.conventionScheduleItem.create({
                data: {
                    conventionId, productionId: prod.id, scheduleDayId: dayId.get(off) ?? null, dayOffset: off,
                    title: s.title, eventType: FESTIVAL_EVENT_TYPE, startTimeMinutes: p.startMin, durationMinutes: p.durationMin,
                    atPrimaryVenue: false, venueId: s.venue ? venueId.get(s.venue) ?? null : null, order: pOrder++,
                },
            });
            createdPerf++;
            if (s.performer && !NON_TALENT.test(s.performer)) {
                await setEventTalent(item.id, conventionId, [{ name: s.performer, role: 'Performer' }]);
            }
        }
    }

    const links = await prisma.scheduleEventTalentLink.findMany({
        where: { scheduleItem: { conventionId } }, select: { talentProfileId: true },
    });
    links.forEach(l => talentIds.add(l.talentProfileId));

    return { shows: shows.length, performances: createdPerf, venues: createdVenues, talent: talentIds.size };
}

// ════════════════════════════════════════════════════════════════════════════
// Basic info — extract a convention's listing fields (name, dates, location,
// description, links) from a source. Preview-only: the organizer reviews these
// in the editor form and Saves, so there is no apply-to-DB here.
// ════════════════════════════════════════════════════════════════════════════

export interface ScrapedBasicInfo {
    name: string | null;
    startDate: string | null;   // YYYY-MM-DD
    endDate: string | null;     // YYYY-MM-DD
    isOneDayEvent: boolean;
    city: string | null;
    stateName: string | null;
    country: string | null;
    websiteUrl: string | null;
    registrationUrl: string | null;
    descriptionShort: string | null;
    descriptionMain: string | null;
}

function basicInfoSystemPrompt(): string {
    return `You extract a magic convention's basic listing information from the provided text or image into JSON.

Respond ONLY as JSON with exactly these keys:
{"name":"...","startDate":"YYYY-MM-DD|null","endDate":"YYYY-MM-DD|null","city":"...","stateName":"...","country":"...","websiteUrl":"...","registrationUrl":"...","descriptionShort":"...","descriptionMain":"..."}

Rules:
- "name": the event's name.
- "startDate"/"endDate": the event's first and last calendar day (YYYY-MM-DD). For a single-day
  event, make them equal. Use null if a date isn't stated.
- "city"/"stateName"/"country": the host location. "stateName" is the state/province/region if
  applicable (e.g. a US state), otherwise "". "country" is the full country name.
- "websiteUrl": the event's official website. "registrationUrl": where to register or buy tickets,
  only if it's a different link; otherwise "".
- "descriptionShort": a one or two sentence summary.
- "descriptionMain": a fuller description — one to three short paragraphs of plain text.
- If the source is in another language, translate the name and descriptions into natural English;
  keep proper names. Use null or "" for anything not present. Do not invent details.`;
}

function shapeBasicInfo(content: string): ScrapedBasicInfo {
    let p: any = {};
    try { p = JSON.parse(content); } catch { /* fall through to empties */ }
    const str = (v: any) => (v && String(v).trim() ? String(v).trim() : null);
    const date = (v: any) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '').trim()) ? String(v).trim() : null);
    const startDate = date(p.startDate);
    const endDate = date(p.endDate);
    return {
        name: str(p.name),
        startDate,
        endDate,
        isOneDayEvent: !!startDate && startDate === endDate,
        city: str(p.city),
        stateName: str(p.stateName),
        country: str(p.country),
        websiteUrl: str(p.websiteUrl),
        registrationUrl: str(p.registrationUrl),
        descriptionShort: str(p.descriptionShort),
        descriptionMain: str(p.descriptionMain),
    };
}

export async function extractBasicInfoFromText(
    text: string,
    ctx: { apiKey: string; model: string },
): Promise<ScrapedBasicInfo> {
    const trimmed = (text || '').slice(0, MAX_TEXT_CHARS).trim();
    if (!trimmed) return shapeBasicInfo('{}');
    const content = await callOpenAI(ctx.apiKey, ctx.model, [
        { role: 'system', content: basicInfoSystemPrompt() },
        { role: 'user', content: `Source text:\n${trimmed}` },
    ]);
    return shapeBasicInfo(content);
}

export async function extractBasicInfoFromImages(
    images: string[],
    ctx: { apiKey: string; model: string },
): Promise<ScrapedBasicInfo> {
    if (!images.length) return shapeBasicInfo('{}');
    const userParts: any[] = [
        { type: 'text', text: 'The convention details are in the following image(s). Read them and return the JSON.' },
        ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];
    const content = await callOpenAI(ctx.apiKey, ctx.model, [
        { role: 'system', content: basicInfoSystemPrompt() },
        { role: 'user', content: userParts },
    ]);
    return shapeBasicInfo(content);
}
