"use client";

import { Box, TextField, Button, useTheme, useMediaQuery } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { ConventionSearchParams } from "@/lib/search";
import { DISPLAY, BODY } from '@/components/frontpage/FrontPage';

// Filter fields on the House Lights stage. MUI's default input palette is
// invisible on the slate/teal grounds, so the wrapper restyles every field
// through the cc tokens; both themes come along for free. Functionality is
// untouched: same fields, same immediate onFilterChange per keystroke.

interface ConventionFilterPanelProps {
  onFilterChange: (filters: Partial<ConventionSearchParams>) => void;
  initialFilters?: Partial<ConventionSearchParams>;
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

export default function ConventionFilterPanel({
  onFilterChange,
  initialFilters = {}
}: ConventionFilterPanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  const narrow = { width: isMobile ? '100%' : 160, ...fieldThemeSx } as const;

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
      <TextField
        label="State"
        value={initialFilters.state || ''}
        onChange={(e) => handleFilterChange('state', e.target.value)}
        size="small"
        sx={narrow}
      />
      <TextField
        label="Country"
        value={initialFilters.country || ''}
        onChange={(e) => handleFilterChange('country', e.target.value)}
        size="small"
        sx={narrow}
      />
      <DatePicker
        label="From"
        value={initialFilters.startDate ? new Date(initialFilters.startDate) : null}
        onChange={(date) => handleFilterChange('startDate', date?.toISOString())}
        slotProps={{ textField: { size: 'small', sx: narrow } }}
      />
      <DatePicker
        label="Until"
        value={initialFilters.endDate ? new Date(initialFilters.endDate) : null}
        onChange={(date) => handleFilterChange('endDate', date?.toISOString())}
        slotProps={{ textField: { size: 'small', sx: narrow } }}
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
