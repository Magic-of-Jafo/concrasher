'use client';

import React from 'react';
import { Box, Typography, Paper, Button, Stack, useTheme, useMediaQuery } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';

const HotelCard = ({ hotel, isCompact = false }: { hotel: any, isCompact?: boolean }) => {
    if (!hotel) return null;

    return (
        <Paper sx={{ p: isCompact ? 1.5 : 2, mb: 2, height: '100%' }}>
            <Typography variant={isCompact ? 'subtitle1' : 'h6'} sx={{ fontWeight: 'bold' }}>{hotel.hotelName}</Typography>
            {hotel.description && (
                <Box
                    sx={{
                        mt: 1,
                        mb: 2,
                        '& p': { margin: '0.5rem 0' },
                        '& ul, & ol': { paddingLeft: '1.5rem' },
                        '& h1, & h2, & h3, & h4, & h5, & h6': { margin: '1rem 0 0.5rem 0' }
                    }}
                    dangerouslySetInnerHTML={{ __html: hotel.description }}
                />
            )}
            {hotel.streetAddress && <Typography variant={isCompact ? 'body2' : 'body1'}>{hotel.streetAddress}</Typography>}
            {(hotel.city || hotel.stateRegion || hotel.postalCode) &&
                <Typography variant={isCompact ? 'body2' : 'body1'}>
                    {[[hotel.city, hotel.stateRegion].filter(Boolean).join(', '), hotel.postalCode].filter(Boolean).join(' ')}
                </Typography>
            }
            {(hotel.groupPrice || hotel.groupRateOrBookingCode || hotel.bookingCutoffDate) && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant={isCompact ? 'subtitle2' : 'subtitle1'} sx={{ fontWeight: 'bold' }}>
                        Convention Room Rate
                    </Typography>
                    {hotel.groupPrice && (
                        <Typography variant={isCompact ? 'body2' : 'body1'}>{hotel.groupPrice}</Typography>
                    )}
                    {hotel.groupRateOrBookingCode && (
                        <Typography variant={isCompact ? 'body2' : 'body1'}>
                            Booking code: <strong>{hotel.groupRateOrBookingCode}</strong>
                        </Typography>
                    )}
                    {hotel.bookingCutoffDate && (
                        <Typography variant={isCompact ? 'body2' : 'body1'} color="warning.main">
                            Book by {new Date(hotel.bookingCutoffDate).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' })} for this rate
                        </Typography>
                    )}
                </Box>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                {hotel.bookingLink && (
                    <Button
                        variant="contained"
                        href={hotel.bookingLink}
                        target="_blank"
                        size={isCompact ? 'small' : 'medium'}
                    >
                        Book Room
                    </Button>
                )}
                {hotel.websiteUrl && !hotel.bookingLink && (
                    <Button
                        variant="contained"
                        href={hotel.websiteUrl}
                        target="_blank"
                        size={isCompact ? 'small' : 'medium'}
                    >
                        Hotel Website
                    </Button>
                )}
                {hotel.websiteUrl && hotel.bookingLink && hotel.websiteUrl !== hotel.bookingLink && (
                    <Button
                        variant="outlined"
                        href={hotel.websiteUrl}
                        target="_blank"
                        size={isCompact ? 'small' : 'medium'}
                    >
                        Website
                    </Button>
                )}
                {hotel.googleMapsUrl && (
                    <Button
                        variant="outlined"
                        startIcon={<MapIcon />}
                        href={hotel.googleMapsUrl}
                        target="_blank"
                        size={isCompact ? 'small' : 'medium'}
                    >
                        Map
                    </Button>
                )}
            </Stack>
        </Paper>
    );
};

export default function HotelSection({ convention }: { convention: any }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Responsive h1 Typography styles
    const h1Styles = {
        fontSize: { xs: '2rem', md: '3rem' },
        lineHeight: { xs: 1.2, md: 1.167 },
    };

    // Prefer real hotel records (they carry group rates/booking info); fall
    // back to presenting the venue as the hotel when the organizer set the
    // guests-stay-at-venue flag without adding a hotel record.
    const isVenueAlsoHotel = convention.guestsStayAtPrimaryVenue;
    const primaryVenue = convention.venues?.find((v: any) => v.isPrimaryVenue);
    const hotelRecordPrimary = convention.hotels?.find((h: any) => h.isPrimaryHotel) || convention.hotels?.[0];
    const primaryHotel = hotelRecordPrimary
        ?? (isVenueAlsoHotel && primaryVenue
            ? { ...primaryVenue, hotelName: primaryVenue.venueName } // Adapt venue to look like a hotel
            : undefined);

    const otherHotels = convention.hotels?.filter((h: any) => h !== hotelRecordPrimary) || [];

    if (!primaryHotel) {
        return (
            <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
                <Typography variant="h1" component="h2" gutterBottom sx={h1Styles}>
                    Hotel
                </Typography>
                <Typography>Hotel information is not yet available.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
            <Typography variant="h1" component="h2" gutterBottom sx={h1Styles}>
                Hotel
            </Typography>
            {primaryHotel?.websiteUrl && (
                <Button
                    variant="contained"
                    size="large"
                    href={primaryHotel.websiteUrl}
                    target="_blank"
                    sx={{ mb: 2 }}
                >
                    Book your room at {primaryHotel.hotelName}
                </Button>
            )}
            {primaryHotel && <HotelCard hotel={primaryHotel} isCompact={false} />}
            {otherHotels.length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h5" component="h3" gutterBottom>
                        Additional Hotels & Accommodations
                    </Typography>
                    <Stack spacing={2}>
                        {otherHotels.map((hotel: any) => (
                            <HotelCard key={hotel.id} hotel={hotel} isCompact={true} />
                        ))}
                    </Stack>
                </Box>
            )}
        </Box>
    );
} 