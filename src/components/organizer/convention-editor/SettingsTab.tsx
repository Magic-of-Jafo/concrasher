import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { Grid } from '@mui/material';
import { ConventionSettingData } from '@/lib/validators';
import { TimezoneSelector } from '@/components/ui/TimezoneSelector';

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



interface SettingsTabProps {
    value: ConventionSettingData;
    onFormChange: (field: keyof ConventionSettingData, value: any) => void;
    errors?: Record<string, string>;
    isEditing: boolean;
    conventionId?: string; // Add convention ID for auto-save
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
    value,
    onFormChange,
    errors = {},
    isEditing,
    conventionId
}) => {
    const [localValue, setLocalValue] = useState<ConventionSettingData>(value);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (field: keyof ConventionSettingData) => async (event: any) => {
        const newValue = event.target.value;
        console.log(`[SettingsTab] handleChange called for ${field} with value:`, newValue);
        console.log(`[SettingsTab] conventionId:`, conventionId);
        console.log(`[SettingsTab] isEditing:`, isEditing);

        setLocalValue(prev => ({ ...prev, [field]: newValue }));
        onFormChange(field, newValue);

        // Auto-save immediately when timezone changes
        if (field === 'timezone' && conventionId && isEditing) {
            console.log('[SettingsTab] Starting auto-save for timezone...');
            setIsSaving(true);
            try {
                console.log('[SettingsTab] Auto-saving timezone:', newValue);
                console.log('[SettingsTab] Current currency:', localValue.currency);

                // Update ConventionSetting table only
                const settingsResponse = await fetch(`/api/organizer/conventions/${conventionId}/settings`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        currency: localValue.currency || 'USD',
                        timezone: newValue
                    }),
                });

                console.log('[SettingsTab] Settings response status:', settingsResponse.status);

                if (settingsResponse.ok) {
                    console.log('[SettingsTab] Timezone auto-saved successfully to ConventionSetting table');
                    const responseData = await settingsResponse.json();
                    console.log('[SettingsTab] Success response:', responseData);
                } else {
                    console.error('[SettingsTab] Failed to auto-save timezone');
                    const settingsError = await settingsResponse.text();
                    console.error('Settings response error:', settingsError);

                    // Try to parse the error for more details
                    try {
                        const errorData = JSON.parse(settingsError);
                        console.error('Parsed error details:', errorData);
                    } catch (e) {
                        console.error('Could not parse error response');
                    }
                }
            } catch (error) {
                console.error('[SettingsTab] Error auto-saving timezone:', error);
            } finally {
                setIsSaving(false);
            }
        } else {
            console.log('[SettingsTab] Auto-save conditions not met:', {
                isTimezone: field === 'timezone',
                hasConventionId: !!conventionId,
                isEditing
            });
        }
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
                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                    <Box sx={{ flex: 1 }}>
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
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <TimezoneSelector
                            value={localValue.timezone || undefined}
                            onChange={async (timezoneId, timezone) => {
                                console.log('[SettingsTab] TimezoneSelector onChange:', { timezoneId, timezone });

                                // Update local state
                                setLocalValue(prev => ({ ...prev, timezone: timezoneId || '' }));
                                onFormChange('timezone', timezoneId || '');

                                // Auto-save immediately when timezone changes
                                if (timezoneId && conventionId && isEditing) {
                                    console.log('[SettingsTab] Starting auto-save for new timezone...');
                                    setIsSaving(true);
                                    try {
                                        const settingsResponse = await fetch(`/api/organizer/conventions/${conventionId}/settings`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                currency: localValue.currency || 'USD',
                                                timezone: timezoneId
                                            }),
                                        });

                                        if (settingsResponse.ok) {
                                            console.log('[SettingsTab] Timezone auto-saved successfully');
                                        } else {
                                            console.error('[SettingsTab] Failed to auto-save timezone');
                                        }
                                    } catch (error) {
                                        console.error('[SettingsTab] Error auto-saving timezone:', error);
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }
                            }}
                            label={`Primary Timezone ${isSaving ? '(Saving...)' : ''}`}
                            placeholder="Search and select your convention's timezone..."
                            error={!!errors.timezone}
                            helperText={
                                errors.timezone ||
                                (isSaving && "Saving timezone...") ||
                                undefined
                            }
                            disabled={!isEditing || isSaving}
                            showDetectButton={true} // Show the manual detect button
                        />
                    </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                    <strong>Currency:</strong> This will be the default currency used for all pricing throughout your convention listing.
                    <br />
                    <strong>Timezone:</strong> This will be used for displaying schedule times and handling time-sensitive operations.
                </Typography>
            </Paper>
        </Box>
    );
}; 