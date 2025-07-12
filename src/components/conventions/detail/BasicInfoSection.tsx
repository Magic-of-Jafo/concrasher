'use client';

import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Chip,
    Stack,
    Container,
    Avatar,
    Link as MuiLink,
    Button,
    Divider,
} from '@mui/material';
import { ConventionStatus } from '@prisma/client';
import Link from 'next/link';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EventIcon from '@mui/icons-material/Event';
import WebIcon from '@mui/icons-material/Web';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { getS3ImageUrl } from '@/lib/defaults';

interface BasicInfoSectionProps {
    convention: any;
}

const statusColors: Record<ConventionStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info'> = {
    [ConventionStatus.DRAFT]: 'default',
    [ConventionStatus.PUBLISHED]: 'primary',
    [ConventionStatus.PAST]: 'secondary',
    [ConventionStatus.CANCELLED]: 'error',
};

const statusLabels: Record<ConventionStatus, string> = {
    [ConventionStatus.DRAFT]: 'Draft',
    [ConventionStatus.PUBLISHED]: 'Published',
    [ConventionStatus.PAST]: 'Past Event',
    [ConventionStatus.CANCELLED]: 'Cancelled',
};

export default function BasicInfoSection({ convention }: BasicInfoSectionProps) {
    const profileImageUrl = getS3ImageUrl(convention.profileImageUrl);
    const coverImageUrl = getS3ImageUrl(convention.coverImageUrl);

    // Format location display
    const locationDisplay = [
        convention.city,
        convention.stateAbbreviation || convention.stateName,
        convention.country
    ].filter(Boolean).join(', ');

    // Format date display for one-day or multi-day events
    const formatConventionDates = () => {
        if (convention.isTBD || !convention.startDate) {
            return 'TBD';
        }

        const startDate = new Date(convention.startDate);
        const endDate = convention.endDate ? new Date(convention.endDate) : null;

        if (convention.isOneDayEvent || !endDate || startDate.toDateString() === endDate.toDateString()) {
            return startDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        }

        return `${startDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric'
        })} - ${endDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })}`;
    };

    // Only show status chip if NOT published
    const shouldShowStatus = convention.status !== ConventionStatus.PUBLISHED;

    // Registration button logic
    const hasRegistrationUrl = convention.registrationUrl &&
        convention.status === ConventionStatus.PUBLISHED;

    return (
        <Paper elevation={1} sx={{ mb: 3 }}>
            {/* Cover Image */}
            {coverImageUrl && (
                <Box
                    sx={{
                        width: '100%',
                        height: { xs: 200, md: 300 },
                        backgroundImage: `url(${coverImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: '4px 4px 0 0',
                        position: 'relative',
                    }}
                >
                    {/* Status Chip - Only if not published */}
                    {shouldShowStatus && (
                        <Box sx={{ position: 'absolute', top: 16, left: 16 }}>
                            <Chip
                                label={statusLabels[convention.status as ConventionStatus] || 'Unknown'}
                                color={statusColors[convention.status as ConventionStatus] || 'default'}
                                size="small"
                            />
                        </Box>
                    )}
                </Box>
            )}

            {/* No cover image but still need status chip */}
            {!coverImageUrl && shouldShowStatus && (
                <Box sx={{ p: 2 }}>
                    <Chip
                        label={statusLabels[convention.status as ConventionStatus] || 'Unknown'}
                        color={statusColors[convention.status as ConventionStatus] || 'default'}
                        size="small"
                    />
                </Box>
            )}

            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
                    {/* Left Column - Main Info */}
                    <Box sx={{ flex: 1 }}>
                        <Stack spacing={3}>
                            {/* Convention Name */}
                            <Typography variant="h1" component="h1" gutterBottom>
                                {convention.name}
                            </Typography>

                            {/* Convention Series */}
                            {convention.series && (
                                <Box>
                                    <Typography variant="subtitle1" color="text.secondary">
                                        Part of the{' '}
                                        <MuiLink component={Link} href={`/series/${convention.series.slug}`}>
                                            {convention.series.name}
                                        </MuiLink>{' '}
                                        series
                                    </Typography>
                                </Box>
                            )}

                            {/* Main Description - Handle rich text */}
                            {convention.descriptionMain && (
                                <Box>
                                    <Typography
                                        variant="body1"
                                        component="div"
                                        sx={{
                                            '& p': { mb: 2 },
                                            '& ul, & ol': { mb: 2, pl: 2 },
                                            '& li': { mb: 0.5 },
                                            '& h1, & h2, & h3, & h4, & h5, & h6': { mb: 1, mt: 2 },
                                            '& a': { color: 'primary.main', textDecoration: 'underline' },
                                        }}
                                        dangerouslySetInnerHTML={{ __html: convention.descriptionMain }}
                                    />
                                </Box>
                            )}
                        </Stack>
                    </Box>

                    {/* Right Column - Profile Image and Info */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: { md: 250 } }}>
                        {/* Registration Button - Prominent placement */}
                        <Box sx={{ mb: 3, width: '100%' }}>
                            <Button
                                variant="contained"
                                size="large"
                                href={hasRegistrationUrl ? convention.registrationUrl : undefined}
                                target={hasRegistrationUrl ? "_blank" : undefined}
                                rel={hasRegistrationUrl ? "noopener noreferrer" : undefined}
                                disabled={!hasRegistrationUrl}
                                sx={{
                                    width: '100%',
                                    ...(hasRegistrationUrl ? {} : {
                                        bgcolor: 'grey.400',
                                        color: 'grey.600',
                                        '&:hover': {
                                            bgcolor: 'grey.500',
                                        }
                                    })
                                }}
                            >
                                {hasRegistrationUrl ? 'Click here to Register' : 'Check back for register link'}
                            </Button>
                        </Box>

                        <Avatar
                            src={profileImageUrl}
                            alt={`${convention.name} profile`}
                            sx={{
                                width: { xs: 150, md: 200 },
                                height: { xs: 150, md: 200 },
                                border: '4px solid',
                                borderColor: 'primary.main',
                                mb: 3,
                            }}
                        />

                        {/* Convention Information */}
                        <Stack spacing={2} sx={{ width: '100%', textAlign: 'center' }}>
                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                {formatConventionDates()}
                            </Typography>

                            {/* Location Information */}
                            {locationDisplay && (
                                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                    {locationDisplay}
                                </Typography>
                            )}

                            {/* Website Link */}
                            {convention.websiteUrl && (
                                <MuiLink
                                    href={convention.websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                        wordBreak: 'break-all',
                                        color: 'primary.main',
                                        textDecoration: 'underline',
                                        '&:hover': {
                                            textDecoration: 'none',
                                        }
                                    }}
                                >
                                    {convention.websiteUrl}
                                </MuiLink>
                            )}
                        </Stack>
                    </Box>
                </Box>
            </Container>
        </Paper>
    );
} 