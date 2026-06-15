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

export interface ClaimCandidate {
    id: string;
    displayName: string;
    aliases: string[];
    profilePictureUrl: string | null;
    conventions: { convention: { name: string } }[];
}

/** Unclaimed profiles matching a person's name — for the "is this you?" nudge. */
export async function findClaimCandidates(name: string, limit = 5): Promise<ClaimCandidate[]> {
    const n = normalizeName(name);
    if (!n) return [];
    return prisma.talentProfile.findMany({
        where: { userId: null, normalizedNames: { has: n } },
        select: {
            id: true,
            displayName: true,
            aliases: true,
            profilePictureUrl: true,
            conventions: { select: { convention: { select: { name: true } } }, take: 5 },
        },
        take: limit,
    });
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
 * profile, and the target must still be unclaimed.
 */
export async function claimTalent(userId: string, talentId: string): Promise<{ ok: boolean; error?: string }> {
    const ownedByUser = await prisma.talentProfile.findUnique({ where: { userId }, select: { id: true } });
    if (ownedByUser) return { ok: false, error: 'You already have a talent profile.' };
    const talent = await prisma.talentProfile.findUnique({ where: { id: talentId }, select: { userId: true } });
    if (!talent) return { ok: false, error: 'Profile not found.' };
    if (talent.userId) return { ok: false, error: 'This profile has already been claimed.' };
    await prisma.talentProfile.update({ where: { id: talentId }, data: { userId, claimedAt: new Date() } });
    return { ok: true };
}
