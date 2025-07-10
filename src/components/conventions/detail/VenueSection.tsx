'use client';

import React from 'react';
import { Box, Typography, Paper, Button, Grid, Stack } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';

const VenueCard = ({ venue, isCompact = false }: { venue: any, isCompact?: boolean }) => {
    if (!venue) return null;

    return (
        <Paper sx={{ p: isCompact ? 1.5 : 2, mb: 2, height: '100%' }}>
            <Typography variant={isCompact ? 'subtitle1' : 'h6'} sx={{ fontWeight: 'bold' }}>{venue.venueName}</Typography>
            {venue.streetAddress && <Typography variant={isCompact ? 'body2' : 'body1'}>{venue.streetAddress}</Typography>}
            {(venue.city || venue.stateRegion || venue.postalCode) &&
                <Typography variant={isCompact ? 'body2' : 'body1'}>{`${venue.city || ''}, ${venue.stateRegion || ''} ${venue.postalCode || ''}`.replace(/ ,|,$/g, '')}</Typography>
            }
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button
                    variant="outlined"
                    startIcon={<MapIcon />}
                    disabled={!venue.googleMapsUrl}
                    href={venue.googleMapsUrl}
                    target="_blank"
                    size={isCompact ? 'small' : 'medium'}
                >
                    Map
                </Button>
            </Stack>
        </Paper>
    );
};


export default function VenueSection({ convention }: { convention: any }) {
    const primaryVenue = convention.venues?.find((v: any) => v.isPrimaryVenue);
    const secondaryVenues = convention.venues?.filter((v: any) => !v.isPrimaryVenue) || [];

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h4" component="h2" gutterBottom>
                Venue
            </Typography>
            {primaryVenue?.websiteUrl && (
                <Button
                    variant="contained"
                    size="large"
                    href={primaryVenue.websiteUrl}
                    target="_blank"
                    sx={{ mb: 2 }}
                >
                    Book your room at {primaryVenue.venueName}
                </Button>
            )}
            {primaryVenue && <VenueCard venue={primaryVenue} isCompact={false} />}
            {secondaryVenues.length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h5" component="h3" gutterBottom>
                        Secondary Venues
                    </Typography>
                    <Grid container spacing={2}>
                        {secondaryVenues.map((venue: any) => (
                            <Grid item key={venue.id} xs={12} sm={6} md={4}>
                                <VenueCard venue={venue} isCompact={true} />
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}
        </Paper>
    );
} 