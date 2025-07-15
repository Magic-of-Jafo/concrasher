'use client';

import React, { Suspense, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Container, Box, Typography, TextField, Button, Alert, Paper } from '@mui/material';
import { AutofillTextField } from '@/components/ui/AutofillTextField';

const ResetPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type ResetPasswordInputs = z.infer<typeof ResetPasswordSchema>;

function ResetPasswordForm() {
  const { control, handleSubmit, formState: { errors }, reset } = useForm<ResetPasswordInputs>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const [message, setMessage] = React.useState('');
  const [messageType, setMessageType] = React.useState<'success' | 'error' | 'warning'>('success');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('reset-password-email');
    if (storedEmail) {
      reset({ email: storedEmail });
      sessionStorage.removeItem('reset-password-email');
    }
  }, [reset]);

  const onSubmit = async (data: ResetPasswordInputs) => {
    setIsSubmitting(true);
    setMessage('');
    setMessageType('success');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message);
        setMessageType('success');
        if (result.warning) {
          setMessage(`${result.message} ${result.warning}`);
          setMessageType('warning');
        }
      } else {
        setMessage(result.message || 'An error occurred. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setMessage('An error occurred while processing your request. Please try again.');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography component="h1" variant="h5" align="center">
          Reset Password
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1, mb: 2 }}>
          Enter your email address and we will send you a link to reset your password.
        </Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {message && (
            <Alert severity={messageType} sx={{ width: '100%', mb: 2 }}>
              {message}
            </Alert>
          )}
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <AutofillTextField
                {...field}
                margin="normal"
                required
                fullWidth
                label="Email Address"
                autoComplete="email"
                autoFocus
                error={!!errors.email}
                helperText={errors.email?.message}
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
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
} 