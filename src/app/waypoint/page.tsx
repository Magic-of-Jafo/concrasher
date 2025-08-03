'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Box,
    TextField,
    Button,
    Paper,
    Typography,
    Container,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function WaypointPage() {
    const [topicId, setTopicId] = useState('');
    const [mode, setMode] = useState(1);
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthorized' | 'no-cookie'>('loading');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword1, setSignupPassword1] = useState('');
    const [signupPassword2, setSignupPassword2] = useState('');
    const [signupError, setSignupError] = useState('');
    const [isSigningUp, setIsSigningUp] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const copyToClipboard = async (text: string, isMarkdown: boolean = false) => {
        try {
            let contentToCopy = text;

            // If it's a user message, format as markdown
            if (!isMarkdown) {
                contentToCopy = text;
            }

            await navigator.clipboard.writeText(contentToCopy);
            // You could add a toast notification here if desired
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    // Check authentication on page load
    useEffect(() => {
        checkAuthentication();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginEmail.trim() || !loginPassword.trim()) {
            setLoginError('Please enter both email and password');
            return;
        }

        setIsLoggingIn(true);
        setLoginError('');

        try {
            const loginData = [
                {
                    "Eamil": loginEmail,
                    "Password": loginPassword
                }
            ];

            const response = await fetch('/api/n8n-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ testData: loginData }),
            });

            const data = await response.json();

            if (response.ok && data) {
                // Check for both array format and direct object format
                let token = null;
                if (data.length > 0 && data[0].token) {
                    token = data[0].token;
                } else if (data.session_token) {
                    token = data.session_token;
                }

                if (token) {
                    console.log('Login successful, token received:', token);

                    // Set the cookie client-side as fallback (without Secure flag for localhost)
                    document.cookie = `session_token=${token}; path=/; max-age=604800; SameSite=Lax`;
                    console.log('Set session_token cookie client-side');

                    // Re-check authentication
                    setAuthStatus('loading');
                    setTimeout(() => {
                        checkAuthentication();
                    }, 1000);
                } else {
                    setLoginError('No token received from login');
                }
            } else {
                setLoginError(data.error || 'Login failed');
            }
        } catch (error) {
            setLoginError('Login failed. Please try again.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(signupEmail)) {
            setSignupError('Please enter a valid email address');
            return;
        }

        // Validate passwords match
        if (signupPassword1 !== signupPassword2) {
            setSignupError('Passwords do not match');
            return;
        }

        // Validate password length
        if (signupPassword1.length < 6) {
            setSignupError('Password must be at least 6 characters long');
            return;
        }

        setIsSigningUp(true);
        setSignupError('');

        try {
            const signupData = [
                {
                    "Email": signupEmail,
                    "Password": signupPassword1
                }
            ];

            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ testData: signupData }),
            });

            const data = await response.json();

            if (response.ok && data) {
                // Check for signup success response
                if (data.length > 0 && data[0].status === 'success') {
                    console.log('Signup successful:', data[0].message);

                    // Clear signup form
                    setSignupEmail('');
                    setSignupPassword1('');
                    setSignupPassword2('');
                    setSignupError('');

                    // Pre-fill login form with the email
                    setLoginEmail(data[0].user.email);

                    // Switch to login tab
                    setActiveTab('login');

                    // Show success message
                    setLoginError(''); // Clear any existing login errors
                    alert('Signup successful! Please log in with your new account.');

                } else {
                    setSignupError(data.error || 'Signup failed');
                }
            } else {
                setSignupError(data.error || 'Signup failed');
            }
        } catch (error) {
            setSignupError('Signup failed. Please try again.');
        } finally {
            setIsSigningUp(false);
        }
    };

    const checkAuthentication = async () => {
        try {
            // Send session token to the webhook
            const authResponse = await fetch('/api/n8n-page-load', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await authResponse.json();
            console.log('Auth response status:', authResponse.status);
            console.log('Auth response data:', data);

            // Check if the webhook response indicates authentication failure
            if (authResponse.status === 200 && !data.error) {
                // Check if the webhook response contains authentication failure indicators
                const responseText = data.response || '';
                console.log('Webhook response text:', responseText);

                // Try to parse as JSON to see if it contains user data (successful auth)
                try {
                    const parsedResponse = JSON.parse(responseText);
                    console.log('Parsed response:', parsedResponse);

                    // Check for authentication failure indicators in JSON
                    if (parsedResponse.authenticated === '401' ||
                        parsedResponse.authenticated === 401 ||
                        parsedResponse.status === '401' ||
                        parsedResponse.status === 401) {
                        console.log('Authentication failed - 401 status in JSON');
                        setAuthStatus('unauthorized');
                        return;
                    }

                    // Check for successful authentication indicators
                    if (parsedResponse && (parsedResponse.user_id || parsedResponse.token || parsedResponse.user || parsedResponse.authenticated === true)) {
                        console.log('Authentication successful - found user data');
                        setAuthStatus('authenticated');
                        return;
                    }
                } catch (e) {
                    // Not JSON, check for error keywords
                }

                if (responseText.includes('401') ||
                    responseText.includes('unauthorized') ||
                    responseText.includes('authentication failed') ||
                    responseText.includes('not authenticated') ||
                    responseText.includes('invalid session')) {
                    console.log('Authentication failed based on response content');
                    setAuthStatus('unauthorized');
                } else {
                    console.log('Authentication successful');
                    setAuthStatus('authenticated');
                }
            } else if (authResponse.status === 401) {
                setAuthStatus('unauthorized');
            } else {
                setAuthStatus('no-cookie');
            }
        } catch (error) {
            console.error('Authentication check error:', error);
            setAuthStatus('no-cookie');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: chatInput,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/waypoint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatInput: chatInput,
                    topic_id: topicId || '',
                    mode: mode,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send message');
            }

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: data.response,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#212121',
            color: '#ECECF1',
            pt: '64px'
        }}>
            {/* Authentication Status Display */}
            {authStatus === 'loading' && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                    <CircularProgress sx={{ color: '#10A37F' }} />
                    <Typography variant="h6" sx={{ mt: 2, color: '#ECECF1' }}>
                        Checking authentication...
                    </Typography>
                </Box>
            )}

            {(authStatus === 'unauthorized' || authStatus === 'no-cookie') && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ mb: 3, color: '#ECECF1' }}>
                        {authStatus === 'unauthorized' ? '❌ Authentication Failed' : '⚠️ Login Required'}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3, color: '#ECECF1' }}>
                        {authStatus === 'unauthorized'
                            ? 'Your session has expired or is invalid. Please log in again.'
                            : 'No authentication session found. Please log in to continue.'
                        }
                    </Typography>

                    <Box sx={{ maxWidth: 400, mx: 'auto' }}>
                        {/* Tabs */}
                        <Box sx={{ mb: 3 }}>
                            <Box sx={{ display: 'flex', borderBottom: 1, borderColor: '#565869' }}>
                                <Button
                                    onClick={() => setActiveTab('login')}
                                    sx={{
                                        color: activeTab === 'login' ? '#10A37F' : '#8E8EA0',
                                        borderBottom: activeTab === 'login' ? 2 : 0,
                                        borderColor: '#10A37F',
                                        borderRadius: 0,
                                        textTransform: 'none',
                                        fontSize: '1rem',
                                        '&:hover': {
                                            bgcolor: 'transparent',
                                            color: activeTab === 'login' ? '#10A37F' : '#ECECF1',
                                        },
                                    }}
                                >
                                    Login
                                </Button>
                                <Button
                                    onClick={() => setActiveTab('signup')}
                                    sx={{
                                        color: activeTab === 'signup' ? '#10A37F' : '#8E8EA0',
                                        borderBottom: activeTab === 'signup' ? 2 : 0,
                                        borderColor: '#10A37F',
                                        borderRadius: 0,
                                        textTransform: 'none',
                                        fontSize: '1rem',
                                        '&:hover': {
                                            bgcolor: 'transparent',
                                            color: activeTab === 'signup' ? '#10A37F' : '#ECECF1',
                                        },
                                    }}
                                >
                                    Sign Up
                                </Button>
                            </Box>
                        </Box>

                        {/* Login Form */}
                        {activeTab === 'login' && (
                            <form onSubmit={handleLogin}>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    disabled={isLoggingIn}
                                    sx={{
                                        mb: 2,
                                        '& .MuiOutlinedInput-root': {
                                            color: '#ECECF1',
                                            bgcolor: '#303030',
                                            '& fieldset': { borderColor: '#565869' },
                                            '&:hover fieldset': { borderColor: '#8E8EA0' },
                                            '&.Mui-focused fieldset': { borderColor: '#10A37F' },
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: '#8E8EA0',
                                            '&.Mui-focused': { color: '#10A37F' },
                                        },
                                    }}
                                />
                                <TextField
                                    fullWidth
                                    label="Password"
                                    type="password"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    disabled={isLoggingIn}
                                    sx={{
                                        mb: 3,
                                        '& .MuiOutlinedInput-root': {
                                            color: '#ECECF1',
                                            bgcolor: '#303030',
                                            '& fieldset': { borderColor: '#565869' },
                                            '&:hover fieldset': { borderColor: '#8E8EA0' },
                                            '&.Mui-focused fieldset': { borderColor: '#10A37F' },
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: '#8E8EA0',
                                            '&.Mui-focused': { color: '#10A37F' },
                                        },
                                    }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={isLoggingIn}
                                    fullWidth
                                    sx={{
                                        py: 1.5,
                                        bgcolor: '#10A37F',
                                        color: '#FFFFFF',
                                        '&:hover': { bgcolor: '#0D8A6A' },
                                        '&:disabled': { bgcolor: '#565869', color: '#8E8EA0' },
                                    }}
                                >
                                    {isLoggingIn ? (
                                        <CircularProgress size={20} sx={{ color: '#FFFFFF' }} />
                                    ) : (
                                        'Login'
                                    )}
                                </Button>
                            </form>
                        )}

                        {/* Signup Form */}
                        {activeTab === 'signup' && (
                            <form onSubmit={handleSignup}>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    value={signupEmail}
                                    onChange={(e) => setSignupEmail(e.target.value)}
                                    disabled={isSigningUp}
                                    sx={{
                                        mb: 2,
                                        '& .MuiOutlinedInput-root': {
                                            color: '#ECECF1',
                                            bgcolor: '#303030',
                                            '& fieldset': { borderColor: '#565869' },
                                            '&:hover fieldset': { borderColor: '#8E8EA0' },
                                            '&.Mui-focused fieldset': { borderColor: '#10A37F' },
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: '#8E8EA0',
                                            '&.Mui-focused': { color: '#10A37F' },
                                        },
                                    }}
                                />
                                <TextField
                                    fullWidth
                                    label="Password"
                                    type="password"
                                    value={signupPassword1}
                                    onChange={(e) => setSignupPassword1(e.target.value)}
                                    disabled={isSigningUp}
                                    sx={{
                                        mb: 2,
                                        '& .MuiOutlinedInput-root': {
                                            color: '#ECECF1',
                                            bgcolor: '#303030',
                                            '& fieldset': { borderColor: '#565869' },
                                            '&:hover fieldset': { borderColor: '#8E8EA0' },
                                            '&.Mui-focused fieldset': { borderColor: '#10A37F' },
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: '#8E8EA0',
                                            '&.Mui-focused': { color: '#10A37F' },
                                        },
                                    }}
                                />
                                <TextField
                                    fullWidth
                                    label="Confirm Password"
                                    type="password"
                                    value={signupPassword2}
                                    onChange={(e) => setSignupPassword2(e.target.value)}
                                    disabled={isSigningUp}
                                    sx={{
                                        mb: 3,
                                        '& .MuiOutlinedInput-root': {
                                            color: '#ECECF1',
                                            bgcolor: '#303030',
                                            '& fieldset': { borderColor: '#565869' },
                                            '&:hover fieldset': { borderColor: '#8E8EA0' },
                                            '&.Mui-focused fieldset': { borderColor: '#10A37F' },
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: '#8E8EA0',
                                            '&.Mui-focused': { color: '#10A37F' },
                                        },
                                    }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={isSigningUp}
                                    fullWidth
                                    sx={{
                                        py: 1.5,
                                        bgcolor: '#10A37F',
                                        color: '#FFFFFF',
                                        '&:hover': { bgcolor: '#0D8A6A' },
                                        '&:disabled': { bgcolor: '#565869', color: '#8E8EA0' },
                                    }}
                                >
                                    {isSigningUp ? (
                                        <CircularProgress size={20} sx={{ color: '#FFFFFF' }} />
                                    ) : (
                                        'Sign Up'
                                    )}
                                </Button>
                            </form>
                        )}

                        {/* Error Display */}
                        {(loginError || signupError) && (
                            <Alert severity="error" sx={{ mt: 2, bgcolor: '#444654', color: '#ECECF1' }}>
                                {activeTab === 'login' ? loginError : signupError}
                            </Alert>
                        )}
                    </Box>
                </Box>
            )}

            {authStatus === 'authenticated' && (
                <Box sx={{
                    display: 'flex',
                    flex: 1,
                    minHeight: 0
                }}>
                    {/* Left Sidebar */}
                    <Box sx={{
                        width: 250,
                        borderRight: 1,
                        borderColor: '#565869',
                        bgcolor: '#212121',
                        flexShrink: 0,
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                    }}>
                        <Typography variant="h6" sx={{ color: '#ECECF1', mb: 2 }}>
                            Settings
                        </Typography>

                        {/* Mode Selector */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ color: '#8E8EA0', mb: 1 }}>
                                Mode Selector
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {[1, 2, 3, 4].map((modeOption) => (
                                    <Box key={modeOption} sx={{ display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="radio"
                                            id={`mode-${modeOption}`}
                                            name="mode"
                                            value={modeOption}
                                            checked={mode === modeOption}
                                            onChange={(e) => setMode(Number(e.target.value))}
                                            style={{
                                                accentColor: '#10A37F',
                                                marginRight: '8px'
                                            }}
                                        />
                                        <label
                                            htmlFor={`mode-${modeOption}`}
                                            style={{
                                                color: '#ECECF1',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            Mode {modeOption}
                                        </label>
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        {/* Topic ID Field */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ color: '#8E8EA0', mb: 1 }}>
                                Topic ID
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                value={topicId}
                                onChange={(e) => setTopicId(e.target.value)}
                                placeholder="Enter Topic ID (optional)"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: '#ECECF1',
                                        bgcolor: '#303030',
                                        '& fieldset': { borderColor: '#565869' },
                                        '&:hover fieldset': { borderColor: '#8E8EA0' },
                                        '&.Mui-focused fieldset': { borderColor: '#10A37F' },
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: '#8E8EA0',
                                        '&.Mui-focused': { color: '#10A37F' },
                                    },
                                    '& .MuiInputBase-input': {
                                        color: '#ECECF1',
                                        '&::placeholder': { color: '#8E8EA0', opacity: 1 },
                                    },
                                }}
                            />
                        </Box>
                    </Box>

                    {/* Main Chat Area */}
                    <Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0
                    }}>
                        {/* Chat Messages Area */}
                        <Box sx={{
                            flex: 1,
                            overflow: 'auto',
                            p: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            bgcolor: '#212121',
                            minHeight: 0
                        }}>
                            <Container maxWidth={false} sx={{ maxWidth: '1100px', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                {messages.map((message, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                                            mb: 1,
                                            position: 'relative',
                                        }}
                                    >
                                        <Paper
                                            sx={{
                                                p: 1.5,
                                                pb: 5.25, // 30px bottom padding (5.25 * 8px = 42px)
                                                maxWidth: '70%',
                                                bgcolor: message.role === 'user' ? '#303030' : '#212121',
                                                color: message.role === 'user' ? '#FFFFFF' : '#ECECF1',
                                                borderRadius: message.role === 'user' ? 2 : 0,
                                                border: 'none',
                                                position: 'relative',
                                            }}
                                        >
                                            {message.role === 'user' ? (
                                                <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap', fontSize: '1.1rem' }}>
                                                    {message.content}
                                                </Typography>
                                            ) : (
                                                <Box
                                                    sx={{
                                                        fontSize: '1.1rem',
                                                        lineHeight: 1.8,
                                                        '& h1, & h2, & h3, & h4, & h5, & h6': { mt: 1, mb: 1, fontWeight: 'bold', color: '#ECECF1' },
                                                        '& p': { mb: 1, color: '#ECECF1' },
                                                        '& ul, & ol': { mb: 1, pl: 2, color: '#ECECF1' },
                                                        '& li': { mb: 0.5, color: '#ECECF1' },
                                                        '& code': { bgcolor: '#565869', color: '#ECECF1', px: 0.5, borderRadius: 0.5, fontFamily: 'monospace' },
                                                        '& pre': { bgcolor: '#565869', color: '#ECECF1', p: 1, borderRadius: 1, overflow: 'auto', mb: 1 },
                                                        '& blockquote': { borderLeft: 3, borderColor: '#10A37F', pl: 2, ml: 0, mb: 1, color: '#ECECF1' },
                                                        '& a': { color: '#F5F5DC', textDecoration: 'underline' },
                                                        '& strong': { fontWeight: 'bold', color: '#ECECF1' },
                                                        '& em': { fontStyle: 'italic', color: '#ECECF1' },
                                                    }}
                                                >
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            a: ({ node, ...props }) => (
                                                                <a {...props} target="_blank" rel="noopener noreferrer" />
                                                            ),
                                                        }}
                                                    >
                                                        {message.content}
                                                    </ReactMarkdown>
                                                </Box>
                                            )}

                                            {/* Copy Icon */}
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 4,
                                                    right: 4,
                                                    opacity: 0.7,
                                                    '&:hover': { opacity: 1 },
                                                }}
                                            >
                                                <Tooltip title="Copy to clipboard" placement="top">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => copyToClipboard(message.content, message.role === 'assistant')}
                                                        sx={{
                                                            color: message.role === 'user' ? '#FFFFFF' : '#ECECF1',
                                                            bgcolor: message.role === 'user' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.1)',
                                                            '&:hover': {
                                                                bgcolor: message.role === 'user' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.2)',
                                                            },
                                                        }}
                                                    >
                                                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Paper>
                                    </Box>
                                ))}

                                {isLoading && (
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                                        <Paper sx={{
                                            p: 1.5,
                                            bgcolor: '#444654',
                                            borderRadius: 0,
                                            border: 'none'
                                        }}>
                                            <CircularProgress size={20} sx={{ color: '#10A37F' }} />
                                        </Paper>
                                    </Box>
                                )}

                                {/* Invisible element for auto-scroll */}
                                <div ref={messagesEndRef} />
                            </Container>
                        </Box>

                        {/* Error Display */}
                        {error && (
                            <Box sx={{ p: 1, bgcolor: '#212121', flexShrink: 0 }}>
                                <Container maxWidth={false} sx={{ maxWidth: '1100px' }}>
                                    <Alert severity="error" sx={{
                                        bgcolor: '#444654',
                                        color: '#ECECF1',
                                        '& .MuiAlert-icon': { color: '#FF6B6B' }
                                    }}>
                                        {error}
                                    </Alert>
                                </Container>
                            </Box>
                        )}

                        {/* Input Area */}
                        <Box sx={{
                            p: 1,
                            pb: 4,
                            borderTop: 1,
                            borderColor: '#565869',
                            bgcolor: '#212121',
                            flexShrink: 0
                        }}>
                            <Container maxWidth={false} sx={{ maxWidth: '1100px' }}>
                                <form onSubmit={handleSubmit}>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={3}
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    if (chatInput.trim() && !isLoading) {
                                                        handleSubmit(e as any);
                                                    }
                                                }
                                            }}
                                            placeholder="Type your message here... (Press Enter to send)"
                                            disabled={isLoading}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                    color: '#ECECF1',
                                                    bgcolor: '#303030',
                                                    '& fieldset': { borderColor: 'transparent' },
                                                    '&:hover fieldset': { borderColor: 'transparent' },
                                                    '&.Mui-focused fieldset': { borderColor: 'transparent' },
                                                },
                                                '& .MuiInputBase-input': {
                                                    color: '#ECECF1',
                                                    lineHeight: 2.2,
                                                    '&::placeholder': { color: '#8E8EA0', opacity: 1 },
                                                },
                                            }}
                                        />
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            disabled={isLoading || !chatInput.trim()}
                                            sx={{
                                                minWidth: 50,
                                                borderRadius: 2,
                                                px: 2,
                                                bgcolor: '#10A37F',
                                                color: '#FFFFFF',
                                                '&:hover': { bgcolor: '#0D8A6A' },
                                                '&:disabled': { bgcolor: '#565869', color: '#8E8EA0' },
                                            }}
                                        >
                                            {isLoading ? (<CircularProgress size={20} sx={{ color: '#FFFFFF' }} />) : (<SendIcon />)}
                                        </Button>
                                    </Box>
                                </form>
                            </Container>
                        </Box>
                    </Box>
                </Box>
            )}
        </Box>
    );
} 