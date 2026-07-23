'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema } from '@/lib/validators';
import { z } from 'zod';
import { Button, Box, Alert, Link } from '@mui/material';
import { AutofillTextField } from '@/components/ui/AutofillTextField';
import { DISPLAY, BODY } from '@/lib/fonts';

type LoginFormInputs = z.infer<typeof LoginSchema>;

export default function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
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
                // 'CredentialsSignin' = the credentials really were wrong.
                // 'service_unavailable' = we could not check them (DB outage);
                // never blame the user's password for that.
                setError(
                    result.error === 'CredentialsSignin'
                        ? 'Invalid email or password.'
                        : result.error === 'service_unavailable'
                            ? 'We are having trouble signing you in right now. Your password is fine; please try again in a minute.'
                            : result.error,
                );
            } else if (result?.ok) {
                // Return to where the user came from (?from=/conventions) when
                // it's a safe same-site path; otherwise the main page.
                // "//host" would be protocol-relative and leave the site.
                const from = searchParams.get('from');
                const safeFrom = from && from.startsWith('/') && !from.startsWith('//') ? from : '/';
                router.push(safeFrom);
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
                disabled={isSubmitting}
                sx={{
                    mt: 3, mb: 2,
                    fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.95rem', textTransform: 'none',
                    backgroundColor: 'var(--cc-gold)', color: 'var(--cc-gold-ink)',
                    py: 1.5, minHeight: 48, borderRadius: '8px',
                    boxShadow: 'var(--cc-glow-gold)',
                    '&:hover': { backgroundColor: 'var(--cc-gold)', filter: 'brightness(1.06)' },
                    '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '3px' },
                    '&.Mui-disabled': { backgroundColor: 'var(--cc-panel)', color: 'var(--cc-soft)' },
                }}
            >
                {isSubmitting ? 'Logging In...' : 'Login'}
            </Button>
            <Box sx={{ textAlign: 'right' }}>
                <Link
                    component="button"
                    type="button"
                    onClick={handleForgotPassword}
                    sx={{
                        fontFamily: BODY, fontSize: '0.82rem',
                        color: 'var(--cc-cyan)', textDecorationColor: 'var(--cc-cyan)',
                        '&:hover': { color: 'var(--cc-ink)' },
                    }}
                >
                    Forgot password?
                </Link>
            </Box>
        </Box>
    );
} 