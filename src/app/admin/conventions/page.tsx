import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Metadata } from 'next';
import AdminConventionsTable, { AdminConventionRow } from '@/components/admin/AdminConventionsTable';

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

    const [rows, featuredSetting] = await Promise.all([
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
    ]);

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
        <AdminConventionsTable
            rows={serialized}
            initialFeaturedIds={(featuredSetting?.value || '').split(',').map((s) => s.trim()).filter(Boolean)}
        />
    );
}
