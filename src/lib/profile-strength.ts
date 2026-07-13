/**
 * Profile Strength — a computed (never stored) 0–100 completeness score with a
 * tier label and an actionable checklist. Owner-only: shown in the editor to
 * motivate completion, never on the public page. Weights are deliberately
 * un-equal (a photo and bio matter; a website barely does). Gated actions check
 * concrete required fields, not the raw number, so the user always sees exactly
 * what's missing. See docs/profile-strength.md.
 */

export type StrengthTier = 'Getting started' | 'Coming together' | 'Strong' | 'Complete';

export interface StrengthItem {
    /** Stable key, also used to define gate requirements. */
    key: string;
    /** Human label for the checklist ("Add a profile photo"). */
    label: string;
    /** Contribution to the 0–100 score when done. */
    weight: number;
    done: boolean;
}

export interface ProfileStrength {
    score: number;              // 0–100, rounded
    tier: StrengthTier;
    items: StrengthItem[];      // every field, done or not
    missing: StrengthItem[];    // items not yet done (for the checklist), heaviest first
}

const BIO_MIN_CHARS = 40;

const visibleLen = (html?: string | null): number =>
    (html || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim().length;

const hasText = (s?: string | null): boolean => !!(s && s.trim().length > 0);
const isEmail = (s?: string | null): boolean => !!(s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()));
const isUrl = (s?: string | null): boolean => !!(s && /^https?:\/\/.+/i.test(s.trim()));
/** A real, non-default image (empty string and null both count as unset). */
const hasImage = (s?: string | null): boolean => hasText(s);

function tierFor(score: number): StrengthTier {
    if (score >= 90) return 'Complete';
    if (score >= 70) return 'Strong';
    if (score >= 40) return 'Coming together';
    return 'Getting started';
}

function assemble(items: StrengthItem[]): ProfileStrength {
    const score = Math.round(items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0));
    const missing = items.filter((i) => !i.done).sort((a, b) => b.weight - a.weight);
    return { score, tier: tierFor(score), items, missing };
}

// ---- Member (base) profile -------------------------------------------------

export interface MemberFields {
    image?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    stageName?: string | null;
    bio?: string | null;
    homeCity?: string | null;
    homeCountry?: string | null;
}

export function memberStrength(u: MemberFields): ProfileStrength {
    return assemble([
        { key: 'photo', label: 'Add a profile photo', weight: 35, done: hasImage(u.image) },
        { key: 'name', label: 'Add your name', weight: 20, done: (hasText(u.firstName) && hasText(u.lastName)) || hasText(u.stageName) },
        { key: 'bio', label: 'Write a short bio', weight: 30, done: visibleLen(u.bio) >= BIO_MIN_CHARS },
        // Home base powers "conventions near me"; needs at least a city and country.
        { key: 'location', label: 'Set your home base', weight: 15, done: hasText(u.homeCity) && hasText(u.homeCountry) },
    ]);
}

// ---- Talent profile --------------------------------------------------------

export interface TalentFields {
    displayName?: string | null;
    profilePictureUrl?: string | null;
    bio?: string | null;
    tagline?: string | null;
    skills?: string[] | null;
    /** Count of media items (photos / video links), or the array itself. */
    media?: unknown[] | number | null;
    contactEmail?: string | null;
    websiteUrl?: string | null;
}

const mediaCount = (m: TalentFields['media']): number =>
    typeof m === 'number' ? m : Array.isArray(m) ? m.length : 0;

export function talentStrength(t: TalentFields): ProfileStrength {
    return assemble([
        { key: 'displayName', label: 'Set your display name', weight: 15, done: hasText(t.displayName) },
        { key: 'photo', label: 'Add a profile photo', weight: 20, done: hasImage(t.profilePictureUrl) },
        { key: 'bio', label: 'Write a bio', weight: 20, done: visibleLen(t.bio) >= BIO_MIN_CHARS },
        { key: 'skills', label: 'List a lecture or skill', weight: 15, done: (t.skills?.length ?? 0) >= 1 },
        { key: 'tagline', label: 'Add a tagline', weight: 10, done: hasText(t.tagline) },
        { key: 'media', label: 'Add a photo or video', weight: 10, done: mediaCount(t.media) >= 1 },
        { key: 'contactEmail', label: 'Add a contact email', weight: 5, done: isEmail(t.contactEmail) },
        { key: 'website', label: 'Add your website', weight: 5, done: isUrl(t.websiteUrl) },
    ]);
}

// ---- Gates -----------------------------------------------------------------
// Gated actions check concrete required fields (transparent checklist), with the
// strength score shown alongside purely as encouragement.

/** Required to activate / apply as talent. */
export const TALENT_APPLY_REQUIREMENTS = ['photo', 'name', 'bio'] as const;
/** Required to publish a public, bookable talent page. */
export const TALENT_PUBLISH_REQUIREMENTS = ['displayName', 'photo', 'bio', 'skills'] as const;

export interface GateStatus {
    met: boolean;
    missing: StrengthItem[];
}

/** Given a computed strength and the keys an action requires, what's missing. */
export function gateStatus(strength: ProfileStrength, requiredKeys: readonly string[]): GateStatus {
    const required = new Set(requiredKeys);
    const missing = strength.items.filter((i) => required.has(i.key) && !i.done);
    return { met: missing.length === 0, missing };
}
