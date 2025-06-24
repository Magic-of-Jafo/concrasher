'use client';

import React from 'react';
import { Container, TextField, Button, Typography, Box, Alert } from '@mui/material';
import { useForm, Controller, ControllerRenderProps, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RegistrationSchema } from '../../../lib/validators';
import { useRouter } from 'next/navigation';

type RegistrationFormData = z.infer<typeof RegistrationSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(RegistrationSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const [serverMessage, setServerMessage] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState<boolean>(false);

  const onSubmit = async (data: RegistrationFormData) => {
    setServerMessage(null);
    setIsError(false);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setIsError(true);
        if (result.message) {
          setServerMessage(result.message);
        }
        if (result.errors) {
          let errorMessage = 'Registration failed. Please check your input:';
          for (const fieldName in result.errors) {
            const fieldErrors = result.errors[fieldName as keyof typeof result.errors];
            if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
              setError(fieldName as keyof RegistrationFormData, { type: 'server', message: fieldErrors[0] });
              errorMessage += `\n- ${fieldErrors[0]}`;
            }
          }
          setServerMessage(errorMessage);
        }
        return;
      }

      setServerMessage(result.message || 'Registration successful! Redirecting...');
      setIsError(false);
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error) {
      setIsError(true);
      setServerMessage('An unexpected error occurred. Please try again.');
      console.error('Registration submission error:', error);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Register
        </Typography>
        {serverMessage && (
          <Alert severity={isError ? "error" : "success"} sx={{ width: '100%', mt: 2 }}>
            {serverMessage}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1 }}>
          <Controller
            name="email"
            control={control}
            render={({ field }: { field: ControllerRenderProps<RegistrationFormData, 'email'> }) => (
              <TextField
                {...field}
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                autoComplete="email"
                autoFocus
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={isSubmitting}
              />
            )}
          />
          <Controller
            name="password"
            control={control}
            render={({ field }: { field: ControllerRenderProps<RegistrationFormData, 'password'> }) => (
              <TextField
                {...field}
                margin="normal"
                required
                fullWidth
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                disabled={isSubmitting}
              />
            )}
          />
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }: { field: ControllerRenderProps<RegistrationFormData, 'confirmPassword'> }) => (
              <TextField
                {...field}
                margin="normal"
                required
                fullWidth
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                disabled={isSubmitting}
              />
            )}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
} 