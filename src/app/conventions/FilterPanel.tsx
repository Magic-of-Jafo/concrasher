import { useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  useTheme,
  useMediaQuery,
  Paper,
  OutlinedInput,
} from '@mui/material';
import { FilterList as FilterIcon, Close as CloseIcon } from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConventionStatus } from '@prisma/client';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface FilterPanelProps {
  className?: string;
}

export function FilterPanel({ className }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isOpen, setIsOpen] = useState(false);

  // Filter states
  const [startDate, setStartDate] = useState<Date | null>(
    searchParams?.get('startDate') ? new Date(searchParams.get('startDate')!) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    searchParams?.get('endDate') ? new Date(searchParams.get('endDate')!) : null
  );
  const [country, setCountry] = useState(searchParams?.get('country') || '');
  const [state, setState] = useState(searchParams?.get('state') || '');
  const [city, setCity] = useState(searchParams?.get('city') || '');
  const [status, setStatus] = useState<ConventionStatus[]>(
    searchParams?.get('status')?.split(',') as ConventionStatus[] || []
  );
  const [minPrice, setMinPrice] = useState(searchParams?.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams?.get('maxPrice') || '');

  const handleApplyFilters = () => {
    if (!searchParams) return;

    const params = new URLSearchParams(searchParams.toString());

    // Reset to page 1 when filters change
    params.set('page', '1');

    // Update params with current filter values
    if (startDate) params.set('startDate', startDate.toISOString());
    else params.delete('startDate');

    if (endDate) params.set('endDate', endDate.toISOString());
    else params.delete('endDate');

    if (country) params.set('country', country);
    else params.delete('country');

    if (state) params.set('state', state);
    else params.delete('state');

    if (city) params.set('city', city);
    else params.delete('city');

    if (status.length) params.set('status', status.join(','));
    else params.delete('status');

    if (minPrice) params.set('minPrice', minPrice);
    else params.delete('minPrice');

    if (maxPrice) params.set('maxPrice', maxPrice);
    else params.delete('maxPrice');

    router.push(`/conventions?${params.toString()}`);
    if (isMobile) setIsOpen(false);
  };

  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setCountry('');
    setState('');
    setCity('');
    setStatus([]);
    setMinPrice('');
    setMaxPrice('');

    if (!searchParams) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('startDate');
    params.delete('endDate');
    params.delete('country');
    params.delete('state');
    params.delete('city');
    params.delete('status');
    params.delete('minPrice');
    params.delete('maxPrice');
    params.set('page', '1');

    router.push(`/conventions?${params.toString()}`);
  };

  const commonTextFieldProps = {
    fullWidth: true,
    size: "small" as const,
    sx: {
      bgcolor: 'background.paper',
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: 'divider',
        },
        '&:hover fieldset': {
          borderColor: 'primary.main',
        },
        '&.Mui-focused fieldset': {
          borderColor: 'primary.main',
        },
      },
      '& .MuiInputLabel-root': {
        color: 'text.primary',
      },
      '& .MuiInputBase-input': {
        color: 'text.primary',
      },
    },
  };

  const commonSelectProps = {
    fullWidth: true,
    size: "small" as const,
    sx: {
      bgcolor: 'background.paper',
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: 'divider',
        },
        '&:hover fieldset': {
          borderColor: 'primary.main',
        },
        '&.Mui-focused fieldset': {
          borderColor: 'primary.main',
        },
      },
      '& .MuiInputLabel-root': {
        color: 'text.primary',
      },
      '& .MuiSelect-select': {
        color: 'text.primary',
      },
    },
  };

  const filterContent = (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        handleApplyFilters();
      }}
      sx={{ p: 2 }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" color="text.primary">Filters</Typography>
        {isMobile && (
          <IconButton onClick={() => setIsOpen(false)}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <Stack spacing={2}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
            slotProps={{
              textField: {
                ...commonTextFieldProps,
                label: 'Start Date',
                autoComplete: 'off',
                onKeyDown: (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyFilters();
                  }
                },
              },
            }}
          />
          <DatePicker
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            slotProps={{
              textField: {
                ...commonTextFieldProps,
                label: 'End Date',
                autoComplete: 'off',
                onKeyDown: (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyFilters();
                  }
                },
              },
            }}
          />
        </LocalizationProvider>

        <TextField
          {...commonTextFieldProps}
          label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApplyFilters();
            }
          }}
        />

        <TextField
          {...commonTextFieldProps}
          label="State/Province"
          value={state}
          onChange={(e) => setState(e.target.value)}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApplyFilters();
            }
          }}
          placeholder="e.g., Ohio or OH"
          helperText="Enter full name (e.g., Ohio) or abbreviation (e.g., OH)"
        />

        <TextField
          {...commonTextFieldProps}
          label="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApplyFilters();
            }
          }}
        />

        <FormControl {...commonSelectProps}>
          <InputLabel id="status-select-label">Status</InputLabel>
          <Select
            labelId="status-select-label"
            id="status-select"
            multiple
            value={status}
            onChange={(e) => setStatus(e.target.value as ConventionStatus[])}
            input={<OutlinedInput label="Status" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyFilters();
              }
            }}
          >
            {Object.values(ConventionStatus).map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          {...commonTextFieldProps}
          label="Min Price"
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApplyFilters();
            }
          }}
        />

        <TextField
          {...commonTextFieldProps}
          label="Max Price"
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApplyFilters();
            }
          }}
        />

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
          >
            Apply Filters
          </Button>
          <Button
            type="button"
            variant="outlined"
            color="primary"
            fullWidth
            onClick={handleClearFilters}
          >
            Clear
          </Button>
        </Box>
      </Stack>
    </Box>
  );

  return (
    <>
      {isMobile ? (
        <>
          <IconButton
            onClick={() => setIsOpen(true)}
            sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            <FilterIcon />
          </IconButton>
          <Drawer
            anchor="right"
            open={isOpen}
            onClose={() => setIsOpen(false)}
            PaperProps={{
              sx: {
                width: '100%',
                maxWidth: 320,
                bgcolor: 'background.default',
              },
            }}
          >
            {filterContent}
          </Drawer>
        </>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: 'background.default',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
          className={className}
        >
          {filterContent}
        </Paper>
      )}
    </>
  );
} 