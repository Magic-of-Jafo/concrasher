// Probe the BrowserOS MCP server: connect and list its tools (names + params).
// Run from a machine with tailnet access to the laptop. Read-only — just lists tools.
//
//   BROWSEROS_MCP_URL="http://100.x.y.z:PORT/mcp" [BROWSEROS_MCP_TOKEN="..."] \
//     node scripts/browseros-probe.mjs

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const url = process.env.BROWSEROS_MCP_URL;
const token = process.env.BROWSEROS_MCP_TOKEN;
if (!url) { console.error('Set BROWSEROS_MCP_URL (e.g. http://100.x.y.z:PORT/mcp).'); process.exit(1); }
const headers = token ? { Authorization: `Bearer ${token}` } : {};

async function tryConnect(kind) {
    const client = new Client({ name: 'convention-crasher-probe', version: '0.1.0' }, { capabilities: {} });
    const transport = kind === 'http'
        ? new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } })
        : new SSEClientTransport(new URL(url), { requestInit: { headers }, eventSourceInit: { headers } });
    await client.connect(transport);
    return client;
}

let client = null;
for (const kind of ['http', 'sse']) {
    try {
        client = await tryConnect(kind);
        console.log(`✓ Connected via ${kind === 'http' ? 'Streamable HTTP' : 'SSE'}.\n`);
        break;
    } catch (e) {
        console.log(`✗ ${kind} transport failed: ${e?.message || e}`);
    }
}
if (!client) { console.error('\nCould not connect to the MCP server. Check the URL/port/path and tailnet reachability.'); process.exit(1); }

try {
    const { tools } = await client.listTools();
    console.log(`${tools.length} tool(s):\n`);
    for (const t of tools) {
        console.log(`• ${t.name}`);
        if (t.description) console.log(`    ${String(t.description).split('\n')[0].slice(0, 140)}`);
        const props = t.inputSchema?.properties ? Object.keys(t.inputSchema.properties) : [];
        if (props.length) console.log(`    params: ${props.join(', ')}`);
    }
} finally {
    await client.close();
}
