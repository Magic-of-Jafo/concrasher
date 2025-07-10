'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  VenueHotelTabData,
  VenueHotelTabSchema,
  VenueData,
  HotelData,
  createDefaultVenue,
  createDefaultHotel,
} from '@/lib/validators';
import { Button, Box, Typography, Checkbox, FormControlLabel, Paper, Divider, Accordion, AccordionSummary, AccordionDetails, Alert, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
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
  value: VenueHotelTabData & { venues?: VenueData[] }; // Allow venues array in prop type
  onChange: (data: VenueHotelTabData, isValid: boolean) => void;
  onValidationChange: (isValid: boolean) => void;
  disabled?: boolean;
  schema?: typeof VenueHotelTabSchema;
}

const VenueHotelTab: React.FC<VenueHotelTabProps> = ({ conventionId, value, onChange, onValidationChange, disabled, schema = VenueHotelTabSchema }) => {
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('primaryVenue');
  const [zodErrors, setZodErrors] = useState<z.ZodIssue[] | null>(null);
  const [venueToDelete, setVenueToDelete] = useState<{ originalIndex: number, displayIndex: number } | null>(null);

  const { primaryVenue, secondaryVenues } = useMemo(() => {
    const pVenue = value.primaryVenue ?? value.venues?.find((v: VenueData) => v.isPrimaryVenue) ?? createDefaultVenue(true);
    const sVenues = value.secondaryVenues ?? value.venues?.filter((v: VenueData) => !v.isPrimaryVenue) ?? [];
    return { primaryVenue: pVenue, secondaryVenues: sVenues };
  }, [value]);

  const isNewConvention = !conventionId;

  const validateAndNotify = useCallback((data: VenueHotelTabData) => {
    const result = schema.safeParse(data);
    const isValid = result.success;
    setZodErrors(isValid ? null : result.error.issues);
    onValidationChange(isValid);

    const combinedVenues = [
      ...(data.primaryVenue ? [data.primaryVenue] : []),
      ...(data.secondaryVenues ?? [])
    ];
    const finalData = { ...data, venues: combinedVenues };
    delete (finalData as any).secondaryVenues; // Clean up before sending up

    onChange(finalData as VenueHotelTabData & { venues: VenueData[] }, isValid);
  }, [onChange, onValidationChange, schema]);

  useEffect(() => {
    const result = schema.safeParse(value);
    const isValid = result.success;
    if (!isValid) {
      setZodErrors(result.error.issues);
    } else {
      setZodErrors(null);
    }
  }, [value, schema]);

  const handleConfirmDeleteVenue = async () => {
    if (venueToDelete === null || !conventionId) return;

    const venue = secondaryVenues[venueToDelete.originalIndex];
    if (!venue || !venue.id) {
      // If there's no ID, it's a new venue that hasn't been saved. Just remove from state.
      handleRemoveSecondaryVenue(venueToDelete.originalIndex);
      setVenueToDelete(null);
      return;
    }

    try {
      const response = await fetch(`/api/organizer/venues/${venue.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete venue');
      }

      handleRemoveSecondaryVenue(venueToDelete.originalIndex);

    } catch (error) {
      console.error('Failed to delete venue:', error);
      // Optionally, show an error message to the user
    } finally {
      setVenueToDelete(null);
    }
  };

  const structuredErrors = useMemo(() => {
    const errors: {
      venues: Record<number, Record<string, string>>;
      hotels: Record<number, Record<string, string>>;
    } = { venues: {}, hotels: {} };

    if (zodErrors) {
      for (const issue of zodErrors) {
        const [level, index, field] = issue.path;
        if ((level === 'venues' || level === 'hotels' || level === 'primaryVenue') && issue.path.length > 1) {
          const isPrimary = level === 'primaryVenue';
          const primaryIndex = isPrimary ? 0 : issue.path[1] as number;
          const currentField = issue.path[isPrimary ? 1 : 2] as string;

          if (isPrimary) {
            if (!errors.venues[0]) errors.venues[0] = {};
            errors.venues[0][currentField] = issue.message;
          } else if (level === 'venues') {
            if (!errors.venues[primaryIndex + 1]) errors.venues[primaryIndex + 1] = {};
            errors.venues[primaryIndex + 1][currentField] = issue.message;
          } else if (level === 'hotels') {
            const hotelIndex = issue.path[1] as number;
            if (!errors.hotels[hotelIndex]) errors.hotels[hotelIndex] = {};
            errors.hotels[hotelIndex][currentField] = issue.message;
          }
        }
      }
    }
    return errors;
  }, [zodErrors]);

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const handlePrimaryVenueChange = (updatedData: Partial<VenueData>) => {
    const newPrimaryVenue = { ...primaryVenue, ...updatedData } as VenueData;
    validateAndNotify({ ...value, primaryVenue: newPrimaryVenue, secondaryVenues });
  };

  const handleSecondaryVenueChange = (index: number, updatedData: Partial<VenueData>) => {
    const newSecondaryVenues = [...secondaryVenues];
    newSecondaryVenues[index] = { ...newSecondaryVenues[index], ...updatedData };
    validateAndNotify({ ...value, primaryVenue, secondaryVenues: newSecondaryVenues });
  };

  const handleRemoveSecondaryVenue = (index: number) => {
    const newSecondaryVenues = [...secondaryVenues];
    newSecondaryVenues.splice(index, 1);
    validateAndNotify({ ...value, primaryVenue, secondaryVenues: newSecondaryVenues });
  };

  const handleHotelChange = (index: number, updatedHotelData: Partial<HotelData>) => {
    const newHotels = [...(value.hotels || [])];
    newHotels[index] = { ...newHotels[index], ...updatedHotelData };
    validateAndNotify({ ...value, primaryVenue, secondaryVenues, hotels: newHotels });
  };

  const handleAddHotel = () => {
    const newHotels = [...(value.hotels || []), createDefaultHotel(false)];
    validateAndNotify({ ...value, primaryVenue, secondaryVenues, hotels: newHotels });
  };

  const handleAddVenue = () => {
    const newSecondaryVenues = [...secondaryVenues, createDefaultVenue(false)];
    validateAndNotify({ ...value, primaryVenue, secondaryVenues: newSecondaryVenues });
  };

  const handleRemoveHotel = (index: number) => {
    const hotels = (value.hotels || []).filter((_, i) => i !== index);
    validateAndNotify({ ...value, primaryVenue, secondaryVenues, hotels });
  };

  const handleGuestsStayAtPrimaryVenueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const guestsStayAtPrimaryVenue = event.target.checked;
    let hotels = [...(value.hotels || [])];
    if (guestsStayAtPrimaryVenue) {
      hotels = hotels.filter(h => !h.isPrimaryHotel);
    } else {
      if (!hotels.some(h => h.isPrimaryHotel)) {
        hotels.unshift(createDefaultHotel(true));
      }
    }
    validateAndNotify({ ...value, primaryVenue, secondaryVenues, guestsStayAtPrimaryVenue, hotels });
  };

  const renderVenueForms = () => {
    if (!primaryVenue) return null; // Guard against undefined primary venue

    return (
      <>
        <Accordion expanded={expandedAccordion === 'primaryVenue'} onChange={handleAccordionChange('primaryVenue')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ flexShrink: 0, fontWeight: 'medium' }}>Primary Venue</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <PrimaryVenueForm
              value={primaryVenue}
              onChange={handlePrimaryVenueChange}
              disabled={disabled}
              errors={structuredErrors.venues[0]}
              isPrimary={true}
            />
          </AccordionDetails>
        </Accordion>

        {secondaryVenues.map((venue, index) => (
          <Accordion key={venue.id || `venue-${index}`} expanded={expandedAccordion === `venue-${index}`} onChange={handleAccordionChange(`venue-${index}`)}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flexShrink: 0, fontWeight: 'medium' }}>
                {`Secondary Venue ${index + 1}`}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <PrimaryVenueForm
                value={venue}
                onChange={(updatedData) => handleSecondaryVenueChange(index, updatedData)}
                disabled={disabled}
                errors={structuredErrors.venues[index + 1]}
                title={`Secondary Venue ${index + 1}`}
                onRemove={() => setVenueToDelete({ originalIndex: index, displayIndex: index + 1 })}
                isNew={!venue.id}
                isPrimary={false}
              />
            </AccordionDetails>
          </Accordion>
        ))}
        <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddVenue} disabled={disabled}>
          Add Secondary Venue
        </Button>
      </>
    );
  };

  const renderHotelForms = () => {
    const hotels = value.hotels || [];
    const primaryHotel = hotels.find(h => h.isPrimaryHotel);

    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>Hotel Information</Typography>
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={value.guestsStayAtPrimaryVenue}
                onChange={handleGuestsStayAtPrimaryVenueChange}
                name="guestsStayAtPrimaryVenue"
                disabled={disabled}
              />
            }
            label="Guests can stay at the primary venue location (e.g., it's a hotel)"
          />
        </Paper>

        {!value.guestsStayAtPrimaryVenue && hotels.map((hotel, index) => (
          <Accordion key={hotel.id || `hotel-${index}`} defaultExpanded={hotel.isPrimaryHotel}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flexShrink: 0, fontWeight: 'medium' }}>
                {hotel.isPrimaryHotel ? 'Primary Hotel' : `Additional Hotel ${index + 1}`}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <HotelForm
                formData={hotel}
                onFormDataChange={(data: Partial<HotelData>) => handleHotelChange(index, data)}
                isPrimaryHotel={hotel.isPrimaryHotel}
                disabled={disabled}
                errors={structuredErrors.hotels[index]}
              />
              <Button
                startIcon={<DeleteIcon />}
                onClick={() => handleRemoveHotel(index)}
                color="error"
                sx={{ mt: 1 }}
                disabled={disabled}
              >
                Remove Hotel
              </Button>
            </AccordionDetails>
          </Accordion>
        ))}
        {!value.guestsStayAtPrimaryVenue && (
          <Button startIcon={<AddIcon />} onClick={handleAddHotel} sx={{ mt: 2 }} disabled={disabled}>
            Add Another Hotel
          </Button>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Venue Information</Typography>
      {renderVenueForms()}
      {renderHotelForms()}

      <Dialog
        open={venueToDelete !== null}
        onClose={() => setVenueToDelete(null)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete Secondary Venue {venueToDelete?.displayIndex}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVenueToDelete(null)}>Cancel</Button>
          <Button onClick={handleConfirmDeleteVenue} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VenueHotelTab;