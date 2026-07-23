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
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VenueHotelHelperDialog, { type VenueHotelAssignment, type ScrapedPlaceResult } from './VenueHotelHelperDialog';

interface VenueHotelTabProps {
  conventionId: string | null;
  value: VenueHotelTabData & { venues?: VenueData[] }; // Allow venues array in prop type
  onChange: (data: VenueHotelTabData, isValid: boolean) => void;
  onValidationChange: (isValid: boolean) => void;
  disabled?: boolean;
  schema?: typeof VenueHotelTabSchema;
  /** Forwarded to the helper dialog: fires when the detected timezone/currency
   *  were filled into the convention's Settings. */
  onLocaleApplied?: (applied: { timezoneSet?: string; timezoneSetId?: string; currencySet?: string }) => void;
  /** Forwarded to the helper dialog: whether Settings already hold values. */
  settingsFilled?: { timezone: boolean; currency: boolean };
}

const VenueHotelTab: React.FC<VenueHotelTabProps> = ({ conventionId, value, onChange, onValidationChange, disabled, schema = VenueHotelTabSchema, onLocaleApplied, settingsFilled }) => {
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);
  const [zodErrors, setZodErrors] = useState<z.ZodIssue[] | null>(null);
  const [venueToDelete, setVenueToDelete] = useState<{ originalIndex: number, displayIndex: number } | null>(null);
  const [confirmDeletePrimary, setConfirmDeletePrimary] = useState(false);
  const [helperOpen, setHelperOpen] = useState(false);
  // Make Primary clicks save immediately; these track that in-flight save.
  const [promotionSaving, setPromotionSaving] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);

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
      ...(data.primaryVenue ? [data.primaryVenue] : [primaryVenue]),
      ...(data.secondaryVenues ?? [])
    ];
    const finalData = { ...data, venues: combinedVenues };
    delete (finalData as any).secondaryVenues; // Clean up before sending up
    delete (finalData as any).primaryVenue; // Clean up before sending up

    onChange(finalData as VenueHotelTabData & { venues: VenueData[] }, isValid);
  }, [onChange, onValidationChange, schema, primaryVenue]);

  useEffect(() => {
    const result = schema.safeParse(value);
    const isValid = result.success;
    if (!isValid) {
      setZodErrors(result.error.issues);
    } else {
      setZodErrors(null);
    }
  }, [value, schema]);

  // Clear the primary venue: delete the saved record (if any) and reset the form
  // to a blank primary venue. The model always keeps exactly one primary venue.
  const handleDeletePrimaryVenue = async () => {
    const id = (primaryVenue as any)?.id;
    if (id && conventionId) {
      try {
        const res = await fetch(`/api/organizer/venues/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || 'Failed to delete venue');
        }
      } catch (err) {
        console.error('Failed to delete primary venue:', err);
      }
    }
    validateAndNotify({ ...value, primaryVenue: createDefaultVenue(true), secondaryVenues });
    setConfirmDeletePrimary(false);
  };

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

  // Persist a promotion the moment it happens: promotions are decisions, not
  // drafts. Sends only the places (partial PUT; the wizard uses the same
  // shape) and adopts the returned rows so fresh records get their real ids.
  // On a new, not-yet-created convention there is nothing to PUT — the swap
  // stays local and rides the normal create/save.
  const persistPromotion = async (next: {
    primaryVenue: VenueData;
    secondaryVenues: VenueData[];
    hotels: HotelData[];
    guestsStayAtPrimaryVenue?: boolean;
  }) => {
    if (!conventionId) return;
    setPromotionSaving(true);
    setPromotionError(null);
    try {
      const clean = (o: any) => { const { tempId, markedForPrimaryPromotion, ...rest } = o || {}; return rest; };
      const res = await fetch(`/api/organizer/conventions/${conventionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venues: [next.primaryVenue, ...next.secondaryVenues].filter(Boolean).map(clean),
          hotels: next.hotels.map(clean),
          ...(next.guestsStayAtPrimaryVenue !== undefined ? { guestsStayAtPrimaryVenue: next.guestsStayAtPrimaryVenue } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save.');
      }
      const saved = await res.json();
      if (Array.isArray(saved.venues) && Array.isArray(saved.hotels)) {
        validateAndNotify({
          ...value,
          primaryVenue: saved.venues.find((v: any) => v.isPrimaryVenue) ?? createDefaultVenue(true),
          secondaryVenues: saved.venues.filter((v: any) => !v.isPrimaryVenue),
          ...(next.guestsStayAtPrimaryVenue !== undefined ? { guestsStayAtPrimaryVenue: next.guestsStayAtPrimaryVenue } : {}),
          hotels: saved.hotels,
        });
      }
    } catch (e: any) {
      setPromotionError(`The change is on screen but not saved yet (${e?.message || 'network error'}). Use Save Convention to retry.`);
    } finally {
      setPromotionSaving(false);
    }
  };

  // Promote a secondary venue to primary, immediately and explicitly. The
  // current primary steps down to a secondary when it holds anything (a saved
  // record or typed content); a blank placeholder primary is simply dropped.
  const handlePromoteVenue = (index: number) => {
    const target = secondaryVenues[index];
    if (!target) return;
    const rest = secondaryVenues.filter((_, i) => i !== index);
    const old: any = primaryVenue;
    const oldHasContent = !!(old?.id || (old?.venueName || '').trim() || (old?.streetAddress || '').trim() || (old?.city || '').trim());
    const next = {
      primaryVenue: { ...target, isPrimaryVenue: true, markedForPrimaryPromotion: false } as VenueData,
      secondaryVenues: oldHasContent
        ? [...rest, { ...old, isPrimaryVenue: false, markedForPrimaryPromotion: false }]
        : rest,
      hotels: value.hotels || [],
    };
    validateAndNotify({ ...value, primaryVenue: next.primaryVenue, secondaryVenues: next.secondaryVenues });
    setExpandedAccordion('primaryVenue');
    void persistPromotion(next);
  };

  // Promote a hotel to primary; any current primary steps down to an
  // additional hotel (nothing is lost). An explicit primary hotel and
  // "guests stay at the venue" are mutually exclusive, so promoting also
  // turns that toggle off and reveals the primary-hotel form.
  const handlePromoteHotel = (actualIndex: number) => {
    const hotels = (value.hotels || []).map((h, i) => ({
      ...h,
      isPrimaryHotel: i === actualIndex,
      markedForPrimaryPromotion: false,
    }));
    validateAndNotify({ ...value, primaryVenue, secondaryVenues, guestsStayAtPrimaryVenue: false, hotels });
    void persistPromotion({ primaryVenue, secondaryVenues, hotels, guestsStayAtPrimaryVenue: false });
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

  // Apply the helper's assignments. STRICTLY ADDITIVE: each scraped place goes
  // into the role the organizer picked, filling only empty fields; nothing that
  // already exists on the tab is removed, replaced, or reordered, and the
  // stay-at-venue toggle is never auto-changed. This is what lets an organizer
  // scrape a second page of hotels and just tag them "secondary hotel" without
  // disturbing the good data already in place.
  const applyVenueHotel = useCallback((a: VenueHotelAssignment) => {
    const fill = (cur: any, val: any) => (cur != null && cur !== '' ? cur : val); // keep existing
    const mergeInto = (base: any, p: ScrapedPlaceResult, nameKey: 'venueName' | 'hotelName') => {
      const out: any = { ...base };
      const fields: (keyof ScrapedPlaceResult)[] = [
        'websiteUrl', 'googleMapsUrl', 'streetAddress', 'city', 'stateRegion', 'postalCode',
        'country', 'contactEmail', 'contactPhone', 'description', 'parkingInfo',
        'publicTransportInfo', 'groupPrice', 'groupRateOrBookingCode', 'bookingLink',
      ];
      for (const f of fields) out[f] = fill(base[f], (p as any)[f]);
      out[nameKey] = fill(base[nameKey], p.name);
      if ((!base.amenities || base.amenities.length === 0) && p.amenities?.length) out.amenities = p.amenities;
      if (!base.bookingCutoffDate && p.bookingCutoffDate) out.bookingCutoffDate = new Date(p.bookingCutoffDate);
      return out;
    };
    const mergeVenueInto = (base: VenueData, p: ScrapedPlaceResult, isPrimary: boolean) =>
      ({ ...mergeInto(base, p, 'venueName'), isPrimaryVenue: isPrimary } as VenueData);
    const mergeHotelInto = (base: HotelData, p: ScrapedPlaceResult, isPrimary: boolean) =>
      ({ ...mergeInto(base, p, 'hotelName'), isPrimaryHotel: isPrimary } as HotelData);
    const nameKey = (s: string | null | undefined) => (s || '').trim().toLowerCase();

    let newPrimaryVenue = primaryVenue;
    const newSecondaryVenues = [...secondaryVenues];
    const hotels = [...(value.hotels || [])];

    for (const { place, role } of a.places) {
      if (role === 'skip') continue;
      if (role === 'primaryVenue') {
        newPrimaryVenue = mergeVenueInto(newPrimaryVenue, place, true);
      } else if (role === 'secondaryVenue') {
        const n = nameKey(place.name);
        const idx = n ? newSecondaryVenues.findIndex(v => nameKey(v.venueName) === n) : -1;
        if (idx >= 0) newSecondaryVenues[idx] = mergeVenueInto(newSecondaryVenues[idx], place, false);
        else newSecondaryVenues.push(mergeVenueInto(createDefaultVenue(false), place, false));
      } else if (role === 'primaryHotel') {
        const idx = hotels.findIndex(h => h.isPrimaryHotel);
        if (idx >= 0) hotels[idx] = mergeHotelInto(hotels[idx], place, true);
        else hotels.unshift(mergeHotelInto(createDefaultHotel(true), place, true));
      } else if (role === 'secondaryHotel') {
        const n = nameKey(place.name);
        const idx = n ? hotels.findIndex(h => !h.isPrimaryHotel && nameKey(h.hotelName) === n) : -1;
        if (idx >= 0) hotels[idx] = mergeHotelInto(hotels[idx], place, false);
        else hotels.push(mergeHotelInto(createDefaultHotel(false), place, false));
      }
    }

    validateAndNotify({ ...value, primaryVenue: newPrimaryVenue, secondaryVenues: newSecondaryVenues, hotels });
    setExpandedAccordion('primaryVenue');
  }, [value, primaryVenue, secondaryVenues, validateAndNotify]);

  const renderVenueForms = () => {
    if (!primaryVenue) return null; // Guard against undefined primary venue

    return (
      <>
        <Accordion expanded={expandedAccordion === 'primaryVenue'} onChange={handleAccordionChange('primaryVenue')} defaultExpanded={false}>
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
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                startIcon={<DeleteIcon />}
                onClick={() => setConfirmDeletePrimary(true)}
                color="error"
                disabled={disabled}
              >
                Delete Primary Venue
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        {secondaryVenues.map((venue, index) => (
          <Accordion key={venue.id || `venue-${index}`} expanded={expandedAccordion === `venue-${index}`} onChange={handleAccordionChange(`venue-${index}`)}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                <Typography sx={{ fontWeight: 'medium', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(venue.venueName || '').trim() || `Secondary Venue ${index + 1}`}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => { e.stopPropagation(); handlePromoteVenue(index); }}
                  disabled={disabled || promotionSaving}
                  aria-label={`Make ${(venue.venueName || '').trim() || `secondary venue ${index + 1}`} the primary venue`}
                  sx={{ flexShrink: 0, mr: 1 }}
                >
                  Make Primary
                </Button>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <PrimaryVenueForm
                value={venue}
                onChange={(updatedData) => handleSecondaryVenueChange(index, updatedData)}
                disabled={disabled}
                errors={structuredErrors.venues[index + 1]}
                title={`Secondary Venue ${index + 1}`}
                isNew={!venue.id}
                isPrimary={false}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  startIcon={<DeleteIcon />}
                  onClick={() => setVenueToDelete({ originalIndex: index, displayIndex: index + 1 })}
                  color="error"
                  disabled={disabled}
                  aria-label={`Delete Secondary Venue ${index + 1}`}
                >
                  Delete Secondary Venue
                </Button>
              </Box>
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
    const additionalHotels = hotels.filter(h => !h.isPrimaryHotel);

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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {value.guestsStayAtPrimaryVenue
              ? "✓ The venue holds the host room block, so there is no separate primary hotel. Overflow hotels can still be added below."
              : "Hotel forms are shown below"}
          </Typography>
        </Paper>

        {!value.guestsStayAtPrimaryVenue && (
          <>
            {/* Primary Hotel Section */}
            <Accordion defaultExpanded={false}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ flexShrink: 0, fontWeight: 'medium' }}>
                  Primary Hotel {primaryHotel ? `(${primaryHotel.hotelName})` : '(Not Set)'}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {primaryHotel ? (
                  <>
                    <HotelForm
                      formData={primaryHotel}
                      onFormDataChange={(data: Partial<HotelData>) => {
                        const primaryIndex = hotels.findIndex(h => h.isPrimaryHotel);
                        if (primaryIndex !== -1) {
                          handleHotelChange(primaryIndex, data);
                        }
                      }}
                      isPrimaryHotel={true}
                      title="Primary Hotel Details"
                      disabled={disabled}
                      errors={structuredErrors.hotels?.[hotels.findIndex(h => h.isPrimaryHotel)]}
                    />
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography color="text.secondary" gutterBottom>
                      No primary hotel set. Add a hotel below and mark it as primary.
                    </Typography>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </>
        )}

        {/* Additional Hotels — ALWAYS visible. Overflow hotels are valid even
            when guests stay at the venue (the public page lists them under
            the venue-as-hotel); only the separate primary-hotel form is
            replaced by the stay-at-venue room block. This gating bug is what
            made helper-applied secondary hotels look like they vanished. */}
        {additionalHotels.map((hotel, index) => {
              // Identify the row by object reference, not id: freshly-scraped
              // (unsaved) hotels all share id === undefined, so an id-based
              // findIndex collides them onto one slot and photo/field edits
              // land on the wrong hotel. filter() preserves references, so
              // indexOf is exact for saved and unsaved hotels alike.
              const actualIndex = hotels.indexOf(hotel);
              return (
                <Accordion key={hotel.id || hotel.tempId || `hotel-${index}`} defaultExpanded={false}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      {/* Show the hotel's actual name so the organizer always
                          knows which hotel this row edits; a bare positional
                          label invites typing one hotel's info into another. */}
                      <Typography sx={{ fontWeight: 'medium', mr: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(hotel.hotelName || '').trim() || `Additional Hotel ${index + 1}`}
                      </Typography>
                      {/* Explicit, immediate promotion — always available. In
                          stay-at-venue mode promoting also turns that toggle
                          off (a separate primary hotel supersedes it). */}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => { e.stopPropagation(); handlePromoteHotel(actualIndex); }}
                        disabled={disabled || promotionSaving}
                        aria-label={`Make ${(hotel.hotelName || '').trim() || `additional hotel ${index + 1}`} the primary hotel`}
                        sx={{ flexShrink: 0, mr: 1 }}
                      >
                        Make Primary
                      </Button>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <HotelForm
                      formData={hotel}
                      onFormDataChange={(data: Partial<HotelData>) => handleHotelChange(actualIndex, data)}
                      isPrimaryHotel={false}
                      disabled={disabled}
                      errors={structuredErrors.hotels?.[actualIndex]}
                    />
                    <Button
                      startIcon={<DeleteIcon />}
                      onClick={() => handleRemoveHotel(actualIndex)}
                      color="error"
                      sx={{ mt: 1 }}
                      disabled={disabled}
                    >
                      Remove Hotel
                    </Button>
                  </AccordionDetails>
                </Accordion>
              );
            })}

        <Button startIcon={<AddIcon />} onClick={handleAddHotel} sx={{ mt: 2 }} disabled={disabled}>
          Add Another Hotel
        </Button>
      </Box>
    );
  };

  return (
    <Box>
      {promotionError && (
        <Alert severity="warning" onClose={() => setPromotionError(null)} sx={{ mb: 2 }}>
          {promotionError}
        </Alert>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5">Venue Information</Typography>
        {conventionId && (
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => setHelperOpen(true)}
            disabled={disabled}
          >
            Import venue &amp; hotel info from your website
          </Button>
        )}
      </Box>
      {renderVenueForms()}
      {renderHotelForms()}

      {conventionId && (
        <VenueHotelHelperDialog
          open={helperOpen}
          onClose={() => setHelperOpen(false)}
          conventionId={conventionId}
          onApplied={applyVenueHotel}
          onLocaleApplied={onLocaleApplied}
          settingsFilled={settingsFilled}
          hasPrimaryVenue={!!(primaryVenue?.venueName || '').trim()}
          hasPrimaryHotel={(value.hotels || []).some(h => h.isPrimaryHotel && (h.hotelName || '').trim())}
        />
      )}

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

      <Dialog
        open={confirmDeletePrimary}
        onClose={() => setConfirmDeletePrimary(false)}
      >
        <DialogTitle>Delete Primary Venue</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This clears the primary venue and removes its saved record. The form resets
            to a blank primary venue. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeletePrimary(false)}>Cancel</Button>
          <Button onClick={handleDeletePrimaryVenue} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VenueHotelTab;
