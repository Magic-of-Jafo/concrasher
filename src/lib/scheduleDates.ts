import { formatInTimeZone } from 'date-fns-tz';

/**
 * Schedule dates are stored as date-only values anchored at **UTC midnight**
 * (`startDate`), and event times are **relative wall-clock** minutes
 * (`dayOffset` + `startTimeMinutes`) representing the convention's local time.
 *
 * Computing day labels with local-timezone date math (e.g. date-fns `addDays` +
 * `format`) rolls the date backward on any machine/server behind UTC — that's
 * the "Friday Sep 4 shows as Thursday Sep 3" bug. These helpers do all day math
 * on UTC calendar components so the result is identical everywhere.
 *
 * (True per-viewer timezone conversion is a separate, deferred workstream; under
 * the current relative model the stored times ARE the venue-local clock.)
 */

/** UTC-midnight Date for (convention start date + dayOffset), drift-free. */
export function conventionDayDate(start: Date | string, dayOffset: number): Date {
    const d = new Date(start);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + dayOffset));
}

/** Format a convention day's calendar date (always in UTC). */
export function formatConventionDay(start: Date | string, dayOffset: number, pattern: string): string {
    return formatInTimeZone(conventionDayDate(start, dayOffset), 'UTC', pattern);
}
