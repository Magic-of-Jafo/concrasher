'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProfileSchema, type ProfileSchemaInput } from '@/lib/validators'; // Assuming aliased path
import { updateUserProfile } from '@/lib/actions'; // Assuming aliased path
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

interface ProfileFormProps {
  currentName?: string | null;
  currentBio?: string | null;
  onProfileUpdate?: (updatedData: { name?: string | null; bio?: string | null }) => void;
}

export default function ProfileForm({ currentName, currentBio, onProfileUpdate }: ProfileFormProps) {
  const [serverMessage, setServerMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined> | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileSchemaInput>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: currentName || '',
      bio: currentBio || '',
    },
  });

  useEffect(() => {
    reset({
      name: currentName || '',
      bio: currentBio || '',
    });
  }, [currentName, currentBio, reset]);

  const onSubmit = async (data: ProfileSchemaInput) => {
    setServerMessage(null);
    setFieldErrors(null);

    // Only submit if there are actual changes
    // However, user might want to submit an empty bio to clear it, or change name to empty (if allowed by schema)
    // The current schema allows optional fields, so if they are unchanged from initial empty/null, they won't be submitted by RHF default behavior if not dirty.
    // If the initial values are set, and user clears them, it becomes dirty.

    const result = await updateUserProfile(data);

    if (result.success && result.user) {
      setServerMessage({ type: 'success', message: result.message || 'Profile updated successfully!' });
      reset({ name: result.user.name || '', bio: result.user.bio || '' }); // Reset form with new values
      if (onProfileUpdate) {
        onProfileUpdate({ name: result.user.name, bio: result.user.bio });
      }
    } else {
      setServerMessage({ type: 'error', message: result.error || 'Failed to update profile.' });
      if (result.fieldErrors) {
        // Convert Zod fieldErrors to a format suitable for display if needed
        // For now, logging and displaying a general message for field errors.
        console.error("Field errors:", result.fieldErrors);
        setFieldErrors(result.fieldErrors as Record<string, string[] | undefined>);
        // You might want to map these to specific RHF errors using setError
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

      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            margin="normal"
            fullWidth
            id="name"
            label="Display Name"
            autoComplete="name"
            error={!!errors.name || !!fieldErrors?.name}
            helperText={errors.name?.message || fieldErrors?.name?.[0]}
            disabled={isSubmitting}
          />
        )}
      />

      <Controller
        name="bio"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            margin="normal"
            fullWidth
            id="bio"
            label="Bio (max 200 characters)"
            multiline
            rows={4}
            error={!!errors.bio || !!fieldErrors?.bio}
            helperText={errors.bio?.message || fieldErrors?.bio?.[0]}
            disabled={isSubmitting}
          />
        )}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={isSubmitting || !isDirty}
      >
        {isSubmitting ? <CircularProgress size={24} /> : 'Save Changes'}
      </Button>
    </Box>
  );
} 