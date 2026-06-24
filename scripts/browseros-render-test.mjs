// Drive BrowserOS to a URL and read its rendered markdown, to learn the tool
// result shapes before wiring this into the app.
//
//   BROWSEROS_MCP_URL="http://127.0.0.1:9200/mcp" node scripts/browseros-render-test.mjs [url]

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = process.env.BROWSEROS_MCP_URL;
const target = process.argv[2] || 'https://book.passkey.com/gt/221308067?gtid=730e738b5246abafb65242568468240d';
if (!url) { console.error('Set BROWSEROS_MCP_URL'); process.exit(1); }

const client = new Client({ name: 'cc-render-test', version: '0.1.0' }, { capabilities: {} });
await client.connect(new StreamableHTTPClientTransport(new URL(url)));

const textOf = (r) => (r?.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');

const t0 = Date.now();
console.log('--- tabs(new) ---');
const opened = await client.callTool({ name: 'tabs', arguments: { action: 'new', url: target, background: true } });
console.log('structuredContent:', JSON.stringify(opened.structuredContent));
console.log('text:', textOf(opened).slice(0, 400));

// Try to discover the page id from structuredContent or the text.
let pageId =
    opened.structuredContent?.page ??
    opened.structuredContent?.pageId ??
    opened.structuredContent?.id ??
    null;
if (pageId == null) {
    const m = textOf(opened).match(/page[ _]?id[^0-9]*(\d+)/i) || textOf(opened).match(/\bpage\s+(\d+)/i) || textOf(opened).match(/\[(\d+)\]/);
    if (m) pageId = Number(m[1]);
}
console.log('=> resolved pageId:', pageId);

console.log('\n--- read(markdown) ---');
const read = await client.callTool({ name: 'read', arguments: { page: pageId ?? 0, format: 'markdown' } });
const md = textOf(read);
console.log('markdown length:', md.length, ' time:', ((Date.now() - t0) / 1000).toFixed(1) + 's');
console.log('first 800 chars:\n' + md.slice(0, 800));

if (pageId != null) {
    try { await client.callTool({ name: 'tabs', arguments: { action: 'close', page: pageId } }); console.log('\n(closed tab', pageId + ')'); } catch {}
}
await client.close();
