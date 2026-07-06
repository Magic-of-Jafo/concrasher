# Convention Listing Wizard — PRD

*Decided with Jafo 2026-07-01/02. This document is authoritative for the wizard build.*

## Goal

A guided, multi-step wizard that takes an organizer from "I have a convention website" to a published, richly-filled listing with as little typing as possible. It orchestrates the five existing import helpers (basic info, venue/hotel, pricing, schedule, festival shows) behind one flow.

## Core decisions (locked)

1. **Save as you go — aggressively.** A real DRAFT convention row is created the moment the organizer finishes the entry step. Every wizard step persists via the existing endpoints immediately on apply. Closing the browser loses nothing; the wizard is resumable per-convention.
2. **Series first.** "Create New Convention" opens the Convention Series picker/creator (this already exists at `/organizer/conventions/new`). Next → the wizard.
3. **Minimum to publish = series + name.** Dates are *encouraged* but optional: with no dates, the listing shows "TBD" on the front page (existing `isTBD` behavior — organizers already stack future years this way; acceptable for now).
4. **One-URL deep import is the core experience.** The wizard asks for the convention's main website URL, then discovers the sub-pages (schedule, pricing/registration, hotel/venue, talent) itself. Every section step arrives pre-seeded with its discovered URL. Only when discovery fails does the organizer paste a section URL manually.
5. **Each section re-runnable independently, forever.** If the convention website is incomplete today (e.g. talent not announced), the organizer returns later and runs just that section's import — either in the wizard or via the existing per-tab helper buttons, which remain.
6. **The tabbed editor remains** the post-creation editing surface. The wizard is the front door for creation.

## Flow

```
Create New Convention
  → Step 0  Series        pick existing / create new            (existing ConventionSeriesSelector)
  → Step 1  Name it        convention name (required) → creates DRAFT (isTBD, seriesId)
                           → redirect to /organizer/conventions/[id]/wizard
  → Step 2  Website        paste main URL → link discovery + basic-info import runs
                           → review extracted name/dates/location/descriptions → apply (autosaves)
  → Step 3  Images         cover + profile (paste/URL/file; existing uploaders)
  → Step 4  Venue & Hotel  pre-seeded URL → import → review → apply (autosaves)
  → Step 5  Pricing        pre-seeded URL → import → review → apply (already autosaves)
  → Step 6  Schedule       branches: CONVENTION → schedule helper · FESTIVAL → shows helper
  → Step 7  Review         completeness checklist → Publish (status → PUBLISHED)
```

Every step is skippable. A skipped step shows in the Step 7 checklist as "not filled — you can add this later from the editor."

## New machinery (the only genuinely new pieces)

- **`discoverSiteLinks(url)`** in the shared scraper core: fetch the main page (existing `gatherFromUrl`, including the BrowserOS fallback), collect anchor/nav links, classify into { schedule, pricing/registration, hotel/venue, talent } candidates — keyword heuristics first (`/schedule`, `/register`, `/hotel`, `/venue`, `/tickets`, `/artists`, `/performers`…), LLM tie-break only if ambiguous. Returns suggested URLs per section.
- **Wizard shell** at `/organizer/conventions/[id]/wizard`: MUI stepper, step state derived from what's already saved on the convention (so resume = just reopening the page), Next/Back/Skip, organizer-or-admin gated.
- **Entry step** on `/organizer/conventions/new`: after series selection, a minimal "name it" card replaces the jump into the full tabs editor; creates the DRAFT and forwards to the wizard.
- **Step wrappers** around the existing helper dialogs/flows, pre-seeding their URL inputs and auto-saving on apply (pricing already saves on accept; venue/hotel apply is followed by the tab-save call; basics apply is followed by the convention PUT).

## Explicitly reused (no rebuild)

- `ConventionSeriesSelector`, POST `/api/organizer/series`, POST `/api/organizer/conventions` (already sets DRAFT + isTBD), PUT `/api/organizer/conventions/[id]`.
- All five scrape routes + extractors in `scheduleScraper.ts` (with translation, image/vision, JS-shell + Cloudflare fallbacks).
- The helper dialogs (`BasicInfoHelperDialog`, `VenueHotelHelperDialog`, `PricingHelperDialog`, `AiScheduleDialog`, `FestivalHelperDialog`) — reused inside steps, seeded with discovered URLs.
- Image uploaders (paste/URL/file, server-side resize).
- `isTBD` → "Date TBD" front-page display.

## Build phases

- **W1 — Shell & entry:** name-it card on /new → create DRAFT → wizard route with stepper + working Publish step. (Shippable: a faster create-and-publish path even before imports.)
- **W2 — Website step:** URL intake, `discoverSiteLinks`, auto basic-info import + review/apply.
- **W3 — Venue/Hotel + Pricing steps** with seeded URLs and autosave on apply.
- **W4 — Images step + Schedule/Shows step** (type branch).
- **W5 — Review & Publish:** completeness checklist, publish flip, redirect to the live page.

## Later (parked)

- Auto-running every import in the background the moment the URL is entered ("zero-click" mode) — v1 keeps one review/apply click per section since extraction quality varies.
- Wizard-driven talent/dealers steps (no import helpers exist for those yet).
- Revisit "TBD stacking" if year-stacked dateless conventions become an eyesore.
