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
    // Placeholder for actual API call
    console.log('Password reset requested for:', data.email);
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1000));
    setMessage(`If an account exists for ${data.email}, a password reset link has been sent.`);
    setIsSubmitting(false);
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
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
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