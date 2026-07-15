import prisma from '@/lib/prisma';
import { ConventionStatus } from '@prisma/client';

/**
 * Dates are stored at UTC midnight of the calendar day, so `endDate < now`
 * would flip a convention to PAST at the START of its final day (and even
 * earlier for attendees west of UTC). The grace window waits until the whole
 * last day has ended in every timezone: 24h to reach the end of the last day
 * in UTC, plus 12h for UTC-12. Convention-local timezones can refine this
 * later; a daily sweep makes the extra hours invisible in practice.
 */
const GRACE_WINDOW_MS = 36 * 60 * 60 * 1000;

/**
 * Flip any PUBLISHED convention whose event has already finished to PAST.
 *
 * A convention counts as finished once its end date — or its start date, when
 * there is no end date — plus the grace window is behind `now`. Soft-deleted
 * conventions are left alone. Returns the number of conventions updated.
 *
 * This is the single source of truth for "expiring" conventions, shared by the
 * admin "Set Expired" action and the scheduled cron endpoint.
 */
export async function expirePastConventions(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - GRACE_WINDOW_MS);
    const [byEndDate, byStartDate] = await prisma.$transaction([
        prisma.convention.updateMany({
            where: {
                status: ConventionStatus.PUBLISHED,
                endDate: { lt: cutoff },
            },
            data: { status: ConventionStatus.PAST },
        }),
        prisma.convention.updateMany({
            where: {
                status: ConventionStatus.PUBLISHED,
                endDate: null,
                startDate: { lt: cutoff },
            },
            data: { status: ConventionStatus.PAST },
        }),
    ]);

    return byEndDate.count + byStartDate.count;
}
