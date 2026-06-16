# Mini-PRD: Festival Scheduling Mode

> **Status:** PROPOSED / not started. Reference doc for building festival support.
> Companion to the convention schedule + Schedule Helper already shipped.

## 1. Problem

A **convention** is a (mostly) linear schedule of one-off events at a single venue.
A **magic festival** (e.g. Melbourne Magic Festival) is a different shape:

- It's a **catalog of shows**; the *show* is the hero, not the timeslot.
- The **same show runs many times** across the week (e.g. "11 shows: 8.00pm, 30 June–11 July").
- Shows run **concurrently** and at **multiple venues across town** (each a real address).
- Browsing is **show-first** ("what do I want to see?"), then "when/where can I see it?".

Our current schedule UI (day tabs, one-off events) buries that. Festivals need a
show-centric model and display.

## 2. Core concept: Show → Performances (one-to-many)

Like a film/fringe festival: one **film** → many **screenings**.

- **Show** (a.k.a. Production): the thing a patron chooses. Title, performer/company,
  blurb, **cover image**, age rating / audience, price tiers, "full details/video" link.
- **Performance** (a showing): one Show at a specific **venue + day + time** (+ optional
  SOLD OUT). A Show has many.

We **reuse `ConventionScheduleItem` as the Performance** (it already has venue + day +
time + talent + description) and add a lightweight **Production** record that groups a
show's performances and holds the show-level metadata.

## 3. Mode toggle

`Convention.type: CONVENTION | FESTIVAL` (enum; default CONVENTION). Settable at creation
and switchable in the editor. The flag flips the editor flow and the default public view.
Everything else (talent, venues, the Schedule Helper, tz-safe dates) is shared.

## 4. Data model (proposed)

**Convention**
- `type ConventionType @default(CONVENTION)` — `CONVENTION | FESTIVAL`.

**New: `Production`** (the Show)
- `id`, `conventionId` (FK)
- `title`
- `tagline` — e.g. "Adult show for ages 15+", "Children's Show ages 3–12"
- `ageRating` — optional structured ("9+", "3-12", "15+") for filtering later
- `description` (blurb)
- `coverImageUrl`
- `detailsUrl` — "FULL DETAILS & VIDEO" link
- `priceTiers Json?` — per-show tiers (Adult/Concession/Child/Family/Group…); see §8
- `talentLinks` — reuse the talent system (the act/company) at the show level
- `order Int?`

**`ConventionScheduleItem`** (now doubles as a Performance)
- `+ productionId String?` (FK → Production; set for festival performances)
- `+ soldOut Boolean @default(false)`
- Already has: `venueId`, `dayOffset`, `startTimeMinutes`, `durationMinutes`, `locationName`,
  `description`, `talentLinks`.
- `coverImageUrl` lives on **Production** (one image per show, not repeated per performance).

**Venue** (already exists; lean into it for festivals)
- Venues become first-class: a managed list, each with address + map. A festival venue is
  often "Building – Room" (e.g. *Arrow on Swanston – The Houdini Theatre – 488 Swanston St*):
  model the building as the `Venue` (address) and the room as the performance `locationName`.

## 5. Organizer experience (editor, festival mode)

- Toggle the convention to **Festival**.
- Manage a list of **Venues** (name + address; map link).
- Manage **Shows**: title, tagline/age, blurb, cover image, details link, price tiers, talent.
- Add **Performances** to a show with a **"repeat" affordance** (pick venue + a set of
  day/time slots quickly, since one show runs many times).
- **Schedule Helper (festival mode)** does the heavy lifting (see §7).

## 6. Attendee experience (public, festival mode)

Default view = **Show Cards**; a toggle switches to **Timeline** (the existing day-tab view).

**Show Cards (masonry / tile grid)** — the hero view:
- Card (collapsed): cover image, title, tagline/age, **run summary** ("11 shows: 8.00pm,
  30 June–11 July"), Expand control.
- Card (expanded): blurb, full **list of performances** (date · time · venue, "SOLD OUT"
  where flagged), price tiers, a **"Full details"** link.
- **No per-show "Book Now"** in v1 — patrons use the convention's single ticketing/registration
  link (already on the convention). (Per-show booking deep-links = future.)
- Tapping the show opens its **Show page** (`/…/show/[id]`) with everything + a venue map.

**Timeline view** (toggle): the day tabs we built, listing performances by time, with a
**venue filter** (essential when venues are across town) and the type-coded rows. Each row
links back to its Show.

**Cross-cutting:** a **venue filter** and **day tabs** apply to both views.

## 7. Schedule Helper — festival mode

The scraper learns the show→performances grouping:
- **Group repeats:** the same show title appearing at many date/times becomes **one
  Production + N performances** (dedupe by normalized title).
- Per show, extract: title, tagline/age, blurb, **cover image** (page/og:image), details
  URL, price tiers; per performance: date, time, venue, sold-out.
- Venue mapping: resolve repeated venue strings to the festival's Venue list (create if new).
- **Bot-walled sites:** Melbourne's page is behind bot verification, so the URL fetch will
  fail — rely on the **paste / PDF** input paths for those (already supported).
- Preview groups by **show** (not by day) so the organizer verifies the catalog.

## 8. Pricing (per-show)

Festival pricing is **per show**, with many tiers (Adult/Concession/Child/Family/Group of
10+/20+, plus notes like "Discount Tuesday"). v1: store as a simple structured
`priceTiers Json` on the Production (label + amount rows) + an optional `priceNote`. Full
reuse of the convention pricing-tab model is **out of scope** for v1.

## 9. Reuse vs. new

- **Reuse:** schedule items (as performances), talent links + matching, tz-safe day/time
  helpers, the Schedule Helper pipeline, venues, the day-tab timeline component.
- **New:** `Production` table + `Convention.type`/`productionId`/`soldOut`/cover image;
  the masonry show-card view + show page; the card↔timeline toggle; venue filter; festival
  editor flow; festival grouping in the scraper.

## 10. Out of scope (v1) / deferred

- Per-show "Book Now" deep links and live ticket-inventory / SOLD OUT sync.
- Full per-show pricing-tab parity.
- Cross-festival talent pages aggregating a performer's shows.
- Map embeds (link out for v1).

## 11. Suggested phasing

1. **F1 — Schema:** `type`, `Production`, `productionId`, `soldOut`, cover image; migration.
2. **F2 — Public festival display:** masonry show cards (collapse/expand) + Show page +
   card↔timeline toggle + venue filter. (Attendee-facing value first.)
3. **F3 — Organizer editor:** festival toggle, Shows + performances (repeat) + venues.
4. **F4 — Schedule Helper festival mode:** group repeats into Shows; extract image/age/price/details.

## 12. Open decisions

- `Production` table vs. grouping schedule items by a `showKey` — **recommend the table**
  (clean home for cover image + show metadata; gives each show a stable page).
- Where cover image lives — **recommend Production** (one per show). User initially suggested
  the event row; confirm we're OK moving it to the show.
- Build order — recommend **F1 → F2** first (public show cards are the dazzle), editor + scraper after.
