import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Metadata } from 'next';
import AdminConventionsTable, { AdminConventionRow } from '@/components/admin/AdminConventionsTable';
import AdminMajorsEditor, { MajorsSlotDraft } from '@/components/admin/AdminMajorsEditor';
import { readMajorsSlots } from '@/lib/majors';
import { MAJORS } from '@/components/frontpage/majors-config';

// The admin's convention manager: every convention on the site in one table —
// sortable, filterable, with View/Edit/Delete per row and the exclusive
// Featured pick for the front page. (The old "Manage All Conventions" button
// pointed at the ORGANIZER profile tab, which only looked complete because
// the admin happened to own every series.)

export const metadata: Metadata = { title: 'Manage Conventions | Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminConventionsPage() {
    const session = await getServerSession(authOptions);
    const roles: string[] = (session?.user as any)?.roles || [];
    if (!session?.user?.id || !roles.includes('ADMIN')) {
        redirect('/');
    }

    const [rows, featuredSetting, seriesList, savedSlots] = await Promise.all([
        db.convention.findMany({
            where: { deletedAt: null },
            orderBy: { startDate: 'asc' },
            select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                type: true,
                startDate: true,
                endDate: true,
                city: true,
                stateAbbreviation: true,
                stateName: true,
                country: true,
                isTBD: true,
            },
        }),
        db.siteSetting.findUnique({ where: { key: 'featured_convention_id' } }),
        db.conventionSeries.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        readMajorsSlots(),
    ]);

    // Seed the majors editor: the saved configuration, or (first visit) the
    // built-in default slots resolved against real series so the admin starts
    // from what the front page is actually showing today.
    const initialSlots: MajorsSlotDraft[] = savedSlots
        ?? MAJORS.map((slot) => ({
            id: slot.key,
            label: slot.short,
            seriesId: seriesList.find((s) => slot.match(s.name))?.id ?? '',
        }));

    const serialized: AdminConventionRow[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        status: r.status,
        type: r.type,
        startDate: r.startDate ? r.startDate.toISOString() : null,
        endDate: r.endDate ? r.endDate.toISOString() : null,
        city: r.city,
        stateAbbreviation: r.stateAbbreviation,
        stateName: r.stateName,
        country: r.country,
        isTBD: r.isTBD,
    }));

    return (
        <>
            <AdminMajorsEditor series={seriesList} initialSlots={initialSlots} />
            <AdminConventionsTable
                rows={serialized}
                initialFeaturedIds={(featuredSetting?.value || '').split(',').map((s) => s.trim()).filter(Boolean)}
            />
        </>
    );
}
