'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Container, Box, Typography, Tabs, Tab, Snackbar, Alert } from '@mui/material';
import { DISPLAY, BODY } from '@/lib/fonts';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

// House Lights styling (2026-07-10): the auth card is a panel on the theme
// surface, gold tab underline, themed inputs. All form logic lives in
// LoginForm / RegisterForm unchanged.

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`auth-tabpanel-${index}`}
            aria-labelledby={`auth-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

interface AuthFormProps {
    initialTab?: 'login' | 'register';
}

export default function AuthForm({ initialTab = 'login' }: AuthFormProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [value, setValue] = useState(initialTab === 'login' ? 0 : 1);
    const [notification, setNotification] = useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (searchParams?.get('verified') === 'true') {
            setNotification({ open: true, message: 'Email verified successfully! Please log in.', severity: 'success' });
        }
    }, [searchParams]);

    // This effect syncs the tab state with the URL
    useEffect(() => {
        if (pathname === '/login') {
            setValue(0);
        } else if (pathname === '/register') {
            setValue(1);
        }
    }, [pathname]);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
        // Also update the URL to match the selected tab without a full page reload
        const newPath = newValue === 0 ? '/login' : '/register';
        if (pathname !== newPath) {
            router.push(newPath);
        }
    };

    const handleCloseNotification = () => {
        if (notification) {
            setNotification({ ...notification, open: false });
        }
    };

    return (
        <Box
            component="main"
            sx={{
                backgroundColor: 'var(--cc-bg)',
                backgroundImage: 'var(--cc-field)',
                backgroundRepeat: 'no-repeat',
                minHeight: '100vh',
                pt: { xs: 5, md: 8 },
                pb: 8,
            }}
        >
            <Container maxWidth="xs">
                {notification && (
                    <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
                            {notification.message}
                        </Alert>
                    </Snackbar>
                )}
                <Box
                    sx={{
                        borderRadius: '12px',
                        backgroundColor: 'var(--cc-panel)',
                        border: '1px solid var(--cc-panel-border)',
                        overflow: 'hidden',
                        // Themed inputs for both forms inside the card.
                        '& .MuiOutlinedInput-root': {
                            fontFamily: BODY,
                            color: 'var(--cc-ink)',
                            borderRadius: '8px',
                            '& fieldset': { borderColor: 'var(--cc-panel-border)' },
                            '&:hover fieldset': { borderColor: 'var(--cc-cyan)' },
                            '&.Mui-focused fieldset': { borderColor: 'var(--cc-gold)' },
                        },
                        '& .MuiInputLabel-root': {
                            fontFamily: BODY,
                            color: 'var(--cc-soft)',
                            '&.Mui-focused': { color: 'var(--cc-gold)' },
                        },
                        '& .MuiFormHelperText-root': { fontFamily: BODY },
                        '& input:-webkit-autofill': {
                            WebkitBoxShadow: '0 0 0 100px var(--cc-bg) inset',
                            WebkitTextFillColor: 'var(--cc-ink)',
                            caretColor: 'var(--cc-ink)',
                        },
                    }}
                >
                    <Tabs
                        value={value}
                        onChange={handleChange}
                        variant="fullWidth"
                        aria-label="login and sign up tabs"
                        sx={{
                            borderBottom: '1px solid var(--cc-hairline)',
                            '& .MuiTabs-indicator': { backgroundColor: 'var(--cc-gold)', height: 3 },
                            '& .MuiTab-root': {
                                fontFamily: DISPLAY, fontWeight: 700, fontSize: '0.85rem',
                                letterSpacing: '0.06em', textTransform: 'uppercase',
                                color: 'var(--cc-muted)', minHeight: 52,
                            },
                            '& .MuiTab-root.Mui-selected': { color: 'var(--cc-ink)' },
                        }}
                    >
                        <Tab label="Login" id="auth-tab-0" aria-controls="auth-tabpanel-0" />
                        <Tab label="Sign Up" id="auth-tab-1" aria-controls="auth-tabpanel-1" />
                    </Tabs>
                    <TabPanel value={value} index={0}>
                        <Typography component="h1" align="center" sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '1.45rem', color: 'var(--cc-ink)' }}>
                            Welcome back
                        </Typography>
                        <Typography align="center" sx={{ fontFamily: BODY, fontSize: '0.85rem', color: 'var(--cc-muted)', mt: 0.5 }}>
                            The magic missed you.
                        </Typography>
                        <LoginForm />
                    </TabPanel>
                    <TabPanel value={value} index={1}>
                        <Typography component="h1" align="center" sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '1.45rem', color: 'var(--cc-ink)' }}>
                            Create your free account
                        </Typography>
                        <Typography align="center" sx={{ fontFamily: BODY, fontSize: '0.85rem', color: 'var(--cc-muted)', mt: 0.5 }}>
                            Free forever. Takes about a minute.
                        </Typography>
                        <RegisterForm />
                    </TabPanel>
                </Box>
            </Container>
        </Box>
    );
}
