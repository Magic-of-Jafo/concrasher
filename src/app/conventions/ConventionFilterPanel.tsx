"use client";

import { useEffect, useState } from 'react';
import { Box, TextField, Button, Autocomplete, useTheme, useMediaQuery } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { ConventionSearchParams } from "@/lib/search";
import { DISPLAY, BODY } from '@/components/frontpage/FrontPage';

// Filter fields on the House Lights stage. State/Country are pickers fed by
// /api/conventions/filter-options — only values that occur on real listings,
// so a filter can't be spelled into an empty page — while still accepting
// free typing. MUI's default input palette is invisible on the slate/teal
// grounds, so everything (including portal popups) restyles via cc tokens.

interface ConventionFilterPanelProps {
  onFilterChange: (filters: Partial<ConventionSearchParams>) => void;
  initialFilters?: Partial<ConventionSearchParams>;
}

interface FilterOptions {
  states: { name: string; abbreviation: string | null }[];
  countries: string[];
}

// One restyle for every field in the panel. MUI X date pickers render their
// own class family (MuiPickersOutlinedInput), so each rule targets both.
const fieldThemeSx = {
  '& .MuiOutlinedInput-root, & .MuiPickersOutlinedInput-root': {
    fontFamily: BODY,
    color: 'var(--cc-ink)',
    borderRadius: '8px',
    minHeight: 44,
    '& fieldset, & .MuiPickersOutlinedInput-notchedOutline': { borderColor: 'var(--cc-panel-border)' },
    '&:hover fieldset, &:hover .MuiPickersOutlinedInput-notchedOutline': { borderColor: 'var(--cc-cyan)' },
    '&.Mui-focused fieldset, &.Mui-focused .MuiPickersOutlinedInput-notchedOutline': { borderColor: 'var(--cc-cyan)', borderWidth: 2 },
  },
  '& .MuiPickersInputBase-sectionsContainer': { color: 'var(--cc-ink)' },
  '& .MuiInputLabel-root': {
    fontFamily: BODY,
    color: 'var(--cc-muted)',
    '&.Mui-focused': { color: 'var(--cc-cyan)' },
  },
  '& .MuiSvgIcon-root': { color: 'var(--cc-muted)' },
} as const;

// Portal surfaces (autocomplete listboxes, the calendar) don't inherit page
// styles; dress them in the same theme.
const popupPaperSx = {
  backgroundColor: 'var(--cc-bg)',
  backgroundImage: 'none',
  color: 'var(--cc-ink)',
  border: '1px solid var(--cc-panel-border)',
  borderRadius: '8px',
  fontFamily: BODY,
  '& .MuiAutocomplete-option': {
    fontFamily: BODY,
    '&[aria-selected="true"], &.Mui-focused, &[aria-selected="true"].Mui-focused': {
      backgroundColor: 'var(--cc-panel)',
    },
  },
  '& .MuiAutocomplete-noOptions': { color: 'var(--cc-muted)', fontFamily: BODY },
} as const;

const calendarPopperSx = {
  '& .MuiPaper-root': {
    backgroundColor: 'var(--cc-bg)',
    backgroundImage: 'none',
    color: 'var(--cc-ink)',
    border: '1px solid var(--cc-panel-border)',
    borderRadius: '8px',
  },
  '& .MuiPickersCalendarHeader-root, & .MuiPickersCalendarHeader-label': { color: 'var(--cc-ink)', fontFamily: BODY },
  '& .MuiSvgIcon-root': { color: 'var(--cc-muted)' },
  '& .MuiDayCalendar-weekDayLabel': { color: 'var(--cc-muted)' },
  '& .MuiPickersDay-root': {
    color: 'var(--cc-ink)',
    fontFamily: BODY,
    '&:hover': { backgroundColor: 'var(--cc-panel)' },
    '&.Mui-selected, &.Mui-selected:hover, &.Mui-selected:focus': {
      backgroundColor: 'var(--cc-gold)',
      color: 'var(--cc-gold-ink)',
    },
    '&.MuiPickersDay-today': { borderColor: 'var(--cc-cyan)' },
    '&.Mui-disabled': { color: 'var(--cc-soft)' },
  },
  '& .MuiPickersYear-yearButton': {
    color: 'var(--cc-ink)',
    '&.Mui-selected': { backgroundColor: 'var(--cc-gold)', color: 'var(--cc-gold-ink)' },
  },
} as const;

export default function ConventionFilterPanel({
  onFilterChange,
  initialFilters = {}
}: ConventionFilterPanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [options, setOptions] = useState<FilterOptions>({ states: [], countries: [] });

  useEffect(() => {
    let mounted = true;
    fetch('/api/conventions/filter-options')
      .then((r) => (r.ok ? r.json() : { states: [], countries: [] }))
      .then((d) => { if (mounted) setOptions({ states: d.states || [], countries: d.countries || [] }); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleFilterChange = (field: keyof ConventionSearchParams, value: any) => {
    onFilterChange({ [field]: value });
  };

  const handleReset = () => {
    onFilterChange({
      query: '',
      city: '',
      state: '',
      country: '',
      startDate: undefined,
      endDate: undefined,
    });
  };

  const narrow = { width: isMobile ? '100%' : 170, ...fieldThemeSx } as const;

  // The server filter matches stateName OR abbreviation (contains), so
  // selecting "Ohio (OH)" passes just the name; typing free text passes as-is.
  const stateLabel = (s: FilterOptions['states'][number]) =>
    s.abbreviation && s.name !== s.abbreviation ? `${s.name} (${s.abbreviation})` : s.name;
  const selectedState = options.states.find(
    (s) => s.name === initialFilters.state || s.abbreviation === initialFilters.state,
  ) ?? (initialFilters.state ? { name: initialFilters.state, abbreviation: null } : null);

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <TextField
        label="Search"
        value={initialFilters.query || ''}
        onChange={(e) => handleFilterChange('query', e.target.value)}
        size="small"
        sx={{ flexGrow: 1, minWidth: isMobile ? '100%' : 220, ...fieldThemeSx }}
      />
      <TextField
        label="City"
        value={initialFilters.city || ''}
        onChange={(e) => handleFilterChange('city', e.target.value)}
        size="small"
        sx={narrow}
      />
      <Autocomplete
        freeSolo
        options={options.states}
        getOptionLabel={(o) => (typeof o === 'string' ? o : stateLabel(o))}
        value={selectedState}
        inputValue={initialFilters.state || ''}
        onInputChange={(_, v, reason) => { if (reason !== 'reset') handleFilterChange('state', v); }}
        onChange={(_, v) => handleFilterChange('state', v == null ? '' : typeof v === 'string' ? v : v.name)}
        slotProps={{ paper: { sx: popupPaperSx } }}
        renderInput={(params) => <TextField {...params} label="State" size="small" />}
        sx={narrow}
      />
      <Autocomplete
        freeSolo
        options={options.countries}
        value={initialFilters.country || null}
        inputValue={initialFilters.country || ''}
        onInputChange={(_, v, reason) => { if (reason !== 'reset') handleFilterChange('country', v); }}
        onChange={(_, v) => handleFilterChange('country', v || '')}
        slotProps={{ paper: { sx: popupPaperSx } }}
        renderInput={(params) => <TextField {...params} label="Country" size="small" />}
        sx={narrow}
      />
      <DatePicker
        label="From"
        value={initialFilters.startDate ? new Date(initialFilters.startDate) : null}
        onChange={(date) => handleFilterChange('startDate', date?.toISOString())}
        slotProps={{ textField: { size: 'small', sx: narrow }, popper: { sx: calendarPopperSx } }}
      />
      <DatePicker
        label="Until"
        value={initialFilters.endDate ? new Date(initialFilters.endDate) : null}
        onChange={(date) => handleFilterChange('endDate', date?.toISOString())}
        slotProps={{ textField: { size: 'small', sx: narrow }, popper: { sx: calendarPopperSx } }}
      />
      <Button
        onClick={handleReset}
        sx={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: '0.85rem',
          textTransform: 'none',
          color: 'var(--cc-muted)',
          minHeight: 44,
          px: 1.5,
          borderRadius: '8px',
          width: isMobile ? '100%' : 'auto',
          '&:hover': { color: 'var(--cc-ink)', backgroundColor: 'var(--cc-panel)' },
          '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
        }}
      >
        Clear filters
      </Button>
    </Box>
  );
}
