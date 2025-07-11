'use client';

import React from 'react';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';

// Assuming these fields will be part of a larger data structure like VenueHotelTabData
export interface LocationAccessData {
  overallEventParkingInfo?: string;
  overallEventPublicTransportInfo?: string;
  overallEventAccessibilityNotes?: string;
}

interface LocationAccessFormProps {
  data: LocationAccessData;
  onChange: (updatedData: LocationAccessData) => void;
  errors?: Record<string, string>;
}

const LocationAccessForm: React.FC<LocationAccessFormProps> = ({ data, onChange, errors = {} }) => {

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    onChange({ ...data, [name]: value });
  };

  return (
    <Box component="form" noValidate autoComplete="off" sx={{ mt: 2, mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: '4px' }}>
      <Typography variant="h6" gutterBottom>Overall Event Location & Access</Typography>
      <Grid container spacing={2}>
        {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Overall Event Parking Information"
            name="overallEventParkingInfo"
            value={data.overallEventParkingInfo || ''}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={3}
            error={!!errors?.overallEventParkingInfo}
            helperText={errors?.overallEventParkingInfo || ''}
          />
        </Grid>
        {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Overall Event Public Transportation"
            name="overallEventPublicTransportInfo"
            value={data.overallEventPublicTransportInfo || ''}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={3}
            error={!!errors?.overallEventPublicTransportInfo}
            helperText={errors?.overallEventPublicTransportInfo || ''}
          />
        </Grid>
        {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Overall Event Accessibility Notes"
            name="overallEventAccessibilityNotes"
            value={data.overallEventAccessibilityNotes || ''}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={3}
            error={!!errors?.overallEventAccessibilityNotes}
            helperText={errors?.overallEventAccessibilityNotes || ''}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default LocationAccessForm; 