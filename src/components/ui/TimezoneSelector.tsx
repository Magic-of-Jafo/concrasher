import React, { useState, useEffect, useMemo } from 'react';
import {
    Autocomplete,
    TextField,
    Box,
    Typography,
    Chip,
    CircularProgress,
    FormHelperText,
    Button,
    Tooltip
} from '@mui/material';
import { LocationOn } from '@mui/icons-material';
import { formatInTimeZone, getTimezoneOffset } from 'date-fns-tz';

interface TimezoneOption {
    id: string;
    ianaId: string;
    value: string | null;
    abbr: string | null;
    offset: number | null;
    isdst: boolean | null;
    text: string | null;
    utcAliases: string[];
    displayLabel: string;
    displayWithTime?: string;
}

interface TimezoneSelectorProps {
    value?: string; // Selected timezone ID
    onChange: (timezoneId: string | null, timezone: TimezoneOption | null) => void;
    label?: string;
    placeholder?: string;
    error?: boolean;
    helperText?: string;
    disabled?: boolean;
    fullWidth?: boolean;
    showDetectButton?: boolean; // Whether to show the "Detect My Timezone" button
}

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
    value,
    onChange,
    label = "Timezone",
    placeholder = "Search for a timezone...",
    error = false,
    helperText,
    disabled = false,
    fullWidth = true,
    showDetectButton = true
}) => {
    const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTimezone, setSelectedTimezone] = useState<TimezoneOption | null>(null);
    const [detecting, setDetecting] = useState(false);

    // Fetch timezones from API
    const fetchTimezones = async (search?: string) => {
        setLoading(true);
        try {
            const url = search
                ? `/api/timezones?search=${encodeURIComponent(search)}`
                : '/api/timezones';

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setTimezones(data.timezones);
            } else {
                console.error('Failed to fetch timezones:', data.error);
            }
        } catch (error) {
            console.error('Error fetching timezones:', error);
        } finally {
            setLoading(false);
        }
    };

    // Manual timezone detection
    const handleDetectTimezone = async () => {
        setDetecting(true);
        try {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            console.log('Detected user timezone:', userTimezone);

            // Ensure we have timezone data
            if (timezones.length === 0) {
                await fetchTimezones();
            }

            // Find the matching timezone in our data
            const matchingTimezone = timezones.find(tz =>
                tz.ianaId === userTimezone ||
                tz.utcAliases.includes(userTimezone)
            );

            if (matchingTimezone) {
                console.log('Selecting detected timezone:', matchingTimezone);
                setSelectedTimezone(matchingTimezone);
                onChange(matchingTimezone.id, matchingTimezone);
            } else {
                console.warn('Could not find matching timezone in database for:', userTimezone);
            }
        } catch (error) {
            console.error('Failed to detect user timezone:', error);
        } finally {
            setDetecting(false);
        }
    };

    // Load timezones on component mount
    useEffect(() => {
        fetchTimezones();
    }, []);

    // Set selected timezone when value prop changes
    useEffect(() => {
        if (value && timezones.length > 0) {
            const timezone = timezones.find(tz => tz.id === value);
            setSelectedTimezone(timezone || null);
        } else if (!value) {
            setSelectedTimezone(null);
        }
    }, [value, timezones]);

    // Enhanced search with debouncing
    useEffect(() => {
        const debounceTimeout = setTimeout(() => {
            if (searchTerm.length >= 2) {
                fetchTimezones(searchTerm);
            } else if (searchTerm.length === 0) {
                fetchTimezones(); // Load all timezones when search is cleared
            }
        }, 300);

        return () => clearTimeout(debounceTimeout);
    }, [searchTerm]);

    // Format options for display with current time
    const formatOption = (timezone: TimezoneOption) => {
        try {
            const now = new Date();
            const currentTime = formatInTimeZone(now, timezone.ianaId, 'HH:mm');
            const offset = getTimezoneOffset(timezone.ianaId, now);
            const offsetHours = offset / (1000 * 60 * 60);
            const offsetString = `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours.toFixed(1).replace('.0', '')}`;

            return {
                ...timezone,
                displayWithTime: `${timezone.value || timezone.ianaId} • ${currentTime} (${offsetString})`
            };
        } catch (error) {
            return {
                ...timezone,
                displayWithTime: timezone.value || timezone.ianaId
            };
        }
    };

    // Memoized formatted options
    const formattedOptions = useMemo(() => {
        return timezones.map(formatOption);
    }, [timezones]);

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <Box sx={{ flex: 1 }}>
                    <Autocomplete
                        fullWidth={fullWidth}
                        options={formattedOptions}
                        value={selectedTimezone}
                        onChange={(event, newValue) => {
                            setSelectedTimezone(newValue);
                            onChange(newValue?.id || null, newValue);
                        }}
                        onInputChange={(event, newInputValue) => {
                            setSearchTerm(newInputValue);
                        }}
                        getOptionLabel={(option) => option.value || option.ianaId}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        loading={loading}
                        disabled={disabled}
                        filterOptions={(options) => options} // Disable client-side filtering since we filter on server
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label={label}
                                placeholder={placeholder}
                                error={error}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                        renderOption={(props, option) => (
                            <Box component="li" {...props}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                        {option.value || option.ianaId}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {option.displayWithTime?.split(' • ')[1] || 'Current time unavailable'}
                                        </Typography>
                                        {option.abbr && (
                                            <Chip
                                                label={option.abbr}
                                                size="small"
                                                variant="outlined"
                                                sx={{ height: 18, fontSize: '0.7rem' }}
                                            />
                                        )}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                        {option.ianaId}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                                <Chip
                                    variant="outlined"
                                    label={option.value || option.ianaId}
                                    {...getTagProps({ index })}
                                    key={option.id}
                                />
                            ))
                        }
                        noOptionsText={
                            searchTerm.length < 2
                                ? "Type at least 2 characters to search timezones"
                                : loading
                                    ? "Searching..."
                                    : "No timezones found"
                        }
                        sx={{
                            '& .MuiAutocomplete-option': {
                                padding: '8px 16px',
                            },
                            '& .MuiAutocomplete-popper': {
                                maxWidth: '250px',
                            },
                        }}
                    />
                </Box>

                {showDetectButton && (
                    <Tooltip title="Automatically detect your current timezone">
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleDetectTimezone}
                            disabled={disabled || detecting}
                            startIcon={<LocationOn />}
                            sx={{
                                minWidth: 'auto',
                                px: 2,
                                height: 56, // Match TextField height
                                flexShrink: 0
                            }}
                        >
                            {detecting ? 'Detecting...' : 'Detect'}
                        </Button>
                    </Tooltip>
                )}
            </Box>

            {helperText && (
                <FormHelperText error={error}>
                    {helperText}
                </FormHelperText>
            )}
        </Box>
    );
}; 