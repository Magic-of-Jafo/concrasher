'use client';

import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Avatar,
    Button,
} from '@mui/material';
import NextLink from 'next/link';

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
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Dealers
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    The list of exhibitors has not been announced yet.
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Dealers
            </Typography>
            <Grid container spacing={3}>
                {dealers.map((dealer) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={dealer.id}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Avatar
                                    variant="square"
                                    src={dealer.profileImageUrl || undefined}
                                    alt={dealer.displayNameOverride || dealer.name}
                                    sx={{ width: 120, height: 120, margin: '0 auto 16px', bgcolor: 'transparent', '& img': { objectFit: 'contain' } }}
                                />
                                <Typography variant="h6" component="div">
                                    {dealer.displayNameOverride || dealer.name}
                                </Typography>
                                {dealer.descriptionOverride && (
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        {dealer.descriptionOverride}
                                    </Typography>
                                )}
                                {dealer.profileLink && (
                                    <Button
                                        component={NextLink}
                                        href={dealer.profileLink}
                                        variant="text"
                                    >
                                        View Profile
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
} 