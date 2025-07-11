// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
// import { TextField, Box, Typography, Grid } from '@mui/material'; // Old import
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid'; // Changed import for Grid
import {
  VenueHotelTabData,
  VenueData, // Or the specific type for a single venue
  createDefaultVenueHotelTabData,
  createDefaultVenue, // Assuming this is the correct name
  VenuePhotoData
} from '@/lib/validators';

interface VenueFormProps {
  venue: VenueData;
  onChange: (updatedVenue: VenueData) => void;
  errors?: Record<string, string>; // Added errors prop
}

// Assuming VenuePhotoData is an object, e.g., { url: string; caption?: string }
// For now, photo editing will be a placeholder.
const VenuePhotosEditorPlaceholder: React.FC<{ photos: VenuePhotoData[], onChange: (photos: VenuePhotoData[]) => void }> = ({ photos, onChange }) => {
  return (
    <Box mt={2} p={2} border="1px dashed grey">
      <Typography variant="subtitle2">Photo Management (Placeholder)</Typography>
      {/* TODO: Implement photo upload, display, and removal logic */}
      <Typography variant="body2" color="textSecondary">
        Currently showing {photos.length} photo(s). Actual photo management UI to be implemented.
      </Typography>
    </Box>
  );
};


const VenueForm: React.FC<VenueFormProps> = ({ venue, onChange, errors = {} }) => {

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const name = event.target.name;
    const value = event.target.value;
    onChange({ ...venue, [name]: value });
  };

  const handleAmenitiesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Assuming amenities are stored as an array of strings.
    // For simplicity in this form, we'll take comma-separated input.
    const amenitiesArray = event.target.value.split(',').map(s => s.trim()).filter(s => s);
    onChange({ ...venue, amenities: amenitiesArray });
  };

  const handlePhotosChange = (updatedPhotos: VenuePhotoData[]) => {
    onChange({ ...venue, photos: updatedPhotos });
  };

  const handleSecondaryVenueChange = (index: number, field: keyof VenueData, fieldValue: any) => {
    const newData = { ...venue }; // value is VenueHotelTabData
    // value.secondaryVenues should always exist as per schema default
    const updatedVenues = [...(newData.secondaryVenues || [])]; // Defensive spread
    updatedVenues[index] = { ...updatedVenues[index], [field]: fieldValue };

    // Update the main state
    onChange({ ...newData, secondaryVenues: updatedVenues });
    validateDataAndNotifyParent({ ...newData, secondaryVenues: updatedVenues });
  };

  const addSecondaryVenue = () => {
    const newData = { ...venue };
    const currentSecondaryVenues = newData.secondaryVenues || [];
    onChange({
      ...newData,
      secondaryVenues: [...currentSecondaryVenues, createDefaultVenue()],
    });
  };

  return (
    <Box component="form" noValidate autoComplete="off">
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Venue Name"
            name="venueName"
            value={venue.venueName || ''}
            onChange={handleChange}
            margin="normal"
            required
            error={!!errors?.venueName}
            helperText={errors?.venueName || ''}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Website URL"
            name="websiteUrl"
            value={venue.websiteUrl || ''}
            onChange={handleChange}
            margin="normal"
            error={!!errors?.websiteUrl}
            helperText={errors?.websiteUrl || ''}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={venue.description || ''}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={3}
            error={!!errors?.description}
            helperText={errors?.description || ''}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Google Maps URL"
            name="googleMapsUrl"
            value={venue.googleMapsUrl || ''}
            onChange={handleChange}
            margin="normal"
            error={!!errors?.googleMapsUrl}
            helperText={errors?.googleMapsUrl || ''}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Contact Email"
            name="contactEmail"
            type="email"
            value={venue.contactEmail || ''}
            onChange={handleChange}
            margin="normal"
            error={!!errors?.contactEmail}
            helperText={errors?.contactEmail || ''}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Contact Phone"
            name="contactPhone"
            value={venue.contactPhone || ''}
            onChange={handleChange}
            margin="normal"
            error={!!errors?.contactPhone}
            helperText={errors?.contactPhone || ''}
          />
        </Grid>

        {/* Address Fields */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Address</Typography>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Street Address"
            name="streetAddress"
            value={venue.streetAddress || ''}
            onChange={handleChange}
            margin="dense"
            error={!!errors?.streetAddress}
            helperText={errors?.streetAddress || ''}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="City"
            name="city"
            value={venue.city || ''}
            onChange={handleChange}
            margin="dense"
            error={!!errors?.city}
            helperText={errors?.city || ''}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="State/Region"
            name="stateRegion"
            value={venue.stateRegion || ''}
            onChange={handleChange}
            margin="dense"
            error={!!errors?.stateRegion}
            helperText={errors?.stateRegion || ''}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Postal Code"
            name="postalCode"
            value={venue.postalCode || ''}
            onChange={handleChange}
            margin="dense"
            error={!!errors?.postalCode}
            helperText={errors?.postalCode || ''}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Country"
            name="country"
            value={venue.country || ''}
            onChange={handleChange}
            margin="dense"
            error={!!errors?.country}
            helperText={errors?.country || ''}
          />
        </Grid>

        {/* Accessibility & Logistics */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Logistics & Accessibility</Typography>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Amenities (comma-separated)"
            name="amenities"
            value={(venue.amenities || []).join(', ')}
            onChange={handleAmenitiesChange}
            margin="normal"
            error={!!errors?.amenities}
            helperText={errors?.amenities || ''}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Parking Information"
            name="parkingInfo"
            value={venue.parkingInfo || ''}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
            error={!!errors?.parkingInfo}
            helperText={errors?.parkingInfo || ''}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Public Transport Information"
            name="publicTransportInfo"
            value={venue.publicTransportInfo || ''}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
            error={!!errors?.publicTransportInfo}
            helperText={errors?.publicTransportInfo || ''}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Overall Accessibility Notes"
            name="overallAccessibilityNotes"
            value={venue.overallAccessibilityNotes || ''}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
            error={!!errors?.overallAccessibilityNotes}
            helperText={errors?.overallAccessibilityNotes || ''}
          />
        </Grid>

        <Grid item xs={12}>
          <VenuePhotosEditorPlaceholder photos={venue.photos || []} onChange={handlePhotosChange} />
        </Grid>

      </Grid>
    </Box>
  );
};

export default VenueForm; 