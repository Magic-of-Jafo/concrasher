// The four majors slots. Interim assignment: name matching against
// ConventionSeries (and convention names as fallback). The admin UI later
// replaces `match` with an explicit seriesId per slot; everything downstream
// (latest-edition resolution, image, countdown/TBD/cadence) stays the same.

export interface MajorSlot {
    key: string;
    /** The name everyone uses. */
    short: string;
    /** Sub line when no edition is known. */
    descriptor: string;
    /** Kicker when the most recent edition has already passed. */
    cadence: string;
    match: (name: string) => boolean;
}

export const MAJORS: MajorSlot[] = [
    {
        key: 'sam',
        short: 'S.A.M.',
        descriptor: 'Society of American Magicians',
        cadence: 'Every summer',
        // Dots or ALL-CAPS only, so "Sam" in an unrelated name can't match.
        match: (n) => /society of american/i.test(n) || /(^|[^A-Za-z])S\.?A\.?M\.(?![A-Za-z])/.test(n) || /\bSAM\b/.test(n),
    },
    {
        key: 'ibm',
        short: 'I.B.M.',
        descriptor: 'International Brotherhood of Magicians',
        cadence: 'Every summer',
        match: (n) => !/british ring/i.test(n) && (/international brotherhood/i.test(n) || /\bI\.?B\.?M\.?\b/.test(n)),
    },
    {
        key: 'magiclive',
        short: 'MAGIC Live',
        descriptor: 'Las Vegas, NV',
        cadence: 'Every August',
        match: (n) => /magic\s*live/i.test(n),
    },
    {
        key: 'blackpool',
        short: 'Blackpool',
        descriptor: "The world's biggest magic convention",
        cadence: 'Every February',
        match: (n) => /blackpool/i.test(n),
    },
];

export function isMajorName(name: string): boolean {
    return MAJORS.some((m) => m.match(name));
}
