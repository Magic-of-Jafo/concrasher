import prisma from '@/lib/prisma';
import { ConventionStatus } from '@prisma/client';

/**
 * Flip any PUBLISHED convention whose event has already finished to PAST.
 *
 * A convention counts as finished once its end date — or its start date, when
 * there is no end date — is before `now`. Soft-deleted conventions are left
 * alone. Returns the number of conventions updated.
 *
 * This is the single source of truth for "expiring" conventions, shared by the
 * admin "Set Expired" action and the scheduled cron endpoint.
 */
export async function expirePastConventions(now: Date = new Date()): Promise<number> {
    const [byEndDate, byStartDate] = await prisma.$transaction([
        prisma.convention.updateMany({
            where: {
                status: ConventionStatus.PUBLISHED,
                endDate: { lt: now },
            },
            data: { status: ConventionStatus.PAST },
        }),
        prisma.convention.updateMany({
            where: {
                status: ConventionStatus.PUBLISHED,
                endDate: null,
                startDate: { lt: now },
            },
            data: { status: ConventionStatus.PAST },
        }),
    ]);

    return byEndDate.count + byStartDate.count;
}
