'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema } from '@/lib/validators';
import { z } from 'zod';
import { TextField, Button, Box, Typography, Alert, Link } from '@mui/material';
import { AutofillTextField } from '@/components/ui/AutofillTextField';

type LoginFormInputs = z.infer<typeof LoginSchema>;

export default function LoginForm() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { control, handleSubmit, formState: { errors }, getValues } = useForm<LoginFormInputs>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginFormInputs) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const result = await signIn('credentials', {
                redirect: false, // Handle redirect manually to control UX
                email: data.email,
                password: data.password,
            });

            if (result?.error) {
                setError(result.error === 'CredentialsSignin' ? 'Invalid email or password.' : result.error);
            } else if (result?.ok) {
                // On successful login, redirect to the main page
                router.push('/');
                router.refresh(); // Refresh the page to update session state in the layout/header
            }
        } catch (err) {
            console.error('Login failed:', err);
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForgotPassword = () => {
        const email = getValues('email');
        if (email) {
            sessionStorage.setItem('reset-password-email', email);
        }
        router.push(`/reset-password`);
    };

    return (
        <Box component="form" method="post" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1 }}>
            {error && (
                <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                    {error}
                </Alert>
            )}
            <Controller
                name="email"
                control={control}
                render={({ field }) => (
                    <AutofillTextField
                        {...field}
                        name="email"
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        autoComplete="email"
                        autoFocus
                        error={!!errors.email}
                        helperText={errors.email?.message}
                    />
                )}
            />
            <Controller
                name="password"
                control={control}
                render={({ field }) => (
                    <AutofillTextField
                        {...field}
                        name="password"
                        margin="normal"
                        required
                        fullWidth
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        error={!!errors.password}
                        helperText={errors.password?.message}
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
                {isSubmitting ? 'Logging In...' : 'Login'}
            </Button>
            <Box sx={{ textAlign: 'right' }}>
                <Link component="button" type="button" onClick={handleForgotPassword} variant="body2">
                    Forgot password?
                </Link>
            </Box>
        </Box>
    );
} 