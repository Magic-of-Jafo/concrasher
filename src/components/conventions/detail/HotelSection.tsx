'use client';

import React from 'react';
import { Box, Typography, Paper, Button, Stack } from '@mui/material';
import Grid from '@mui/material/Grid';
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
                <Typography variant={isCompact ? 'body2' : 'body1'}>{`${hotel.city || ''}, ${hotel.stateRegion || ''} ${hotel.postalCode || ''}`.replace(/ ,|,$/g, '')}</Typography>
            }
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button
                    variant="outlined"
                    startIcon={<MapIcon />}
                    disabled={!hotel.googleMapsUrl}
                    href={hotel.googleMapsUrl}
                    target="_blank"
                    size={isCompact ? 'small' : 'medium'}
                >
                    Map
                </Button>
            </Stack>
        </Paper>
    );
};

export default function HotelSection({ convention }: { convention: any }) {
    const isVenueAlsoHotel = convention.settings?.guestsStayAtPrimaryVenue;
    const primaryVenue = convention.venues?.find((v: any) => v.isPrimaryVenue);
    const primaryHotel = isVenueAlsoHotel
        ? { ...primaryVenue, hotelName: primaryVenue.venueName } // Adapt venue to look like a hotel
        : convention.hotels?.find((h: any) => h.isPrimaryHotel);

    const otherHotels = isVenueAlsoHotel
        ? []
        : convention.hotels?.filter((h: any) => !h.isPrimaryHotel) || [];

    if (!primaryHotel) {
        return (
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h1" component="h2" gutterBottom>
                    Hotel
                </Typography>
                <Typography>Hotel information is not yet available.</Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h1" component="h2" gutterBottom>
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
                        Additional Hotels
                    </Typography>
                    <Grid container spacing={2}>
                        {otherHotels.map((hotel: any) => (
                            // @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error
                            <Grid item key={hotel.id} xs={12} sm={6} md={4}>
                                <HotelCard hotel={hotel} isCompact={true} />
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}
        </Paper>
    );
} 