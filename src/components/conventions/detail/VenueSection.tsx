'use client';

import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import Grid from '@mui/material/Grid';
import MapIcon from '@mui/icons-material/Map';
import { getS3ImageUrl } from '@/lib/defaults';
import { toAbsoluteUrl } from '@/lib/url';
import { DISPLAY, BODY } from '@/lib/fonts';

// House Lights reskin (2026-07-10): panel cards on the theme surface, one
// photo band per venue (spec: every venue makes room for at least one image;
// the hero scene stands in until the organizer uploads photos).

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
    '&.Mui-disabled': { color: 'var(--cc-soft)', borderColor: 'var(--cc-hairline)' },
} as const;

const htmlSx = {
    fontFamily: BODY,
    fontSize: '0.9rem',
    lineHeight: 1.65,
    color: 'var(--cc-muted)',
    '& p': { margin: '0.5rem 0' },
    '& ul, & ol': { paddingLeft: '1.5rem' },
    '& a': { color: 'var(--cc-cyan)' },
    '& h1, & h2, & h3, & h4, & h5, & h6': { margin: '1rem 0 0.5rem 0', color: 'var(--cc-ink)', fontFamily: DISPLAY },
} as const;

export function SectionKicker({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            component="h2"
            sx={{
                fontFamily: DISPLAY, fontSize: '0.75rem', fontWeight: 800,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'var(--cc-magenta)', textShadow: 'var(--cc-glow-magenta)', mb: 2,
            }}
        >
            {children}
        </Typography>
    );
}

const VenueCard = ({ venue, isCompact = false }: { venue: any; isCompact?: boolean }) => {
    if (!venue) return null;
    const photo = venue.photos?.[0];

    return (
        <Box
            sx={{
                borderRadius: '12px',
                backgroundColor: 'var(--cc-panel)',
                border: '1px solid var(--cc-panel-border)',
                overflow: 'hidden',
                mb: 2,
                height: '100%',
                display: isCompact ? 'block' : { xs: 'block', lg: 'grid' },
                gridTemplateColumns: isCompact ? undefined : { lg: 'minmax(320px, 42%) minmax(0, 1fr)' },
            }}
        >
            {/* The photo band: every venue reserves this space. */}
            <Box
                sx={{
                    height: isCompact ? 110 : { xs: 150, sm: 'auto', lg: '100%' },
                    minHeight: isCompact ? undefined : { lg: 320 },
                    aspectRatio: isCompact ? undefined : { xs: 'auto', sm: '16 / 9', lg: 'auto' },
                    background: 'var(--cc-hero-scene)',
                    backgroundSize: 'var(--cc-hero-bokeh-size)',
                    borderBottom: isCompact ? '1px solid var(--cc-hairline)' : { xs: '1px solid var(--cc-hairline)', lg: 'none' },
                    borderRight: isCompact ? 'none' : { xs: 'none', lg: '1px solid var(--cc-hairline)' },
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    // Subtle zoom on hover (pointer devices only).
                    '@media (hover: hover)': { '&:hover img': { transform: 'scale(1.05)' } },
                }}
            >
                {photo ? (
                    <Box
                        component="img"
                        src={getS3ImageUrl(photo.url)}
                        alt={photo.caption || venue.venueName || ''}
                        sx={{
                            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                            transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                        }}
                    />
                ) : (
                    <Typography sx={{ fontFamily: DISPLAY, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--cc-hero-sub)' }}>
                        {venue.venueName}
                    </Typography>
                )}
            </Box>

            <Box sx={{ p: isCompact ? 1.75 : { xs: 2.5, lg: 3 } }}>
                <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: isCompact ? '1rem' : '1.2rem', color: 'var(--cc-ink)' }}>
                    {venue.venueName}
                </Typography>
                {venue.description && (
                    <Box sx={{ mt: 1, mb: 1.5, ...htmlSx }} dangerouslySetInnerHTML={{ __html: venue.description }} />
                )}
                {venue.streetAddress && (
                    <Typography sx={{ fontFamily: BODY, fontSize: '0.88rem', color: 'var(--cc-muted)' }}>{venue.streetAddress}</Typography>
                )}
                {(venue.city || venue.stateRegion || venue.postalCode) && (
                    <Typography sx={{ fontFamily: BODY, fontSize: '0.88rem', color: 'var(--cc-muted)' }}>
                        {`${venue.city || ''}, ${venue.stateRegion || ''} ${venue.postalCode || ''}`.replace(/ ,|,$/g, '')}
                    </Typography>
                )}
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                    <Button
                        startIcon={<MapIcon />}
                        disabled={!venue.googleMapsUrl}
                        href={toAbsoluteUrl(venue.googleMapsUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        size={isCompact ? 'small' : 'medium'}
                        sx={outlineButtonSx}
                    >
                        Map
                    </Button>
                </Stack>
            </Box>
        </Box>
    );
};

export default function VenueSection({ convention }: { convention: any }) {
    const primaryVenue = convention.venues?.find((v: any) => v.isPrimaryVenue);
    const secondaryVenues = convention.venues?.filter((v: any) => !v.isPrimaryVenue) || [];

    return (
        <Box sx={{ py: 1 }}>
            <SectionKicker>Venue</SectionKicker>
            {(primaryVenue?.bookingLink || primaryVenue?.websiteUrl) && (
                <Button
                    href={toAbsoluteUrl(primaryVenue.bookingLink || primaryVenue.websiteUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ ...outlineButtonSx, mb: 2 }}
                >
                    {convention.guestsStayAtPrimaryVenue
                        ? `Book your room at ${primaryVenue.venueName} ↗`
                        : 'Venue website ↗'}
                </Button>
            )}
            {convention.guestsStayAtPrimaryVenue && primaryVenue &&
                (primaryVenue.groupPrice || primaryVenue.groupRateOrBookingCode || primaryVenue.bookingCutoffDate) && (
                <Box sx={{ mb: 2, p: 1.75, backgroundColor: 'var(--cc-panel)', border: '1px solid var(--cc-panel-border)', borderRadius: '8px', maxWidth: 480 }}>
                    <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.9rem', color: 'var(--cc-ink)' }}>
                        Convention Room Rate
                    </Typography>
                    {primaryVenue.groupPrice && (
                        <Typography sx={{ fontFamily: BODY, fontSize: '0.9rem', color: 'var(--cc-muted)' }}>{primaryVenue.groupPrice}</Typography>
                    )}
                    {primaryVenue.groupRateOrBookingCode && (
                        <Typography sx={{ fontFamily: BODY, fontSize: '0.9rem', color: 'var(--cc-muted)' }}>
                            Booking code: <Box component="strong" sx={{ color: 'var(--cc-ink)' }}>{primaryVenue.groupRateOrBookingCode}</Box>
                        </Typography>
                    )}
                    {primaryVenue.bookingCutoffDate && (
                        <Typography suppressHydrationWarning sx={{ fontFamily: BODY, fontSize: '0.9rem', fontWeight: 700, color: 'var(--cc-live)' }}>
                            Book by {new Date(primaryVenue.bookingCutoffDate).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' })} for this rate
                        </Typography>
                    )}
                </Box>
            )}
            {primaryVenue && <VenueCard venue={primaryVenue} isCompact={false} />}
            {!primaryVenue && (
                <Typography sx={{ fontFamily: BODY, fontSize: '0.95rem', color: 'var(--cc-muted)' }}>
                    Venue details have not been announced yet.
                </Typography>
            )}
            {secondaryVenues.length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Typography component="h3" sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '1.05rem', color: 'var(--cc-ink)', mb: 1.5 }}>
                        Secondary Venues
                    </Typography>
                    <Grid container spacing={2}>
                        {secondaryVenues.map((venue: any) => (
                            // @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error
                            <Grid item key={venue.id} xs={12} sm={6} md={4}>
                                <VenueCard venue={venue} isCompact={true} />
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}
        </Box>
    );
}
