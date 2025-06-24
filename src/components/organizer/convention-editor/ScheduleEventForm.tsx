"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Switch, FormControlLabel, Select, InputLabel, FormControl, Box, Typography, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';

const EVENT_TYPES = [
  { value: 'Lecture', color: '#64b5f6' },     // Blue 300
  { value: 'Workshop', color: '#81c784' },    // Green 300
  { value: 'Show', color: '#ba68c8' },        // Purple 300
  { value: 'Panel', color: '#ffb74d' },       // Orange 300
  { value: 'Competition', color: '#f06292' },  // Pink 300
  { value: 'Dealers', color: '#4db6ac' },     // Teal 300
  { value: 'Other', color: '#90a4ae' },       // Blue Grey 300
];

interface ScheduleEventFormProps {
  open: boolean;
  onClose: () => void;
  item: any | null;
  conventionId?: string;
  venues?: { id: string; venueName: string; isPrimaryVenue?: boolean }[];
  hotels?: { id: string; hotelName: string }[];
  allScheduleItems?: any[];
  onSave: (data: any) => void;
  onDelete?: () => void;
  forceCreateNew?: boolean;
}

export default function ScheduleEventForm({ open, onClose, item, conventionId, venues = [], hotels = [], allScheduleItems = [], onSave, onDelete, forceCreateNew = false }: ScheduleEventFormProps) {
  // Debug logging for troubleshooting dropdown population
  // console.log('ScheduleEventForm venues:', venues);
  // console.log('ScheduleEventForm hotels:', hotels);

  // Form state
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPES[0].value);
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30'); // Default duration, string for TextField
  const [isMilestone, setIsMilestone] = useState(false);
  const [atPrimaryVenue, setAtPrimaryVenue] = useState(true);
  const [locationName, setLocationName] = useState('');
  const [venueId, setVenueId] = useState('');
  const [venueOptions, setVenueOptions] = useState<{ id: string; name: string }[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [noFee, setNoFee] = useState(true);
  const [feeTiers, setFeeTiers] = useState<{ id?: string; label: string; amount: string }[]>([{ label: 'Standard', amount: '' }]);

  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isCreatingNewEvent, setIsCreatingNewEvent] = useState(forceCreateNew);

  // Populate venueOptions from props when open/atPrimaryVenue changes
  useEffect(() => {
    if (!open || atPrimaryVenue) return;
    setLoadingVenues(true);
    const cid = conventionId || item?.conventionId;
    if (!cid) {
      setLoadingVenues(false);
      return;
    }
    Promise.all([
      fetch(`/api/conventions/${cid}/venues`).then(res => res.json()),
      fetch(`/api/conventions/${cid}/hotels`).then(res => res.json()),
    ])
      .then(([fetchedVenues, fetchedHotels]) => {
        const secondaryVenues = Array.isArray(fetchedVenues)
          ? fetchedVenues.filter((v: any) => !v.isPrimaryVenue).map((v: any) => ({ id: v.id, name: v.venueName }))
          : [];
        const allHotels = Array.isArray(fetchedHotels)
          ? fetchedHotels.map((h: any) => ({ id: h.id, name: h.hotelName }))
          : [];
        const options = [...secondaryVenues, ...allHotels];
        setVenueOptions(options);
      })
      .catch(() => setVenueOptions([]))
      .finally(() => setLoadingVenues(false));
  }, [open, atPrimaryVenue, conventionId, item?.conventionId]);

  // Effect to populate form when an existing item is selected or when `item` (for new event with time) changes
  useEffect(() => {
    if (open) {
      const eventToLoad = item;

      const creating = forceCreateNew || !eventToLoad?.id;
      setIsCreatingNewEvent(creating);

      setTitle(creating ? '' : eventToLoad?.title || '');
      setEventType(eventToLoad?.eventType || EVENT_TYPES[0].value);
      setDescription(eventToLoad?.description || '');

      const currentDuration = eventToLoad?.durationMinutes;
      if (currentDuration === 0) {
        setIsMilestone(true);
        setDurationMinutes('0'); // Or keep as default/last valid if preferred when unchecking
      } else {
        setIsMilestone(false);
        setDurationMinutes(currentDuration !== undefined ? String(currentDuration) : '30');
      }

      // Default location/venue settings
      let initialAtPrimaryVenue = true;
      let initialLocationName = '';
      let initialVenueId = '';

      if (eventToLoad) {
        initialAtPrimaryVenue = eventToLoad.venueId == null && (!eventToLoad.locationName || !eventToLoad.locationName.startsWith('Secondary:'));
        if (eventToLoad.venueId) { // If there's a venueId, it's not at primary
          initialAtPrimaryVenue = false;
          initialVenueId = eventToLoad.venueId;
        }
        initialLocationName = eventToLoad.locationName || '';
      }

      setAtPrimaryVenue(initialAtPrimaryVenue);
      setLocationName(initialLocationName);
      setVenueId(initialVenueId);

      const defaultFeeBehavior = !eventToLoad?.feeTiers || eventToLoad.feeTiers.length === 0 || (eventToLoad.feeTiers.length === 1 && eventToLoad.feeTiers[0].amount === 0);
      setNoFee(defaultFeeBehavior);

      setFeeTiers(
        !defaultFeeBehavior && eventToLoad?.feeTiers
          ? eventToLoad.feeTiers.map((t: any) => ({
            id: t.id,
            label: t.label,
            amount: t.amount !== undefined && t.amount !== null ? String(t.amount) : ''
          }))
          : [{ label: 'Standard', amount: '' }]
      );
      setErrors({});
    } else {
      setIsCreatingNewEvent(forceCreateNew); // Reset based on forceCreateNew
      setDurationMinutes('30'); // Reset duration on close if needed
      setIsMilestone(false);     // Reset milestone on close
      setErrors({});
    }
  }, [open, item, forceCreateNew]);

  // Color for event type
  const eventTypeColor = EVENT_TYPES.find(t => t.value === eventType)?.color || '#1976d2';

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
  };

  const handleMilestoneChange = (checked: boolean) => {
    setIsMilestone(checked);
    if (checked) {
      setErrors(prev => ({ ...prev, durationMinutes: '' })); // Clear duration error if switching to milestone
    }
    // Optionally, reset durationMinutes to a default like '15' or '30' when unchecking,
    // or leave it as is if user might toggle back and forth. For now, leaves it.
  };

  const handleSave = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim() && (isCreatingNewEvent || (item?.id && !title.trim()))) {
      newErrors.title = 'Event name is required';
    }
    if (!atPrimaryVenue && !venueId) newErrors.venueId = 'Venue/Hotel is required for off-site events.';

    const parsedDuration = parseInt(durationMinutes, 10);
    if (!isMilestone) {
      if (isNaN(parsedDuration) || parsedDuration <= 0) {
        newErrors.durationMinutes = 'Duration must be a positive number.';
      } else if (parsedDuration % 15 !== 0) {
        newErrors.durationMinutes = 'Duration must be in 15-minute increments.';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const finalDuration = isMilestone ? 0 : parsedDuration;

    // This data structure MUST match the ConventionScheduleItemCreateInput or ConventionScheduleItemUpdateInput
    // derived from the Zod schemas in `validators.ts`.
    const dataToSave: any = {
      title: title.trim(),
      eventType,
      description: description.trim(),
      durationMinutes: finalDuration,
      atPrimaryVenue,
      locationName: locationName.trim() || null,
      venueId: atPrimaryVenue ? null : venueId,
      requiresFee: !noFee,
      feeTiers: noFee ? [] : feeTiers
        .filter(t => t.label.trim() && t.amount.trim() && !isNaN(Number(t.amount.trim())))
        .map(t => ({
          id: t.id,
          label: t.label.trim(),
          amount: Number(t.amount.trim())
        })),
    };

    // Add fields that only exist on the original `item` if needed for context,
    // like dayOffset. The server action function signature handles this.
    if (item?.dayOffset !== undefined) {
      dataToSave.dayOffset = item.dayOffset;
    }

    if (item?.id && !isCreatingNewEvent) {
      dataToSave.id = item.id;
    }

    console.log("Data being sent to onSave:", dataToSave);
    onSave(dataToSave);
  };

  const handleFeeTierChange = (index: number, field: 'label' | 'amount', value: string) => {
    const updatedTiers = [...feeTiers];
    updatedTiers[index] = { ...updatedTiers[index], [field]: value };
    setFeeTiers(updatedTiers);
  };

  const handleAddFeeTier = () => {
    // When adding a new tier, give it a blank label for the user to fill in,
    // and initialize amount as an empty string for the controlled input.
    setFeeTiers([...feeTiers, { label: '', amount: '' }]);
  };

  const handleRemoveFeeTier = (index: number) => {
    const updatedTiers = feeTiers.filter((_, i) => i !== index);
    setFeeTiers(updatedTiers);
  };

  // Simplified Dialog Title
  const dialogTitleText = (item?.id && !forceCreateNew && !isCreatingNewEvent) ? 'Edit Event Details' : 'Add New Event Details';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{dialogTitleText}</DialogTitle>
      <DialogContent>
        <Box mt={1} mb={2}>
          <TextField
            label="Event Name"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            fullWidth
            required
            margin="normal"
            error={!!errors.title}
            helperText={errors.title}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Event Type</InputLabel>
            <Select
              value={eventType}
              onChange={e => setEventType(e.target.value)}
              label="Event Type"
              renderValue={(selectedValue) => (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EventIcon sx={{ color: EVENT_TYPES.find(t => t.value === selectedValue)?.color || 'inherit', mr: 1 }} />
                  {selectedValue}
                </Box>
              )}
            >
              {EVENT_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <EventIcon sx={{ color: type.color, mr: 1 }} />
                  {type.value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Event Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            margin="normal"
          />
          <FormControlLabel
            control={<Switch checked={isMilestone} onChange={(e) => handleMilestoneChange(e.target.checked)} />}
            label="This is a milestone event (no duration)"
          />
          {!isMilestone && (
            <TextField
              label="Duration (in minutes)"
              value={durationMinutes}
              onChange={e => setDurationMinutes(e.target.value)}
              type="number"
              fullWidth
              margin="normal"
              required
              error={!!errors.durationMinutes}
              helperText={errors.durationMinutes || "Must be in 15-minute increments (e.g., 30, 45, 60)"}
              inputProps={{ step: 15 }}
            />
          )}
          <FormControlLabel
            control={<Switch checked={atPrimaryVenue} onChange={e => setAtPrimaryVenue(e.target.checked)} />}
            label="Event is at the Primary Venue"
          />
          {atPrimaryVenue ? (
            <TextField
              label="Room Name / Location"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              fullWidth
              margin="normal"
              helperText="e.g., Main Stage, Panel Room A"
            />
          ) : (
            <>
              {loadingVenues ? (
                <Typography>Loading venues...</Typography>
              ) : (
                <FormControl fullWidth margin="normal" required error={!!errors.venueId}>
                  <InputLabel>Select Secondary Venue or Hotel</InputLabel>
                  <Select
                    value={venueId}
                    onChange={e => setVenueId(e.target.value)}
                    label="Select Secondary Venue or Hotel"
                  >
                    {venueOptions.map(option => (
                      <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>
                    ))}
                  </Select>
                  {errors.venueId && <Typography color="error" variant="caption">{errors.venueId}</Typography>}
                </FormControl>
              )}
              <TextField
                label="Room Name / Specific Location (Optional)"
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                fullWidth
                margin="normal"
                helperText="e.g., Ballroom West, Conference Room 3"
              />
            </>
          )}

          <FormControlLabel
            control={<Switch checked={noFee} onChange={e => setNoFee(e.target.checked)} />}
            label="No additional fees for this event"
          />

          {!noFee && (
            <Box mt={2} p={2} border={1} borderColor="grey.300" borderRadius={1}>
              <Typography variant="subtitle1" mb={1}>Fee Tiers</Typography>
              {feeTiers.map((tier, index) => (
                <Box key={index} display="flex" alignItems="center" mb={1} gap={1}>
                  <TextField
                    label="Fee Tier Label"
                    value={tier.label}
                    onChange={e => handleFeeTierChange(index, 'label', e.target.value)}
                    size="small"
                    sx={{ flexGrow: 1 }}
                  />
                  <TextField
                    label="Amount"
                    value={tier.amount}
                    onChange={e => handleFeeTierChange(index, 'amount', e.target.value)}
                    type="number"
                    size="small"
                    sx={{ width: '100px' }}
                  />
                  <Tooltip title="Remove tier">
                    <IconButton onClick={() => handleRemoveFeeTier(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
              <Tooltip title="Add another fee tier">
                <Button onClick={handleAddFeeTier} startIcon={<AddIcon />}>
                  Add tier
                </Button>
              </Tooltip>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {item?.id && onDelete && !isCreatingNewEvent && (
          <Button onClick={onDelete} color="error" sx={{ mr: 'auto' }}>Delete Event</Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
}