'use client';

import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AdminGuardProps {
  children: React.ReactNode;
  redirectUrl?: string;
}

export default function AdminGuard({ children, redirectUrl = '/' }: AdminGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || !session?.user?.roles?.includes(Role.ADMIN)) {
      router.push(redirectUrl);
    }
  }, [session, status, router, redirectUrl]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated' || !session?.user?.roles?.includes(Role.ADMIN)) {
    return null; // Don't render anything while redirecting
  }

  return <>{children}</>;
} 