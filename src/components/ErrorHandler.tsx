'use client';

import { useEffect } from 'react';
import { useNotification } from './NotificationContext';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

export function ErrorHandler() {
  const { showNotification } = useNotification();
  const pathname = usePathname();
  const searchParams = useSearchParams()!;
  const router = useRouter();

  useEffect(() => {
    // Check for error message in URL parameters
    const errorMessage = searchParams.get('error');
    if (errorMessage) {
      showNotification(errorMessage, 'error');
      // Remove error from URL after showing notification
      const params = new URLSearchParams(searchParams.toString());
      params.delete('error');
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
    }
  }, [pathname, searchParams, showNotification, router]);

  return null;
} 