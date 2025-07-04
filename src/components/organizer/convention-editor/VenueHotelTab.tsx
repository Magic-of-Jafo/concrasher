'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  VenueHotelTabData,
  VenueHotelTabSchema,
  VenueData,
  HotelData,
  createDefaultVenue,
  createDefaultHotel,
} from '@/lib/validators';
import { Button, Box, Typography, Checkbox, FormControlLabel, Paper, Divider, Accordion, AccordionSummary, AccordionDetails, Alert, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HotelForm from './HotelForm';
import AddIcon from '@mui/icons-material/Add';
import { z, ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import PrimaryVenueForm from './PrimaryVenueForm';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

interface VenueHotelTabProps {
  conventionId: string | null;
  value: VenueHotelTabData;
  onChange: (data: VenueHotelTabData, isValid: boolean) => void;
  onValidationChange: (isValid: boolean) => void;
  disabled?: boolean;
  schema?: typeof VenueHotelTabSchema;
}

const VenueHotelTab: React.FC<VenueHotelTabProps> = ({ conventionId, value, onChange, onValidationChange, disabled, schema = VenueHotelTabSchema }) => {
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('primaryVenue');
  const [zodErrors, setZodErrors] = useState<z.ZodIssue[] | null>(null);

  const structuredErrors = useMemo(() => {
    const errors: {
      venues: Record<number, Record<string, string>>;
      hotels: Record<number, Record<string, string>>;
    } = { venues: {}, hotels: {} };

    if (zodErrors) {
      for (const issue of zodErrors) {
        const [level, index, field] = issue.path;
        if ((level === 'venues' || level === 'hotels') && typeof index === 'number' && typeof field === 'string') {
          if (!errors[level][index]) {
            errors[level][index] = {};
          }
          errors[level][index][field] = issue.message;
        }
      }
    }
    return errors;
  }, [zodErrors]);

  // Memoize finds for primary entities to avoid re-computation on every render
  const primaryVenue = useMemo(() => value.venues.find(v => v.isPrimaryVenue), [value.venues]);
  const primaryHotel = useMemo(() => value.hotels.find(h => h.isPrimaryHotel), [value.hotels]);

  const validateAndNotify = useCallback((data: VenueHotelTabData) => {
    const result = schema.safeParse(data);
    const isValid = result.success;
    setZodErrors(isValid ? null : result.error.issues);
    onValidationChange(isValid);
    onChange(data, isValid);
  }, [onChange, onValidationChange, schema]);

  useEffect(() => {
    validateAndNotify(value);
  }, [value, validateAndNotify]);

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const getFieldError = useCallback((path: (string | number)[]): string | undefined => {
    return zodErrors?.find(err => JSON.stringify(err.path) === JSON.stringify(path))?.message;
  }, [zodErrors]);

  const handleDataChange = (updatedData: Partial<VenueHotelTabData>) => {
    validateAndNotify({ ...value, ...updatedData });
  };

  const handleVenueChange = (index: number, updatedVenueData: Partial<VenueData>) => {
    const newVenues = [...value.venues];
    newVenues[index] = { ...newVenues[index], ...updatedVenueData };
    handleDataChange({ venues: newVenues });
  };

  const handleHotelChange = (index: number, updatedHotelData: Partial<HotelData>) => {
    const newHotels = [...value.hotels];
    newHotels[index] = { ...newHotels[index], ...updatedHotelData };
    handleDataChange({ hotels: newHotels });
  };

  const handleAddVenue = () => {
    const newVenue = createDefaultVenue(false);
    handleDataChange({ venues: [...value.venues, newVenue] });
  };

  const handleRemoveVenue = (index: number) => {
    handleDataChange({ venues: value.venues.filter((_, i) => i !== index) });
  };

  const handleAddHotel = () => {
    const newHotel = createDefaultHotel(false);
    handleDataChange({ hotels: [...value.hotels, newHotel] });
  };

  const handleRemoveHotel = (index: number) => {
    const hotels = value.hotels.filter((_, i) => i !== index);
    // If the removed hotel was primary, we might need a rule to assign a new primary
    if (!hotels.some(h => h.isPrimaryHotel) && !value.guestsStayAtPrimaryVenue) {
      // Potentially handle this case, for now, just remove. Schema will invalidate.
    }
    handleDataChange({ hotels });
  };

  const handleGuestsStayAtPrimaryVenueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const guestsStayAtPrimaryVenue = event.target.checked;
    let hotels = [...value.hotels];

    if (guestsStayAtPrimaryVenue) {
      // If guests stay at the venue, remove any designated primary hotel
      hotels = hotels.filter(h => !h.isPrimaryHotel);
    } else {
      // If they don't, and there's no primary hotel, add one.
      if (!hotels.some(h => h.isPrimaryHotel)) {
        hotels.unshift(createDefaultHotel(true));
      }
    }
    handleDataChange({ guestsStayAtPrimaryVenue, hotels });
  };

  const renderVenueForms = () => {
    const primaryVenueIndex = value.venues.findIndex(v => v.isPrimaryVenue);
    const secondaryVenues = value.venues.filter(v => !v.isPrimaryVenue);

    return (
      <>
        {primaryVenue && primaryVenueIndex !== -1 && (
          <Accordion expanded={expandedAccordion === 'primaryVenue'} onChange={handleAccordionChange('primaryVenue')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Primary Venue</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <PrimaryVenueForm
                formData={primaryVenue}
                onFormDataChange={(data) => handleVenueChange(primaryVenueIndex, data)}
                errors={structuredErrors.venues[primaryVenueIndex]}
                title="Primary Venue Details"
                disabled={disabled}
              />
            </AccordionDetails>
          </Accordion>
        )}

        <Accordion expanded={expandedAccordion === 'secondaryVenues'} onChange={handleAccordionChange('secondaryVenues')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Secondary Venue(s)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {secondaryVenues.map((venue, index) => {
              const originalIndex = value.venues.findIndex(v => v.tempId === venue.tempId);
              return (
                <Paper key={venue.tempId || index} elevation={2} sx={{ p: 2, mb: 2 }}>
                  <PrimaryVenueForm
                    formData={venue}
                    onFormDataChange={(data) => handleVenueChange(originalIndex, data)}
                    errors={structuredErrors.venues[originalIndex]}
                    title={`Secondary Venue ${index + 1}`}
                    disabled={disabled}
                  />
                  <Button
                    startIcon={<DeleteIcon />}
                    onClick={() => handleRemoveVenue(originalIndex)}
                    color="error"
                    sx={{ mt: 1 }}
                    disabled={disabled}
                  >
                    Remove Venue
                  </Button>
                </Paper>
              );
            })}
            <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddVenue} disabled={disabled}>
              Add Secondary Venue
            </Button>
          </AccordionDetails>
        </Accordion>
      </>
    );
  };

  const renderHotelForms = () => {
    const primaryHotelIndex = value.hotels.findIndex(h => h.isPrimaryHotel);
    const additionalHotels = value.hotels.filter(h => !h.isPrimaryHotel);

    return (
      <>
        <FormControlLabel
          control={
            <Checkbox
              checked={value.guestsStayAtPrimaryVenue}
              onChange={handleGuestsStayAtPrimaryVenueChange}
              name="guestsStayAtPrimaryVenue"
              disabled={disabled}
            />
          }
          label="The Primary Venue will also serve as the Primary Hotel"
        />

        {!value.guestsStayAtPrimaryVenue && primaryHotel && primaryHotelIndex !== -1 && (
          <Accordion expanded={expandedAccordion === 'primaryHotel'} onChange={handleAccordionChange('primaryHotel')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Primary Hotel</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <HotelForm
                formData={primaryHotel}
                onFormDataChange={(data) => handleHotelChange(primaryHotelIndex, data)}
                errors={structuredErrors.hotels[primaryHotelIndex]}
                title="Primary Hotel Details"
                disabled={disabled}
                isPrimaryHotel={true}
              />
            </AccordionDetails>
          </Accordion>
        )}

        <Accordion expanded={expandedAccordion === 'additionalHotels'} onChange={handleAccordionChange('additionalHotels')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Additional Hotel(s)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {additionalHotels.map((hotel, index) => {
              const originalIndex = value.hotels.findIndex(h => h.tempId === hotel.tempId);
              return (
                <Paper key={hotel.tempId || index} elevation={2} sx={{ p: 2, mb: 2 }}>
                  <HotelForm
                    formData={hotel}
                    onFormDataChange={(data) => handleHotelChange(originalIndex, data)}
                    errors={structuredErrors.hotels[originalIndex]}
                    title={`Additional Hotel ${index + 1}`}
                    disabled={disabled}
                    isPrimaryHotel={false}
                  />
                  <Button
                    startIcon={<DeleteIcon />}
                    onClick={() => handleRemoveHotel(originalIndex)}
                    color="error"
                    sx={{ mt: 1 }}
                    disabled={disabled}
                  >
                    Remove Hotel
                  </Button>
                </Paper>
              );
            })}
            <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddHotel} disabled={disabled}>
              Add Additional Hotel
            </Button>
          </AccordionDetails>
        </Accordion>
      </>
    );
  };


  return (
    <Box>
      {zodErrors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Please correct the errors before proceeding.
          <ul>
            {zodErrors.map((err, index) => <li key={index}>{err.path.join('.')} - {err.message}</li>)}
          </ul>
        </Alert>
      )}

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>Venues</Typography>
        <Divider sx={{ mb: 2 }} />
        {renderVenueForms()}
      </Box>

      <Box>
        <Typography variant="h5" gutterBottom>Hotels</Typography>
        <Divider sx={{ mb: 2 }} />
        {renderHotelForms()}
      </Box>
    </Box>
  );
};

export default VenueHotelTab;