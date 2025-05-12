'use client';

import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session?.user?.roles?.includes(Role.ADMIN)) {
    redirect('/');
  }

  return <>{children}</>;
} 