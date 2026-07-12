# Profile Strength

A computed 0–100 completeness score with a tier label and an actionable
checklist. Modeled on LinkedIn "Profile Strength" / Upwork completeness-gating.
Implemented in [`src/lib/profile-strength.ts`](../src/lib/profile-strength.ts).

## Principles

- **Owner-only.** Shown in the editor to motivate completion — never on the
  public profile (a visitor should never see "43% complete").
- **Computed, never stored.** Derived on read from current field values so it
  can't drift. Cache only if perf demands it later.
- **Weighted, not linear.** A photo and bio move the needle; a website barely
  does.
- **Gate on requirements, motivate with the score.** Gated actions check a
  concrete required-field checklist (transparent — the user sees exactly what's
  missing), with the strength % shown beside it as encouragement. No opaque
  threshold.
- **Actionable.** Every missing point links to the exact field to fill.

## Tiers

| Range | Label |
|---|---|
| 0–39 | Getting started |
| 40–69 | Coming together |
| 70–89 | Strong |
| 90–100 | Headliner |

Tier labels are a copy decision and the boundaries can shift without a data
change (score is computed).

## Weights

### Member (base) profile — everyone

| Field | Weight | Done when |
|---|---|---|
| Profile photo | 40 | a non-default image is set |
| Name | 25 | first + last, or a stage name |
| Bio | 35 | ≥ 40 chars of visible text |

### Talent profile — once talent

| Field | Weight | Done when |
|---|---|---|
| Display name | 15 | non-empty |
| Profile photo | 20 | non-default image |
| Bio | 20 | ≥ 40 visible chars |
| Lectures / skills | 15 | ≥ 1 entry |
| Tagline | 10 | non-empty |
| Media (photo/video) | 10 | ≥ 1 item |
| Contact email | 5 | valid email |
| Website | 5 | valid URL |

## Gated actions (required-field checklists)

| Action | Requires |
|---|---|
| Activate / apply as talent | photo · name · bio |
| Publish a public/bookable talent page | display name · photo · bio · ≥1 lecture/skill |

The button is disabled-with-reason until requirements are met; the tooltip lists
what's missing (same pattern as the "coming soon" greyed actions).

## Ties to the claim flow

The **"Is this you?" claim check** fires the moment a user enters their **name**
(it only needs the name; see `findClaimCandidates` in
[`src/lib/talent.ts`](../src/lib/talent.ts), which matches exactly then fuzzily
to catch schedule misspellings). Strength is the ongoing nudge to flesh out the
profile; the claim nudge is the one-time match. Completing photo · name · bio to
apply as talent is also exactly when the claim match becomes possible.
