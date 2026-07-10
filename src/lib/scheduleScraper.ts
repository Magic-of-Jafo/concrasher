import prisma from '@/lib/prisma';
import { EVENT_TYPES } from '@/lib/eventTypes';
import { setEventTalent } from '@/lib/talent';
import { browserosRender, browserosRenderRich } from '@/lib/browserosRender';

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

// A PDF whose extracted text is shorter than this is treated as having no real
// text layer (scans, flattened design exports) and gets rendered for vision.
export const PDF_TEXT_MIN_CHARS = 100;

/**
 * Render a PDF's pages to PNG data URLs for the vision model. The fallback for
 * PDFs with no text layer. Uses @napi-rs/canvas under the hood (via unpdf);
 * returns as many pages as rendered successfully, up to maxPages.
 */
export async function pdfToImages(
    data: ArrayBuffer | Uint8Array,
    { maxPages = 4, scale = 2 }: { maxPages?: number; scale?: number } = {},
): Promise<string[]> {
    const { getDocumentProxy, renderPageAsImage } = await import('unpdf');
    // Copy the bytes: the caller's buffer may already have been consumed by
    // pdfToText, and pdf.js can transfer ownership of what it's given.
    const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data.slice(0));
    const pdf = await getDocumentProxy(bytes);
    const pages = Math.min(pdf.numPages, maxPages);
    const images: string[] = [];
    for (let p = 1; p <= pages; p++) {
        try {
            const dataUrl = await renderPageAsImage(pdf, p, {
                // webpackIgnore: the package ships a native .node binary that
                // webpack must never try to bundle; Node resolves it at runtime.
                canvasImport: () => import(/* webpackIgnore: true */ '@napi-rs/canvas'),
                scale,
                toDataURL: true,
            });
            if (dataUrl) images.push(dataUrl);
        } catch (e: any) {
            console.error(`pdfToImages: page ${p} render failed:`, e?.message || e);
        }
    }
    return images;
}

// Present as a real browser. Many event sites sit behind Cloudflare/WAFs that
// 403 obvious bot User-Agents; a normal browser UA + Accept headers clears the
// simple header-based blocks (full JS challenges still need the Image fallback).
const UA = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
};

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
    if (!res.ok) {
        // Cloudflare / WAF bot challenges (a JS challenge we can't solve server-side)
        // come back as 403/503 with a cloudflare server or a cf-mitigated header.
        const server = (res.headers.get('server') || '').toLowerCase();
        const challenged = res.headers.get('cf-mitigated') || server.includes('cloudflare') || res.status === 403 || res.status === 503;
        if (challenged) {
            // Real-browser fallback (if configured): returns page text AND a full-page
            // screenshot, so even if text extraction fails the vision path can read it.
            const rendered = await browserosRenderRich(url);
            const shot = rendered.image ? [rendered.image] : [];
            if ((rendered.text && rendered.text.trim()) || shot.length) {
                return { kind: 'html', text: rendered.text || '', images: shot };
            }
            throw new Error("This page is protected by a bot challenge (e.g. Cloudflare) that this tool can't read directly. Take a screenshot of the info and use the Image option; you can paste it straight from your clipboard.");
        }
        throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/pdf') || /\.pdf(\?|$)/i.test(url)) {
        const ab = await res.arrayBuffer();
        const text = await pdfToText(ab.slice(0));
        // Scanned / flattened PDFs have no text layer: render pages for vision.
        const images = text.trim().length >= PDF_TEXT_MIN_CHARS ? [] : await pdfToImages(ab);
        return { kind: 'pdf', text, images };
    }
    if (ct.startsWith('image/') || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) {
        const buf = Buffer.from(await res.arrayBuffer());
        return { kind: 'image', text: '', images: [bufferToDataUrl(ct, buf)] };
    }
    const html = await res.text();
    let text = htmlToText(html);
    const images: string[] = [];
    for (const u of candidateImageUrls(html, url)) {
        const d = await fetchImageAsDataUrl(u);
        if (d) images.push(d);
        if (images.length >= 4) break;
    }
    // JS-rendered shells (Wix, Squarespace, etc.) strip down to almost nothing.
    // Re-render in a real browser if one is configured, and keep its screenshot as
    // a vision fallback for content our text extraction can't reach (iframes, etc.).
    if (text.trim().length < 150) {
        const rendered = await browserosRenderRich(url);
        if (rendered.text && rendered.text.trim().length > text.trim().length) text = rendered.text;
        if (rendered.image) images.push(rendered.image);
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

// Build the show's display title. At a performer festival the act type alone
// ("Magician", "Mentalist") isn't useful — lead with the performer's name. Skip
// when the title already names them, or the performer is a generic/non-act string.
function festivalShowTitle(title: string, performer: string | null): string {
    const t = (title || '').trim();
    const p = (performer || '').trim();
    if (!p || NON_TALENT.test(p)) return t || p;
    if (!t) return p;
    const tl = t.toLowerCase(), pl = p.toLowerCase();
    if (tl.includes(pl)) return t;   // title already names the performer
    if (pl.includes(tl)) return p;   // performer string already includes the title
    return `${p} — ${t}`;            // lead with the performer (the headline)
}

function shapeFestival(content: string): ScrapedFestival {
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { return { shows: [] }; }

    const shows: ScrapedShow[] = (Array.isArray(parsed.shows) ? parsed.shows : [])
        .map((s: any) => ({
            title: festivalShowTitle(String(s.title || '').trim(), s.performer ? String(s.performer).trim() : null),
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
- "descriptionShort": one or two tight sentences that make a visitor want to read on. Concrete, not hypey.
- "descriptionMain": two or three SHORT paragraphs of original marketing copy for the event's public
  listing page, separated by blank lines (\\n\\n). Write it fresh in your own words; never copy sentences
  from the source, and never write ABOUT the source ("is described as", "the website says"). Lead with
  what attendees actually get: who they'll see, what they'll do, what makes this event different. Weave
  the facts (dates, venue, headliners, traditions, who it's for) into that story. Voice: a knowledgeable
  human editor who likes this event; warm, direct, specific.
- Copy style rules (strict): no em dashes anywhere. No "isn't just X, it's Y" or "more than just" framing.
  Don't open with "Whether you're...". Avoid stock hype words (unforgettable, immersive, elevate, unleash,
  vibrant, magical journey). Vary sentence length; not every sentence gets a three-item list. No
  exclamation marks. No invented facts, performers, prices, or numbers: only what the source states.
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

// ════════════════════════════════════════════════════════════════════════════
// Pricing — extract a convention's ticket price table(s) from a source. Ports
// the proven enrich-conventions pricing model (one or more independent tables,
// optional two-column channel pricing). Preview-only: fills the Pricing tab.
// ════════════════════════════════════════════════════════════════════════════

export interface ScrapedPriceTier { label: string; amount: number; amountSecondary: number | null; }
export interface ScrapedPriceTable {
    name: string | null;          // tab name when there are multiple tables
    primaryLabel: string | null;  // main column label (dearer channel for two-column)
    secondaryLabel: string | null;// second column label (cheaper channel)
    tiers: ScrapedPriceTier[];
}
export interface ScrapedPricing { currency: string | null; tables: ScrapedPriceTable[]; }

function pricingSystemPrompt(): string {
    return `You extract a magic convention's ticket PRICING from the provided text or image into JSON.

Model the pricing as one or more independent tables:
- ONE table, single price column: every ticket has one price. Set "secondaryLabel" null and each tier's "amountSecondary" null.
- ONE table, TWO price columns: the SAME tickets are sold at two prices by channel (e.g. cheaper online, dearer at the door). Put the DEARER price in "amount" and the cheaper in "amountSecondary"; set "primaryLabel" (e.g. "At the Door") and "secondaryLabel" (e.g. "Online"). Do NOT make two tables for this.
- MULTIPLE tables: the event sells genuinely different ticket SETS with different categories (e.g. a full-week "All Access" set and a separate "Daily" set). One table per set, each with its own "name" and its own tiers.

Each tier: { "label": category name, "amount": number, "amountSecondary": number|null }.
Amounts are plain numbers — no currency symbols, no thousands separators (e.g. 280000, not "₩280,000").
"currency" is the ISO code if determinable (e.g. "USD", "KRW", "EUR"), else null.
If the source is in another language, translate the category labels into natural English; keep amounts as-is.
Use null/empty when unsure rather than guessing. If there is no pricing, return an empty "tables" array.

Respond ONLY as JSON:
{"currency":"KRW","tables":[{"name":null,"primaryLabel":null,"secondaryLabel":null,"tiers":[{"label":"3-Day Pass","amount":280000,"amountSecondary":null}]}]}`;
}

function shapePricing(content: string): ScrapedPricing {
    let p: any = {};
    try { p = JSON.parse(content); } catch { return { currency: null, tables: [] }; }
    const num = (v: any) => (typeof v === 'number' && isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v.replace(/[^0-9.]/g, ''))) ? Number(v.replace(/[^0-9.]/g, '')) : null));
    const str = (v: any) => (v && String(v).trim() ? String(v).trim() : null);
    const tables: ScrapedPriceTable[] = (Array.isArray(p.tables) ? p.tables : [])
        .map((t: any) => ({
            name: str(t.name),
            primaryLabel: str(t.primaryLabel),
            secondaryLabel: str(t.secondaryLabel),
            tiers: (Array.isArray(t.tiers) ? t.tiers : [])
                .map((tier: any) => ({ label: String(tier.label || '').trim(), amount: num(tier.amount), amountSecondary: num(tier.amountSecondary) }))
                .filter((tier: any) => tier.label && tier.amount != null),
        }))
        .filter((t: ScrapedPriceTable) => t.tiers.length);
    return { currency: str(p.currency), tables };
}

export async function extractPricingFromText(
    text: string,
    ctx: { apiKey: string; model: string },
): Promise<ScrapedPricing> {
    const trimmed = (text || '').slice(0, MAX_TEXT_CHARS).trim();
    if (!trimmed) return { currency: null, tables: [] };
    const content = await callOpenAI(ctx.apiKey, ctx.model, [
        { role: 'system', content: pricingSystemPrompt() },
        { role: 'user', content: `Source text:\n${trimmed}` },
    ]);
    return shapePricing(content);
}

export async function extractPricingFromImages(
    images: string[],
    ctx: { apiKey: string; model: string },
): Promise<ScrapedPricing> {
    if (!images.length) return { currency: null, tables: [] };
    const userParts: any[] = [
        { type: 'text', text: 'The ticket pricing is in the following image(s). Read it and return the JSON.' },
        ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];
    const content = await callOpenAI(ctx.apiKey, ctx.model, [
        { role: 'system', content: pricingSystemPrompt() },
        { role: 'user', content: userParts },
    ]);
    return shapePricing(content);
}

// ════════════════════════════════════════════════════════════════════════════
// Venue & Hotel — extract the event VENUE and the lodging HOTEL from a source.
// Common case: the convention is held AT a hotel and attendees stay there
// (sameLocation), so the booking details live on the venue. Otherwise a separate
// host hotel is returned. Preview-only: fills the Venue/Hotel tab.
// ════════════════════════════════════════════════════════════════════════════

export interface ScrapedPlace {
    name: string | null;
    websiteUrl: string | null;
    googleMapsUrl: string | null;
    streetAddress: string | null;
    city: string | null;
    stateRegion: string | null;
    postalCode: string | null;
    country: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    description: string | null;
    amenities: string[];
    parkingInfo: string | null;
    publicTransportInfo: string | null;
    // Room-block booking (host hotel, or the venue when it doubles as the hotel)
    groupPrice: string | null;
    groupRateOrBookingCode: string | null;
    bookingLink: string | null;
    bookingCutoffDate: string | null; // YYYY-MM-DD
}
export interface ScrapedVenueHotel {
    sameLocation: boolean | null; // do attendees stay where the events happen?
    venue: ScrapedPlace | null;
    hotels: ScrapedPlace[];       // lodging hotels separate from the venue — host/primary first, then overflow
}

/** Build a universal, always-clickable Google Maps search link from a place's
 *  name + address. No Maps API key needed. */
export function buildGoogleMapsUrl(p: Partial<ScrapedPlace> | null | undefined): string | null {
    if (!p) return null;
    const parts = [p.name, p.streetAddress, p.city, p.stateRegion, p.postalCode, p.country]
        .map((v) => (v ? String(v).trim() : '')).filter(Boolean);
    if (!parts.length) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
}

function venueHotelSystemPrompt(): string {
    return `You extract a magic convention's event VENUE and lodging HOTEL details from the provided text or image into JSON.

A convention has a VENUE where events take place, and lodging where attendees stay. VERY OFTEN the convention is held AT a hotel and attendees stay in that same hotel (sameLocation true). Sometimes events are at a separate venue and attendees stay at a different host hotel (sameLocation false).

Respond ONLY as JSON with exactly these keys:
{"sameLocation":true,"venue":{place},"hotels":[]}

A {place} object has exactly these keys:
{"name":"...","websiteUrl":"...","googleMapsUrl":"...","streetAddress":"...","city":"...","stateRegion":"...","postalCode":"...","country":"...","contactEmail":"...","contactPhone":"...","description":"...","amenities":["..."],"parkingInfo":"...","publicTransportInfo":"...","groupPrice":"...","groupRateOrBookingCode":"...","bookingLink":"...","bookingCutoffDate":"YYYY-MM-DD"}

Rules:
- "venue": the place where events happen — name, address, contact, and a short plain-text description.
- "sameLocation": true if attendees stay at the same place the events happen (the venue IS the host hotel); false if there is a SEPARATE host hotel; null if unclear. When unsure, prefer true.
- "hotels": an array of lodging hotels that are SEPARATE from the venue — do NOT repeat the venue here. List EVERY hotel mentioned, in the order shown, as {place} objects. When sameLocation is false, the FIRST hotel is the main/host hotel and the rest are additional/overflow hotels. When sameLocation is true, the venue holds the host room block and this array holds any ADDITIONAL/overflow hotels (often empty). A page may list one main hotel plus several overflow hotels — capture them ALL.
- When the venue is also where attendees stay (sameLocation true), put that host room-block booking on the VENUE.
- Booking fields (on whichever place is the lodging): "groupPrice" = nightly rate as written (e.g. "$129/night"); "groupRateOrBookingCode" = the code/phrase to mention for the convention rate (e.g. "MAGIC26"); "bookingLink" = the direct booking URL; "bookingCutoffDate" = last day to book at that rate (YYYY-MM-DD).
- "googleMapsUrl": only if an explicit Google Maps link is present in the source; otherwise null (we build one from the address).
- "amenities": a short list if stated, else [].
- If the source is in another language, translate descriptions/amenities into natural English; keep proper names, addresses, and codes. Use null or "" for anything not present. Do not invent details.`;
}

function shapePlace(p: any): ScrapedPlace | null {
    if (!p || typeof p !== 'object') return null;
    const str = (v: any) => (v && String(v).trim() ? String(v).trim() : null);
    const date = (v: any) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '').trim()) ? String(v).trim() : null);
    const amenities = (Array.isArray(p.amenities) ? p.amenities : [])
        .map((a: any) => String(a || '').trim()).filter(Boolean);
    const place: ScrapedPlace = {
        name: str(p.name),
        websiteUrl: str(p.websiteUrl),
        googleMapsUrl: str(p.googleMapsUrl),
        streetAddress: str(p.streetAddress),
        city: str(p.city),
        stateRegion: str(p.stateRegion),
        postalCode: str(p.postalCode),
        country: str(p.country),
        contactEmail: str(p.contactEmail),
        contactPhone: str(p.contactPhone),
        description: str(p.description),
        amenities,
        parkingInfo: str(p.parkingInfo),
        publicTransportInfo: str(p.publicTransportInfo),
        groupPrice: str(p.groupPrice),
        groupRateOrBookingCode: str(p.groupRateOrBookingCode),
        bookingLink: str(p.bookingLink),
        bookingCutoffDate: date(p.bookingCutoffDate),
    };
    // A place is only meaningful if it at least has a name or an address line.
    if (!place.name && !place.streetAddress && !place.city) return null;
    // Construct a Maps link from the address when the source didn't supply one.
    if (!place.googleMapsUrl) place.googleMapsUrl = buildGoogleMapsUrl(place);
    return place;
}

function shapeVenueHotel(content: string): ScrapedVenueHotel {
    let p: any = {};
    try { p = JSON.parse(content); } catch { return { sameLocation: null, venue: null, hotels: [] }; }
    const venue = shapePlace(p.venue);
    // Accept "hotels" (array) or a legacy single "hotel".
    const rawHotels = Array.isArray(p.hotels) ? p.hotels : (p.hotel ? [p.hotel] : []);
    const hotels = rawHotels.map(shapePlace).filter((h: ScrapedPlace | null): h is ScrapedPlace => !!h);
    let sameLocation: boolean | null =
        p.sameLocation === true ? true : p.sameLocation === false ? false : null;
    // If the model said "separate hotel" but listed none, treat as same-location.
    if (sameLocation === false && hotels.length === 0) sameLocation = true;
    return { sameLocation, venue, hotels };
}

export async function extractVenueHotelFromText(
    text: string,
    ctx: { apiKey: string; model: string },
): Promise<ScrapedVenueHotel> {
    const trimmed = (text || '').slice(0, MAX_TEXT_CHARS).trim();
    if (!trimmed) return { sameLocation: null, venue: null, hotels: [] };
    const content = await callOpenAI(ctx.apiKey, ctx.model, [
        { role: 'system', content: venueHotelSystemPrompt() },
        { role: 'user', content: `Source text:\n${trimmed}` },
    ]);
    return shapeVenueHotel(content);
}

export async function extractVenueHotelFromImages(
    images: string[],
    ctx: { apiKey: string; model: string },
): Promise<ScrapedVenueHotel> {
    if (!images.length) return { sameLocation: null, venue: null, hotels: [] };
    const userParts: any[] = [
        { type: 'text', text: 'The venue / hotel details are in the following image(s). Read them and return the JSON.' },
        ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];
    const content = await callOpenAI(ctx.apiKey, ctx.model, [
        { role: 'system', content: venueHotelSystemPrompt() },
        { role: 'user', content: userParts },
    ]);
    return shapeVenueHotel(content);
}

// ════════════════════════════════════════════════════════════════════════════
// Site link discovery — given a convention's main website URL, find the
// sub-pages the wizard's later steps need (schedule, pricing/registration,
// hotel/venue, talent). Keyword heuristics over the page's links; no LLM call.
// ════════════════════════════════════════════════════════════════════════════

export interface DiscoveredLinks {
    schedule: string | null;
    pricing: string | null;
    hotel: string | null;
    talent: string | null;
}

// Scored keyword patterns per section. A link's href path scores double; its
// visible text scores single. Highest score wins the section.
const LINK_PATTERNS: Record<keyof DiscoveredLinks, RegExp> = {
    schedule: /\b(schedule|program(me)?s?|agenda|events?|timetable|line-?up)\b/i,
    pricing: /\b(regist(er|ration)?|tickets?|pric(e|es|ing)|fees?|attend|book(ing)?|join)\b/i,
    hotel: /\b(hotels?|venue|travel|stay|accommodat\w*|lodging|location|getting[- ]there)\b/i,
    talent: /\b(artists?|performers?|talent|guests?|stars?|magicians?|lecturers?|speakers?|line-?up|who'?s[- ]coming)\b/i,
};

// Off-site hosts that ARE the section page for many conventions (room-block
// booking engines, ticketing platforms). A host match is the strongest signal.
const EXTERNAL_HOSTS: Partial<Record<keyof DiscoveredLinks, RegExp>> = {
    hotel: /(?:^|\.)(passkey\.com|cvent\.com|hilton\.com|marriott\.com|hyatt\.com|ihg\.com|wyndhamhotels\.com|choicehotels\.com|bestwestern\.com)$/i,
    pricing: /(?:^|\.)(eventbrite\.[a-z.]+|ovationtix\.com|ticketleap\.com|showclix\.com|universe\.com|ti\.to|tickettailor\.com|brownpapertickets\.com|regfox\.com|eventzilla\.net)$/i,
};

/** Extract [text, absoluteUrl] pairs from raw HTML anchors or markdown links. */
function extractLinks(content: string, baseUrl: string): Array<{ text: string; url: string }> {
    const out: Array<{ text: string; url: string }> = [];
    const push = (href: string, text: string) => {
        try {
            const abs = new URL(href, baseUrl);
            if (!/^https?:$/.test(abs.protocol)) return;
            abs.hash = '';
            out.push({ text: (text || '').replace(/\s+/g, ' ').trim(), url: abs.toString() });
        } catch { /* unparseable href */ }
    };
    // HTML anchors
    const aRe = /<a\b[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = aRe.exec(content))) push(m[1], m[2].replace(/<[^>]+>/g, ' '));
    // Markdown links (BrowserOS renders pages as markdown)
    const mdRe = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g;
    while ((m = mdRe.exec(content))) push(m[2], m[1]);
    return out;
}

/**
 * Discover a convention site's section pages from its main URL. Fetches the
 * page (falling back to a real-browser render for bot-challenged / JS-shell
 * sites), then classifies same-host links by keyword. Best-effort: sections
 * without a confident match come back null and the organizer pastes that
 * section's URL manually on its wizard step.
 */
export async function discoverSiteLinks(url: string): Promise<DiscoveredLinks> {
    const none: DiscoveredLinks = { schedule: null, pricing: null, hotel: null, talent: null };

    let content = '';
    let finalUrl = url;
    try {
        const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(30000) });
        if (res.ok) {
            finalUrl = res.url || url;
            content = await res.text();
            // JS shells have markup but no real anchor text; still parseable, so keep it.
        }
        if (!res.ok || extractLinks(content, finalUrl).length < 3) {
            const rendered = await browserosRender(url);
            if (rendered) content = content + '\n' + rendered;
        }
    } catch {
        const rendered = await browserosRender(url);
        if (!rendered) return none;
        content = rendered;
    }
    if (!content) return none;

    let host = '';
    try { host = new URL(finalUrl).host.replace(/^www\./, ''); } catch { return none; }

    const allLinks = extractLinks(content, finalUrl);
    const hostOf = (u: string) => { try { return new URL(u).host.replace(/^www\./, ''); } catch { return ''; } };
    const sameHostLinks = allLinks.filter((l) => hostOf(l.url) === host);

    const result: DiscoveredLinks = { ...none };
    for (const section of Object.keys(LINK_PATTERNS) as Array<keyof DiscoveredLinks>) {
        const re = LINK_PATTERNS[section];
        const externalRe = EXTERNAL_HOSTS[section];
        let best: { url: string; score: number } | null = null;
        // Same-host pages: path match beats text match.
        for (const l of sameHostLinks) {
            let path = '';
            try { path = decodeURIComponent(new URL(l.url).pathname); } catch { /* keep '' */ }
            const score = (re.test(path) ? 2 : 0) + (re.test(l.text) ? 1 : 0);
            if (score > 0 && (!best || score > best.score)) best = { url: l.url, score };
        }
        // Known external booking/ticketing hosts: the strongest signal there is.
        if (externalRe) {
            for (const l of allLinks) {
                const h = hostOf(l.url);
                if (h && h !== host && externalRe.test(h)) { best = { url: l.url, score: 3 }; break; }
            }
        }
        result[section] = best?.url ?? null;
    }
    // The same page often serves venue+hotel or schedule+talent; that's fine —
    // each step's helper reads whatever its page contains.
    return result;
}
