'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Typography,
  CircularProgress,
  Box,
  Alert,
} from '@mui/material';
import { Convention } from '@prisma/client';
import ConventionForm from '@/components/ConventionForm';
import type { ConventionFormData } from '@/components/ConventionForm';

export default function EditConventionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  const [convention, setConvention] = useState<Convention | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && !session?.user?.roles?.includes('ORGANIZER') && !session?.user?.roles?.includes('ADMIN')) {
      router.push('/unauthorized');
      return;
    }

    const fetchConvention = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/organizer/conventions/${params.id}`);

        if (!response.ok) {
          let apiErrorMessage = 'Failed to fetch convention';
          try {
            const errorData = await response.json();
            if (errorData && errorData.error) {
              apiErrorMessage = errorData.error;
            }
          } catch (parseError) {
            if (response.status === 404) apiErrorMessage = 'Convention not found';
            else apiErrorMessage = `Failed to fetch convention. Status: ${response.status}`;
          }
          throw new Error(apiErrorMessage);
        }

        const data = await response.json();
        setConvention(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch convention');
      } finally {
        setIsLoading(false);
      }
    };

    if (status === 'authenticated' && !convention) {
      fetchConvention();
    }
  }, [status, router, session, params.id, convention]);

  const editConventionMutation = useMutation({
    mutationFn: async (data: ConventionFormData) => {
      const response = await fetch(`/api/organizer/conventions/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update convention');
      }
      return response.json();
    },
    onSuccess: (updatedConventionData) => {
      setConvention(updatedConventionData);
      setSuccessMessage('Convention updated successfully');
      queryClient.invalidateQueries({ queryKey: ['conventions', 'all'] });
      
      setTimeout(() => {
        router.push('/organizer/conventions');
      }, 1500);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to update convention');
    },
  });

  const handleSubmit = async (data: ConventionFormData) => {
    setError(null);
    setSuccessMessage(null);
    editConventionMutation.mutate(data);
  };

  if (status === 'loading' || isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error && !convention && !editConventionMutation.isPending) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}
      {editConventionMutation.error && (
         <Alert severity="error" sx={{ mb: 3 }}>
          {(editConventionMutation.error as Error).message}
        </Alert>
      )}
      
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Convention
        </Typography>

        <ConventionForm
          convention={convention}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/organizer/conventions')}
          isSubmitting={editConventionMutation.isPending}
          error={error && !convention ? error : null}
          mode="edit"
        />
      </Paper>
    </Container>
  );
} 