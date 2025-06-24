'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';

const OrganizerApplicationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  experience: z.string().min(20, 'Please describe your experience in at least 20 characters'),
});

type OrganizerApplicationInputs = z.infer<typeof OrganizerApplicationSchema>;

export default function OrganizerApplicationPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizerApplicationInputs>({
    resolver: zodResolver(OrganizerApplicationSchema),
  });

  const onSubmit = async (data: OrganizerApplicationInputs) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/organizer/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit application');
      }

      // Redirect to profile page on success
      router.push('/profile');
    } catch (err) {
      console.error('Application submission failed:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <Container maxWidth="sm">
        <Alert severity="warning" sx={{ mt: 4 }}>
          Please sign in to apply for organizer status.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography component="h1" variant="h4" gutterBottom>
          Apply to Become an Organizer
        </Typography>
        <Typography variant="body1" paragraph>
          Please fill out the form below to apply for organizer status. We'll review your application and get back to you soon.
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Full Name"
            autoComplete="name"
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            id="bio"
            label="Bio"
            multiline
            rows={4}
            {...register('bio')}
            error={!!errors.bio}
            helperText={errors.bio?.message}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            id="experience"
            label="Event Organization Experience"
            multiline
            rows={6}
            {...register('experience')}
            error={!!errors.experience}
            helperText={errors.experience?.message}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
} 