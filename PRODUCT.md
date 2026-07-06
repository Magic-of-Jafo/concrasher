# Product

## Register

brand

*(Default. The public, attendee-facing surfaces — homepage, convention detail pages, talent/brand directories — are the shop window: design sells attendance. Organizer-facing tools — the convention editor, listing wizard, dashboards, admin — are worked in the product register: clarity and efficiency over drama.)*

## Users

- **Attendees / Hobbyists** — performance-magic enthusiasts worldwide discovering conventions to attend. They arrive curious and leave (we hope) registered. Context: browsing on desktop and phone, comparing events, checking dates/prices/hotels. Job to be done: "find my next convention and feel confident booking it."
- **Organizers** — individuals or small clubs running conventions, often non-technical volunteers. Job: publish and maintain a rich, accurate listing with minimal effort. The platform's helpers (schedule, pricing, venue/hotel, basic-info importers) exist so they paste a link instead of retyping their website.
- **Talent** (performers/lecturers) — want a professional profile and visibility to organizers.
- **Brands** (magic shops, manufacturers, publishers) — want presence and association with events.
- **Admin** — platform oversight, moderation, role approvals.

## Product Purpose

ConventionCrasher is the central home for the worldwide performance-magic convention community. It fixes two problems at once: attendees can't discover conventions (information is fragmented across dozens of terrible websites), and organizers lack decent tools to present their events. Success looks like: every magic convention on Earth listed richly and accurately, attendees registering because the listing sold them, and organizers maintaining their listing in minutes, not evenings.

## Brand Personality

**Exciting, inviting, global.**

The interface should feel like an invitation to something special — the anticipation of a live show, the warmth of a community gathering, and a genuinely international scope (events from Columbus to Busan get equal dignity). Voice: enthusiastic but credible; a knowledgeable friend who's been to a hundred conventions, not a hype machine.

## Anti-references

- **Typical magic-convention registration websites.** They are the antithesis of good UI — dated layouts, walls of centered text, clashing colors, tiny photos, buried registration links, PayPal-button energy. ConventionCrasher must look and feel like it comes from a different decade than the sites it aggregates. When in doubt, ask "would a magic con's webmaster have done this?" — if yes, don't.
- Generic corporate-SaaS gray minimalism (the opposite failure: sterile and uninviting).

## Design Principles

1. **The listing is the sales pitch.** Public pages are never neutral information displays — they persuade. Price anchoring, clear calls to action, urgency where honest (booking cutoffs, "happening now"), and imagery that makes you want to be in the room.
2. **Raise the bar, visibly.** Every surface should make the community's existing websites look ten years older. Polish is a feature attendees and organizers can feel.
3. **Effortless for organizers.** Never make an organizer retype what their website already says. Import, review, apply. Complexity lives in our code, not their workflow.
4. **Local-first, global feel.** A 60-person regional gathering gets the same visual dignity as a 2,000-person international convention. Currencies, time zones, and languages are first-class, not afterthoughts.
5. **Excitement without kitsch.** Theatrical energy comes from craft — motion, contrast, anticipation — never from clip-art wands, top hats, or "magical" fonts.

## Homepage Doctrine

The front page has one mission: **activate the next generation of attendees.** Live-event attendance in the magic community has declined since just before COVID, especially among younger magicians. The homepage's job is to make a first-time convention-goer think *"this is something I could actually do — and it looks fun,"* and to start investigating a nearby convention they could attend.

1. **Useful before signup — always.** A visitor is using the site the moment they land: no walls, no gates, no account needed for core discovery. Signup is motivated later by added value (alerts, localized search, connecting with other attendees), never required up front.
2. **Hero = logo + one call-to-action + the next three conventions chronologically.** Immediate utility above the fold, on every device including mobile.
3. **First-timer first.** Copy, imagery, and structure speak to someone who has never attended a convention: exciting and inviting, never insider-gated. Once they attend their first, they'll attend more — the page's real conversion is the *first attendance*, not the click.

## Accessibility & Inclusion

- **WCAG 2.2 Level AA — mandatory** (documented in docs/ui-ux.md with detailed requirements).
- Full keyboard accessibility everywhere, including the tabbed convention editor and any drag-and-drop (which must have keyboard equivalents).
- 4.5:1 contrast minimum for text, 3:1 for large text and UI components; visible focus states; semantic HTML; correct ARIA on dynamic widgets.
- Touch targets ≥ 44×44 CSS px. Respect reduced-motion preferences.
- International audience: layouts must tolerate translated/longer strings and non-USD currencies.
