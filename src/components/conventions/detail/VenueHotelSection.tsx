'use client';

import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Link,
    Divider,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HotelIcon from '@mui/icons-material/Hotel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface VenueHotelSectionProps {
    convention: any;
}

const VenueHotelCard = ({ entity, type, isPrimary = false }: { entity: any, type: 'venue' | 'hotel', isPrimary?: boolean }) => {
    const {
        venueName,
        hotelName,
        streetAddress,
        city,
        stateRegion,
        postalCode,
        country,
        websiteUrl,
        googleMapsUrl,
        // Hotel specific fields
        description,
        amenities,
        contactEmail,
        contactPhone,
        groupRateOrBookingCode,
        groupPrice,
        bookingLink,
        bookingCutoffDate,
        parkingInfo,
        publicTransportInfo,
        overallAccessibilityNotes
    } = entity;

    const name = venueName || hotelName;
    const address = [streetAddress, city, stateRegion, postalCode, country].filter(Boolean).join(', ');

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant="h6" component="div" gutterBottom>
                    {type === 'venue' ? <LocationOnIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> : <HotelIcon sx={{ mr: 1, verticalAlign: 'middle' }} />}
                    {name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    {address}
                </Typography>
                {websiteUrl && (
                    <Link href={websiteUrl} target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-block', mr: 2 }}>
                        Website
                    </Link>
                )}
                {googleMapsUrl && (
                    <Link href={googleMapsUrl} target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-block' }}>
                        View on Google Maps
                    </Link>
                )}

                {isPrimary && (
                    <Box mt={2}>
                        <Divider sx={{ my: 2 }} />

                        <Accordion>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls="panel1a-content"
                                id="panel1a-header"
                            >
                                <Typography>Details</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box>
                                    {description && <Box mb={2} dangerouslySetInnerHTML={{ __html: description }} />}

                                    {type === 'hotel' && (groupPrice || bookingLink || groupRateOrBookingCode) && (
                                        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                                            <Typography variant="h6" gutterBottom>Booking Information</Typography>
                                            {groupPrice && <Typography variant="body1"><b>Group Rate:</b> {groupPrice}</Typography>}
                                            {groupRateOrBookingCode && <Typography variant="body1"><b>Code:</b> {groupRateOrBookingCode}</Typography>}
                                            {bookingCutoffDate && <Typography variant="body1"><b>Book by:</b> {new Date(bookingCutoffDate).toLocaleDateString()}</Typography>}
                                            {bookingLink && <Button variant="contained" href={bookingLink} target="_blank" sx={{ mt: 1 }}>Book Now</Button>}
                                        </Paper>
                                    )}

                                    {amenities && amenities.length > 0 && (
                                        <Box mb={2}>
                                            <Typography variant="subtitle1"><b>Amenities:</b></Typography>
                                            <Typography variant="body2">{amenities.join(', ')}</Typography>
                                        </Box>
                                    )}
                                    {(parkingInfo || publicTransportInfo || overallAccessibilityNotes) && (
                                        <Box mb={2}>
                                            <Typography variant="h6" gutterBottom>Venue Information</Typography>
                                            {parkingInfo && <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}><b>Parking:</b> {parkingInfo}</Typography>}
                                            {publicTransportInfo && <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}><b>Public Transport:</b> {publicTransportInfo}</Typography>}
                                            {overallAccessibilityNotes && <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}><b>Accessibility:</b> {overallAccessibilityNotes}</Typography>}
                                        </Box>
                                    )}
                                    {(contactEmail || contactPhone) && (
                                        <Box>
                                            <Typography variant="subtitle1"><b>Contact:</b></Typography>
                                            {contactEmail && <Typography variant="body2">{contactEmail}</Typography>}
                                            {contactPhone && <Typography variant="body2">{contactPhone}</Typography>}
                                        </Box>
                                    )}
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default function VenueHotelSection({ convention }: VenueHotelSectionProps) {
    const { venues = [], hotels = [] } = convention;

    const primaryVenue = venues.find((v: any) => v.isPrimaryVenue);
    const secondaryVenues = venues.filter((v: any) => !v.isPrimaryVenue);
    const primaryHotel = hotels.find((h: any) => h.isPrimaryHotel);
    const additionalHotels = hotels.filter((h: any) => !h.isPrimaryHotel);

    if (!primaryVenue && !primaryHotel && secondaryVenues.length === 0 && additionalHotels.length === 0) {
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

            {primaryVenue && (
                <Box mb={4}>
                    <Typography variant="h5" gutterBottom>Primary Venue</Typography>
                    <VenueHotelCard entity={primaryVenue} type="venue" isPrimary={true} />
                </Box>
            )}

            {secondaryVenues.length > 0 && (
                <Box mb={4}>
                    <Typography variant="h5" gutterBottom>Additional Venues</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {secondaryVenues.map((venue: any) => (
                            <Box key={venue.id} sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                                <VenueHotelCard entity={venue} type="venue" />
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}

            <Divider sx={{ my: 4 }} />

            {primaryHotel && (
                <Box mb={4}>
                    <Typography variant="h5" gutterBottom>Primary Hotel</Typography>
                    <VenueHotelCard entity={primaryHotel} type="hotel" isPrimary={true} />
                </Box>
            )}

            {additionalHotels.length > 0 && (
                <Box mb={4}>
                    <Typography variant="h5" gutterBottom>Additional Hotels</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {additionalHotels.map((hotel: any) => (
                            <Box key={hotel.id} sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                                <VenueHotelCard entity={hotel} type="hotel" />
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
        </Paper>
    );
} 