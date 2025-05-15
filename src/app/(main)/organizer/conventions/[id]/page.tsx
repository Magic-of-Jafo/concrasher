'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Container,
  Paper,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material';
import { Convention } from '@prisma/client';
import ConventionForm from '@/components/ConventionForm';
import type { ConventionFormData } from '@/components/ConventionForm';

export default function ConventionFormPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [convention, setConvention] = useState<Convention | null>(null);
  const [isLoading, setIsLoading] = useState(params.id !== 'new');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = params.id !== 'new';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && !session?.user?.roles?.includes('ORGANIZER')) {
      router.push('/');
      return;
    }

    if (isEditMode) {
      const fetchConvention = async () => {
        try {
          const response = await fetch(`/api/organizer/conventions/${params.id}`, {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Failed to fetch convention');
          }

          const data = await response.json();
          setConvention(data);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to fetch convention');
        } finally {
          setIsLoading(false);
        }
      };

      if (status === 'authenticated') {
        fetchConvention();
      }
    } else {
      // For new convention, we don't need to load anything
      setIsLoading(false);
    }
  }, [status, router, session?.user?.roles, params.id, isEditMode]);

  const handleSubmit = async (data: ConventionFormData) => {
    try {
      setIsSaving(true);
      setError(null);

      const url = isEditMode 
        ? `/api/organizer/conventions/${params.id}`
        : '/api/organizer/conventions';
      
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} convention`);
      }

      if (!isEditMode) {
        const result = await response.json();
        router.push(`/organizer/conventions/${result.convention.id}`);
      } else {
        router.push('/organizer/conventions');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} convention`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {isEditMode ? 'Edit Convention' : 'Create New Convention'}
        </Typography>

        <ConventionForm
          convention={convention}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/organizer/conventions')}
          isSubmitting={isSaving}
          error={error}
          mode={isEditMode ? 'edit' : 'create'}
        />
      </Paper>
    </Container>
  );
} 