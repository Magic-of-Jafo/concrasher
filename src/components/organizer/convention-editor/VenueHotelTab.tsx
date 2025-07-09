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
  value: VenueHotelTabData;
  onChange: (data: VenueHotelTabData, isValid: boolean) => void;
  onValidationChange: (isValid: boolean) => void;
  disabled?: boolean;
  schema?: typeof VenueHotelTabSchema;
}

const VenueHotelTab: React.FC<VenueHotelTabProps> = ({ conventionId, value: rawValue, onChange, onValidationChange, disabled, schema = VenueHotelTabSchema }) => {
  const [localState, setLocalState] = useState<VenueHotelTabData>(() => {
    const secondaryVenues = (rawValue as any).secondaryVenues ?? (rawValue as any).venues?.filter((v: any) => !v.isPrimaryVenue) ?? [];
    const primaryVenue = (rawValue as any).primaryVenue ?? ((rawValue as any).venues?.find((v: any) => v.isPrimaryVenue) ?? createDefaultVenue(true));
    return {
      primaryVenue,
      secondaryVenues,
      primaryHotelDetails: (rawValue as any).primaryHotelDetails,
      hotels: (rawValue as any).hotels ?? [],
      guestsStayAtPrimaryVenue: (rawValue as any).guestsStayAtPrimaryVenue ?? false,
    };
  });

  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('primaryVenue');
  const [zodErrors, setZodErrors] = useState<z.ZodIssue[] | null>(null);
  const [venueToDelete, setVenueToDelete] = useState<{ originalIndex: number, displayIndex: number } | null>(null);

  useEffect(() => {
    const secondaryVenues = (rawValue as any).secondaryVenues ?? (rawValue as any).venues?.filter((v: any) => !v.isPrimaryVenue) ?? [];
    const primaryVenue = (rawValue as any).primaryVenue ?? ((rawValue as any).venues?.find((v: any) => v.isPrimaryVenue) ?? createDefaultVenue(true));

    setLocalState({
      primaryVenue,
      secondaryVenues,
      primaryHotelDetails: (rawValue as any).primaryHotelDetails,
      hotels: (rawValue as any).hotels ?? [],
      guestsStayAtPrimaryVenue: (rawValue as any).guestsStayAtPrimaryVenue ?? false,
    });
  }, [JSON.stringify(rawValue)]);

  const isNewConvention = !conventionId;

  const handleConfirmDeleteVenue = async () => {
    if (venueToDelete === null || !conventionId) return;

    const venue = localState.secondaryVenues[venueToDelete.originalIndex];
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

  const validateAndNotify = useCallback((data: VenueHotelTabData) => {
    const result = schema.safeParse(data);
    const isValid = result.success;
    setZodErrors(isValid ? null : result.error.issues);
    onValidationChange(isValid);

    const combinedVenues = [
      ...(data.primaryVenue ? [data.primaryVenue] : []),
      ...(data.secondaryVenues ?? [])
    ];

    onChange({ ...data, venues: combinedVenues } as VenueHotelTabData & { venues: VenueData[] }, isValid);
  }, [onChange, onValidationChange, schema]);

  useEffect(() => {
    validateAndNotify(localState);
  }, [localState, validateAndNotify]);

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const handlePrimaryVenueChange = (updatedData: Partial<VenueData>) => {
    setLocalState(prevState => ({
      ...prevState,
      primaryVenue: { ...prevState.primaryVenue, ...updatedData } as VenueData
    }));
  };

  const handleSecondaryVenueChange = (index: number, updatedData: Partial<VenueData>) => {
    setLocalState(prevState => {
      const newSecondaryVenues = [...(prevState.secondaryVenues || [])];
      newSecondaryVenues[index] = { ...newSecondaryVenues[index], ...updatedData };
      return { ...prevState, secondaryVenues: newSecondaryVenues };
    });
  };

  const handleRemoveSecondaryVenue = (index: number) => {
    setLocalState(prevState => {
      const newSecondaryVenues = [...(prevState.secondaryVenues || [])];
      newSecondaryVenues.splice(index, 1);
      return { ...prevState, secondaryVenues: newSecondaryVenues };
    });
  };

  const handleHotelChange = (index: number, updatedHotelData: Partial<HotelData>) => {
    setLocalState(prevState => {
      const newHotels = [...prevState.hotels];
      newHotels[index] = { ...newHotels[index], ...updatedHotelData };
      return { ...prevState, hotels: newHotels };
    });
  };

  const handleAddHotel = () => {
    setLocalState(prevState => ({
      ...prevState,
      hotels: [...(prevState.hotels ?? []), createDefaultHotel(false)]
    }));
  };

  const handleAddVenue = () => {
    setLocalState(prevState => ({
      ...prevState,
      secondaryVenues: [...(prevState.secondaryVenues ?? []), createDefaultVenue(false)]
    }));
  };

  const handleRemoveHotel = (index: number) => {
    setLocalState(prevState => {
      const hotels = prevState.hotels.filter((_, i) => i !== index);
      return { ...prevState, hotels };
    });
  };

  const handleGuestsStayAtPrimaryVenueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const guestsStayAtPrimaryVenue = event.target.checked;
    setLocalState(prevState => {
      let hotels = [...prevState.hotels];
      if (guestsStayAtPrimaryVenue) {
        hotels = hotels.filter(h => !h.isPrimaryHotel);
      } else {
        if (!hotels.some(h => h.isPrimaryHotel)) {
          hotels.unshift(createDefaultHotel(true));
        }
      }
      return { ...prevState, guestsStayAtPrimaryVenue, hotels };
    });
  };

  const renderVenueForms = () => {
    const primaryVenue = localState.primaryVenue;
    const secondaryVenues = localState.secondaryVenues || [];

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
              />
              <Button
                startIcon={<DeleteIcon />}
                onClick={() => setVenueToDelete({ originalIndex: index, displayIndex: index + 1 })}
                color="error"
                sx={{ mt: 1 }}
                disabled={disabled}
              >
                Remove Venue (Permanent)
              </Button>
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
    const hotels = localState.hotels || [];
    const primaryHotel = hotels.find(h => h.isPrimaryHotel);

    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>Hotel Information</Typography>
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={localState.guestsStayAtPrimaryVenue}
                onChange={handleGuestsStayAtPrimaryVenueChange}
                name="guestsStayAtPrimaryVenue"
                disabled={disabled}
              />
            }
            label="Guests can stay at the primary venue location (e.g., it's a hotel)"
          />
        </Paper>

        {!localState.guestsStayAtPrimaryVenue && hotels.map((hotel, index) => (
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
        {!localState.guestsStayAtPrimaryVenue && (
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