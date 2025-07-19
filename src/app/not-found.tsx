import { Box, Typography, Button, Container } from '@mui/material';
import Link from 'next/link';
import { getS3ImageUrl } from '@/lib/defaults';

export default function NotFound() {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                backgroundColor: '#01264b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffc1', // Light yellow color
            }}
        >
            <Container maxWidth="md">
                <Box
                    sx={{
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    {/* Logo */}
                    <Box sx={{ mb: 2 }}>
                        <img
                            src={getS3ImageUrl('/images/defaults/convention-crasher-logo.png')}
                            alt="Convention Crasher Logo"
                            style={{
                                width: '200px',
                                height: 'auto',
                            }}
                        />
                    </Box>

                    {/* 404 Text */}
                    <Typography
                        variant="h1"
                        sx={{
                            fontFamily: 'Montserrat',
                            fontWeight: 900,
                            fontSize: { xs: '4rem', sm: '6rem', md: '8rem' },
                            color: '#ffffc1',
                            lineHeight: 1,
                            mb: 2,
                        }}
                    >
                        404
                    </Typography>

                    {/* Error Message */}
                    <Typography
                        variant="h2"
                        sx={{
                            fontFamily: 'Montserrat',
                            fontWeight: 700,
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                            color: '#ffffc1',
                            mb: 2,
                        }}
                    >
                        Page Not Found
                    </Typography>

                    <Typography
                        variant="body1"
                        sx={{
                            fontSize: { xs: '1rem', sm: '1.125rem' },
                            color: '#ffffc1',
                            opacity: 0.9,
                            maxWidth: '600px',
                            mb: 4,
                        }}
                    >
                        The page you're looking for doesn't exist or has been moved.
                        Don't worry though - there are plenty of amazing conventions to discover!
                    </Typography>

                    {/* Action Buttons */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: 2,
                            justifyContent: 'center',
                        }}
                    >
                        <Button
                            component={Link}
                            href="/"
                            variant="contained"
                            size="large"
                            sx={{
                                backgroundColor: '#ffffc1',
                                color: '#01264b',
                                fontFamily: 'Montserrat',
                                fontWeight: 700,
                                px: 4,
                                py: 1.5,
                                '&:hover': {
                                    backgroundColor: '#e8e8d0',
                                },
                            }}
                        >
                            Go Home
                        </Button>

                        <Button
                            component={Link}
                            href="/conventions"
                            variant="outlined"
                            size="large"
                            sx={{
                                borderColor: '#ffffc1',
                                color: '#ffffc1',
                                fontFamily: 'Montserrat',
                                fontWeight: 600,
                                px: 4,
                                py: 1.5,
                                '&:hover': {
                                    borderColor: '#e8e8d0',
                                    backgroundColor: 'rgba(255, 255, 193, 0.1)',
                                },
                            }}
                        >
                            Browse Conventions
                        </Button>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
} 