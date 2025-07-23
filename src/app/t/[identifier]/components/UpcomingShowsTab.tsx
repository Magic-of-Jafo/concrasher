'use client';

import React from 'react';
import { Box, Typography, Card, CardContent, Chip, Link } from '@mui/material';
import { CalendarToday as CalendarIcon, LocationOn as LocationIcon, Event as EventIcon } from '@mui/icons-material';
import { ConventionStatus } from '@prisma/client';

interface UpcomingShowsTabProps {
    conventions: Array<{
        id: string;
        convention: {
            id: string;
            name: string;
            startDate: Date | null;
            endDate: Date | null;
            city: string | null;
            country: string | null;
            status: ConventionStatus;
        };
    }>;
}

const UpcomingShowsTab: React.FC<UpcomingShowsTabProps> = ({ conventions }) => {
    const formatDateRange = (startDate: Date | null, endDate: Date | null) => {
        if (!startDate) return 'TBD';

        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : null;

        const options: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        };

        if (!end || start.toDateString() === end.toDateString()) {
            return start.toLocaleDateString('en-US', options);
        }

        const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = end.toLocaleDateString('en-US', options);

        return `${startStr} - ${endStr}`;
    };

    const formatLocation = (city: string | null, country: string | null) => {
        if (!city && !country) return 'Location TBD';
        if (!country) return city;
        if (!city) return country;
        return `${city}, ${country}`;
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Upcoming Appearances
            </Typography>

            {conventions.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {conventions.map((booking) => (
                        <Card key={booking.id} variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600, flex: 1 }}>
                                        {booking.convention.name}
                                    </Typography>
                                    <Chip
                                        label="Confirmed"
                                        size="small"
                                        color="success"
                                        variant="outlined"
                                        sx={{ ml: 2 }}
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', flex: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CalendarIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {formatDateRange(booking.convention.startDate, booking.convention.endDate)}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <LocationIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {formatLocation(booking.convention.city, booking.convention.country)}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                        More details will be available as the event approaches
                                    </Typography>

                                    <Link
                                        href={`/conventions/${booking.convention.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        variant="body2"
                                        sx={{
                                            color: 'primary.main',
                                            textDecoration: 'none',
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            '&:hover': {
                                                textDecoration: 'underline',
                                            },
                                        }}
                                    >
                                        View Convention →
                                    </Link>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            ) : (
                <Box
                    sx={{
                        textAlign: 'center',
                        py: 6,
                        px: 2,
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        color: 'text.secondary',
                    }}
                >
                    <EventIcon sx={{ fontSize: '3rem', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
                        No Upcoming Shows
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.9rem', mb: 2 }}>
                        This talent doesn't have any upcoming convention appearances scheduled.
                    </Typography>
                    <Chip
                        label="Bookings Coming Soon"
                        size="small"
                        variant="outlined"
                        sx={{ opacity: 0.7 }}
                    />
                </Box>
            )}
        </Box>
    );
};

export default UpcomingShowsTab; 