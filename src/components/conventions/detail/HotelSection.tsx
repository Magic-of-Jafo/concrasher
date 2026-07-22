'use client';

import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import { DISPLAY, BODY } from '@/lib/fonts';
import { getS3ImageUrl } from '@/lib/defaults';
import { toAbsoluteUrl } from '@/lib/url';
import { clarityEvent } from '@/lib/clarity';

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
    const photo = hotel.photos?.[0];

    // Non-compact (primary) always gets an image column, with a text fallback.
    // Compact (additional-hotel) cards only get one when a photo exists —
    // otherwise they stay text-only. The image sits beside the content at `lg`
    // for the primary card, at `sm` for the tighter compact cards.
    const showImage = photo || !isCompact;
    const imgSide = isCompact ? 'sm' : 'lg';

    return (
        <Box
            sx={{
                borderRadius: '12px',
                backgroundColor: 'var(--cc-panel)',
                border: '1px solid var(--cc-panel-border)',
                mb: 2,
                height: '100%',
                overflow: 'hidden',
                display: showImage
                    ? (isCompact ? { xs: 'block', sm: 'grid' } : { xs: 'block', lg: 'grid' })
                    : 'block',
                gridTemplateColumns: showImage
                    ? (isCompact
                        ? { sm: 'minmax(150px, 32%) minmax(0, 1fr)' }
                        : { lg: 'minmax(320px, 42%) minmax(0, 1fr)' })
                    : undefined,
            }}
        >
            {showImage && (
                <Box
                    sx={{
                        height: isCompact ? { xs: 140, sm: '100%' } : { xs: 150, sm: 'auto', lg: '100%' },
                        minHeight: isCompact ? { sm: 140 } : { lg: 320 },
                        aspectRatio: isCompact ? { xs: '16 / 9', sm: 'auto' } : { xs: 'auto', sm: '16 / 9', lg: 'auto' },
                        background: 'var(--cc-hero-scene)',
                        backgroundSize: 'var(--cc-hero-bokeh-size)',
                        borderBottom: { xs: '1px solid var(--cc-hairline)', [imgSide]: 'none' },
                        borderRight: { xs: 'none', [imgSide]: '1px solid var(--cc-hairline)' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        '@media (hover: hover)': { '&:hover img': { transform: 'scale(1.05)' } },
                    }}
                >
                    {photo ? (
                        <Box
                            component="img"
                            src={getS3ImageUrl(photo.url)}
                            alt={photo.caption || hotel.hotelName || ''}
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                                transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                            }}
                        />
                    ) : (
                        <Typography sx={{ fontFamily: DISPLAY, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--cc-hero-sub)' }}>
                            {hotel.hotelName}
                        </Typography>
                    )}
                </Box>
            )}
            <Box sx={{ p: isCompact ? 1.75 : { xs: 2.5, lg: 3 } }}>
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
                    <Button href={toAbsoluteUrl(hotel.bookingLink)} target="_blank" rel="noopener noreferrer" onClick={() => clarityEvent('book_room_click')} size={isCompact ? 'small' : 'medium'} sx={outlineButtonSx}>
                        Book Room ↗
                    </Button>
                )}
                {hotel.websiteUrl && !hotel.bookingLink && (
                    <Button href={toAbsoluteUrl(hotel.websiteUrl)} target="_blank" rel="noopener noreferrer" size={isCompact ? 'small' : 'medium'} sx={outlineButtonSx}>
                        Hotel Website ↗
                    </Button>
                )}
                {hotel.websiteUrl && hotel.bookingLink && hotel.websiteUrl !== hotel.bookingLink && (
                    <Button href={toAbsoluteUrl(hotel.websiteUrl)} target="_blank" rel="noopener noreferrer" size={isCompact ? 'small' : 'medium'} sx={outlineButtonSx}>
                        Website ↗
                    </Button>
                )}
                {hotel.googleMapsUrl && (
                    <Button startIcon={<MapIcon />} href={toAbsoluteUrl(hotel.googleMapsUrl)} target="_blank" rel="noopener noreferrer" size={isCompact ? 'small' : 'medium'} sx={outlineButtonSx}>
                        Map
                    </Button>
                )}
            </Stack>
            </Box>
        </Box>
    );
};

export default function HotelSection({ convention }: { convention: any }) {
    // Stay-at-venue: the venue IS the host lodging, so it takes the primary
    // card (unless a hotel is explicitly flagged primary) and every hotel
    // record presents as an overflow hotel. Otherwise the flagged primary,
    // or failing that the first record, leads.
    const isVenueAlsoHotel = convention.guestsStayAtPrimaryVenue;
    const primaryVenue = convention.venues?.find((v: any) => v.isPrimaryVenue);
    const explicitPrimary = convention.hotels?.find((h: any) => h.isPrimaryHotel) ?? null;
    const hotelRecordPrimary = explicitPrimary
        ?? (isVenueAlsoHotel ? null : (convention.hotels?.[0] ?? null));
    const primaryHotel = hotelRecordPrimary
        ?? (isVenueAlsoHotel && primaryVenue
            ? { ...primaryVenue, hotelName: primaryVenue.venueName } // Adapt venue to look like a hotel
            : undefined);

    const otherHotels = convention.hotels?.filter((h: any) => h !== hotelRecordPrimary) || [];

    // Same weight/size as the Additional Hotel(s) heading below so the two
    // section titles read as siblings.
    const headingSx = { fontFamily: DISPLAY, fontWeight: 800, fontSize: '1.05rem', color: 'var(--cc-ink)', mb: 1.5 } as const;

    if (!primaryHotel && otherHotels.length === 0) {
        return (
            <Box sx={{ py: 1 }}>
                <Typography component="h2" sx={headingSx}>Primary Hotel</Typography>
                <Typography sx={{ fontFamily: BODY, fontSize: '0.95rem', color: 'var(--cc-muted)' }}>
                    Hotel information is not yet available.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ py: 1 }}>
            {primaryHotel && (
                <>
                    <Typography component="h2" sx={headingSx}>Primary Hotel</Typography>
                    <HotelCard hotel={primaryHotel} isCompact={false} />
                </>
            )}
            {otherHotels.length > 0 && (
                <Box sx={{ mt: primaryHotel ? 4 : 0 }}>
                    {/* Without a primary card the group heading is just "Hotels" —
                        "Additional" would beg the question: additional to what? */}
                    <Typography component={primaryHotel ? 'h3' : 'h2'} sx={headingSx}>
                        {primaryHotel
                            ? (otherHotels.length > 1 ? 'Additional Hotels' : 'Additional Hotel')
                            : 'Hotels'}
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
