// Shared types + region/budget helpers for the redesigned homepage.
// Design tokens follow DESIGN.md ("House Lights Down" / full-auditorium theme).

export interface HomeConvention {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  stateAbbreviation: string | null;
  stateName: string | null;
  country: string | null;
  startDate: string | null; // ISO
  endDate: string | null; // ISO
  imageUrl: string | null;
  descriptionShort: string | null;
  region: Region;
}

export type Region =
  | 'North America'
  | 'Europe'
  | 'Asia'
  | 'Oceania'
  | 'Latin America'
  | 'Other';

export const REGION_ORDER: Region[] = [
  'North America',
  'Europe',
  'Asia',
  'Oceania',
  'Latin America',
  'Other',
];

const COUNTRY_TO_REGION: Record<string, Region> = {
  'united states': 'North America',
  usa: 'North America',
  canada: 'North America',
  mexico: 'North America',
  'united kingdom': 'Europe',
  uk: 'Europe',
  england: 'Europe',
  scotland: 'Europe',
  wales: 'Europe',
  ireland: 'Europe',
  france: 'Europe',
  germany: 'Europe',
  austria: 'Europe',
  switzerland: 'Europe',
  italy: 'Europe',
  spain: 'Europe',
  portugal: 'Europe',
  netherlands: 'Europe',
  belgium: 'Europe',
  sweden: 'Europe',
  norway: 'Europe',
  denmark: 'Europe',
  finland: 'Europe',
  poland: 'Europe',
  'czech republic': 'Europe',
  hungary: 'Europe',
  greece: 'Europe',
  'south korea': 'Asia',
  korea: 'Asia',
  japan: 'Asia',
  china: 'Asia',
  taiwan: 'Asia',
  'hong kong': 'Asia',
  singapore: 'Asia',
  india: 'Asia',
  thailand: 'Asia',
  vietnam: 'Asia',
  malaysia: 'Asia',
  philippines: 'Asia',
  indonesia: 'Asia',
  israel: 'Asia',
  'united arab emirates': 'Asia',
  australia: 'Oceania',
  'new zealand': 'Oceania',
  peru: 'Latin America',
  brazil: 'Latin America',
  argentina: 'Latin America',
  chile: 'Latin America',
  colombia: 'Latin America',
  ecuador: 'Latin America',
  bolivia: 'Latin America',
  uruguay: 'Latin America',
  paraguay: 'Latin America',
  venezuela: 'Latin America',
  'costa rica': 'Latin America',
  panama: 'Latin America',
  guatemala: 'Latin America',
};

export function countryToRegion(country: string | null | undefined): Region {
  if (!country) return 'Other';
  return COUNTRY_TO_REGION[country.trim().toLowerCase()] ?? 'Other';
}

// ISO 3166-1 alpha-2 codes for the flag-icons package (class "fi fi-<code>").
const COUNTRY_TO_FLAG: Record<string, string> = {
  'united states': 'us',
  usa: 'us',
  canada: 'ca',
  mexico: 'mx',
  'united kingdom': 'gb',
  uk: 'gb',
  england: 'gb-eng',
  scotland: 'gb-sct',
  wales: 'gb-wls',
  ireland: 'ie',
  france: 'fr',
  germany: 'de',
  austria: 'at',
  switzerland: 'ch',
  italy: 'it',
  spain: 'es',
  portugal: 'pt',
  netherlands: 'nl',
  belgium: 'be',
  sweden: 'se',
  norway: 'no',
  denmark: 'dk',
  finland: 'fi',
  poland: 'pl',
  'czech republic': 'cz',
  hungary: 'hu',
  greece: 'gr',
  'south korea': 'kr',
  korea: 'kr',
  japan: 'jp',
  china: 'cn',
  taiwan: 'tw',
  'hong kong': 'hk',
  singapore: 'sg',
  india: 'in',
  thailand: 'th',
  vietnam: 'vn',
  malaysia: 'my',
  philippines: 'ph',
  indonesia: 'id',
  israel: 'il',
  'united arab emirates': 'ae',
  australia: 'au',
  'new zealand': 'nz',
  peru: 'pe',
  brazil: 'br',
  argentina: 'ar',
  chile: 'cl',
  colombia: 'co',
  ecuador: 'ec',
  bolivia: 'bo',
  uruguay: 'uy',
  paraguay: 'py',
  venezuela: 've',
  'costa rica': 'cr',
  panama: 'pa',
  guatemala: 'gt',
};

export function countryToFlagCode(country: string | null | undefined): string | null {
  if (!country) return null;
  return COUNTRY_TO_FLAG[country.trim().toLowerCase()] ?? null;
}

// --- "House Lights Down" tokens (see DESIGN.md) ---
export const HOUSE = {
  bg: '#01264b', // Blue Wash Deep — the auditorium
  surface: 'rgba(255, 255, 255, 0.06)', // lit card surface on the wash
  surfaceHover: 'rgba(255, 255, 255, 0.11)',
  border: 'rgba(255, 255, 255, 0.14)',
  borderHover: 'rgba(255, 255, 255, 0.30)',
  ink: '#ffffff',
  inkSecondary: 'rgba(255, 255, 255, 0.74)',
  inkFaint: 'rgba(255, 255, 255, 0.55)',
  gold: '#ffd700', // Gold Spot — one per screen
  goldWarm: '#ffed4e',
  navyOnGold: '#1a365d',
  cream: '#f5f5dc', // display text on the wash only
  liveGreen: '#7fe0a0', // "Happening now" lightened for dark-surface contrast
  dealGreenText: '#0F6E56',
  dealGreenBg: '#E1F5EE',
} as const;

// Light-island tokens: bridge + feed sections sit on Paper while the page
// chrome (hero, closing beat, footer) stays on the Blue Wash.
export const ISLAND = {
  bg: '#ffffff', // Paper
  ink: '#212121',
  inkSecondary: 'rgba(0, 0, 0, 0.66)',
  rail: 'rgba(26, 54, 93, 0.055)', // sidebar panel: Paper tinted toward Blue Wash
  border: '#e0e0e0',
  borderHover: '#1a365d',
  surfaceHover: 'rgba(26, 54, 93, 0.04)',
  countdown: '#004d7a', // Countdown Blue
  liveGreen: '#2E7D32', // Live Green on light surfaces
  navy: '#01264b',
} as const;

export const DISPLAY_FONT = 'var(--font-montserrat), system-ui, arial, sans-serif';
export const BODY_FONT = 'var(--font-inter), system-ui, arial, sans-serif';

// --- date helpers (UTC-stable so server and client agree) ---
export function formatDateRange(startIso: string | null, endIso: string | null): string {
  if (!startIso) return 'Dates TBD';
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const md = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const year = start.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'UTC' });
  if (!end || end.getTime() === start.getTime()) return `${md(start)}, ${year}`;
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();
  if (sameMonth) {
    const day = end.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' });
    return `${md(start)}–${day}, ${year}`;
  }
  return `${md(start)} – ${md(end)}, ${end.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'UTC' })}`;
}

export function monthKey(startIso: string): string {
  const d = new Date(startIso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export type Countdown =
  | { kind: 'happening'; text: string }
  | { kind: 'today'; text: string }
  | { kind: 'future'; text: string }
  | { kind: 'tbd'; text: string };

// Uses the visitor's local clock (same behavior as the previous card); callers
// must render the result with suppressHydrationWarning.
export function getCountdown(startIso: string | null, endIso: string | null): Countdown {
  if (!startIso) return { kind: 'tbd', text: 'Dates TBD' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startIso);
  start.setHours(0, 0, 0, 0);
  const end = endIso ? new Date(endIso) : new Date(startIso);
  end.setHours(0, 0, 0, 0);
  if (today >= start && today <= end) return { kind: 'happening', text: 'Happening now!' };
  const days = Math.ceil((start.getTime() - today.getTime()) / 86400000);
  if (days <= 0) return { kind: 'today', text: 'Starts today' };
  if (days === 1) return { kind: 'today', text: 'Starts tomorrow' };
  return { kind: 'future', text: `In ${days} days` };
}

export function formatLocation(c: HomeConvention): string {
  const isUS = countryToRegion(c.country) === 'North America' && /united states|usa/i.test(c.country || '');
  if (isUS) {
    return [c.city, c.stateAbbreviation || c.stateName].filter(Boolean).join(', ') || 'Location TBD';
  }
  return [c.city, c.country].filter(Boolean).join(', ') || 'Location TBD';
}
