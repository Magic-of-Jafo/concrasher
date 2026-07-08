---
name: ConventionCrasher
description: The central home for the worldwide performance-magic convention community.
colors:
  blue-wash-deep: "#01264b"
  blue-wash: "#1a365d"
  gold-spot: "#ffd700"
  gold-spot-warm: "#ffed4e"
  house-cream: "#f5f5dc"
  deal-green: "#0F6E56"
  deal-green-tint: "#E1F5EE"
  live-green: "#2E7D32"
  countdown-blue: "#004d7a"
  ink: "#212121"
  paper: "#ffffff"
  major-crimson: "#B3122E"
  major-cobalt: "#1D4ED8"
  major-violet: "#6D28D9"
  major-emerald: "#047857"
  night-bg: "#000000"
  night-ink: "#e3e3e3"
  night-muted: "#b4b8bf"
  night-soft: "#82868f"
  night-gold: "#c69749"
  night-gold-ink: "#191307"
  night-slate: "#a9b4d6"
  night-panel-base: "#282a3a"
  night-bronze: "#735f32"
  night-live: "#7fe0a0"
  day-bg: "#f1f6f5"
  day-ink: "#101443"
  day-muted: "#3a4663"
  day-soft: "#67748f"
  day-teal: "#2e6b6e"
  day-navy: "#294669"
  day-teal-border: "#478b8d"
  day-live: "#0a7a43"
  surface-gray: "#f5f5f5"
  border-gray: "#e0e0e0"
  legacy-mui-blue: "#1976d2"
typography:
  display:
    fontFamily: "Montserrat, system-ui, arial, sans-serif"
    fontSize: "clamp(2rem, 4vw + 1rem, 4rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "Montserrat, system-ui, arial, sans-serif"
    fontSize: "clamp(1.5rem, 2vw + 0.75rem, 2rem)"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Montserrat, system-ui, arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Inter, system-ui, arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-cta:
    backgroundColor: "{colors.gold-spot}"
    textColor: "{colors.blue-wash}"
    rounded: "{rounded.pill}"
    padding: "12px 48px"
  button-cta-hover:
    backgroundColor: "{colors.gold-spot-warm}"
    textColor: "{colors.blue-wash}"
  card-convention:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "16px"
  chip-deal:
    backgroundColor: "{colors.deal-green-tint}"
    textColor: "{colors.deal-green}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  chip-tag:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.blue-wash-deep}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: ConventionCrasher

## 1. Overview

**Creative North Star: "House Lights Down"**

The moment before the show starts. The auditorium is washed in deep blue, the audience settles, and a single warm spotlight is about to hit the stage. That is the emotional register of every public ConventionCrasher surface: anticipation, not noise. The Blue Wash carries the atmosphere; the Gold Spot is rare and always aimed at exactly one thing — the action we most want a visitor to take. This system sells attendance the way a good theater sells a show: by making you feel the room before you're in it.

The system explicitly rejects its category's defaults. Per PRODUCT.md, the anti-reference is the **typical magic-convention registration website** — dated layouts, walls of centered text, clashing colors, buried registration links. The opposite failure, **generic corporate-SaaS gray minimalism**, is equally banned. Excitement comes from craft — contrast, motion, anticipation — never from clip-art wands, top hats, or "magical" fonts.

**Transitional status (read this before generating anything).** The currently shipped implementation is a **placeholder**, not the standard. What is *normative* in this document: the color tokens (Blue Wash, Gold Spot, and the semantic accents), the typography direction, the Named Rules, and the Do's and Don'ts. What is *descriptive only*: the current component treatments in Section 5, recorded so agents understand what exists today. A full redesign is planned; extend the normative core, do not propagate placeholder patterns (MUI-default blue, doubled border-plus-shadow cards, unloaded font references).

**Key Characteristics:**
- Two rooms, one theater: public surfaces are the auditorium (Blue Wash, theatrical, persuasive); organizer/admin tools are the production office (light, calm, efficient).
- Gold is a spotlight, not a paint bucket — one gold moment per screen.
- Confident showmanship: bold weights, saturated CTAs, generous padding; the interface sells with a straight face.
- Global dignity: a 60-person regional gathering gets the same visual treatment as a 2,000-person international convention.
- WCAG 2.2 AA is mandatory: 4.5:1 body text, 3:1 large text and UI components, 44×44px touch targets, visible focus, reduced-motion alternatives.

## 2. Colors

A dark theatrical wash with a single precious accent: deep stage-light blue, hit by warm gold.

### Primary
- **Blue Wash Deep** (#01264b): The house at its darkest. Header/navigation background today; the anchor of the auditorium atmosphere in the redesign. White text and Gold Spot both sit safely on it.
- **Blue Wash** (#1a365d): The lifted stage-light blue. Hero overlays (used at 70% opacity over video), large atmospheric surfaces, and as the text color on gold CTAs.

### Secondary
- **Gold Spot** (#ffd700): The spotlight. Reserved for the single most important action or moment on a screen — the registration CTA, the "See All" button, a hovered link on navy. Text on gold is always Blue Wash, never white (fails contrast).
- **Gold Spot Warm** (#ffed4e): Hover/active state of Gold Spot only. Never appears at rest.

### Tertiary
- **Deal Green** (#0F6E56) on **Deal Green Tint** (#E1F5EE): the "Save $X" chip in pricing tables — the price-anchoring accent. Money-saved messaging only.
- **Live Green** (#2E7D32): "Happening Now!" urgency signals. Honest urgency only (a convention literally in progress), per PRODUCT.md.
- **Countdown Blue** (#004d7a): the days-until number in countdown displays.

### Neutral
- **Ink** (#212121): primary text on light surfaces (rendered today as rgba(0,0,0,0.87) via MUI).
- **Paper** (#ffffff): card and content surfaces in the light "production office" room.
- **House Cream** (#f5f5dc): display text on Blue Wash only (the hero headline). Never a background; never body text.
- **Surface Gray** (#f5f5f5) / **Border Gray** (#e0e0e0): quiet fills and hairlines in organizer tooling.
- **Legacy MUI Blue** (#1976d2): the untouched Material-UI default `primary.main`, still inherited by chips, links, and buttons. **Placeholder. Prohibited in new work**; it is the single biggest reason the site currently reads two-brained. The redesign retires it in favor of Blue Wash roles.

### House Lights (the 2026-07 front-page system — normative for the new homepage)
The redesigned front page ("the Anchor layout") runs on its own two-theme palette, defined as CSS variables (`--cc-*`) in globals.css and toggled by the **House Lights** switch (`data-theme` on `<html>`; dark is default). Chosen 2026-07-07 from a seven-palette bake-off:
- **Dark ("house lights down") = Midnight Gold.** True black #000000, slate ink #e3e3e3 (deliberately cool, replacing the source palette's warm cream), gold #c69749 carrying kickers, countdowns, AND the CTA (ink #191307), slate-blue #a9b4d6 as the secondary accent (links/section heads), panels from #282a3a, bronze #735f32 in the field gradient, live green #7fe0a0. Gold glows on dark.
- **Light ("house lights up") = Abyss daylight.** Pale teal-white #f1f6f5, deep indigo ink #101443, teal #2e6b6e (primary accent) + navy #294669 (secondary + CTA bg with #f1f6f5 ink), teal borders from #478b8d, live green #0a7a43. Glows retired.
Low-alpha tints of these hues (panels, hairlines, gradient fields) are tonal ramps of this system. Headers Montserrat, body Open Sans (interim, user-chosen). **Buttons are rectangles (4-8px radius), never pills** (see Do's and Don'ts). The old Electric Night violet was the runner-up and lives only in the dev PaletteTester for reference.

### Named Rules
**The Gold Spot Rule.** Gold is the spotlight: it hits one thing per screen, and that thing is the action we most want taken. Two gold elements on one screen means neither is the spotlight. Never use gold decoratively.

**The Two Rooms Rule.** Public, attendee-facing surfaces live in the auditorium: Blue Wash atmosphere, theatrical contrast, persuasive energy. Organizer, admin, and editor surfaces live in the production office: Paper backgrounds, Ink text, calm density. Never theatrical chrome on a form; never gray-SaaS minimalism on a listing.

## 3. Typography

**Display Font:** Montserrat (with system-ui, Arial fallback) — weights 400, 700, 800
**Body Font:** Inter (with system-ui, Arial fallback)
**Mono Font:** Roboto Mono (loaded; currently unused in UI)

**Character:** A confident geometric announcer (Montserrat 800) over a clear, neutral house voice (Inter). The pairing is the emcee and the program notes: one projects, one informs.

### Hierarchy
- **Display** (800, clamp(2rem, 4vw + 1rem, 4rem), 1.1): Hero headlines only. On Blue Wash, set in House Cream or white.
- **Headline** (700, clamp(1.5rem, 2vw + 0.75rem, 2rem), 1.2): Page titles and major section headings.
- **Title** (700, 1.25rem, 1.4): Card titles (convention names), sub-section headings.
- **Body** (400, 1rem, 1.6): All running copy. Max line length 65–75ch.
- **Label** (600, 0.875rem, 1.4): Metadata, chips, countdown labels, table headers.

### Named Rules
**The Loaded Font Rule.** Only fonts registered via `next/font` in [src/app/layout.tsx](src/app/layout.tsx) may be referenced in styles — currently Inter, Montserrat (400/700/800), and Roboto Mono. The current code references Poppins, Open Sans, and Montserrat 900 in `sx` props; **none of these are loaded** and all silently fall back to system fonts. Fix on sight: replace with Montserrat/Inter at a loaded weight. Never introduce a font reference without loading it.

## 4. Elevation

Elevation doctrine is **deliberately unsettled** pending the planned redesign; the current treatments are placeholder MUI defaults plus one custom card shadow, and they should not be extended as if they were doctrine. The North Star points the redesign toward **depth as light**: in a darkened house, hierarchy comes from what the light touches — tonal lift and glow on dark surfaces, soft ambient shadow on light ones — not from stacking gray drop shadows.

### Shadow Vocabulary (current, descriptive only)
- **Card rest** (`box-shadow: 0px 6px 21px -7px rgba(0, 0, 0, 0.25)`): ConventionCard at rest — currently doubled with a 2px border, a placeholder pattern; the redesign picks one depth cue, not both.
- **Card hover** (`box-shadow: 0px 8px 25px -5px rgba(0, 0, 0, 0.35)`): hover deepening on interactive cards.
- **MUI defaults** (`theme.shadows[1..2]`): sidebar widgets and pricing tables.

### Named Rules
**The One Cue Rule.** A surface signals depth with a border *or* a shadow, never both. (The current card violates this; do not copy it.)

## 5. Components

> Section 5 records what exists today. Per the Overview, these are **transitional** — understand them, match them for small fixes, but do not treat them as the redesign target.

### Buttons
- **Shape:** Slightly rounded (4px, MUI default).
- **CTA (the Gold Spot):** Gold Spot background, Blue Wash text, bold weight (600+), generous padding (12px 48px). One per screen.
- **Hover / Focus:** background warms to Gold Spot Warm; focus must show a visible ring (currently MUI default).
- **Secondary:** white text buttons on navy (header), MUI text/outlined buttons elsewhere — currently inherit Legacy MUI Blue, which is prohibited in new work; use Blue Wash roles instead.

### Chips
- **Tag chips:** small, pill-shaped, outlined — currently Legacy MUI Blue (placeholder); redesign maps them to Blue Wash.
- **Deal chips:** Deal Green text on Deal Green Tint, weight 600, pill, 22px tall. The "Save $X" price-anchoring signal — keep this pattern; it is doing its sales job.

### Cards / Containers
- **Corner Style:** Gently rounded (12px).
- **Background:** Paper.
- **Shadow Strategy:** see Elevation — currently shadow + 2px border doubled (placeholder).
- **Internal Padding:** 16px.
- **Signature content pattern:** the ConventionCard — square image (120px desktop / 80px mobile), Montserrat-weight title, muted location/date lines, tag chips, and the countdown block ("IN / 14 / DAYS" with Countdown Blue numeral, or Live Green "Happening Now!"). The countdown is honest urgency and a keeper across the redesign.

### Inputs / Fields
- **Style:** MUI outlined text fields, Paper background, Border Gray strokes. Untouched Material defaults (placeholder).
- **Focus:** MUI default focus ring in Legacy MUI Blue — will follow the primary-color retirement.
- **Error:** MUI default red.

### Navigation
- **Style:** Blue Wash Deep app bar; logo left, text links right, white text.
- **Mobile:** hamburger to drawer, avatar shortcut when signed in.
- **States:** hover currently browser/MUI default; redesign gives links a Gold Spot hover treatment (see ConventionFeed's "Sign Up for Free" link for the existing precedent).

### Pricing Table (signature)
Dark header cells (near-black on the emphasized channel column), alternating row tints, and the *deal* price set larger and bolder (1.25rem bold vs 1.1rem/500) beside the Deal chip. This is PRODUCT.md's price-anchoring principle in component form — preserve the psychology even as the skin changes.

### Homepage signature elements (normative — the "House Lights Down" language made visible)
These are the brand's owned visual moves, introduced on the homepage and available to any public surface:

- **The Stage Scene.** The hero background is crafted stage light: a soft-edged beam (cream at ≤0.11 alpha) crossing diagonally behind the headline, a warm pool where it lands on the "stage floor," and a black-alpha vignette on the far side. All light is built from House Cream alphas — **never gold** (the Gold Spot Rule keeps gold for the CTA). A background video may later sit *under* the light overlays; the scene doubles as its fallback so the hero can never go flat.
- **Stage Tiles.** The imageless-convention placeholder is the same scene in miniature: Blue Wash gradient, one cream spotlight, monogram in cream. The spot's position and wash angle vary deterministically per convention name (5 stagings) so lists never render as identical tiles.
- **The Big Four Plaques.** The four marquee conventions (S.A.M., I.B.M., MAGIC Live, Blackpool) as Paper cards straddling the hero/island seam, each wearing engraved Victorian scrollwork (inline SVG acanthus tile) in its own hue at ~0.13 opacity — the antique-playing-card language with zero suit pips. Hues (AA-safe as kicker text on Paper): crimson #B3122E (S.A.M.), cobalt #1D4ED8 (I.B.M.), violet #6D28D9 (MAGIC Live), emerald #047857 (Blackpool). These hues belong to the plaques only; they are not general accents. Hover wakes the scrollwork (opacity ~0.22) and lifts the card. Cards bind to their next listed edition dynamically and degrade to a static descriptor when none is upcoming.
- *(Retired: the Magic Words Strip. Its slot above the closing beat is reserved for the planned organizer-curated event ticker.)*
- **Load choreography.** Hero content rises (`home-rise`: 14px translate + fade, 0.7s cubic-bezier(0.22,1,0.36,1), ~90ms stagger) while the light blooms (`home-bloom`, 1.6s). Keyframes live in globals.css; reduced-motion disables both. This is the page's one orchestrated moment — don't add scroll-reveals to every section.

## 6. Do's and Don'ts

### Do:
- **Do** aim the Gold Spot (#ffd700) at exactly one action per screen, with Blue Wash (#1a365d) text on it.
- **Do** keep the two rooms distinct: Blue Wash theater for attendees, Paper-and-Ink calm for organizers.
- **Do** preserve the sales psychology in components: deal prices bolder and larger than anchor prices, "Save $X" Deal chips, honest countdown urgency ("Happening Now!", "Starts Tomorrow").
- **Do** verify contrast at WCAG 2.2 AA every time: 4.5:1 body, 3:1 large text and UI components; 44×44px touch targets; visible focus states; reduced-motion alternatives for every animation.
- **Do** design for the world: layouts must tolerate longer translated strings, non-USD currencies, and any time zone without breaking.
- **Do** fix Loaded Font Rule violations on sight (Poppins, Open Sans, Montserrat 900 references → Montserrat/Inter at loaded weights).

### Don't:
- **Don't** build anything that could pass for a "typical magic-convention registration website" — dated layouts, walls of centered text, clashing colors, tiny photos, buried registration links, PayPal-button energy (PRODUCT.md's words). If a magic con's webmaster would have done it, don't.
- **Don't** drift into generic corporate-SaaS gray minimalism — the opposite failure: sterile and uninviting.
- **Don't** use clip-art wands, top hats, rabbits, sparkle trails, or "magical" display fonts. Theatrical energy comes from craft, not kitsch.
- **Don't** use Legacy MUI Blue (#1976d2) or the MUI default pink (#dc004e) in any new work. They are unconfigured factory defaults, not brand.
- **Don't** use gold on more than one element per screen, and never white text on gold.
- **Don't** ship the purple gradient (#667eea → #764ba2) currently on public profile banners into anything new — it is the stock AI-default gradient and is slated for replacement.
- **Don't** use `background-clip: text` gradient text, side-stripe borders (`border-left` > 1px as accent), decorative glassmorphism, or tiny uppercase tracked eyebrows above every section.
- **Don't** double a border with a shadow on the same surface (The One Cue Rule).
- **Don't** reference a font that isn't loaded via `next/font` (The Loaded Font Rule).
