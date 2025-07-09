'use client';

import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Link as MuiLink,
    Divider,
    Button,
    Tabs,
    Tab,
    CardActionArea
} from '@mui/material';
import NextLink from 'next/link';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useTheme } from '@mui/material/styles';


interface VenueHotelSectionProps {
    convention: any;
}

const VenueHotelCard = ({ entity, type }: { entity: any, type: 'venue' | 'hotel' }) => {
    const theme = useTheme();
    const {
        id,
        venueName,
        hotelName,
        description,
        streetAddress,
        city,
        stateRegion,
        postalCode,
        country,
        googleMapsUrl,
    } = entity;

    const name = venueName || hotelName;
    const address = [streetAddress, city, stateRegion, postalCode, country].filter(Boolean).join(', ');

    // Fallback to google maps search query if no explicit link
    const mapLink = googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    const entityPath = type === 'venue' ? 'venues' : 'hotels';
    // The convention object passed down may not have its own ID if it was looked up by slug
    // We would need to pass the convention ID down to build this link properly.
    // For now, this will be a non-functional link.
    const editPath = `/organizer/${entityPath}/${id}/edit`; // Placeholder

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <NextLink href={editPath} passHref legacyBehavior>
                <CardActionArea sx={{ flexGrow: 1 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <MuiLink
                                href={mapLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                sx={{ textDecoration: 'none', textAlign: 'center', mr: 2, color: 'text.primary' }}
                            >
                                <LocationOnIcon />
                                <Typography variant="caption" display="block">Map</Typography>
                            </MuiLink>
                            <Typography variant="h6" component="div">
                                {name}
                            </Typography>
                        </Box>

                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ minHeight: '40px' }}>
                            {address}
                        </Typography>
                        <Box
                            sx={{
                                ...theme.typography.body2,
                                mt: 1,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                '& p': { margin: 0 },
                            }}
                            dangerouslySetInnerHTML={{ __html: description || '' }}
                        />
                    </CardContent>
                </CardActionArea>
            </NextLink>
        </Card>
    );
};

export default function VenueHotelSection({ convention }: VenueHotelSectionProps) {
    const [currentTab, setCurrentTab] = useState(0);

    const { venues = [], hotels = [] } = convention;

    const primaryVenue = venues.find((v: any) => v.isPrimaryVenue);
    const secondaryVenues = venues.filter((v: any) => !v.isPrimaryVenue);
    const primaryHotel = hotels.find((h: any) => h.isPrimaryHotel);
    const additionalHotels = hotels.filter((h: any) => !h.isPrimaryHotel);

    const allVenues = [
        ...(primaryVenue ? [{ ...primaryVenue, isPrimary: true }] : []),
        ...secondaryVenues.map((v: any) => ({ ...v, isPrimary: false }))
    ];

    const allHotels = [
        ...(primaryHotel ? [{ ...primaryHotel, isPrimary: true }] : []),
        ...additionalHotels.map((h: any) => ({ ...h, isPrimary: false }))
    ];

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    if (venues.length === 0 && hotels.length === 0) {
        return (
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Venue & Hotel Information
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Venue and hotel information is not yet available for this convention.
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Venue & Hotel Information
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={currentTab} onChange={handleTabChange} aria-label="Venue and Hotel Tabs">
                    <Tab label={`Venues (${venues.length})`} disabled={venues.length === 0} />
                    <Tab label={`Hotels (${hotels.length})`} disabled={hotels.length === 0} />
                </Tabs>
            </Box>

            {currentTab === 0 && (
                <Grid container spacing={2}>
                    {allVenues.map((venue: any) => (
                        <Grid item key={venue.id} xs={12} sm={6} md={4}>
                            <VenueHotelCard entity={venue} type="venue" />
                        </Grid>
                    ))}
                </Grid>
            )}

            {currentTab === 1 && (
                <Grid container spacing={2}>
                    {allHotels.map((hotel: any) => (
                        <Grid item key={hotel.id} xs={12} sm={6} md={4}>
                            <VenueHotelCard entity={hotel} type="hotel" />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Paper>
    );
} 