'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DatePicker } from '@mui/x-date-pickers';
import { ConventionType } from '@prisma/client';
import ConventionSeriesSelector from '@/components/ConventionSeriesSelector';

const conventionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startDate: z.date(),
  endDate: z.date(),
  city: z.string().min(1, 'City is required'),
  stateAbbreviation: z.string().optional(),
  stateName: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  venueName: z.string().optional(),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  type: z.nativeEnum(ConventionType),
  seriesId: z.string().min(1, 'Series is required'),
});

type ConventionFormData = z.infer<typeof conventionSchema>;

export default function NewConventionPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ConventionFormData>({
    resolver: zodResolver(conventionSchema),
    defaultValues: {
      type: ConventionType.GENERAL,
    },
  });

  const handleSeriesSelect = (seriesId: string | null) => {
    setValue('seriesId', seriesId || '');
  };

  const handleNewSeriesCreate = async (series: any) => {
    try {
      const response = await fetch('/api/organizer/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(series),
      });

      if (!response.ok) {
        throw new Error('Failed to create series');
      }

      const data = await response.json();
      setValue('seriesId', data.series.id);
    } catch (error) {
      console.error('Error creating series:', error);
      setError('Failed to create series');
    }
  };

  const onSubmit = async (data: ConventionFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/organizer/conventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create convention');
      }

      const result = await response.json();
      router.push(`/organizer/conventions/${result.convention.id}`);
    } catch (error) {
      console.error('Error creating convention:', error);
      setError('Failed to create convention');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Convention
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <ConventionSeriesSelector
            onSeriesSelect={handleSeriesSelect}
            onNewSeriesCreate={handleNewSeriesCreate}
          />

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Convention Name"
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Start Date"
                onChange={(date) => setValue('startDate', date as Date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.startDate,
                    helperText: errors.startDate?.message,
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="End Date"
                onChange={(date) => setValue('endDate', date as Date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.endDate,
                    helperText: errors.endDate?.message,
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                {...register('city')}
                error={!!errors.city}
                helperText={errors.city?.message}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State/Province"
                {...register('stateName')}
                error={!!errors.stateName}
                helperText={errors.stateName?.message}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Country"
                {...register('country')}
                error={!!errors.country}
                helperText={errors.country?.message}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Venue Name"
                {...register('venueName')}
                error={!!errors.venueName}
                helperText={errors.venueName?.message}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                {...register('description')}
                multiline
                rows={4}
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Website URL"
                {...register('websiteUrl')}
                error={!!errors.websiteUrl}
                helperText={errors.websiteUrl?.message}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Convention Type"
                {...register('type')}
                error={!!errors.type}
                helperText={errors.type?.message}
              >
                {Object.values(ConventionType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Convention'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
} 