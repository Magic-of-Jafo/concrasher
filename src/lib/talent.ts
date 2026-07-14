import prisma from '@/lib/prisma';

/**
 * Talent service — shared matching/create/claim primitives used by the agent
 * (scraping performers onto events), the editor autocomplete, and the
 * "claim your profile" flows.
 *
 * Talent identity: a TalentProfile can exist "unclaimed" (userId null) and be
 * claimed by a real user later. A person may be listed under a real name and a
 * stage name (e.g. "Carissa Hendrix" performing as "Lucy Darling"), so every
 * profile carries aliases, and matching runs over the normalized set of all of
 * them so any listed name resolves to the one person.
 */

/** Lowercase, strip diacritics + punctuation, collapse whitespace. */
export function normalizeName(name: string): string {
    return name
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')   // drop diacritic marks
        .toLowerCase()
        .replace(/['’.\-]/g, '')            // drop apostrophes, periods, hyphens
        .replace(/\s+/g, ' ')
        .trim();
}

/** Normalized, de-duped set of a person's display name + aliases (the match key). */
export function nameVariants(displayName: string, aliases: string[] = []): string[] {
    const all = [displayName, ...aliases].map(normalizeName).filter(Boolean);
    return Array.from(new Set(all));
}

export interface TalentSearchResult {
    id: string;
    displayName: string;
    aliases: string[];
    userId: string | null;
    claimedAt: Date | null;
    profilePictureUrl: string | null;
}

/** Fuzzy search by display name — powers autocomplete and agent matching. */
export async function searchTalent(query: string, limit = 10): Promise<TalentSearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    return prisma.talentProfile.findMany({
        where: { displayName: { contains: q, mode: 'insensitive' } },
        select: { id: true, displayName: true, aliases: true, userId: true, claimedAt: true, profilePictureUrl: true },
        orderBy: { displayName: 'asc' },
        take: limit,
    });
}

/** Match a name against ANY talent (claimed or unclaimed) via the normalized set. */
export async function findTalentByName(name: string): Promise<{ id: string; displayName: string } | null> {
    const n = normalizeName(name);
    if (!n) return null;
    return prisma.talentProfile.findFirst({
        where: { normalizedNames: { has: n } },
        select: { id: true, displayName: true },
    });
}

/**
 * Link one or more listed names to a single talent record: reuse an existing
 * match (claimed or unclaimed) — learning any new alias we just saw — or create
 * a new unclaimed profile. `displayName` is the primary; `aliases` are other
 * names the same person was listed under (e.g. a real name alongside a stage name).
 */
export async function findOrCreateUnclaimedTalent(
    displayName: string,
    aliases: string[] = [],
): Promise<{ id: string; displayName: string; created: boolean } | null> {
    const name = displayName.trim();
    if (!name) return null;
    const listed = [name, ...aliases.map(a => a.trim()).filter(Boolean)];

    for (const listedName of listed) {
        const hit = await prisma.talentProfile.findFirst({
            where: { normalizedNames: { has: normalizeName(listedName) } },
            select: { id: true, displayName: true, aliases: true },
        });
        if (!hit) continue;
        // Learn any names we saw that this profile doesn't already record.
        const knownNorm = new Set(nameVariants(hit.displayName, hit.aliases));
        const newAliases = listed.filter(a => normalizeName(a) !== normalizeName(hit.displayName) && !knownNorm.has(normalizeName(a)));
        if (newAliases.length) {
            const mergedAliases = Array.from(new Set([...hit.aliases, ...newAliases]));
            await prisma.talentProfile.update({
                where: { id: hit.id },
                data: { aliases: mergedAliases, normalizedNames: nameVariants(hit.displayName, mergedAliases) },
            });
        }
        return { id: hit.id, displayName: hit.displayName, created: false };
    }

    const created = await prisma.talentProfile.create({
        data: {
            displayName: name,
            aliases: aliases.map(a => a.trim()).filter(Boolean),
            normalizedNames: nameVariants(name, aliases),
            userId: null,
        },
        select: { id: true, displayName: true },
    });
    return { ...created, created: true };
}

export interface DetectedTalent {
    id: string;
    displayName: string;
    claimed: boolean;
    matchedName: string;  // the normalized name/alias that matched the text
    fuzzy: boolean;       // matched approximately (likely misspelling) vs exactly
}

/** Levenshtein edit distance (iterative, two-row). */
function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
        const cur = [i];
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        }
        prev = cur;
    }
    return prev[n];
}

/** How many edits we'll tolerate for a fuzzy name match, by name length. */
function fuzzyTolerance(len: number): number {
    if (len <= 6) return 1;   // short names: only tiny typos
    if (len <= 12) return 2;
    return 3;
}

/**
 * Find existing talent whose name (or any alias) appears in free text — used to
 * auto-suggest performers from an event title/description as the organizer types.
 *
 * Two passes, both bounded to names already in the DB (so effectively
 * zero-false-positive — non-person titles like "Dealer's Room" never hit):
 *   1. Exact: whole-word match over the normalized text.
 *   2. Fuzzy: for multi-word names only, slide a same-length token window over
 *      the text and accept small edit distances — catches misspellings like
 *      "John Shyrock" → "John Shryock". Flagged `fuzzy` so the UI can ask
 *      "did you mean…?" rather than silently asserting a match.
 *
 * Naive full scan of the talent table — fine at current scale; swap for a
 * token-prefix index if the table grows large.
 */
export async function detectTalentInText(text: string): Promise<DetectedTalent[]> {
    const norm = normalizeName(text);
    if (!norm) return [];
    const tokens = norm.split(' ').filter(Boolean);
    const haystack = ` ${norm} `;
    const all = await prisma.talentProfile.findMany({
        select: { id: true, displayName: true, userId: true, normalizedNames: true },
    });
    const out: DetectedTalent[] = [];
    for (const t of all) {
        const names = t.normalizedNames.length ? t.normalizedNames : [normalizeName(t.displayName)];

        const exact = names.find(n => n && haystack.includes(` ${n} `));
        if (exact) {
            out.push({ id: t.id, displayName: t.displayName, claimed: t.userId !== null, matchedName: exact, fuzzy: false });
            continue;
        }

        // Fuzzy pass — multi-word names only (single short words are too noisy).
        let best: { name: string; dist: number } | null = null;
        for (const n of names) {
            const words = n.split(' ').filter(Boolean);
            if (words.length < 2) continue;
            const tol = fuzzyTolerance(n.length);
            for (let i = 0; i + words.length <= tokens.length; i++) {
                const window = tokens.slice(i, i + words.length).join(' ');
                const d = levenshtein(window, n);
                if (d > 0 && d <= tol && (!best || d < best.dist)) best = { name: n, dist: d };
            }
        }
        if (best) {
            out.push({ id: t.id, displayName: t.displayName, claimed: t.userId !== null, matchedName: best.name, fuzzy: true });
        }
    }
    return out;
}

export interface ClaimCandidate {
    id: string;
    displayName: string;
    aliases: string[];
    profilePictureUrl: string | null;
    conventions: { convention: { name: string } }[];
    /** True when matched by approximate spelling — the UI should confirm ("is
     *  this you?") rather than assert. */
    fuzzy: boolean;
}

/**
 * Unclaimed profiles matching a person's name — for the "is this you?" nudge.
 *
 * Human-written schedules misspell names ("Michael Amar" for "Michael Ammar"),
 * so we match exactly first, then fuzzily (small whole-name edit distance).
 * Fuzzy hits are flagged so the claim UI confirms rather than asserts. Fuzziness
 * is safe *here* because a person confirms every claim; we deliberately do NOT
 * fuzzy-match in findOrCreateUnclaimedTalent (creation), where a wrong merge
 * would silently fuse two different people with no human in the loop.
 *
 * Naive full scan of unclaimed profiles — fine at current scale (hundreds);
 * swap for a token-prefix index if the table grows large.
 */
export async function findClaimCandidates(name: string, limit = 5): Promise<ClaimCandidate[]> {
    const n = normalizeName(name);
    if (!n) return [];
    const tol = Math.min(2, fuzzyTolerance(n.length));
    const unclaimed = await prisma.talentProfile.findMany({
        where: { userId: null },
        select: {
            id: true,
            displayName: true,
            aliases: true,
            profilePictureUrl: true,
            normalizedNames: true,
            conventions: { select: { convention: { select: { name: true } } }, take: 5 },
        },
    });
    return unclaimed
        .map((t) => {
            const names = t.normalizedNames.length ? t.normalizedNames : [normalizeName(t.displayName)];
            let dist = Infinity;
            for (const cand of names) {
                if (!cand) continue;
                const d = cand === n ? 0 : levenshtein(cand, n);
                if (d < dist) dist = d;
            }
            return { t, dist };
        })
        .filter((s) => s.dist <= tol)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, limit)
        .map(({ t, dist }) => ({
            id: t.id,
            displayName: t.displayName,
            aliases: t.aliases,
            profilePictureUrl: t.profilePictureUrl,
            conventions: t.conventions,
            fuzzy: dist > 0,
        }));
}

export interface EventPerformerInput {
    talentId?: string;   // existing talent picked from search
    name: string;        // display name (used to create/match when no talentId)
    role?: string | null;
}

/**
 * Replace an event's talent links with the given performers. New names are
 * matched/created as unclaimed talent; each linked person is also associated
 * with the convention. Used by the schedule-item save path and the agent.
 */
export async function setEventTalent(
    scheduleItemId: string,
    conventionId: string,
    performers: EventPerformerInput[],
): Promise<void> {
    await prisma.scheduleEventTalentLink.deleteMany({ where: { scheduleItemId } });
    let order = 0;
    for (const pf of performers) {
        const name = (pf.name || '').trim();
        let talentId = pf.talentId;
        if (!talentId) {
            if (!name) continue;
            const t = await findOrCreateUnclaimedTalent(name);
            if (!t) continue;
            talentId = t.id;
        }
        await prisma.scheduleEventTalentLink.create({
            data: { scheduleItemId, talentProfileId: talentId, role: pf.role || null, order: order++, nameAsListed: name || null },
        });
        await prisma.conventionTalent.upsert({
            where: { conventionId_talentProfileId: { conventionId, talentProfileId: talentId } },
            create: { conventionId, talentProfileId: talentId },
            update: {},
        });
    }
}

/**
 * Claim an unclaimed profile for a user. Guards: the user can't already own a
 * profile, and the target must still be unclaimed. After claiming, a scraped
 * misspelling in the display name is corrected toward the user's own name.
 */
export async function claimTalent(userId: string, talentId: string): Promise<{ ok: boolean; error?: string }> {
    const ownedByUser = await prisma.talentProfile.findUnique({ where: { userId }, select: { id: true } });
    if (ownedByUser) return { ok: false, error: 'You already have a talent profile.' };
    const talent = await prisma.talentProfile.findUnique({ where: { id: talentId }, select: { userId: true } });
    if (!talent) return { ok: false, error: 'Profile not found.' };
    if (talent.userId) return { ok: false, error: 'This profile has already been claimed.' };
    await prisma.talentProfile.update({ where: { id: talentId }, data: { userId, claimedAt: new Date() } });
    // Best-effort: a failure here must not undo a successful claim.
    try {
        await correctClaimedDisplayName(userId, talentId);
    } catch (e) {
        console.error('claimTalent: name correction failed (claim itself succeeded):', e);
    }
    return { ok: true };
}

/**
 * Scraped schedules misspell names ("Michael Amar"); the person claiming knows
 * their own spelling. If the claimed profile's display name is a NEAR-miss of a
 * name the user entered (the only way a fuzzy claim candidate surfaces), replace
 * it with the user's spelling and keep the old one as an alias so existing
 * schedule links and future re-scrapes of the misspelling still resolve here.
 *
 * Deliberately does nothing when the display name matches exactly, or when it's
 * far from every user name (a claim matched via alias — e.g. a stage name like
 * "Lucy Darling" claimed by "Carissa Hendrix" — must keep its stage name).
 */
async function correctClaimedDisplayName(userId: string, talentId: string): Promise<void> {
    const [user, talent] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { firstName: true, lastName: true, stageName: true },
        }),
        prisma.talentProfile.findUnique({
            where: { id: talentId },
            select: { displayName: true, aliases: true },
        }),
    ]);
    if (!user || !talent) return;

    const userNames = [
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
        (user.stageName || '').trim(),
    ].filter(Boolean);
    if (userNames.length === 0) return;

    const dispNorm = normalizeName(talent.displayName);
    if (!dispNorm) return;
    // Exact match (either name) — nothing to correct.
    if (userNames.some((n) => normalizeName(n) === dispNorm)) return;

    // Correct only when the display name is a small edit away from a user name.
    const tol = Math.min(2, fuzzyTolerance(dispNorm.length));
    let best: { name: string; dist: number } | null = null;
    for (const n of userNames) {
        const d = levenshtein(normalizeName(n), dispNorm);
        if (d <= tol && (!best || d < best.dist)) best = { name: n, dist: d };
    }
    if (!best) return;

    const mergedAliases = Array.from(new Set([...talent.aliases, talent.displayName]));
    await prisma.talentProfile.update({
        where: { id: talentId },
        data: {
            displayName: best.name,
            aliases: mergedAliases,
            normalizedNames: nameVariants(best.name, mergedAliases),
        },
    });
}
