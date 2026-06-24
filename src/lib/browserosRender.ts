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
        .replace(/^\s*\[UNTRUSTED_PAGE_CONTENT[^\]]*\][^\n]*\n?/i, '')
        .replace(/\[\/UNTRUSTED_PAGE_CONTENT\]\s*$/i, '')
        .trim();
}

const textOf = (r: any): string =>
    (r?.content || []).filter((c: any) => c?.type === 'text').map((c: any) => c.text).join('\n');

async function render(target: string): Promise<string | null> {
    const url = process.env.BROWSEROS_MCP_URL;
    if (!url) return null;
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
        if (pageId == null) return null;
        // Let JS-populated content (e.g. ticket dropdowns) settle before reading.
        try {
            await client.callTool({ name: 'wait', arguments: { page: pageId, for: 'time', value: '1800' } }, undefined, { timeout: 10000 });
        } catch { /* best-effort */ }
        const read = await client.callTool(
            { name: 'read', arguments: { page: pageId, format: 'markdown' } },
            undefined,
            { timeout: 45000 },
        );
        let md = stripUntrusted(textOf(read));
        // markdown/text drop <select> option text — often ticket/package PRICES.
        // Pull selectable options out of the accessibility snapshot and append them.
        try {
            const snap = stripUntrusted(textOf(await client.callTool(
                { name: 'snapshot', arguments: { page: pageId } },
                undefined,
                { timeout: 30000 },
            )));
            const opts = snap.split('\n')
                .filter((l) => /\b(combobox|listbox|option|radio|checkbox|menuitemradio)\b/i.test(l))
                .map((l) => l.replace(/\s*\[ref=e\d+\]/g, '').replace(/\s*\[(?:collapsed|expanded)\]/gi, '').trim())
                .filter(Boolean);
            if (opts.length) md += `\n\n## Selectable options\n${opts.join('\n')}`;
        } catch { /* snapshot is best-effort */ }
        return md || null;
    } finally {
        try { if (pageId != null) await client.callTool({ name: 'tabs', arguments: { action: 'close', page: pageId } }); } catch { /* best-effort */ }
        try { await client.close(); } catch { /* best-effort */ }
    }
}

/** Render `target` in BrowserOS and return its markdown, or null on any failure
 *  (unconfigured, unreachable, timeout). Bounded so a slow/offline laptop can't
 *  hang a request. */
export async function browserosRender(target: string): Promise<string | null> {
    if (!process.env.BROWSEROS_MCP_URL) return null;
    try {
        return await Promise.race([
            render(target),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 60000)),
        ]);
    } catch (e: any) {
        console.warn('[browseros] render failed:', e?.message || e);
        return null;
    }
}
