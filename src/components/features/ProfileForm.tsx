'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProfileSchema, type ProfileSchemaInput } from '@/lib/validators';
import { updateUserProfile } from '@/lib/actions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Autocomplete from '@mui/material/Autocomplete';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import ProseMirrorEditor from '@/components/ui/ProseMirrorEditor';
import { FuzzyStateInput } from '@/components/ui/FuzzyStateInput';
import { COUNTRIES } from '@/lib/countries';

interface ProfileFormProps {
  currentFirstName?: string | null;
  currentLastName?: string | null;
  currentStageName?: string | null;
  currentBio?: string | null;
  currentUseStageNamePublicly?: boolean | null;
  currentHomeCity?: string | null;
  currentHomeStateName?: string | null;
  currentHomeStateAbbreviation?: string | null;
  currentHomeCountry?: string | null;
  onProfileUpdate?: (updatedData: ProfileSchemaInput) => void;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ProfileForm({
  currentFirstName,
  currentLastName,
  currentStageName,
  currentBio,
  currentUseStageNamePublicly,
  currentHomeCity,
  currentHomeStateName,
  currentHomeStateAbbreviation,
  currentHomeCountry,
  onProfileUpdate,
  onSuccess,
  onCancel
}: ProfileFormProps) {
  const [serverMessage, setServerMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined> | null>(null);
  const [isUpdatingToggle, setIsUpdatingToggle] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileSchemaInput>({
    resolver: ProfileSchema ? zodResolver(ProfileSchema) : undefined,
    defaultValues: {
      firstName: currentFirstName || '',
      lastName: currentLastName || '',
      stageName: currentStageName || '',
      bio: currentBio || '',
      useStageNamePublicly: currentUseStageNamePublicly || false,
      homeCity: currentHomeCity || '',
      homeStateName: currentHomeStateName || '',
      homeStateAbbreviation: currentHomeStateAbbreviation || '',
      homeCountry: currentHomeCountry || '',
    },
  });

  const useStageNamePublicly = watch('useStageNamePublicly');
  const homeCountry = watch('homeCountry');
  const homeStateName = watch('homeStateName');

  useEffect(() => {
    reset({
      firstName: currentFirstName || '',
      lastName: currentLastName || '',
      stageName: currentStageName || '',
      bio: currentBio || '',
      useStageNamePublicly: currentUseStageNamePublicly || false,
      homeCity: currentHomeCity || '',
      homeStateName: currentHomeStateName || '',
      homeStateAbbreviation: currentHomeStateAbbreviation || '',
      homeCountry: currentHomeCountry || '',
    });
  }, [currentFirstName, currentLastName, currentStageName, currentBio, currentUseStageNamePublicly, currentHomeCity, currentHomeStateName, currentHomeStateAbbreviation, currentHomeCountry, reset]);

  // Auto-save the stage name toggle immediately when changed
  const handleToggleChange = async (newValue: boolean) => {
    setIsUpdatingToggle(true);
    setServerMessage(null);
    setFieldErrors(null);

    try {
      // Update the form value
      setValue('useStageNamePublicly', newValue);

      // Prepare data with only the current values from the form
      const currentFormData = {
        firstName: currentFirstName,
        lastName: currentLastName,
        stageName: currentStageName,
        bio: currentBio,
        useStageNamePublicly: newValue,
      };

      const result = await updateUserProfile(currentFormData);

      if (result.success) {
        setServerMessage({ 
          type: 'success', 
          message: `Stage name preference ${newValue ? 'enabled' : 'disabled'}` 
        });
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setServerMessage(null);
        }, 3000);

        if (onProfileUpdate) {
          onProfileUpdate(currentFormData);
        }
      } else {
        setServerMessage({ type: 'error', message: result.error || 'Failed to update preference.' });
        // Revert the toggle if the update failed
        setValue('useStageNamePublicly', !newValue);
      }
    } catch (error) {
      console.error('Error updating stage name preference:', error);
      setServerMessage({ type: 'error', message: 'An unexpected error occurred.' });
      // Revert the toggle if the update failed
      setValue('useStageNamePublicly', !newValue);
    } finally {
      setIsUpdatingToggle(false);
    }
  };

  const onSubmit = async (data: ProfileSchemaInput) => {
    setServerMessage(null);
    setFieldErrors(null);

    const result = await updateUserProfile(data);

    if (result.success && result.user) {
      setServerMessage({ type: 'success', message: result.message || 'Profile updated successfully!' });
      const newValues = {
        firstName: result.user.firstName || '',
        lastName: result.user.lastName || '',
        stageName: result.user.stageName || '',
        bio: result.user.bio || '',
        // Include every field so the form is no longer "dirty" after a save —
        // otherwise the Save button stays enabled and the save looks like it
        // didn't take.
        useStageNamePublicly: data.useStageNamePublicly ?? false,
        homeCity: result.user.homeCity || '',
        homeStateName: result.user.homeStateName || '',
        homeStateAbbreviation: result.user.homeStateAbbreviation || '',
        homeCountry: result.user.homeCountry || '',
      };
      reset(newValues);
      if (onProfileUpdate) {
        onProfileUpdate(newValues);
      }
      if (onSuccess) {
        // Delay hiding the form to allow success message to be seen
        setTimeout(() => onSuccess(), 1500);
      }
    } else {
      setServerMessage({ type: 'error', message: result.error || 'Failed to update profile.' });
      if (result.fieldErrors) {
        console.error("Field errors:", result.fieldErrors);
        setFieldErrors(result.fieldErrors as Record<string, string[] | undefined>);
      }
    }
  };

  // Validation failures otherwise block the submit silently (the bio has no
  // inline error slot), so surface the first problem where the user can see it.
  const onInvalid = (formErrors: typeof errors) => {
    const firstMessage = Object.values(formErrors)
      .map((e) => (e as { message?: string })?.message)
      .find(Boolean);
    setServerMessage({ type: 'error', message: firstMessage || 'Please fix the highlighted fields and try again.' });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
        <Controller
          name="firstName"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              id="firstName"
              label="First Name"
              autoComplete="given-name"
              error={!!errors.firstName || !!fieldErrors?.firstName}
              helperText={errors.firstName?.message || (fieldErrors?.firstName ? fieldErrors.firstName[0] : '')}
              disabled={isSubmitting}
            />
          )}
        />
        <Controller
          name="lastName"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              id="lastName"
              label="Last Name"
              autoComplete="family-name"
              error={!!errors.lastName || !!fieldErrors?.lastName}
              helperText={errors.lastName?.message || (fieldErrors?.lastName ? fieldErrors.lastName[0] : '')}
              disabled={isSubmitting}
            />
          )}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 2 }, alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2 }}>
        <Controller
          name="stageName"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              id="stageName"
              label="Stage Name (Optional)"
              autoComplete="nickname"
              error={!!errors.stageName || !!fieldErrors?.stageName}
              helperText={errors.stageName?.message || (fieldErrors?.stageName ? fieldErrors.stageName[0] : '')}
              disabled={isSubmitting}
            />
          )}
        />
        <Controller
          name="useStageNamePublicly"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value || false}
                  onChange={(e) => handleToggleChange(e.target.checked)}
                  name="useStageNamePublicly"
                  disabled={isUpdatingToggle}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Use stage name publicly
                  {isUpdatingToggle && <CircularProgress size={16} />}
                </Box>
              }
            />
          )}
        />
      </Box>

      {/* Home base — private. Powers "conventions near me" search and distance
          alerts; never shown on the public profile. */}
      <Box sx={{ mb: 1 }}>
        <Typography
          component="label"
          sx={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', color: 'var(--cc-ink)' }}
        >
          Home base
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: 'var(--cc-muted)' }}>
          Find conventions near you - just tell us where you are. This information is kept private and never shared.
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <Controller
          name="homeCountry"
          control={control}
          render={({ field }) => (
            <Autocomplete
              fullWidth
              freeSolo
              options={COUNTRIES}
              autoHighlight
              value={COUNTRIES.find((opt) => opt.label === field.value) || field.value || null}
              getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
              isOptionEqualToValue={(opt, val) => opt.label === (typeof val === 'string' ? val : val?.label)}
              onChange={(_, newValue) => {
                const label = typeof newValue === 'string' ? newValue : newValue?.label || '';
                field.onChange(label);
                // State/abbreviation only make sense for the US picker; clear
                // them when the country changes away from it.
                if (label !== 'United States') {
                  setValue('homeStateName', '', { shouldDirty: true });
                  setValue('homeStateAbbreviation', '', { shouldDirty: true });
                }
              }}
              onInputChange={(_, newInputValue, reason) => {
                if (reason === 'input') field.onChange(newInputValue);
              }}
              disabled={isSubmitting}
              renderInput={(params) => (
                <TextField {...params} label="Country" autoComplete="country-name" />
              )}
              sx={{ flex: 1 }}
            />
          )}
        />
        {homeCountry === 'United States' ? (
          <FuzzyStateInput
            value={homeStateName || ''}
            onChange={(name, abbr) => {
              setValue('homeStateName', name, { shouldDirty: true });
              setValue('homeStateAbbreviation', abbr, { shouldDirty: true });
            }}
            disabled={isSubmitting}
            sx={{ flex: 1 }}
          />
        ) : (
          <Controller
            name="homeStateName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value || ''}
                fullWidth
                label="State / Province / Region"
                disabled={isSubmitting}
                sx={{ flex: 1 }}
              />
            )}
          />
        )}
        <Controller
          name="homeCity"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value || ''}
              fullWidth
              label="City"
              autoComplete="address-level2"
              disabled={isSubmitting}
              sx={{ flex: 1 }}
            />
          )}
        />
      </Box>

      <Box sx={{ mb: 1 }}>
        <Typography
          component="label"
          sx={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', color: 'var(--cc-ink)' }}
        >
          Bio
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: 'var(--cc-muted)' }}>
          A short introduction shown on your public profile. Share who you are and what you do.
        </Typography>
      </Box>
      <Controller
        name="bio"
        control={control}
        render={({ field }) => (
          <ProseMirrorEditor
            value={field.value || ''}
            onChange={field.onChange}
          />
        )}
      />

      {serverMessage && (
        <Alert severity={serverMessage.type} sx={{ mt: 3 }}>
          {serverMessage.message}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 2 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || !isDirty}
          sx={{ px: 4, minWidth: 160 }}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Save Changes'}
        </Button>
        {onCancel && (
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
            sx={{ px: 4 }}
          >
            Cancel
          </Button>
        )}
      </Box>
    </Box>
  );
} 