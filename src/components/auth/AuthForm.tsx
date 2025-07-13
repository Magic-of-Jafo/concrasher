'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Container, Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

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
    const [value, setValue] = useState(initialTab === 'login' ? 0 : 1);

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

    return (
        <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
            <Paper elevation={3}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={value} onChange={handleChange} variant="fullWidth" aria-label="login and sign up tabs">
                        <Tab label="Login" id="auth-tab-0" aria-controls="auth-tabpanel-0" />
                        <Tab label="Sign Up" id="auth-tab-1" aria-controls="auth-tabpanel-1" />
                    </Tabs>
                </Box>
                <TabPanel value={value} index={0}>
                    <Typography component="h1" variant="h5" align="center">
                        Login
                    </Typography>
                    <LoginForm />
                </TabPanel>
                <TabPanel value={value} index={1}>
                    <Typography component="h1" variant="h5" align="center">
                        Create Account
                    </Typography>
                    <RegisterForm />
                </TabPanel>
            </Paper>
        </Container>
    );
} 