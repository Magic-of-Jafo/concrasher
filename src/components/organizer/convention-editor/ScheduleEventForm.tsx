"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Switch, FormControlLabel, Select, InputLabel, FormControl, Box, Typography, IconButton, Tooltip, FormHelperText, Autocomplete, Chip, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import VerifiedIcon from '@mui/icons-material/Verified';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { EVENT_TYPES, getEventTypeColor, isCanonicalEventType } from '@/lib/eventTypes';

// Roles a performer can have on an event. Free text also allowed via the form.
const PERFORMER_ROLES = ['Performer', 'Lecturer', 'MC', 'Panelist', 'Host', 'Workshop Leader', 'Judge', 'Guest of Honor', 'Other'];

// Best-guess role from the event type + title, so confirming a detected
// performer is a single click. Falls back to 'Performer'.
function guessRole(eventType: string, title: string): string {
  const t = `${eventType} ${title}`.toLowerCase();
  if (/\bmc\b|emcee|\bhost(ed)?\b/.test(t)) return 'MC';
  if (/panel/.test(t)) return 'Panelist';
  if (/lecture/.test(t)) return 'Lecturer';
  if (/workshop/.test(t)) return 'Workshop Leader';
  if (/compet|contest|judg/.test(t)) return 'Judge';
  return 'Performer';
}

interface PerformerRow {
  talentId?: string;   // set when matched to an existing profile
  name: string;        // display name (also used to create/match)
  role: string;
  claimed?: boolean;   // existing profile is owned by a real user
}

interface TalentSearchOption {
  id: string;
  displayName: string;
  claimed: boolean;
}

interface DetectedSuggestion {
  id: string;
  displayName: string;
  claimed: boolean;
  fuzzy?: boolean;
}


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

  // Performers (talent tagging)
  const [performers, setPerformers] = useState<PerformerRow[]>([]);
  const [talentInput, setTalentInput] = useState('');
  const [talentOptions, setTalentOptions] = useState<TalentSearchOption[]>([]);
  const [talentLoading, setTalentLoading] = useState(false);
  // Auto-detected existing talent found in the title/description.
  const [detected, setDetected] = useState<DetectedSuggestion[]>([]);
  // On-demand AI extraction (Layer 2) — finds names not yet in the DB.
  const [aiResults, setAiResults] = useState<{ name: string; role: string | null }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isCreatingNewEvent, setIsCreatingNewEvent] = useState(forceCreateNew);

  // Debounced search against existing talent (claimed or unclaimed).
  useEffect(() => {
    const q = talentInput.trim();
    if (!q) { setTalentOptions([]); return; }
    setTalentLoading(true);
    const handle = setTimeout(() => {
      fetch(`/api/talent/search?q=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(data => setTalentOptions(Array.isArray(data?.results) ? data.results : []))
        .catch(() => setTalentOptions([]))
        .finally(() => setTalentLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [talentInput]);

  // Auto-detect existing talent named in the title/description (debounced).
  useEffect(() => {
    if (!open) { setDetected([]); return; }
    const text = `${title} ${description}`.trim();
    if (!text) { setDetected([]); return; }
    const handle = setTimeout(() => {
      fetch('/api/talent/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
        .then(res => res.json())
        .then(data => setDetected(Array.isArray(data?.results) ? data.results : []))
        .catch(() => setDetected([]));
    }, 400);
    return () => clearTimeout(handle);
  }, [open, title, description]);

  const addPerformer = (row: PerformerRow) => {
    const name = row.name.trim();
    if (!name) return;
    // De-dupe inside the updater (by talentId if known, else by name) so rapid
    // adds — e.g. "Add all" — can't create duplicates from stale state.
    setPerformers(prev => {
      const exists = prev.some(p =>
        (row.talentId && p.talentId === row.talentId) ||
        (!row.talentId && p.name.trim().toLowerCase() === name.toLowerCase())
      );
      return exists ? prev : [...prev, { ...row, name }];
    });
    setTalentInput('');
    setTalentOptions([]);
  };

  const updatePerformerRole = (index: number, role: string) => {
    setPerformers(prev => prev.map((p, i) => i === index ? { ...p, role } : p));
  };

  const removePerformer = (index: number) => {
    setPerformers(prev => prev.filter((_, i) => i !== index));
  };

  // Layer 2: ask the AI to pull performer names out of the title/description
  // (catches new names + shared surnames that string-matching can't).
  const runAiExtract = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/talent/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, eventType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data?.error || 'AI request failed.');
        setAiResults([]);
      } else {
        setAiResults(Array.isArray(data?.results) ? data.results : []);
      }
    } catch {
      setAiError('AI request failed.');
      setAiResults([]);
    } finally {
      setAiLoading(false);
    }
  };

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

      // Load existing performers from the event's talent links.
      const links = Array.isArray(eventToLoad?.talentLinks) ? eventToLoad.talentLinks : [];
      setPerformers(
        links.map((l: any) => ({
          talentId: l.talentProfile?.id ?? l.talentProfileId,
          name: l.nameAsListed || l.talentProfile?.displayName || '',
          role: l.role || 'Performer',
          claimed: !!l.talentProfile?.userId,
        })).filter((p: PerformerRow) => p.name)
      );
      setTalentInput('');
      setTalentOptions([]);
      setAiResults([]);
      setAiError(null);
      setErrors({});
    } else {
      setIsCreatingNewEvent(forceCreateNew); // Reset based on forceCreateNew
      setDurationMinutes('30'); // Reset duration on close if needed
      setIsMilestone(false);     // Reset milestone on close
      setPerformers([]);
      setTalentInput('');
      setTalentOptions([]);
      setAiResults([]);
      setAiError(null);
      setErrors({});
    }
  }, [open, item, forceCreateNew]);

  // Color for event type
  const eventTypeColor = getEventTypeColor(eventType);

  // Detected talent not already added as a performer, split by match confidence.
  const pendingSuggestions = detected.filter(d => !performers.some(p => p.talentId === d.id));
  const exactSuggestions = pendingSuggestions.filter(d => !d.fuzzy);
  const fuzzySuggestions = pendingSuggestions.filter(d => d.fuzzy);
  // AI results not already added as a performer (matched by name).
  const aiPending = aiResults.filter(r =>
    !performers.some(p => p.name.trim().toLowerCase() === r.name.trim().toLowerCase())
  );

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
      // Performers — backend matches/creates talent and links them to the event.
      talent: performers.map(p => ({
        talentId: p.talentId,
        name: p.name.trim(),
        role: p.role || null,
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
                  <EventIcon sx={{ color: getEventTypeColor(selectedValue as string), mr: 1 }} />
                  {selectedValue}
                </Box>
              )}
            >
              {/* Keep a legacy value (e.g. "Show") selectable so it doesn't render blank. */}
              {eventType && !isCanonicalEventType(eventType) && (
                <MenuItem value={eventType}>
                  <EventIcon sx={{ color: getEventTypeColor(eventType), mr: 1 }} />
                  {eventType} (legacy)
                </MenuItem>
              )}
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

          {/* Performers — tag the talent appearing in this event */}
          <Box mt={2} p={2} border={1} borderColor="grey.300" borderRadius={1}>
            <Typography variant="subtitle1" mb={1}>Talent</Typography>

            {exactSuggestions.length > 0 && (
              <Box mb={1.5}>
                <Typography variant="caption" color="text.secondary">
                  Detected in title/description — tap to add:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.75} mt={0.5} alignItems="center">
                  {exactSuggestions.map(s => (
                    <Chip
                      key={s.id}
                      icon={<AddIcon />}
                      label={s.displayName}
                      onClick={() => addPerformer({ talentId: s.id, name: s.displayName, role: guessRole(eventType, title), claimed: s.claimed })}
                      color={s.claimed ? 'success' : 'default'}
                      variant="outlined"
                      size="small"
                      clickable
                    />
                  ))}
                  {exactSuggestions.length > 1 && (
                    <Button
                      size="small"
                      onClick={() => exactSuggestions.forEach(s => addPerformer({ talentId: s.id, name: s.displayName, role: guessRole(eventType, title), claimed: s.claimed }))}
                    >
                      Add all
                    </Button>
                  )}
                </Box>
              </Box>
            )}

            {fuzzySuggestions.length > 0 && (
              <Box mb={1.5}>
                <Typography variant="caption" color="warning.main">
                  Did you mean… ? (possible misspelling — tap to add the correct name)
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.75} mt={0.5} alignItems="center">
                  {fuzzySuggestions.map(s => (
                    <Tooltip key={s.id} title={`Add "${s.displayName}" as the performer`}>
                      <Chip
                        icon={<AddIcon />}
                        label={`${s.displayName}?`}
                        onClick={() => addPerformer({ talentId: s.id, name: s.displayName, role: guessRole(eventType, title), claimed: s.claimed })}
                        color="warning"
                        variant="outlined"
                        size="small"
                        clickable
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            )}

            <Autocomplete
              freeSolo
              options={talentOptions}
              loading={talentLoading}
              value={null}
              inputValue={talentInput}
              onInputChange={(_, v) => setTalentInput(v)}
              filterOptions={(x) => x}
              getOptionLabel={(o) => (typeof o === 'string' ? o : o.displayName)}
              isOptionEqualToValue={(o, v) => (o as TalentSearchOption).id === (v as TalentSearchOption).id}
              onChange={(_, value) => {
                if (!value) return;
                if (typeof value === 'string') {
                  addPerformer({ name: value, role: 'Performer' });
                } else {
                  addPerformer({ talentId: value.id, name: value.displayName, role: 'Performer', claimed: value.claimed });
                }
              }}
              renderOption={(props, option) => (
                <li {...props} key={(option as TalentSearchOption).id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography sx={{ flexGrow: 1 }}>{(option as TalentSearchOption).displayName}</Typography>
                    <Chip
                      size="small"
                      label={(option as TalentSearchOption).claimed ? 'Claimed' : 'Unclaimed'}
                      color={(option as TalentSearchOption).claimed ? 'success' : 'default'}
                      variant={(option as TalentSearchOption).claimed ? 'filled' : 'outlined'}
                    />
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Add talent"
                  placeholder="Search existing talent, or type a new name…"
                  helperText="Pick an existing profile, or type a new name to create an unclaimed one"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {talentLoading ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={aiLoading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                onClick={runAiExtract}
                disabled={aiLoading || (!title.trim() && !description.trim())}
              >
                {aiLoading ? 'Scanning…' : 'Find performers with AI'}
              </Button>
              {aiError && <Typography variant="caption" color="error.main">{aiError}</Typography>}
              {!aiError && !aiLoading && aiResults.length > 0 && aiPending.length === 0 && (
                <Typography variant="caption" color="text.secondary">No new names found.</Typography>
              )}
            </Box>
            {aiPending.length > 0 && (
              <Box mt={1} mb={0.5}>
                <Typography variant="caption" color="text.secondary">AI-detected — tap to add:</Typography>
                <Box display="flex" flexWrap="wrap" gap={0.75} mt={0.5} alignItems="center">
                  {aiPending.map((r, i) => (
                    <Chip
                      key={`ai-${r.name}-${i}`}
                      icon={<AutoAwesomeIcon />}
                      label={r.role ? `${r.name} · ${r.role}` : r.name}
                      onClick={() => addPerformer({ name: r.name, role: r.role || guessRole(eventType, title) })}
                      color="secondary"
                      variant="outlined"
                      size="small"
                      clickable
                    />
                  ))}
                  {aiPending.length > 1 && (
                    <Button
                      size="small"
                      onClick={() => aiPending.forEach(r => addPerformer({ name: r.name, role: r.role || guessRole(eventType, title) }))}
                    >
                      Add all
                    </Button>
                  )}
                </Box>
              </Box>
            )}

            {performers.length > 0 && (
              <Box mt={1.5}>
                {performers.map((p, i) => (
                  <Box key={p.talentId || `new-${p.name}`} display="flex" alignItems="center" gap={1} mb={1}>
                    <Box display="flex" alignItems="center" gap={0.5} sx={{ flexGrow: 1, minWidth: 0 }}>
                      {p.claimed && (
                        <Tooltip title="Claimed profile (owned by a registered user)">
                          <VerifiedIcon fontSize="small" color="success" />
                        </Tooltip>
                      )}
                      <Typography noWrap title={p.name}>{p.name}</Typography>
                      {!p.talentId && <Chip size="small" label="New" color="info" variant="outlined" />}
                    </Box>
                    <FormControl size="small" sx={{ width: 160 }}>
                      <Select
                        value={PERFORMER_ROLES.includes(p.role) ? p.role : 'Other'}
                        onChange={e => updatePerformerRole(i, e.target.value)}
                      >
                        {PERFORMER_ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <Tooltip title="Remove performer">
                      <IconButton onClick={() => removePerformer(i)}><DeleteIcon /></IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

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
            control={
              <Switch
                checked={atPrimaryVenue}
                onChange={(e) => setAtPrimaryVenue(e.target.checked)}
                name="atPrimaryVenue"
              />
            }
            label="Event is at Primary Venue"
          />
          {!atPrimaryVenue && (
            <FormControl fullWidth margin="normal" required error={!!errors.venueId}>
              <InputLabel id="venue-select-label">Select Secondary Venue or Hotel</InputLabel>
              <Select
                labelId="venue-select-label"
                value={venueId}
                onChange={e => setVenueId(e.target.value)}
                label="Select Secondary Venue or Hotel"
              >
                {loadingVenues ? (
                  <MenuItem disabled><em>Loading...</em></MenuItem>
                ) : (
                  venueOptions.map(option => (
                    <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>
                  ))
                )}
              </Select>
              {errors.venueId && <FormHelperText>{errors.venueId}</FormHelperText>}
            </FormControl>
          )}
          {atPrimaryVenue && (
            <TextField
              label="Room/Area Name (e.g., Main Stage)"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              fullWidth
              margin="normal"
              helperText="e.g., Main Stage, Panel Room A"
            />
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