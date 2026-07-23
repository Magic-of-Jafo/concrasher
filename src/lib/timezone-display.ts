// Presentation helpers for convention timezones. Schedule times are stored as
// venue-local clock times, so display never converts them; these helpers only
// (a) name the zone for the reader and (b) decide what "today" means.

/** Friendly zone name ("Eastern Time", "British Time") from an IANA id;
 *  falls back to the seeded row's display value, then the raw id. */
export function timezoneLabel(ianaId?: string | null, fallback?: string | null): string | null {
    if (!ianaId) return fallback || null;
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: ianaId,
            timeZoneName: 'longGeneric',
        }).formatToParts(new Date());
        return parts.find((p) => p.type === 'timeZoneName')?.value || fallback || ianaId;
    } catch {
        return fallback || ianaId;
    }
}

/** Today's calendar date as a UTC-midnight key — computed in the CONVENTION'S
 *  timezone when known (the schedule's "today" is the venue's day, for
 *  attendees and remote viewers alike), else the viewer's local date. */
export function todayKeyInZone(ianaId?: string | null): number {
    const now = new Date();
    if (ianaId) {
        try {
            // en-CA yields YYYY-MM-DD, easy to split.
            const ymd = new Intl.DateTimeFormat('en-CA', {
                timeZone: ianaId,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(now);
            const [y, m, d] = ymd.split('-').map(Number);
            if (y && m && d) return Date.UTC(y, m - 1, d);
        } catch {
            // Unknown zone id: fall through to viewer-local.
        }
    }
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}
