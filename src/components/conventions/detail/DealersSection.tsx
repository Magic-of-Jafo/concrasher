'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid'; // Specific import for Grid
import NextLink from 'next/link';
import { getS3ImageUrl } from '@/lib/defaults';
import { DISPLAY, BODY } from '@/lib/fonts';
import { SectionKicker } from './VenueSection';

// House Lights reskin (2026-07-10): dealer tiles as panel cards; artwork sits
// on a white plate so logos read on both themes.

// Based on prisma/schema.prisma
// NOTE: The actual data passed in will need to be populated with the
// related profile data (user, talent, or brand) by the API.
interface PopulatedDealerLink {
    id: string;
    displayNameOverride?: string | null;
    descriptionOverride?: string | null;
    profileType: 'USER' | 'TALENT' | 'BRAND';
    // Populated data:
    name: string;
    profileImageUrl?: string | null;
    profileLink: string;
}

interface DealersSectionProps {
    convention: {
        dealerLinks?: PopulatedDealerLink[];
    };
}

export default function DealersSection({ convention }: DealersSectionProps) {
    const dealers = convention.dealerLinks || [];

    if (dealers.length === 0) {
        return (
            <Box sx={{ py: 1 }}>
                <SectionKicker>Dealers</SectionKicker>
                <Typography sx={{ fontFamily: BODY, fontSize: '0.95rem', color: 'var(--cc-muted)' }}>
                    The list of exhibitors has not been announced yet.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ py: 1 }}>
            <SectionKicker>Dealers</SectionKicker>
            <Grid container spacing={2}>
                {dealers.map((dealer) => (
                    // @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error
                    <Grid item xs={12} sm={6} md={4} key={dealer.id}>
                        <Box
                            component={dealer.profileLink ? NextLink : 'div'}
                            href={dealer.profileLink || undefined}
                            sx={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                height: '100%', textAlign: 'center', textDecoration: 'none',
                                borderRadius: '12px',
                                backgroundColor: 'var(--cc-panel)',
                                border: '1px solid var(--cc-panel-border)',
                                p: 2,
                                transition: 'border-color 0.18s ease-out, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                                '&:hover': dealer.profileLink
                                    ? { borderColor: 'var(--cc-cyan)', transform: 'translateY(-2px)' }
                                    : undefined,
                                '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
                                '@media (prefers-reduced-motion: reduce)': {
                                    transition: 'border-color 0.18s',
                                    '&:hover': { transform: 'none' },
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 110, height: 110, mb: 1.25,
                                    borderRadius: '8px', backgroundColor: '#ffffff',
                                    border: '1px solid var(--cc-hairline)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden',
                                }}
                            >
                                {dealer.profileImageUrl ? (
                                    <Box
                                        component="img"
                                        src={getS3ImageUrl(dealer.profileImageUrl)}
                                        alt=""
                                        loading="lazy"
                                        sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                    />
                                ) : (
                                    <Typography component="span" sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '1.75rem', color: 'var(--cc-gold-ink)' }}>
                                        {(dealer.displayNameOverride || dealer.name || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2)}
                                    </Typography>
                                )}
                            </Box>
                            <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '1rem', color: 'var(--cc-ink)' }}>
                                {dealer.displayNameOverride || dealer.name}
                            </Typography>
                            {dealer.descriptionOverride && (
                                <Typography sx={{ fontFamily: BODY, fontSize: '0.82rem', color: 'var(--cc-muted)', mt: 0.5 }}>
                                    {dealer.descriptionOverride}
                                </Typography>
                            )}
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
