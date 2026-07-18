import { db } from '@/lib/db';

// The admin-curated front-page majors strip. One SiteSetting row holds an
// ORDERED list of slots (label + series); the front page renders however many
// exist. No setting saved = the hardcoded name-matching defaults in
// majors-config.ts keep working, so a fresh database needs no setup.

export const MAJORS_SETTING_KEY = 'majors_slots';
/** Layout sanity cap: the strip is one row on desktop. */
export const MAJORS_MAX_SLOTS = 6;

export interface MajorsSlotConfig {
    /** Stable client id for list editing/drag keys. */
    id: string;
    /** The big text on the card, admin-typed (e.g. "S.A.M."). */
    label: string;
    seriesId: string;
}

function isValidSlot(s: any): s is MajorsSlotConfig {
    return !!s && typeof s === 'object'
        && typeof s.id === 'string' && s.id.trim() !== ''
        && typeof s.label === 'string'
        && typeof s.seriesId === 'string' && s.seriesId.trim() !== '';
}

/** The admin's saved slots, in display order; null when never configured
 *  (callers fall back to the name-matching defaults). */
export async function readMajorsSlots(): Promise<MajorsSlotConfig[] | null> {
    try {
        const row = await db.siteSetting.findUnique({ where: { key: MAJORS_SETTING_KEY } });
        if (!row?.value) return null;
        const parsed = JSON.parse(row.value);
        if (!Array.isArray(parsed)) return null;
        const slots = parsed.filter(isValidSlot).slice(0, MAJORS_MAX_SLOTS);
        return slots.length ? slots : null;
    } catch {
        return null;
    }
}
