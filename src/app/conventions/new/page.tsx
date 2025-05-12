'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import ConventionForm from './ConventionForm';
import { Role } from '@prisma/client';

export default function NewConventionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      const userRoles = session?.user?.roles || [];
      const hasAccess = userRoles.includes(Role.ADMIN) || userRoles.includes(Role.ORGANIZER);
      if (!hasAccess) {
        router.push('/'); // Redirect users without access to home
      }
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const userRoles = session?.user?.roles || [];
  const hasAccess = userRoles.includes(Role.ADMIN) || userRoles.includes(Role.ORGANIZER);
  if (!hasAccess) {
    return null; // Will be redirected by useEffect
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Convention
        </Typography>
        <ConventionForm />
      </Box>
    </Container>
  );
} 