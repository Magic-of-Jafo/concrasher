'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  VenueHotelTabData, 
  VenueHotelTabSchema,
  VenueData, 
  HotelData,
  createDefaultVenue,
  createDefaultHotel,
  createDefaultVenueHotelTabData
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
}

const VenueHotelTab: React.FC<VenueHotelTabProps> = ({ conventionId, value, onChange, onValidationChange, disabled }) => {
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('primaryVenue');
  const [zodErrors, setZodErrors] = useState<z.ZodIssue[] | null>(null);
  const [currentValue, setCurrentValue] = useState<VenueHotelTabData>(value);
  const [validationError, setValidationError] = useState<ZodError | null>(null);

  const getFieldError = useCallback((path: (string | number)[]): string | undefined => {
    if (!zodErrors) return undefined;
    const issue = zodErrors.find(err => {
      if (err.path.length !== path.length) return false;
      return err.path.every((segment, index) => segment === path[index]);
    });
    return issue?.message;
  }, [zodErrors]);

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const validateDataAndNotifyParent = useCallback((dataToValidate: VenueHotelTabData, isNewData: boolean) => {
    const validationResult = VenueHotelTabSchema.safeParse(dataToValidate);
    if (validationResult.success) {
      setZodErrors(null);
      setValidationError(null);
      onChange(validationResult.data, true);
      if (onValidationChange) onValidationChange(true);
    } else {
      setZodErrors(validationResult.error.issues);
      setValidationError(validationResult.error);
      onChange(dataToValidate, false);
      if (onValidationChange) onValidationChange(false);
    }
  }, [onChange, onValidationChange]);
  
  const shouldUpdateHotelDetails = useMemo(() => {
    return currentValue.hotels.length > 0;
  }, [currentValue.hotels.length]);

  const handlePrimaryVenueChange = (updatedPrimaryVenue: Partial<VenueData>) => {
    const newData: VenueHotelTabData = { 
      ...currentValue, 
      primaryVenue: { ...(currentValue.primaryVenue || createDefaultVenue(true)), ...updatedPrimaryVenue } as VenueData 
    };
    setCurrentValue(newData);
    validateDataAndNotifyParent(newData, true);
  };

  const handleGuestsStayAtPrimaryVenueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    const newData: VenueHotelTabData = {
      ...currentValue,
      guestsStayAtPrimaryVenue: isChecked,
      primaryHotelDetails: isChecked ? undefined : (currentValue.primaryHotelDetails || createDefaultHotel(true)),
    };
    setCurrentValue(newData);
    validateDataAndNotifyParent(newData, true);

    if (!isChecked && expandedAccordion !== 'primaryHotel') {
      setExpandedAccordion('primaryHotel');
    }
  };

  const handlePrimaryHotelChange = (updatedPrimaryHotel: Partial<HotelData>) => {
    const newData: VenueHotelTabData = { 
      ...currentValue, 
      primaryHotelDetails: { ...(currentValue.primaryHotelDetails || createDefaultHotel(true)), ...updatedPrimaryHotel } as HotelData 
    };
    setCurrentValue(newData);
    validateDataAndNotifyParent(newData, true);
  };

  const handleSecondaryVenueChange = (updatedSecondaryVenue: Partial<VenueData>, index: number) => {
    const updatedSecondaryVenues = [...currentValue.secondaryVenues];
    updatedSecondaryVenues[index] = { ...updatedSecondaryVenues[index], ...updatedSecondaryVenue } as VenueData;
    const newData: VenueHotelTabData = { ...currentValue, secondaryVenues: updatedSecondaryVenues };
    setCurrentValue(newData);
    validateDataAndNotifyParent(newData, true);
  };

  const handleAddSecondaryVenue = () => {
    const newSecondaryVenue: VenueData = {
      ...createDefaultVenue(),
      id: undefined,
      tempId: uuidv4(),
    };
    const newData: VenueHotelTabData = { ...currentValue, secondaryVenues: [...currentValue.secondaryVenues, newSecondaryVenue] };
    setCurrentValue(newData);
    validateDataAndNotifyParent(newData, true);
  };

  const handleRemoveSecondaryVenue = (index: number) => {
    const updatedSecondaryVenues = currentValue.secondaryVenues.filter((_, i) => i !== index);
    const newData: VenueHotelTabData = { ...currentValue, secondaryVenues: updatedSecondaryVenues };
    setCurrentValue(newData);
    validateDataAndNotifyParent(newData, true);
  };

  const handleHotelChange = (index: number, hotelPartialData: Partial<HotelData>) => {
    const updatedHotels = currentValue.hotels.map((hotel: HotelData, i: number) => 
      i === index ? { ...hotel, ...hotelPartialData } : hotel
    );
    const newData: VenueHotelTabData = { ...currentValue, hotels: updatedHotels };
    setCurrentValue(newData);
    validateDataAndNotifyParent(newData, true);
  };

  const addHotel = () => {
    const newHotel: HotelData = { 
        ...createDefaultHotel(),
        id: undefined,
        tempId: uuidv4(), 
        markedForPrimaryPromotion: false
    };
    const updatedHotels = [...currentValue.hotels, newHotel];
    const newData: VenueHotelTabData = { ...currentValue, hotels: updatedHotels };
    setCurrentValue(newData);
    validateDataAndNotifyParent(newData, true);
  };

  const removeHotel = (index: number) => {
    const updatedHotels = currentValue.hotels.filter((_, i) => i !== index);
    const newData: VenueHotelTabData = { ...currentValue, hotels: updatedHotels };
    setCurrentValue(newData);
    validateDataAndNotifyParent(newData, true);
  };
  
  const resetPrimaryVenue = () => {
    const newData: VenueHotelTabData = { 
      ...currentValue,
      primaryVenue: createDefaultVenue(true)
    };
    setCurrentValue(newData);
    validateDataAndNotifyParent(newData, true);
  };

  const resetPrimaryHotel = () => {
    const newData: VenueHotelTabData = {
      ...currentValue,
      primaryHotelDetails: createDefaultHotel(true)
    };
    setCurrentValue(newData);
    validateDataAndNotifyParent(newData, true);
  };
  
  useEffect(() => {
    setCurrentValue(prevCurrentValue => {
      return {
        ...value,
        primaryHotelDetails: value.primaryHotelDetails ? 
          { ...createDefaultHotel(), ...value.primaryHotelDetails, isPrimaryHotel: value.primaryHotelDetails.isPrimaryHotel || false } 
          : undefined,
        hotels: value.hotels.map(propHotel => {
          const existingHotel = prevCurrentValue.hotels.find(prevHotel => 
            (prevHotel.id && prevHotel.id === propHotel.id) || 
            (prevHotel.tempId && prevHotel.tempId === propHotel.tempId)
          );
          return {
            ...createDefaultHotel(),
            ...propHotel,
            markedForPrimaryPromotion: existingHotel ? existingHotel.markedForPrimaryPromotion || false : false,
          };
        }),
        secondaryVenues: value.secondaryVenues.map(propVenue => {
            const existingVenue = prevCurrentValue.secondaryVenues.find(prevVenue => 
                (prevVenue.id && prevVenue.id === propVenue.id) || 
                (prevVenue.tempId && prevVenue.tempId === propVenue.tempId)
            );
            return {
                ...createDefaultVenue(),
                ...propVenue,
                markedForPrimaryPromotion: existingVenue ? existingVenue.markedForPrimaryPromotion || false : false,
            };
        })
      };
    });
  }, [value]);

  const guestsStayAtPrimaryVenue = currentValue.guestsStayAtPrimaryVenue ?? false;

  const handleToggleSecondaryVenuePromotion = (targetIndex: number, promote: boolean) => {
    let alreadyHasAPromotedVenue = false;
    if (promote) {
      alreadyHasAPromotedVenue = currentValue.secondaryVenues.some(
        (venue, index) => index !== targetIndex && venue.markedForPrimaryPromotion
      );
    }
    const newSecondaryVenues = currentValue.secondaryVenues.map((venue, index) => {
      if (index === targetIndex) {
        if (promote) {
          return { ...venue, markedForPrimaryPromotion: alreadyHasAPromotedVenue ? false : true };
        } else {
          return { ...venue, markedForPrimaryPromotion: false };
        }
      }
      return venue;
    });
    const newData: VenueHotelTabData = { ...currentValue, secondaryVenues: newSecondaryVenues };
    setCurrentValue(newData);
    validateDataAndNotifyParent(newData, true);
  };

  const handleToggleAdditionalHotelPromotion = (targetHotelIndex: number, promote: boolean) => {
    let alreadyHasAPromotedHotelInList = false;
    if (promote) {
      alreadyHasAPromotedHotelInList = currentValue.hotels.some(
        (hotel, index) => index !== targetHotelIndex && hotel.markedForPrimaryPromotion
      );
    }

    const newAdditionalHotels = currentValue.hotels.map((hotel, index) => {
      if (index === targetHotelIndex) {
        if (promote) {
          return { ...hotel, markedForPrimaryPromotion: alreadyHasAPromotedHotelInList ? false : true };
        } else {
          return { ...hotel, markedForPrimaryPromotion: false };
        }
      }
      return hotel;
    });

    const newData: VenueHotelTabData = {
      ...currentValue,
      hotels: newAdditionalHotels,
    };
    setCurrentValue(newData);
    validateDataAndNotifyParent(newData, true);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {validationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Please correct the highlighted fields below.
        </Alert>
      )}

      <Accordion expanded={expandedAccordion === 'primaryVenue'} onChange={handleAccordionChange('primaryVenue')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Primary Venue</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">Primary Venue Details</Typography>
            <IconButton onClick={resetPrimaryVenue} color="error" aria-label="Reset primary venue" disabled={disabled}>
              <DeleteIcon />
            </IconButton>
          </Box>
          <PrimaryVenueForm
            title=""
            formData={currentValue.primaryVenue || createDefaultVenue(true)}
            onFormDataChange={handlePrimaryVenueChange}
            disabled={disabled}
            errors={{
              venueName: getFieldError(['primaryVenue', 'venueName']),
              websiteUrl: getFieldError(['primaryVenue', 'websiteUrl']),
              googleMapsUrl: getFieldError(['primaryVenue', 'googleMapsUrl']),
              contactEmail: getFieldError(['primaryVenue', 'contactEmail']),
            }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={guestsStayAtPrimaryVenue}
                onChange={handleGuestsStayAtPrimaryVenueChange}
                disabled={disabled}
              />
            }
            label="The Venue is also the primary hotel"
            sx={{ mt: 1, mb: 1 }}
          />
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expandedAccordion === 'secondaryVenues'} onChange={handleAccordionChange('secondaryVenues')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Secondary Venue(s)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {currentValue.secondaryVenues.map((venue: VenueData, index: number) => {
            const baseErrorPath = ['secondaryVenues', index];
            return (
              <Paper key={venue.tempId || venue.id || `secondary-venue-${index}`} elevation={2} sx={{ mb: 2, p: { xs: 1, sm: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">Secondary Venue {index + 1}</Typography>
                  <Box>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={venue.markedForPrimaryPromotion || false}
                          onChange={(e) => handleToggleSecondaryVenuePromotion(index, e.target.checked)}
                          disabled={disabled}
                        />
                      }
                      label="Make Primary"
                      sx={{ mr: 1 }}
                    />
                    <IconButton onClick={() => handleRemoveSecondaryVenue(index)} color="error" aria-label={`Remove secondary venue ${index + 1}`} disabled={disabled}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <PrimaryVenueForm
                  title={`Secondary Venue ${index + 1} Details`}
                  formData={venue}
                  onFormDataChange={(changedData) => handleSecondaryVenueChange(changedData, index)}
                  disabled={disabled}
                  errors={{
                    venueName: getFieldError([...baseErrorPath, 'venueName']),
                    websiteUrl: getFieldError([...baseErrorPath, 'websiteUrl']),
                    googleMapsUrl: getFieldError([...baseErrorPath, 'googleMapsUrl']),
                    contactEmail: getFieldError([...baseErrorPath, 'contactEmail']),
                  }}
                />
              </Paper>
            );
          })}
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />} 
            onClick={handleAddSecondaryVenue} 
            disabled={disabled}
            sx={{ mt: 2 }}
          >
            Add Secondary Venue
          </Button>
        </AccordionDetails>
      </Accordion>

      {!guestsStayAtPrimaryVenue && (
        <Accordion 
          expanded={expandedAccordion === 'primaryHotel'} 
          onChange={handleAccordionChange('primaryHotel')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Primary Hotel</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">Primary Hotel Details</Typography>
              <IconButton onClick={resetPrimaryHotel} color="error" aria-label="Reset primary hotel" disabled={disabled}>
                <DeleteIcon />
              </IconButton>
            </Box>
            <HotelForm
              title=""
              formData={currentValue.primaryHotelDetails || createDefaultHotel(true)}
              onFormDataChange={handlePrimaryHotelChange}
              disabled={disabled}
              errors={{
                hotelName: getFieldError(['primaryHotelDetails', 'hotelName']),
                websiteUrl: getFieldError(['primaryHotelDetails', 'websiteUrl']),
                googleMapsUrl: getFieldError(['primaryHotelDetails', 'googleMapsUrl']),
                contactEmail: getFieldError(['primaryHotelDetails', 'contactEmail']),
                bookingLink: getFieldError(['primaryHotelDetails', 'bookingLink']),
              }}
            />
          </AccordionDetails>
        </Accordion>
      )}

      <Accordion expanded={expandedAccordion === 'hotels'} onChange={handleAccordionChange('hotels')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Additional Hotel(s)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {currentValue.hotels.length === 0 && (
            <Typography variant="body2" color="textSecondary" sx={{mb: 2, textAlign: 'center', p:2}}>
              No additional hotels listed.
            </Typography>
          )}
          {currentValue.hotels.map((hotel: HotelData, index: number) => {
            const baseErrorPath = ['hotels', index];
            return (
              <Paper key={hotel.tempId || hotel.id || `secondary-hotel-${index}`} elevation={2} sx={{ mb: 2, p: { xs: 1, sm: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">Hotel {index + 1}</Typography>
                  <Box>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={hotel.markedForPrimaryPromotion || false}
                          onChange={(e) => handleToggleAdditionalHotelPromotion(index, e.target.checked)}
                          disabled={disabled || guestsStayAtPrimaryVenue}
                        />
                      }
                      label="Make Primary"
                      sx={{ mr: 1 }}
                    />
                    <IconButton onClick={() => removeHotel(index)} color="error" aria-label={`Remove hotel ${index + 1}`} disabled={disabled}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <HotelForm
                  title={`Hotel ${index + 1} Details`}
                  formData={hotel}
                  onFormDataChange={(changedData) => handleHotelChange(index, changedData)}
                  disabled={disabled}
                  errors={{
                    hotelName: getFieldError([...baseErrorPath, 'hotelName']),
                    websiteUrl: getFieldError([...baseErrorPath, 'websiteUrl']),
                    googleMapsUrl: getFieldError([...baseErrorPath, 'googleMapsUrl']),
                    contactEmail: getFieldError([...baseErrorPath, 'contactEmail']),
                    bookingLink: getFieldError([...baseErrorPath, 'bookingLink']),
                  }}
                />
              </Paper>
            );
          })}
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />} 
            onClick={addHotel} 
            disabled={disabled}
            sx={{ mt: 2 }}
          >
            Add Hotel
          </Button>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default VenueHotelTab; 