'use client';

import React from 'react';
import { Box, Typography, Button, Container, Chip } from '@mui/material';
import { PersonOff as PersonOffIcon } from '@mui/icons-material';
import Link from 'next/link';

interface InactiveTalentProfileProps {
    user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
    };
}

const InactiveTalentProfile: React.FC<InactiveTalentProfileProps> = ({ user }) => {
    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Cover Image Area */}
            <Box
                sx={{
                    height: { xs: 120, sm: 180 },
                    background: 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)',
                    position: 'relative',
                }}
            />

            <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
                {/* Profile Type Indicator */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 2,
                        mt: { xs: -6, sm: -8 },
                        mb: 1,
                    }}
                >
                    <Chip
                        label="Talent Profile"
                        size="small"
                        sx={{
                            backgroundColor: 'rgba(158, 158, 158, 0.1)',
                            color: '#9e9e9e',
                            border: '1px solid rgba(158, 158, 158, 0.3)',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                        }}
                    />
                    <Typography
                        component="a"
                        href={`/u/${user.id}`}
                        variant="body2"
                        sx={{
                            color: 'primary.main',
                            textDecoration: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            '&:hover': {
                                textDecoration: 'underline',
                            },
                        }}
                    >
                        View User Profile →
                    </Typography>
                </Box>

                {/* Inactive Message */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '50vh',
                        textAlign: 'center',
                        px: 2,
                    }}
                >
                    <PersonOffIcon
                        sx={{
                            fontSize: { xs: '4rem', sm: '6rem' },
                            color: 'text.secondary',
                            mb: 3,
                            opacity: 0.5,
                        }}
                    />

                    <Typography
                        variant="h1"
                        sx={{
                            fontSize: { xs: '2rem', sm: '3rem' },
                            fontWeight: 'bold',
                            mb: 2,
                            color: 'text.primary',
                        }}
                    >
                        Profile Currently Not Active
                    </Typography>

                    <Typography
                        variant="body1"
                        sx={{
                            fontSize: { xs: '1rem', sm: '1.1rem' },
                            color: 'text.secondary',
                            mb: 4,
                            maxWidth: 500,
                            lineHeight: 1.6,
                        }}
                    >
                        {userName}'s talent profile is currently not active.
                        The profile may be temporarily disabled or under maintenance.
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Button
                            component={Link}
                            href={`/u/${user.id}`}
                            variant="contained"
                            size="large"
                            sx={{ minWidth: 140 }}
                        >
                            View User Profile
                        </Button>

                        <Button
                            component={Link}
                            href="/conventions"
                            variant="outlined"
                            size="large"
                            sx={{ minWidth: 140 }}
                        >
                            Browse Conventions
                        </Button>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
};

export default InactiveTalentProfile; 