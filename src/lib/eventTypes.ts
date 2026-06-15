// Single source of truth for the schedule event-type taxonomy + colors.
// Imported by the schedule editor (ScheduleTab, ScheduleEventForm) and the
// timeline grid so the dropdown options and card colors never drift apart.
//
// `eventType` is a free-text String column, so older records may carry legacy
// values (e.g. "Show", "Dealers", "Panel"). Those are kept out of the dropdown
// but still get a sensible color via LEGACY_COLOR_ALIASES, and the editor's
// Select adds the current value as a fallback option so nothing renders blank.

export interface EventTypeOption {
    value: string;
    color: string;
}

// The canonical, controlled taxonomy (offered in the editor dropdown).
export const EVENT_TYPES: EventTypeOption[] = [
    { value: 'Lecture', color: '#64b5f6' },          // blue 300
    { value: 'Workshop', color: '#81c784' },         // green 300
    { value: 'Stage/Gala Show', color: '#ba68c8' },  // purple 300
    { value: 'Close-up Show', color: '#9575cd' },    // deep purple 300
    { value: 'Competition', color: '#f06292' },      // pink 300
    { value: 'Dealer Hall', color: '#4db6ac' },      // teal 300
    { value: 'Registration', color: '#4dd0e1' },     // cyan 300
    { value: 'Meal/Banquet', color: '#ff8a65' },     // deep orange 300
    { value: 'Social/Party', color: '#f48fb1' },     // pink 200
    { value: 'Panel/Q&A', color: '#ffb74d' },        // orange 300
    { value: 'Screening', color: '#7986cb' },        // indigo 300
    { value: 'Auction', color: '#a1887f' },          // brown 300
    { value: 'Keynote', color: '#4fc3f7' },          // light blue 300
    { value: 'Awards', color: '#ffd54f' },           // amber 300
    { value: 'Kids/Youth', color: '#aed581' },       // light green 300
    { value: 'Jam Session', color: '#dce775' },      // lime 300
    { value: 'Tour/Excursion', color: '#80cbc4' },   // teal 200
    { value: 'Vendor Demo', color: '#9fa8da' },      // indigo 200
    { value: 'Other', color: '#90a4ae' },            // blue grey 300
];

export const DEFAULT_EVENT_COLOR = '#bdbdbd'; // grey 400

// Legacy values still present in older data → map to a current color.
const LEGACY_COLOR_ALIASES: Record<string, string> = {
    'Show': '#ba68c8',     // → Stage/Gala Show
    'Dealers': '#4db6ac',  // → Dealer Hall
    'Panel': '#ffb74d',    // → Panel/Q&A
};

const COLOR_BY_VALUE: Record<string, string> = {
    ...Object.fromEntries(EVENT_TYPES.map(t => [t.value, t.color])),
    ...LEGACY_COLOR_ALIASES,
};

/** Color for an event type, with legacy-alias support and a default fallback. */
export function getEventTypeColor(value?: string | null): string {
    if (!value) return DEFAULT_EVENT_COLOR;
    return COLOR_BY_VALUE[value] ?? DEFAULT_EVENT_COLOR;
}

/** True if the value is one of the canonical taxonomy options (in the dropdown). */
export function isCanonicalEventType(value?: string | null): boolean {
    return !!value && EVENT_TYPES.some(t => t.value === value);
}
