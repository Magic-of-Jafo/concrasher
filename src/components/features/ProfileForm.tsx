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
import Grid from '@mui/material/Grid';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import ProseMirrorEditor from '@/components/ui/ProseMirrorEditor';

interface ProfileFormProps {
  currentFirstName?: string | null;
  currentLastName?: string | null;
  currentStageName?: string | null;
  currentBio?: string | null;
  currentUseStageNamePublicly?: boolean | null;
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
    },
  });

  const useStageNamePublicly = watch('useStageNamePublicly');

  useEffect(() => {
    reset({
      firstName: currentFirstName || '',
      lastName: currentLastName || '',
      stageName: currentStageName || '',
      bio: currentBio || '',
      useStageNamePublicly: currentUseStageNamePublicly || false,
    });
  }, [currentFirstName, currentLastName, currentStageName, currentBio, currentUseStageNamePublicly, reset]);

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

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1 }}>
      {serverMessage && (
        <Alert severity={serverMessage.type} sx={{ mb: 2 }}>
          {serverMessage.message}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
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

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
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

      <Box sx={{ display: 'flex', gap: 2, mt: 3, mb: 2 }}>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={isSubmitting || !isDirty}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Save Changes'}
        </Button>
        {onCancel && (
          <Button
            fullWidth
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </Box>
    </Box>
  );
} 