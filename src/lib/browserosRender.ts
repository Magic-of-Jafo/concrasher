// Render a URL in a real browser via the BrowserOS MCP server, returning the
// page's readable markdown. Used as a fallback when our plain server-side fetch
// is blocked by a bot challenge (e.g. Cloudflare) or returns an empty JS-rendered
// shell. Best-effort: returns null (never throws) so callers degrade gracefully.
//
// Configured by BROWSEROS_MCP_URL (e.g. http://127.0.0.1:9200/mcp over an SSH
// tunnel in dev). When unset, the fallback is disabled.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// BrowserOS wraps `read` output in prompt-injection guard markers; strip them so
// only the real page content reaches our extractors.
function stripUntrusted(s: string): string {
    return s
        // Opening marker + the rest of its line ("Untrusted page content follows…").
        .replace(/^\s*\[UNTRUSTED_PAGE_CONTENT[^\]]*\][^\n]*\n?/i, '')
        // Closing marker — BrowserOS emits [END_UNTRUSTED_PAGE_CONTENT nonce=…]
        // (older builds used [/UNTRUSTED_PAGE_CONTENT]); handle both.
        .replace(/\[(?:END_|\/)UNTRUSTED_PAGE_CONTENT[^\]]*\]\s*$/i, '')
        // BrowserOS renders a literal "(empty)" placeholder for a blank page
        // (e.g. mid-redirect just after a challenge clears) — treat it as nothing.
        .replace(/^\s*\(empty\)\s*$/i, '')
        .trim();
}

const textOf = (r: any): string =>
    (r?.content || []).filter((c: any) => c?.type === 'text').map((c: any) => c.text).join('\n');

// Cloudflare (and similar) bot-challenge interstitials, which briefly render
// before the real page loads. If a read returns one of these, the challenge
// hasn't cleared yet — keep polling.
function looksLikeChallenge(s: string): boolean {
    return /performing security verification|just a moment|verify(?:ing)? you are (?:a )?human|enable javascript and cookies to continue|needs to review the security of your connection|challenge-platform|cf[-_]chl|\bray id\b|checking your browser|attention required/i.test(s);
}

export interface BrowserosRender {
    /** Readable page markdown (with any <select> options appended), or null. */
    text: string | null;
    /** Full-page PNG screenshot as a data URL, for the vision extractor to read
     *  when text extraction comes up empty. Only captured when `withShot`. */
    image: string | null;
}

// Find a cookie/consent "accept" button in an accessibility snapshot and return
// its stable ref (for an `act` click). Many sites (council/tourism CMSs, EU-region
// sites) render the article behind a consent wall, so `read` returns only the
// cookie modal until it's dismissed. Consent persists in the browser profile, so
// this only fires on a site's first visit. Kept conservative — only well-known
// "accept/allow all cookies" phrases on short button labels — so we never click
// an unrelated control. (evaluate/DOM scripting isn't usable here: BrowserOS runs
// tabs backgrounded, where CDP Runtime.evaluate sees a null document.)
function findConsentRef(snapshot: string): string | null {
    const phrases = /allow all cookies|accept all cookies|accept all|allow all|accept cookies|allow cookies|accept & close/i;
    for (const line of snapshot.split('\n')) {
        if (!/\bbutton\b/i.test(line)) continue;
        const label = (line.match(/"([^"]{1,40})"/)?.[1] || '');
        if (label && phrases.test(label)) {
            const ref = line.match(/\[ref=(e\d+)\]/)?.[1];
            if (ref) return ref;
        }
    }
    return null;
}

async function render(target: string, withShot: boolean): Promise<BrowserosRender> {
    const url = process.env.BROWSEROS_MCP_URL;
    if (!url) return { text: null, image: null };
    const token = process.env.BROWSEROS_MCP_TOKEN;
    const transportOpts = token ? { requestInit: { headers: { Authorization: `Bearer ${token}` } } } : undefined;

    const client = new Client({ name: 'convention-crasher', version: '0.1.0' }, { capabilities: {} });
    let pageId: number | null = null;
    try {
        await client.connect(new StreamableHTTPClientTransport(new URL(url), transportOpts));
        const opened = await client.callTool(
            { name: 'tabs', arguments: { action: 'new', url: target, background: true } },
            undefined,
            { timeout: 45000 },
        );
        pageId = (opened as any).structuredContent?.page ?? null;
        if (pageId == null) {
            const m = textOf(opened).match(/page\s+(\d+)/i);
            if (m) pageId = Number(m[1]);
        }
        if (pageId == null) return { text: null, image: null };
        const readMarkdown = async (): Promise<string> => stripUntrusted(textOf(await client.callTool(
            { name: 'read', arguments: { page: pageId, format: 'markdown' } },
            undefined,
            { timeout: 45000 },
        )));
        // Cloudflare / bot-challenge pages show a "Performing security verification"
        // interstitial that auto-clears after a few seconds of JS. A single short
        // wait+read captures that interstitial instead of the real page, so poll:
        // wait, read, and retry while the content still looks like a challenge (or
        // is empty), up to a bounded number of tries. Also lets JS-populated content
        // (e.g. ticket dropdowns) settle.
        const pollForContent = async (tries: number): Promise<string> => {
            let out = '';
            for (let attempt = 0; attempt < tries; attempt++) {
                try {
                    await client.callTool({ name: 'wait', arguments: { page: pageId, for: 'time', value: '2200' } }, undefined, { timeout: 10000 });
                } catch { /* best-effort */ }
                out = await readMarkdown();
                // Stop once we have real content: not a challenge interstitial and past
                // the brief blank/redirect state (stripUntrusted maps "(empty)" to '').
                if (out.length > 150 && !looksLikeChallenge(out)) break;
            }
            return out;
        };
        const snapshot = async (): Promise<string> => stripUntrusted(textOf(await client.callTool(
            { name: 'snapshot', arguments: { page: pageId } },
            undefined,
            { timeout: 30000 },
        )));

        let md = await pollForContent(8);
        let snap = await snapshot();
        // Dismiss a cookie/consent wall if one is covering the content: click the
        // "Accept all cookies" button (by snapshot ref) and reload so the page
        // renders past the wall, then re-read. Consent then persists for next time.
        const consentRef = findConsentRef(snap);
        if (consentRef) {
            try {
                await client.callTool({ name: 'act', arguments: { page: pageId, kind: 'click', ref: consentRef } }, undefined, { timeout: 20000 });
                await client.callTool({ name: 'navigate', arguments: { page: pageId, action: 'reload' } }, undefined, { timeout: 45000 });
                const after = await pollForContent(6);
                if (after.length > md.length) md = after;
                snap = await snapshot();
            } catch { /* best-effort */ }
        }
        // markdown/text drop <select> option text — often ticket/package PRICES.
        // Pull selectable options out of the accessibility snapshot and append them.
        try {
            const opts = snap.split('\n')
                .filter((l) => /\b(combobox|listbox|option|radio|checkbox|menuitemradio)\b/i.test(l))
                .map((l) => l.replace(/\s*\[ref=e\d+\]/g, '').replace(/\s*\[(?:collapsed|expanded)\]/gi, '').trim())
                .filter(Boolean);
            if (opts.length) md += `\n\n## Selectable options\n${opts.join('\n')}`;
        } catch { /* snapshot is best-effort */ }
        // Full-page screenshot for the vision extractor — the general fallback when
        // text extraction still yields nothing (JS/iframe-rendered content, image
        // flyers, etc.). Only when the caller wants it (basic-info / helper scrapes).
        let image: string | null = null;
        if (withShot) {
            try {
                const shot = await client.callTool({ name: 'screenshot', arguments: { page: pageId, fullPage: true } }, undefined, { timeout: 45000 });
                const im = ((shot as any).content || []).find((c: any) => c?.type === 'image');
                if (im?.data) image = `data:${im.mimeType || 'image/png'};base64,${im.data}`;
            } catch { /* screenshot is best-effort */ }
        }
        return { text: md || null, image };
    } finally {
        try { if (pageId != null) await client.callTool({ name: 'tabs', arguments: { action: 'close', page: pageId } }); } catch { /* best-effort */ }
        try { await client.close(); } catch { /* best-effort */ }
    }
}

/** Render `target` in BrowserOS and return { text, image }, or nulls on any
 *  failure (unconfigured, unreachable, timeout). `withShot` also captures a
 *  full-page screenshot for the vision fallback. Bounded so a slow/offline
 *  laptop can't hang a request. */
export async function browserosRenderRich(target: string, withShot = true): Promise<BrowserosRender> {
    if (!process.env.BROWSEROS_MCP_URL) return { text: null, image: null };
    try {
        return await Promise.race([
            render(target, withShot),
            new Promise<BrowserosRender>((resolve) => setTimeout(() => resolve({ text: null, image: null }), 75000)),
        ]);
    } catch (e: any) {
        console.warn('[browseros] render failed:', e?.message || e);
        return { text: null, image: null };
    }
}

/** Text-only convenience wrapper (no screenshot) for callers that just need the
 *  page markdown, e.g. link discovery. */
export async function browserosRender(target: string): Promise<string | null> {
    return (await browserosRenderRich(target, false)).text;
}
