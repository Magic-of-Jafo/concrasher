'use client';

import AuthForm from '@/components/auth/AuthForm';
import { Suspense } from 'react';

// Use a loading component or null for Suspense fallback
function Loading() {
  return <div>Loading...</div>;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthForm initialTab="login" />
    </Suspense>
  );
} 