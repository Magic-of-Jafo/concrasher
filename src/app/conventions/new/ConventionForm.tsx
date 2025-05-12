'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ConventionCreateSchema, type ConventionCreateInput } from '@/lib/validators';
import { ConventionStatus } from '@prisma/client';
import ImageUpload from '@/components/ImageUpload';

export default function ConventionForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isValid },
  } = useForm<Partial<ConventionCreateInput>>({
    resolver: zodResolver(ConventionCreateSchema),
    defaultValues: {
      name: '',
      startDate: new Date(),
      endDate: new Date(),
      city: '',
      state: '',
      country: '',
      venueName: '',
      description: '',
      websiteUrl: '',
      conventionSeriesId: undefined,
      status: ConventionStatus.DRAFT,
      bannerImageUrl: '',
      galleryImageUrls: [],
    },
    mode: 'onChange',
  });

  const onSubmit: SubmitHandler<Partial<ConventionCreateInput>> = async (data) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Defensive: ensure galleryImageUrls is always an array
      const safeData = {
        ...data,
        galleryImageUrls: Array.isArray(data.galleryImageUrls) ? data.galleryImageUrls : [],
      };

      // Debug: log form data
      console.log('Submitting convention form data:', safeData);

      // Ensure dates are properly formatted
      const formattedData = {
        ...safeData,
        startDate: safeData.startDate instanceof Date ? safeData.startDate.toISOString() : safeData.startDate,
        endDate: safeData.endDate instanceof Date ? safeData.endDate.toISOString() : safeData.endDate,
      };

      console.log('Formatted data for submission:', formattedData);

      const response = await fetch('/api/conventions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Server response error:', error);
        throw new Error(error.message || 'Failed to create convention');
      }

      const result = await response.json();
      console.log('Convention created successfully:', result);
      router.push(`/conventions/${result.id}`);
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add form validation debug logging
  console.log('Form state:', { isDirty, isValid, errors });

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit, (formErrors) => {
          console.error('Form validation errors:', formErrors);
          setError('Please fix the errors in the form and try again.');
        })}>
          <Grid container spacing={3}>
            {error && (
              <Grid item xs={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Convention Name"
                    fullWidth
                    required
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Start Date"
                      value={field.value}
                      onChange={field.onChange}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          error: !!errors.startDate,
                          helperText: errors.startDate?.message,
                        },
                      }}
                    />
                  </LocalizationProvider>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="End Date"
                      value={field.value}
                      onChange={field.onChange}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          error: !!errors.endDate,
                          helperText: errors.endDate?.message,
                        },
                      }}
                    />
                  </LocalizationProvider>
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="City"
                    fullWidth
                    required
                    error={!!errors.city}
                    helperText={errors.city?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="State"
                    fullWidth
                    required
                    error={!!errors.state}
                    helperText={errors.state?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Country"
                    fullWidth
                    required
                    error={!!errors.country}
                    helperText={errors.country?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="venueName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Venue Name"
                    fullWidth
                    error={!!errors.venueName}
                    helperText={errors.venueName?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    multiline
                    rows={4}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="websiteUrl"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Website URL"
                    fullWidth
                    error={!!errors.websiteUrl}
                    helperText={errors.websiteUrl?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Banner Image
              </Typography>
              <Controller
                name="bannerImageUrl"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    value={field.value || ''}
                    onChange={field.onChange}
                    onError={(msg) => setError(msg)}
                    helperText={errors.bannerImageUrl?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Gallery Images
              </Typography>
              <Controller
                name="galleryImageUrls"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    value={Array.isArray(field.value) ? field.value : []}
                    onChange={field.onChange}
                    multiple
                    onError={(msg) => setError(msg)}
                    helperText={errors.galleryImageUrls?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      {...field}
                      label="Status"
                      error={!!errors.status}
                    >
                      {Object.values(ConventionStatus).map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
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
                  disabled={isSubmitting || !isValid}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                >
                  {isSubmitting ? 'Creating...' : 'Create Convention'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
} 