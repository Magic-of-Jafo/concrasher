"use client";

import { Box, TextField, Button, Stack, useTheme, useMediaQuery } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { useState } from "react";
import { ConventionSearchParams } from "@/lib/search";

interface ConventionFilterPanelProps {
  onFilterChange: (filters: ConventionSearchParams) => void;
  initialFilters?: Partial<ConventionSearchParams>;
}

export default function ConventionFilterPanel({
  onFilterChange,
  initialFilters = {}
}: ConventionFilterPanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [filters, setFilters] = useState<ConventionSearchParams>({
    page: 1,
    limit: 10,
    query: initialFilters.query || '',
    city: initialFilters.city || '',
    state: initialFilters.state || '',
    country: initialFilters.country || '',
    startDate: initialFilters.startDate,
    endDate: initialFilters.endDate,
  });

  const handleFilterChange = (field: keyof ConventionSearchParams, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const emptyFilters: ConventionSearchParams = {
      page: 1,
      limit: 10,
      query: '',
      city: '',
      state: '',
      country: '',
      startDate: undefined,
      endDate: undefined,
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
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
          value={filters.query}
          onChange={(e) => handleFilterChange('query', e.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
        />
        <TextField
          label="City"
          value={filters.city}
          onChange={(e) => handleFilterChange('city', e.target.value)}
          size="small"
          sx={{ width: isMobile ? '100%' : '150px' }}
        />
        <TextField
          label="State"
          value={filters.state}
          onChange={(e) => handleFilterChange('state', e.target.value)}
          size="small"
          sx={{ width: isMobile ? '100%' : '150px' }}
        />
        <TextField
          label="Country"
          value={filters.country}
          onChange={(e) => handleFilterChange('country', e.target.value)}
          size="small"
          sx={{ width: isMobile ? '100%' : '150px' }}
        />
        <DatePicker
          label="Start Date"
          value={filters.startDate ? new Date(filters.startDate) : null}
          onChange={(date) => handleFilterChange('startDate', date?.toISOString())}
          slotProps={{ textField: { size: 'small', sx: { width: isMobile ? '100%' : '150px' } } }}
        />
        <DatePicker
          label="End Date"
          value={filters.endDate ? new Date(filters.endDate) : null}
          onChange={(date) => handleFilterChange('endDate', date?.toISOString())}
          slotProps={{ textField: { size: 'small', sx: { width: isMobile ? '100%' : '150px' } } }}
        />
        <Button
          variant="outlined"
          onClick={handleReset}
          size="small"
          sx={{ width: isMobile ? '100%' : 'auto' }}
        >
          Reset
        </Button>
      </Stack>
    </Box>
  );
} 