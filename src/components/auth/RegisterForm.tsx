'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Box, Alert } from '@mui/material';
import { AutofillTextField } from '../ui/AutofillTextField';
import { signIn } from 'next-auth/react';
import { generateEventId, trackPixelEvent } from '@/lib/tracking-utils';

// Client-side only schema - password match is checked manually
const ClientRegistrationSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
    confirmPassword: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
});

type RegisterFormInputs = z.infer<typeof ClientRegistrationSchema>;

export default function RegisterForm() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const hasSubmitted = useRef(false); // Ref to prevent double submission in Strict Mode

    const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormInputs>({
        resolver: zodResolver(ClientRegistrationSchema),
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
        // Manual password match check
        if (data.password !== data.confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        if (hasSubmitted.current) {
            return;
        }
        hasSubmitted.current = true;

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        // ✅ Generate a unique event ID for this registration
        const eventId = generateEventId();

        // ✅ Fire the browser event immediately with deduplication
        trackPixelEvent('CompleteRegistration', {
            registration_method: 'Email',
        }, eventId);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                    eventId, // ✅ Pass the eventId to the server
                }),
            });
            const result = await response.json();

            if (!response.ok) {
                setError(result.message || 'An unknown registration error occurred.');
                return;
            }

            setSuccessMessage("Registration successful! Logging you in...");

            const signInResult = await signIn('credentials', {
                redirect: false,
                email: data.email,
                password: data.password,
            });


            if (signInResult?.error) {
                setError('Registration successful, but login failed. Please try logging in manually.');
            } else if (signInResult?.ok) {
                router.push('/profile');
                router.refresh();
            }

        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            // Reset submission status, but keep the ref to prevent re-submission on re-render
            setIsSubmitting(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1 }}>
            {error && (
                <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                    {error}
                </Alert>
            )}
            {successMessage && !error && (
                <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
                    {successMessage}
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
                        margin="normal"
                        required
                        fullWidth
                        label="Password"
                        type="password"
                        autoComplete="new-password"
                        error={!!errors.password}
                        helperText={errors.password?.message}
                    />
                )}
            />
            <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                    <AutofillTextField
                        {...field}
                        margin="normal"
                        required
                        fullWidth
                        label="Confirm Password"
                        type="password"
                        autoComplete="new-password"
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword?.message}
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
                {isSubmitting ? 'Signing Up...' : 'Sign Up'}
            </Button>
        </Box>
    );
} 