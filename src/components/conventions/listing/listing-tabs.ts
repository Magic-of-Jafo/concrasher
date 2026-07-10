// Tab registry for the public convention listing ("True Tabs" structure).
// The route (server validation) and the shell (tab bar) both import from
// here so URL segments and tabs can never drift apart.
//
// Every tab has its own URL: /conventions/<slug> is About, and each other
// tab lives at /conventions/<slug>/<path> so anyone can deep-link straight
// to a listing's schedule, pricing, etc.

export type ListingTabKey =
    | 'about'
    | 'schedule'
    | 'pricing'
    | 'venue'
    | 'hotels'
    | 'dealers'
    | 'media';

export interface ListingTab {
    key: ListingTabKey;
    label: string;
    /** URL segment under the listing base; '' means the base URL itself. */
    path: string;
}

export const LISTING_TABS: ListingTab[] = [
    { key: 'about', label: 'About', path: '' },
    { key: 'schedule', label: 'Schedule', path: 'schedule' },
    { key: 'pricing', label: 'Pricing', path: 'pricing' },
    { key: 'venue', label: 'Venue', path: 'venue' },
    { key: 'hotels', label: 'Hotels', path: 'hotels' },
    { key: 'dealers', label: 'Dealers', path: 'dealers' },
    { key: 'media', label: 'Media', path: 'media' },
];

/** The tab key for a URL segment, or null if the segment isn't a tab. */
export function tabKeyForPath(path: string): ListingTabKey | null {
    const tab = LISTING_TABS.find((t) => t.path === path);
    return tab ? tab.key : null;
}
