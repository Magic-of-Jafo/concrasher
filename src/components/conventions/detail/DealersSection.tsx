'use client';

import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Card,
    CardContent,
    Avatar,
    Button,
    CardActionArea,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid'; // Specific import for Grid
import NextLink from 'next/link';
import { getS3ImageUrl } from '@/lib/defaults';

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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Responsive h1 Typography styles
    const h1Styles = {
        fontSize: { xs: '2rem', md: '3rem' },
        lineHeight: { xs: 1.2, md: 1.167 },
    };

    const dealers = convention.dealerLinks || [];

    if (dealers.length === 0) {
        return (
            <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
                <Typography variant="h1" component="h1" gutterBottom sx={h1Styles}>
                    Dealers
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    The list of exhibitors has not been announced yet.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
            <Typography variant="h1" component="h1" gutterBottom sx={h1Styles}>
                Dealers
            </Typography>
            <Grid container spacing={3}>
                {dealers.map((dealer) => (
                    // @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error
                    <Grid item xs={12} sm={6} md={4} key={dealer.id}>
                        <Card sx={{ height: '100%', borderRadius: '8px' }}>
                            <NextLink href={dealer.profileLink || '#'} passHref legacyBehavior>
                                <CardActionArea sx={{ height: '100%' }}>
                                    <CardContent sx={{ textAlign: 'center', p: '12px' }}>
                                        <Avatar
                                            variant="square"
                                            src={getS3ImageUrl(dealer.profileImageUrl) || undefined}
                                            alt={dealer.displayNameOverride || dealer.name}
                                            sx={{ width: 120, height: 120, margin: '0 auto 8px', bgcolor: 'transparent', '& img': { objectFit: 'contain' } }}
                                        />
                                        <Typography variant="h6" component="div">
                                            {dealer.displayNameOverride || dealer.name}
                                        </Typography>
                                        {dealer.descriptionOverride && (
                                            <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 0 }}>
                                                {dealer.descriptionOverride}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </CardActionArea>
                            </NextLink>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
} 