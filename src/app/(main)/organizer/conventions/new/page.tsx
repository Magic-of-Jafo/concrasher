'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Container,
  Paper,
  Typography,
  CircularProgress,
  Box,
  Alert,
} from '@mui/material';
import ConventionForm from '@/components/ConventionForm';
import type { ConventionFormData } from '@/components/ConventionForm';

export default function NewConventionPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'loading') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
      }

  if (status === 'authenticated' && !session?.user?.roles?.includes('ORGANIZER')) {
    router.push('/unauthorized');
    return null;
    }

  const handleSubmit = async (data: ConventionFormData) => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch('/api/organizer/conventions/all-conventions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create convention');
      }

      const result = await response.json();
      router.push(`/organizer/conventions`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create convention');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Convention
        </Typography>

        <ConventionForm
          onSubmit={handleSubmit}
          onCancel={() => router.push('/organizer/conventions')}
          isSubmitting={isSaving}
          error={error}
          mode="create"
        />
      </Paper>
    </Container>
  );
} 