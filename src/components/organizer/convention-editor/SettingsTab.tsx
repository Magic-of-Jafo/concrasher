import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import Grid from '@mui/material/Grid';
import { ConventionSettingData } from '@/lib/validators';

// Currency options commonly used in magic conventions
const CURRENCIES = [
    { code: 'USD', label: 'USD - United States Dollar' },
    { code: 'EUR', label: 'EUR - Euro' },
    { code: 'GBP', label: 'GBP - British Pound' },
    { code: 'CAD', label: 'CAD - Canadian Dollar' },
    { code: 'AUD', label: 'AUD - Australian Dollar' },
    { code: 'CHF', label: 'CHF - Swiss Franc' },
    { code: 'JPY', label: 'JPY - Japanese Yen' },
];

// Timezone options grouped by region
const TIMEZONES = [
    // North America
    { value: 'America/New_York', label: 'Eastern Time (New York)' },
    { value: 'America/Chicago', label: 'Central Time (Chicago)' },
    { value: 'America/Denver', label: 'Mountain Time (Denver)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
    { value: 'America/Phoenix', label: 'Mountain Standard Time (Phoenix)' },
    { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)' },
    { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
    { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },

    // Europe
    { value: 'Europe/London', label: 'GMT (London)' },
    { value: 'Europe/Paris', label: 'Central European Time (Paris)' },
    { value: 'Europe/Berlin', label: 'Central European Time (Berlin)' },
    { value: 'Europe/Rome', label: 'Central European Time (Rome)' },
    { value: 'Europe/Madrid', label: 'Central European Time (Madrid)' },
    { value: 'Europe/Amsterdam', label: 'Central European Time (Amsterdam)' },
    { value: 'Europe/Zurich', label: 'Central European Time (Zurich)' },
    { value: 'Europe/Vienna', label: 'Central European Time (Vienna)' },

    // Asia Pacific
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)' },
    { value: 'Australia/Melbourne', label: 'Australian Eastern Time (Melbourne)' },
    { value: 'Australia/Perth', label: 'Australian Western Time (Perth)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)' },
    { value: 'Asia/Singapore', label: 'Singapore Time' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong Time' },

    // South America
    { value: 'America/Sao_Paulo', label: 'Brasília Time (São Paulo)' },
    { value: 'America/Buenos_Aires', label: 'Argentina Time (Buenos Aires)' },
    { value: 'America/Bogota', label: 'Colombia Time (Bogotá)' },
];

interface SettingsTabProps {
    value: ConventionSettingData;
    onFormChange: (field: keyof ConventionSettingData, value: any) => void;
    errors?: Record<string, string>;
    isEditing: boolean;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
    value,
    onFormChange,
    errors = {},
    isEditing
}) => {
    const [localValue, setLocalValue] = useState<ConventionSettingData>(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (field: keyof ConventionSettingData) => (event: any) => {
        const newValue = event.target.value;
        setLocalValue(prev => ({ ...prev, [field]: newValue }));
        onFormChange(field, newValue);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Convention Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                Configure default settings for your convention, including currency for pricing and timezone for schedules.
            </Typography>

            <Paper elevation={1} sx={{ p: 3, mt: 2 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth error={!!errors.currency}>
                            <InputLabel id="currency-label">Default Currency</InputLabel>
                            <Select
                                labelId="currency-label"
                                value={localValue.currency || 'USD'}
                                onChange={handleChange('currency')}
                                label="Default Currency"
                                disabled={!isEditing}
                            >
                                {CURRENCIES.map((currency) => (
                                    <MenuItem key={currency.code} value={currency.code}>
                                        {currency.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.currency && (
                                <FormHelperText>{errors.currency}</FormHelperText>
                            )}
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth error={!!errors.timezone}>
                            <InputLabel id="timezone-label">Primary Timezone</InputLabel>
                            <Select
                                labelId="timezone-label"
                                value={localValue.timezone || 'America/New_York'}
                                onChange={handleChange('timezone')}
                                label="Primary Timezone"
                                disabled={!isEditing}
                            >
                                {TIMEZONES.map((timezone) => (
                                    <MenuItem key={timezone.value} value={timezone.value}>
                                        {timezone.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.timezone && (
                                <FormHelperText>{errors.timezone}</FormHelperText>
                            )}
                        </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            <strong>Currency:</strong> This will be the default currency used for all pricing throughout your convention listing.
                            <br />
                            <strong>Timezone:</strong> This will be used for displaying schedule times and handling time-sensitive operations.
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
}; 