import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import BrandCreateForm from '@/components/features/BrandCreateForm';
import { Role } from '@prisma/client';

interface BrandEditPageProps {
    params: {
        brandId: string;
    };
}

export default async function BrandEditPage({ params }: BrandEditPageProps) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/login');
    }

    const brand = await db.brand.findUnique({
        where: {
            id: params.brandId,
        },
    });

    if (!brand) {
        notFound();
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });

    const isOwner = brand.ownerId === session.user.id;
    const isAdmin = user?.roles.includes(Role.ADMIN) ?? false;

    if (!isOwner && !isAdmin) {
        redirect('/unauthorized');
    }

    return (
        <BrandCreateForm initialData={brand} />
    );
} 