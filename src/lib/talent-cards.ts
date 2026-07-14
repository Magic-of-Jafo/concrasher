/**
 * Talent-card image resolution — shared by the convention editor's Talent tab
 * and the public listing's Talent tab.
 *
 * The rule (decided 2026-07-14): the talent controls their own promotion.
 *   1. The card's chosen image, IF it is still one of the talent's current
 *      promo photos (the organizer picked among the talent's own images).
 *   2. Otherwise, the talent's FIRST promo photo. This line is the "talent
 *      takes over instantly" behavior: the moment a talent uploads a promo
 *      photo, any organizer-uploaded or stale image silently loses — no
 *      migration pass needed, because resolution happens at render time.
 *   3. An organizer-uploaded image (only reachable while the talent has no
 *      promo photos of their own).
 *   4. The talent's profile picture, as a last resort (a real face beats a
 *      blank card on a sales page).
 *   5. Nothing — the card renders a themed monogram.
 */

export type TalentCardImageSource = 'promo' | 'organizer' | 'profile' | 'none';

export interface ResolvedTalentCardImage {
    url: string | null;
    source: TalentCardImageSource;
}

export function resolveTalentCardImage(args: {
    /** ConventionTalent.imageUrl — the organizer's stored choice (may be stale). */
    chosenUrl: string | null;
    /** The talent's current PROMO_IMAGE urls, in the talent's own order. */
    promoUrls: string[];
    /** The talent's profile picture. */
    profilePictureUrl: string | null;
}): ResolvedTalentCardImage {
    const { chosenUrl, promoUrls, profilePictureUrl } = args;
    if (promoUrls.length > 0) {
        if (chosenUrl && promoUrls.includes(chosenUrl)) return { url: chosenUrl, source: 'promo' };
        return { url: promoUrls[0], source: 'promo' };
    }
    if (chosenUrl) return { url: chosenUrl, source: 'organizer' };
    if (profilePictureUrl) return { url: profilePictureUrl, source: 'profile' };
    return { url: null, source: 'none' };
}

/** Sort key for billing order: arranged cards first (by order), then unarranged by assignment time. */
export function billingSort<T extends { order: number | null; assignedAt: Date | string }>(rows: T[]): T[] {
    return [...rows].sort((a, b) => {
        if (a.order != null && b.order != null) return a.order - b.order;
        if (a.order != null) return -1;
        if (b.order != null) return 1;
        return new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime();
    });
}

/** Max promo photos a talent may upload. */
export const PROMO_PHOTO_LIMIT = 3;
