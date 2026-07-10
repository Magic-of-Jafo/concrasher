'use client';

import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import { DISPLAY, BODY } from '@/lib/fonts';
import { SectionKicker } from './VenueSection';

// House Lights reskin (2026-07-10): panel cards on the theme surface. All
// booking/website/map links leave the site, so they open in a new tab.

const outlineButtonSx = {
    fontFamily: DISPLAY,
    fontWeight: 700,
    textTransform: 'none',
    color: 'var(--cc-ink)',
    border: '1px solid var(--cc-panel-border)',
    borderRadius: '8px',
    px: 2,
    minHeight: 44,
    '&:hover': { borderColor: 'var(--cc-cyan)', backgroundColor: 'var(--cc-panel)' },
    '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
} as const;

const HotelCard = ({ hotel, isCompact = false }: { hotel: any; isCompact?: boolean }) => {
    if (!hotel) return null;

    return (
        <Box
            sx={{
                borderRadius: '12px',
                backgroundColor: 'var(--cc-panel)',
                border: '1px solid var(--cc-panel-border)',
                p: isCompact ? 1.75 : 2.5,
                mb: 2,
                height: '100%',
            }}
        >
            <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: isCompact ? '1rem' : '1.2rem', color: 'var(--cc-ink)' }}>
                {hotel.hotelName}
            </Typography>
            {hotel.description && (
                <Box
                    sx={{
                        mt: 1, mb: 1.5,
                        fontFamily: BODY, fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--cc-muted)',
                        '& p': { margin: '0.5rem 0' },
                        '& ul, & ol': { paddingLeft: '1.5rem' },
                        '& a': { color: 'var(--cc-cyan)' },
                        '& h1, & h2, & h3, & h4, & h5, & h6': { margin: '1rem 0 0.5rem 0', color: 'var(--cc-ink)', fontFamily: DISPLAY },
                    }}
                    dangerouslySetInnerHTML={{ __html: hotel.description }}
                />
            )}
            {hotel.streetAddress && (
                <Typography sx={{ fontFamily: BODY, fontSize: '0.88rem', color: 'var(--cc-muted)' }}>{hotel.streetAddress}</Typography>
            )}
            {(hotel.city || hotel.stateRegion || hotel.postalCode) && (
                <Typography sx={{ fontFamily: BODY, fontSize: '0.88rem', color: 'var(--cc-muted)' }}>
                    {[[hotel.city, hotel.stateRegion].filter(Boolean).join(', '), hotel.postalCode].filter(Boolean).join(' ')}
                </Typography>
            )}
            {(hotel.groupPrice || hotel.groupRateOrBookingCode || hotel.bookingCutoffDate) && (
                <Box sx={{ mt: 1.5, p: 1.75, backgroundColor: 'var(--cc-bg)', border: '1px solid var(--cc-panel-border)', borderRadius: '8px' }}>
                    <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.9rem', color: 'var(--cc-ink)' }}>
                        Convention Room Rate
                    </Typography>
                    {hotel.groupPrice && (
                        <Typography sx={{ fontFamily: BODY, fontSize: '0.9rem', color: 'var(--cc-muted)' }}>{hotel.groupPrice}</Typography>
                    )}
                    {hotel.groupRateOrBookingCode && (
                        <Typography sx={{ fontFamily: BODY, fontSize: '0.9rem', color: 'var(--cc-muted)' }}>
                            Booking code: <Box component="strong" sx={{ color: 'var(--cc-ink)' }}>{hotel.groupRateOrBookingCode}</Box>
                        </Typography>
                    )}
                    {hotel.bookingCutoffDate && (
                        <Typography suppressHydrationWarning sx={{ fontFamily: BODY, fontSize: '0.9rem', fontWeight: 700, color: 'var(--cc-live)' }}>
                            Book by {new Date(hotel.bookingCutoffDate).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' })} for this rate
                        </Typography>
                    )}
                </Box>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                {hotel.bookingLink && (
                    <Button href={hotel.bookingLink} target="_blank" rel="noopener noreferrer" size={isCompact ? 'small' : 'medium'} sx={outlineButtonSx}>
                        Book Room ↗
                    </Button>
                )}
                {hotel.websiteUrl && !hotel.bookingLink && (
                    <Button href={hotel.websiteUrl} target="_blank" rel="noopener noreferrer" size={isCompact ? 'small' : 'medium'} sx={outlineButtonSx}>
                        Hotel Website ↗
                    </Button>
                )}
                {hotel.websiteUrl && hotel.bookingLink && hotel.websiteUrl !== hotel.bookingLink && (
                    <Button href={hotel.websiteUrl} target="_blank" rel="noopener noreferrer" size={isCompact ? 'small' : 'medium'} sx={outlineButtonSx}>
                        Website ↗
                    </Button>
                )}
                {hotel.googleMapsUrl && (
                    <Button startIcon={<MapIcon />} href={hotel.googleMapsUrl} target="_blank" rel="noopener noreferrer" size={isCompact ? 'small' : 'medium'} sx={outlineButtonSx}>
                        Map
                    </Button>
                )}
            </Stack>
        </Box>
    );
};

export default function HotelSection({ convention }: { convention: any }) {
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
            <Box sx={{ py: 1 }}>
                <SectionKicker>Hotel</SectionKicker>
                <Typography sx={{ fontFamily: BODY, fontSize: '0.95rem', color: 'var(--cc-muted)' }}>
                    Hotel information is not yet available.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ py: 1 }}>
            <SectionKicker>Hotel</SectionKicker>
            {primaryHotel && <HotelCard hotel={primaryHotel} isCompact={false} />}
            {otherHotels.length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Typography component="h3" sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '1.05rem', color: 'var(--cc-ink)', mb: 1.5 }}>
                        Additional Hotels &amp; Accommodations
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
