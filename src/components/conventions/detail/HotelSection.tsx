'use client';

import React from 'react';
import { Box, Typography, Paper, Button, Stack } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';

const HotelCard = ({ hotel }: { hotel: any }) => {
    if (!hotel) return null;

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">{hotel.name}</Typography>
            <Typography variant="body1">{hotel.streetAddress}</Typography>
            <Typography variant="body1">{`${hotel.city}, ${hotel.stateRegion} ${hotel.postalCode}`}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button
                    variant="outlined"
                    startIcon={<MapIcon />}
                    disabled={!hotel.googleMapsUrl}
                    href={hotel.googleMapsUrl}
                    target="_blank"
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
        ? { ...primaryVenue, name: primaryVenue.venueName } // Adapt venue to look like a hotel
        : convention.hotels?.find((h: any) => h.isPrimaryHotel);

    const otherHotels = isVenueAlsoHotel
        ? []
        : convention.hotels?.filter((h: any) => !h.isPrimaryHotel) || [];

    if (!primaryHotel) {
        return (
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h4" component="h2" gutterBottom>
                    Hotel
                </Typography>
                <Typography>Hotel information is not yet available.</Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h4" component="h2" gutterBottom>
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
                    Book your room at {primaryHotel.name}
                </Button>
            )}
            <HotelCard hotel={primaryHotel} />
            {otherHotels.length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h5" component="h3" gutterBottom>
                        Other Nearby Hotels
                    </Typography>
                    {otherHotels.map((hotel: any) => (
                        <HotelCard key={hotel.id} hotel={hotel} />
                    ))}
                </Box>
            )}
        </Paper>
    );
} 