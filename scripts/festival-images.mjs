// Pull per-show poster images from a saved festival page (HTML or view-source)
// and set Production.coverImageUrl by matching show titles.
//
//   node scripts/festival-images.mjs --html "C:/path/to/page.html" [--slug <slug>] [--apply]
//
// NOTE: for production we'd re-host images on S3; this sets the source URLs
// directly (fine for local verification of the card display).

import { readFileSync } from 'fs';
const args = (() => { const a = process.argv.slice(2), o = {}; for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { const k = a[i].slice(2), n = a[i + 1]; if (n && !n.startsWith('--')) { o[k] = n; i++; } else o[k] = true; } } return o; })();
const APPLY = !!args.apply;
const SLUG = args.slug ?? 'melbourne-magic-festival-2026';
const HTML_PATH = args.html ?? 'C:/Users/magic/Desktop/view-source_https___melbournemagicfestival.com_daily-schedule-2026_.html';

if (!process.env.DATABASE_URL) {
    try { const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); const m = env.match(/^DATABASE_URL="?([^"\r\n]+)"?/m); if (m) process.env.DATABASE_URL = m[1]; } catch { }
}
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const norm = s => (s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’.\-:!?,()]/g, '').replace(/\s+/g, ' ').trim();

// reconstruct the real page HTML from a Chrome "view-source" save (or pass real HTML)
let raw = readFileSync(HTML_PATH, 'utf8');
if (raw.includes('class="line-content"') || raw.includes('class="html-tag"')) {
    raw = raw.replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

// each show card = a "gallery-item" div with an <img ... wp-post-image ... src> then <h3>Title</h3>
const titleToImg = new Map();
for (const seg of raw.split(/class="gallery-item/).slice(1)) {
    const card = seg.slice(0, 4000);
    const img = card.match(/src="(https?:\/\/[^"]+\/wp-content\/uploads\/[^"]+\.(?:jpe?g|png|webp))"/i);
    const h3 = card.match(/<h3>\s*([^<]+?)\s*<\/h3>/i);
    if (img && h3) {
        const key = norm(h3[1]);
        if (key && !titleToImg.has(key)) titleToImg.set(key, { title: h3[1].trim(), url: img[1] });
    }
}
console.log(`Parsed ${titleToImg.size} show→image pairs from the page.`);

const conv = await prisma.convention.findFirst({ where: { slug: SLUG }, select: { id: true } });
if (!conv) { console.error('Convention not found: ' + SLUG); process.exit(1); }
const prods = await prisma.production.findMany({ where: { conventionId: conv.id }, select: { id: true, title: true } });

// Fuzzy fallback for title-format differences (substring or strong token overlap).
const entries = Array.from(titleToImg.entries()).map(([key, v]) => ({ key, ...v, tokens: new Set(key.split(' ').filter(w => w.length > 2)) }));
function bestFuzzy(title) {
    const np = norm(title);
    if (np.length < 4) return null;
    const npTokens = new Set(np.split(' ').filter(w => w.length > 2));
    let best = null;
    for (const e of entries) {
        if (e.key.length < 5) continue;
        let score = (np.includes(e.key) || e.key.includes(np)) ? 0.9 : 0;
        const inter = [...npTokens].filter(w => e.tokens.has(w)).length;
        const uni = new Set([...npTokens, ...e.tokens]).size || 1;
        score = Math.max(score, inter / uni);
        if (!best || score > best.score) best = { score, v: e };
    }
    return best && best.score >= 0.6 ? best.v : null;
}

// Manual overrides for shows the page-match can't resolve (e.g. title "?", gala
// compilations) — supplied out-of-band. Matched by predicate on the title.
const MANUAL = [
    [t => t.trim() === '?', 'https://melbournemagicfestival.com/wp-content/uploads/2026/02/Danettv.jpg'],
    [t => /close.?up magic gala/i.test(t), 'https://melbournemagicfestival.com/wp-content/uploads/2026/04/CU-Gala.jpg'],
    [t => /stage magic gala/i.test(t), 'https://melbournemagicfestival.com/wp-content/uploads/2026/02/gala5.jpg'],
    [t => /mad hatter/i.test(t), 'https://melbournemagicfestival.com/wp-content/uploads/2026/02/mad.jpg'],
];
const manualUrl = title => { const m = MANUAL.find(([pred]) => pred(title)); return m ? { title, url: m[1] } : null; };

let matched = 0; const misses = [];
for (const p of prods) {
    const hit = titleToImg.get(norm(p.title)) || bestFuzzy(p.title) || manualUrl(p.title);
    if (hit) {
        matched++;
        if (APPLY) await prisma.production.update({ where: { id: p.id }, data: { coverImageUrl: hit.url } });
        else console.log(`  ✓ ${p.title}  →  ${hit.url.split('/').pop()}`);
    } else {
        misses.push(p.title);
    }
}
console.log(`\nMatched ${matched}/${prods.length} productions.${APPLY ? ' (coverImageUrl updated)' : ' (dry-run)'}`);
if (misses.length) console.log('Unmatched:', misses.join(' | '));
await prisma.$disconnect();
