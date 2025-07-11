// @ts-nocheck
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Alert,
  Grid,
  Typography,
  Paper,
  Divider,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Convention, ConventionStatus } from '@prisma/client';
import ConventionSeriesSelector from '@/components/ConventionSeriesSelector';
import EditIcon from '@mui/icons-material/Edit';

// Reverted schema: fields are required as per their actual data model state.
// Conditional requirement is handled by form logic (trigger validation).
const conventionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens and no spaces'),
  seriesId: z.string().min(1, 'Series is required'),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  stateAbbreviation: z.string().optional(),
  stateName: z.string().optional(),
  venueName: z.string().optional(),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  status: z.nativeEnum(ConventionStatus),
});

export type ConventionFormData = z.infer<typeof conventionSchema>;

interface ConventionFormProps {
  convention?: Convention | null;
  onSubmit: (data: ConventionFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  mode: 'create' | 'edit';
}

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-');
};

export default function ConventionForm({
  convention,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
  mode,
}: ConventionFormProps) {
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(mode === 'edit');
  const [isSeriesCommitted, setIsSeriesCommitted] = useState(mode === 'edit');
  const [populatedConventionId, setPopulatedConventionId] = useState<string | null>(null);
  const [isOneDayEvent, setIsOneDayEvent] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    trigger,
  } = useForm<ConventionFormData>({
    resolver: zodResolver(conventionSchema), // Use the reverted, stricter schema
    defaultValues: {
      status: ConventionStatus.DRAFT,
      // For create mode, other required fields will be set by user interaction or effects
      // For edit mode, useEffect below will populate them
      name: convention?.name || '',
      slug: convention?.slug || '',
      seriesId: convention?.seriesId || '',
      // Dates need to be Date objects or undefined for DatePicker
      startDate: convention?.startDate ? new Date(convention.startDate) : undefined,
      endDate: convention?.endDate ? new Date(convention.endDate) : undefined,
      city: convention?.city || '',
      country: convention?.country || '',
      // Optional fields
      stateAbbreviation: convention?.stateAbbreviation || '',
      stateName: convention?.stateName || '',
      venueName: convention?.venueName || '',
      description: convention?.description || '',
      websiteUrl: convention?.websiteUrl || '',
    },
  });

  const watchedSeriesId = watch('seriesId');
  console.log('[ConventionForm] Rendering - current watchedSeriesId:', watchedSeriesId); // Log on every render

  const watchedName = watch('name');
  const watchedSlug = watch('slug');

  useEffect(() => {
    if (mode === 'create' && watchedName && !isSlugManuallyEdited) {
      setValue('slug', generateSlug(watchedName), { shouldValidate: true });
    }

    // If name has an error and user is typing, re-validate name
    // Check errors.name directly without adding it to dependency array to avoid loop
    if (errors.name && watchedName) {
      trigger('name');
    }
    // If slug has an error and user is manually editing it, re-validate slug
    if (errors.slug && watchedSlug && isSlugManuallyEdited) {
      trigger('slug');
    }
  }, [watchedName, watchedSlug, mode, isSlugManuallyEdited, setValue, trigger]); // errors.name/slug removed from deps

  // Effect for initial population in EDIT mode
  useEffect(() => {
    if (mode === 'edit') {
      if (convention) {
        // Only populate if this specific convention.id has not been populated yet.
        if (convention.id !== populatedConventionId) {
          setValue('name', convention.name);
          setValue('slug', convention.slug);
          setIsSlugManuallyEdited(true); // Part of initial setup for edit
          setValue('seriesId', convention.seriesId);
          setIsSeriesCommitted(true);    // Part of initial setup for edit
          if (convention.startDate) setValue('startDate', new Date(convention.startDate));
          if (convention.endDate) setValue('endDate', new Date(convention.endDate));
          setValue('city', convention.city || '');
          setValue('country', convention.country || '');
          setValue('status', convention.status);
          setValue('description', convention.description || '');
          setValue('stateAbbreviation', convention.stateAbbreviation || '');
          setValue('stateName', convention.stateName || '');
          setValue('venueName', convention.venueName || '');
          setValue('websiteUrl', convention.websiteUrl || '');
          setPopulatedConventionId(convention.id); // Mark this convention ID as populated

          // Initialize isOneDayEvent toggle for edit mode
          if (convention.startDate && convention.endDate) {
            const start = new Date(convention.startDate);
            const end = new Date(convention.endDate);
            // Compare date parts only, ignoring time
            if (start.getFullYear() === end.getFullYear() &&
              start.getMonth() === end.getMonth() &&
              start.getDate() === end.getDate()) {
              setIsOneDayEvent(true);
            } else {
              setIsOneDayEvent(false);
            }
          } else {
            setIsOneDayEvent(false); // Default if no dates
          }
        }
      } else {
        // If convention prop becomes null (e.g. parent is unmounting or navigating away)
        // then we should clear the populatedConventionId to allow repopulation if a new convention is loaded.
        setPopulatedConventionId(null);
      }
    } else { // mode === 'create'
      // If mode switches to 'create', reset populatedConventionId so edit mode can repopulate if switched back
      // and form was previously populated for an edited convention.
      if (populatedConventionId) {
        setPopulatedConventionId(null);
      }
    }
  }, [convention, mode, setValue, populatedConventionId, setIsSlugManuallyEdited, setIsSeriesCommitted]);

  // Effect for CREATE mode - reacting to seriesId changes (e.g., clearing fields)
  useEffect(() => {
    if (mode === 'create') {
      setIsSeriesCommitted(!!watchedSeriesId);
      if (!watchedSeriesId) {
        setValue('name', '');
        setValue('slug', '');
        // @ts-ignore 
        setValue('startDate', undefined);
        // @ts-ignore 
        setValue('endDate', undefined);
        setValue('city', '');
        setValue('country', '');
      }
    }
  }, [mode, watchedSeriesId, setValue]);

  const handleSeriesSelect = useCallback(async (seriesId: string | null) => {
    const newSeriesId = seriesId || '';
    console.log('[ConventionForm] handleSeriesSelect - newSeriesId received:', newSeriesId);
    setValue('seriesId', newSeriesId, { shouldValidate: true });
    console.log('[ConventionForm] handleSeriesSelect - seriesId after setValue, according to watch:', watch('seriesId'));

    await trigger('seriesId');

    setIsSeriesCommitted(!!newSeriesId);
    if (newSeriesId) {
      await trigger(['name', 'slug', 'startDate', 'endDate', 'city', 'country']);
    }
  }, [setValue, setIsSeriesCommitted, trigger, watch]);

  const handleNewSeriesCreate = useCallback(async (seriesData: any) => {
    try {
      const response = await fetch('/api/organizer/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seriesData),
      });
      if (!response.ok) throw new Error('Failed to create series');
      const data = await response.json();
      setValue('seriesId', data.series.id, { shouldValidate: true });
      setIsSeriesCommitted(true);
      await trigger(['name', 'slug', 'startDate', 'endDate', 'city', 'country']);
    } catch (createError) {
      console.error('Error creating series:', createError);
    }
  }, [setValue, setIsSeriesCommitted, trigger]);

  const handleStartDateChange = useCallback((date: Date | null) => {
    setValue('startDate', date || undefined);
    if (isOneDayEvent && date) {
      setValue('endDate', date);
    } else if (!isOneDayEvent && date) {
      // For multi-day events, we can still auto-populate endDate from startDate as a default
      // The user can then change it if needed using the visible EndDate picker
      setValue('endDate', date);
    } else if (!date) { // If date is cleared
      setValue('endDate', undefined);
    }
    trigger(['startDate', 'endDate']);
  }, [setValue, trigger, isOneDayEvent]);

  const startDate = watch('startDate');

  // Effect to handle isOneDayEvent toggle changes
  useEffect(() => {
    const currentStartDate = watch('startDate');
    if (isOneDayEvent && currentStartDate) {
      setValue('endDate', currentStartDate, { shouldValidate: true });
    }
    // When toggling to multi-day (isOneDayEvent is false),
    // endDate will retain its value (which would be same as startDate if just toggled from true).
    // The user can then freely change it using the now-visible EndDate picker.
    // If startDate is not set, endDate remains as is (likely undefined).
  }, [isOneDayEvent, setValue, watch]);

  return (
    <form onSubmit={handleSubmit(async (formDataFromRHF) => {
      // Create the data object that will actually be submitted
      const submissionData = {
        ...formDataFromRHF, // Spread the data RHF provides
        seriesId: watchedSeriesId, // Explicitly use the latest watched seriesId
      };

      // TEMPORARY LOG - check this new object
      console.log("Data being prepared for submission (with explicit seriesId):", submissionData);
      // END TEMPORARY LOG

      if (mode === 'create' && !isSeriesCommitted) {
        await trigger('seriesId');
        // Use submissionData.seriesId for the check here too
        if (!submissionData.seriesId) return;
      }

      if (isSeriesCommitted || mode === 'edit') {
        const result = await trigger(['seriesId', 'name', 'slug', 'startDate', 'endDate', 'city', 'country']);
        if (!result) {
          return;
        }
      }
      await onSubmit(submissionData); // Pass the modified submissionData
    })}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper', mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Series Information
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <ConventionSeriesSelector
            initialSeriesId={mode === 'edit' ? convention?.seriesId : null}
            onSeriesSelect={handleSeriesSelect}
            onNewSeriesCreate={handleNewSeriesCreate}
          />
          {errors.seriesId && !watchedSeriesId && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errors.seriesId.message}
            </Alert>
          )}
        </Paper>

        {(isSeriesCommitted || mode === 'edit') && (
          <>
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Convention Name"
                    {...register('name')}
                    error={!!errors.name}
                    helperText={errors.name?.message || 'Enter the official name of the convention.'}
                    inputProps={{ 'aria-label': 'Convention Name' }}
                    required={isSeriesCommitted || mode === 'edit'}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label={mode === 'create' && !isSlugManuallyEdited && watchedSlug ? '' : 'Slug'}
                    {...register('slug')}
                    error={!!errors.slug}
                    helperText={errors.slug?.message || (mode === 'create' && !isSlugManuallyEdited ? "Auto-generated from name. Click edit icon to customize." : "URL-friendly identifier (e.g., 'my-cool-event-2025')")}
                    inputProps={{ 'aria-label': 'Slug' }}
                    InputProps={{
                      readOnly: mode === 'create' && !isSlugManuallyEdited,
                      endAdornment: mode === 'create' && !isSlugManuallyEdited && (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="edit slug"
                            onClick={() => setIsSlugManuallyEdited(true)}
                            edge="end"
                          >
                            <EditIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    required={isSeriesCommitted || mode === 'edit'}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    {...register('description')}
                    multiline
                    rows={4}
                    error={!!errors.description}
                    helperText={errors.description?.message || 'Briefly describe the convention (optional).'}
                    inputProps={{ 'aria-label': 'Description' }}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    select
                    label="Status"
                    {...register('status')}
                    defaultValue={ConventionStatus.DRAFT}
                    error={!!errors.status}
                    helperText={errors.status?.message || 'Set the current status of the convention.'}
                    inputProps={{ 'aria-label': 'Status' }}
                  >
                    {Object.values(ConventionStatus).map((statusVal) => (
                      <MenuItem key={statusVal} value={statusVal}>
                        {statusVal.charAt(0) + statusVal.slice(1).toLowerCase()}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Event Dates
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 6 }}>
                  <DatePicker
                    label="Start Date"
                    value={watch('startDate') || null}
                    onChange={handleStartDateChange}
                    format="MM/dd/yyyy"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.startDate,
                        helperText: errors.startDate?.message || 'First day of the convention.',
                        inputProps: { 'aria-label': 'Start Date' },
                        required: isSeriesCommitted || mode === 'edit'
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isOneDayEvent}
                        onChange={(e) => setIsOneDayEvent(e.target.checked)}
                        name="isOneDayEvent"
                      />
                    }
                    label="One-day event"
                    sx={{ mt: { xs: 2, md: 0 }, mb: { xs: 1, md: 0 }, display: 'block' }} // Adjust spacing
                  />
                </Grid>
                {!isOneDayEvent && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DatePicker
                      label="End Date"
                      value={watch('endDate') || null}
                      onChange={(date) => setValue('endDate', date as Date)}
                      minDate={startDate}
                      views={['day']}
                      openTo="day"
                      referenceDate={startDate}
                      format="MM/dd/yyyy"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.endDate,
                          helperText: errors.endDate?.message || 'Last day of the convention.',
                          inputProps: { 'aria-label': 'End Date' },
                          required: isSeriesCommitted || mode === 'edit'
                        },
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Location Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="City"
                    {...register('city')}
                    error={!!errors.city}
                    helperText={errors.city?.message || 'City where the convention is held.'}
                    inputProps={{ 'aria-label': 'City' }}
                    required={isSeriesCommitted || mode === 'edit'}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="State/Province"
                    {...register('stateName')}
                    error={!!errors.stateName}
                    helperText={errors.stateName?.message || 'State or province (optional).'}
                    inputProps={{ 'aria-label': 'State/Province' }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Country"
                    {...register('country')}
                    error={!!errors.country}
                    helperText={errors.country?.message || 'Country where the convention is held.'}
                    inputProps={{ 'aria-label': 'Country' }}
                    required={isSeriesCommitted || mode === 'edit'}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Venue Name"
                    {...register('venueName')}
                    error={!!errors.venueName}
                    helperText={errors.venueName?.message || 'Venue or building name (optional).'}
                    inputProps={{ 'aria-label': 'Venue Name' }}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Additional Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Website URL"
                    {...register('websiteUrl')}
                    error={!!errors.websiteUrl}
                    helperText={errors.websiteUrl?.message || 'Official website for the convention (optional).'}
                    inputProps={{ 'aria-label': 'Website URL' }}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={isSubmitting}
                aria-label="Cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                aria-label={isSubmitting ? 'Saving' : mode === 'create' ? 'Create Convention' : 'Save Changes'}
              >
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Convention' : 'Save Changes'}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </form>
  );
} 