# Feature Update Notes

Running notes on planned improvements and design directions for the convention
listing helpers and related features. Newest first.

---

## Helper robustness for JavaScript‑rendered sites

### Problem
The Schedule / Basic‑Info / Pricing helpers read a source by fetching the page
server‑side and stripping it to text (plus any `<img>` images as a vision
fallback). This fails on **client‑rendered** sites — Wix, Squarespace, Eventbrite,
OvationTix — where the server returns an almost‑empty HTML shell and all content
(text *and* images) is injected by JavaScript in the browser.

Concrete example: `poesmagic.com` (Wix) returns ~600 KB of HTML that is 99.99%
`<script>`. After stripping scripts there are **~5 characters** of real text and
**zero `<img>` tags**, so the helper has nothing to read and returns
"Couldn't read that source."

**Current behaviour / workaround:** detect the empty shell and tell the organizer
to screenshot the page and use the **Image** option (paste or upload), which runs
the screenshot through the vision model. This works and is the reliable, universal
fallback — but it's manual.

### Options to make it more automatic (rough order of effort)

1. **Clearer guidance — _shipped_.** Detect the empty‑shell case and explain it's a
   JavaScript page, point to the Image/paste option. Zero infra.

2. **Parse embedded structured data / JSON‑LD — _cheap, high value, recommended next_.**
   Many SPA sites still embed server‑side JSON for SEO inside the HTML we already
   fetch: `<script type="application/ld+json">` (schema.org `Event` with
   `offers`/`price`), Open Graph tags, or framework warm‑up blobs (Wix
   `wixWarmupData`, Next `__NEXT_DATA__`). Before falling back to images on a
   "no readable text" page, pull these blocks out and feed them to the extractor.
   No browser required; catches a large share of event/ticketing pages. Start with
   JSON‑LD `Event`/`Offer` — it's a standard we already care about (see
   `docs/dynamic-event-structured-data.md`). Wire it into `gatherFromUrl` in
   `src/lib/scheduleScraper.ts` so HTML → (text ∥ JSON‑LD ∥ images).

3. **Headless render → screenshot → vision — _robust, more ops_.** Load the URL in a
   real headless browser, let the JS run, then screenshot the rendered page and run
   it through the existing image/vision extractor (no fragile DOM parsing — reuse
   the image pipeline). Handles essentially any site.
   - Don't self‑host Chromium on the Render starter plan (memory + cold‑start pain).
     Use a hosted rendering API — Browserless, ScrapingBee, Browserbase, Cloudflare
     Browser Rendering, or Apify — that returns a PNG and/or the rendered HTML. Pay
     per render; cap usage and gate it behind admin/feature‑flag.
   - Bonus: the rendered HTML can also feed the text extractor for long,
     multi‑section schedules a single screenshot would truncate.

4. **Per‑platform data APIs — _avoid_.** Wix / OvationTix / Eventbrite each expose
   JSON APIs, but reverse‑engineering and maintaining a scraper per platform is
   brittle and doesn't scale. Skip unless one platform clearly dominates inbound
   conventions.

### Recommendation
Keep Image/paste as the always‑works path. Next cheap win is **option 2**
(JSON‑LD / embedded structured data) inside `gatherFromUrl`. Reserve **option 3**
(hosted render) for when self‑service coverage needs to be near‑universal — and
pick a rendering API rather than self‑hosting Chromium.
