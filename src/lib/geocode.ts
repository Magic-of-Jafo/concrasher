// City-level geocoding via Nominatim (OpenStreetMap). Free, no API key;
// usage policy asks for a descriptive User-Agent and at most 1 request/sec,
// which our volumes (one lookup on save, a paced backfill) respect easily.
// City-level precision is exactly right for "how far is this convention from
// home" — street accuracy would add nothing.

export interface GeocodeResult {
    latitude: number;
    longitude: number;
}

export interface GeocodablePlace {
    city?: string | null;
    state?: string | null;   // full name or abbreviation, best effort
    country?: string | null;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'ConventionCrasher/1.0 (https://conventioncrasher.com)';

/**
 * Resolve a city/state/country to coordinates, or null when nothing matches.
 * Never throws: geocoding is always a best-effort enrichment, and callers
 * treat null as "leave coordinates empty".
 */
export async function geocodePlace(place: GeocodablePlace): Promise<GeocodeResult | null> {
    const city = place.city?.trim();
    if (!city) return null; // a bare state/country centroid would mislead distance sorting

    // Free-form query beats the structured endpoint here: it tolerates state
    // abbreviations ("OH") and quirky country strings the way users type them.
    const q = [city, place.state?.trim(), place.country?.trim()].filter(Boolean).join(', ');

    try {
        const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const hit = Array.isArray(data) ? data[0] : null;
        const latitude = Number(hit?.lat);
        const longitude = Number(hit?.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        return { latitude, longitude };
    } catch {
        return null;
    }
}

/** Great-circle distance in kilometers (haversine). */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}
