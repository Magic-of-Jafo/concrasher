"use client";

import { Box, TextField, Button, Stack, useTheme, useMediaQuery } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { ConventionSearchParams } from "@/lib/search";

interface ConventionFilterPanelProps {
  onFilterChange: (filters: Partial<ConventionSearchParams>) => void;
  initialFilters?: Partial<ConventionSearchParams>;
}

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

  return (
    <Box sx={{ mb: 3 }}>
      <Stack
        direction={isMobile ? "column" : "row"}
        spacing={2}
        alignItems={isMobile ? "stretch" : "center"}
      >
        <TextField
          label="Search"
          value={initialFilters.query || ''}
          onChange={(e) => handleFilterChange('query', e.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
        />
        <TextField
          label="City"
          value={initialFilters.city || ''}
          onChange={(e) => handleFilterChange('city', e.target.value)}
          size="small"
          sx={{ width: isMobile ? '100%' : '150px' }}
        />
        <TextField
          label="State"
          value={initialFilters.state || ''}
          onChange={(e) => handleFilterChange('state', e.target.value)}
          size="small"
          sx={{ width: isMobile ? '100%' : '150px' }}
        />
        <TextField
          label="Country"
          value={initialFilters.country || ''}
          onChange={(e) => handleFilterChange('country', e.target.value)}
          size="small"
          sx={{ width: isMobile ? '100%' : '150px' }}
        />
        <DatePicker
          label="Start Date"
          value={initialFilters.startDate ? new Date(initialFilters.startDate) : null}
          onChange={(date) => handleFilterChange('startDate', date?.toISOString())}
          slotProps={{ textField: { size: 'small', sx: { width: isMobile ? '100%' : '150px' } } }}
        />
        <DatePicker
          label="End Date"
          value={initialFilters.endDate ? new Date(initialFilters.endDate) : null}
          onChange={(date) => handleFilterChange('endDate', date?.toISOString())}
          slotProps={{ textField: { size: 'small', sx: { width: isMobile ? '100%' : '150px' } } }}
        />
        <Button
          variant="outlined"
          onClick={handleReset}
          size="small"
          sx={{ width: isMobile ? '100%' : 'auto' }}
        >
          Clear
        </Button>
      </Stack>
    </Box>
  );
} 