# Schedule Timeline — Track B Rewrite (deferred)

> **Status:** NOT STARTED. This is a design/scoping doc to be picked up as a single
> focused effort (ideally at the start of a fresh usage window — it touches the most
> complex component in the app and will be temporarily destabilizing mid-flight).
>
> Track A (low-risk polish: centralized taxonomy, console-log cleanup, init gating on
> both dates, left-list tooltip) is done separately and does **not** depend on this.

## 1. Why

The schedule editor's graphical timeline is a **hand-rolled** drag/resize surface built
on raw `mousedown`/`window.mousemove`/`window.mouseup` math. It works on desktop with a
mouse, but it has three structural problems:

1. **No accessibility.** BMad **epic3, Story 3.2 AC6** explicitly required WCAG 2.2 AA
   with *full keyboard alternatives* for every drag operation. The current grid has no
   keyboard interaction and no ARIA. This is a hard regression from the accepted spec.
2. **No touch support.** It listens to `mouse*` events only (not `pointer*`/touch), so
   it is effectively unusable on tablets and phones.
3. **Bespoke geometry math.** All snapping, overlap-column layout, resize-edge detection,
   and out-of-bounds clamping are custom. It's brittle and hard to extend (e.g. the
   5-hour window, cross-midnight events).

## 2. Current implementation (what exists today)

- **Files**
  - `src/components/organizer/convention-editor/ScheduleTimelineGrid.tsx` — the grid (≈800 lines). Owns drag/resize/scroll/layout.
  - `src/components/organizer/convention-editor/ScheduleTab.tsx` — host: left "All Events" list, day navigation, init gating, drag-to-place wiring, save orchestration.
  - `src/components/organizer/convention-editor/ScheduleEventForm.tsx` — the add/edit dialog (title, type, description, **Talent**, duration, venue, fees).
  - `src/lib/actions.ts` — server actions: `getScheduleItemsByConvention`, `createScheduleItem`, `updateScheduleItem`, `deleteScheduleItem`, `bulkCreateScheduleItems`, `initializeScheduleDays`, `deleteScheduleDay`.
  - `src/lib/eventTypes.ts` — centralized taxonomy + colors (added in Track A; reuse it).
  - API: `src/app/api/conventions/[id]/schedule-items/route.ts` (+ `[itemId]/route.ts`), `.../schedule-days/route.ts`.

- **Data model (KEEP AS-IS — do not change):** events are stored with **relative**
  time: `dayOffset` (int, day 0 = convention start), `startTimeMinutes` (0–1439),
  `durationMinutes` (0 = milestone). Absolute time is computed at render from
  `convention.startDate + dayOffset`. This relative model is an explicit product
  decision; the rewrite must preserve it.

- **Interaction model today**
  - Left list cards are HTML5-draggable; dropping on the grid calls
    `onAssignExistingEvent(eventId, dayOffset, startTimeMinutes, durationMinutes, title)`.
  - On a placed card: drag body = move; top/bottom 8px edges = resize; click = edit.
    A `dragOrResizeJustFinishedRef` flag disambiguates click-vs-drag.
  - `onUnscheduleEvent(eventId)` returns a card to the unplaced pool.
  - Grid shows a **5-hour window** (`VISIBLE_WINDOW_HOURS = 5`, 15-min rows at 30px) with
    up/down "nudge" buttons that change `viewStartHour`.
  - `calculateLayout()` packs overlapping events into side-by-side columns.
  - Milestones (duration 0) render as a one-row flagged bar; cannot be resized.

- **Persistence:** `updateScheduleItem`/`createScheduleItem` persist scalar fields + fee
  tiers + talent links. `ScheduleTab.handleSaveEvent` re-fetches the schedule after each
  save (authoritative refresh). The placed-events "Save Timeline" path bulk-persists
  `dayOffset`/`startTimeMinutes`/`durationMinutes`.

## 3. Goals of the rewrite

1. **Keyboard-operable** (WCAG 2.2 AA): move/resize/place/unplace via keyboard, with a
   "move to time/day" affordance and live ARIA announcements. Close the AC6 gap.
2. **Pointer + touch** support (works on tablet).
3. **Library-backed DnD** to delete most of the bespoke math: **`@dnd-kit`**
   (`@dnd-kit/core` + `@dnd-kit/accessibility`; sortable not strictly needed since we use
   free placement on a time grid). dnd-kit gives Pointer/Touch/Keyboard sensors,
   collision detection, and a screen-reader announcer out of the box.
4. **Rework the viewport:** replace the 5-hour nudge window with either (a) a scrollable
   full-day column with sticky hour labels, or (b) a fit-to-content range
   (earliest→latest event ± padding). Decide during step 0 below.
5. **Cross-midnight handling:** decide whether late-night events (e.g. 11:30pm–12:30am)
   are clamped to 23:59 or allowed to visually continue into the next day lane.
6. **No data-model change**, no API change required (the same
   `onAssignExistingEvent`-shaped callback can be preserved).

## 4. Proposed architecture

- Keep `ScheduleTab` as the host (left list + day nav + save orchestration). Most of the
  rewrite is inside `ScheduleTimelineGrid` and the left-list draggable cards.
- **dnd-kit setup:** one `DndContext` (likely lifted into `ScheduleTab` so a card can be
  dragged from the list *into* the grid). Sensors: `PointerSensor`, `TouchSensor`,
  `KeyboardSensor` (with a custom coordinate-getter that steps in 15-min / 1-day
  increments). Use `DragOverlay` for the drag preview.
- **Droppable:** the grid is a droppable keyed by `dayOffset`; on drop, convert pointer Y
  → minutes (reuse the px↔minute helpers) and call the existing assign callback.
- **Resize:** dnd-kit handles *move*, not *resize*. Keep a small dedicated resize
  interaction for the top/bottom edges (pointer events + a keyboard handler when the card
  is focused: e.g. `Shift+Arrow` grows/shrinks duration by 15 min). This is the one piece
  that stays partly custom — scope it carefully.
- **Keyboard model (proposed):** Tab to focus a card → Arrow Up/Down moves start time by
  15 min, Arrow Left/Right moves day, `Shift+Arrow Up/Down` changes duration, `Enter`
  opens the editor, `Delete` unplaces. Announce every change via dnd-kit's
  `announcements` API.
- **Layout:** the overlap→column packer (`calculateLayout`) is solid and library-agnostic;
  **keep it**.

## 5. Suggested step order (each independently shippable)

0. **Spike/decide (no prod code):** confirm `@dnd-kit`, decide viewport model (scroll vs
   fit), decide cross-midnight policy. ~½ day.
1. **Extract pure helpers** from `ScheduleTimelineGrid` into a `timeline/geometry.ts`
   (minutes↔px, snapping, layout, bounds). Unit-test them. No behavior change.
2. **Introduce `DndContext` + sensors**; reimplement **drag-to-place from the list** and
   **move within the grid** via dnd-kit. Remove the corresponding `window` mouse listeners.
3. **Reimplement resize** with pointer events + keyboard (`Shift+Arrow`).
4. **Add keyboard navigation + ARIA announcements**; verify with a screen reader.
5. **Viewport rework** (scroll or fit-to-content) + cross-midnight handling.
6. **Touch QA** on a real tablet; **a11y QA** against WCAG 2.2 AA (the epic3 AC6 checklist).

## 6. Risks / why this destabilizes things

- It's the single most stateful component; mid-rewrite, drag/resize/place can all be
  half-broken at once. Land it on a branch, keep steps individually revertable.
- The click-vs-drag disambiguation (`dragOrResizeJustFinishedRef`) and the assign/unassign
  callbacks are load-bearing for save — regressions here look like "events won't place"
  or "edits open on drag." Test the save round-trip after every step.
- The 5-hour-window assumptions are baked into several px calculations; the viewport
  rework (step 5) ripples through `renderEventCards`/placeholder math.

## 7. Acceptance criteria (revives epic3 AC5/AC6 + new)

- AC: All place/move/resize/unplace operations are fully **keyboard**-operable, with
  visible focus and screen-reader announcements (WCAG 2.2 AA).
- AC: Drag/move/resize work via **touch** on a tablet.
- AC: Mouse behavior is at parity with today (snap to 15 min, overlap columns, milestones,
  click-to-edit, drag-from-list-to-place, unplace).
- AC: Save round-trip unaffected — placed times persist and reload correctly (this is the
  regression that bit us before; the load path now includes `talentLinks` + `feeTiers`).
- AC: No data-model or API changes.

## 8. Out of scope for Track B (tracked elsewhere)

- The **"Thursday Sept 3" off-by-one** day label is a **timezone display** bug
  (`startDate` stored at UTC midnight, `format()`-ed in a behind-UTC locale), part of the
  separate tz-aware-display workstream — not the DnD rewrite.
- Talent tagging UI, AI performer extraction, and public @-link rendering are their own
  phases.
