import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, FormHelperText, Button, Divider } from '@mui/material';
import { Grid } from '@mui/material';
import { ConventionSettingData } from '@/lib/validators';
import { TimezoneSelector } from '@/components/ui/TimezoneSelector';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { deleteConvention } from '@/lib/actions';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { useSnackbar } from 'notistack';

// Define the type here to match the data fetched from the API
interface Currency {
    id: number;
    code: string;
    name: string;
    demonym: string | null;
    majorSingle: string;
    majorPlural: string;
    ISOnum: number | null;
    symbol: string;
    symbolNative: string;
    minorSingle: string;
    minorPlural: string;
    ISOdigits: number;
    decimals: number;
    numToBasic: number | null;
}

const fetchCurrencies = async (): Promise<Currency[]> => {
    const response = await fetch('/api/currencies');
    if (!response.ok) {
        throw new Error('Failed to fetch currencies');
    }
    return response.json();
};

interface SettingsTabProps {
    value: ConventionSettingData;
    onFormChange: (field: keyof ConventionSettingData, value: any) => void;
    errors?: Record<string, string>;
    isEditing: boolean;
    conventionId: string; // Made required for delete functionality
    conventionName: string; // For the confirmation dialog
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
    value,
    onFormChange,
    errors = {},
    isEditing,
    conventionId,
    conventionName,
}) => {
    const [localValue, setLocalValue] = useState<ConventionSettingData>(value);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const router = useRouter();
    const { enqueueSnackbar } = useSnackbar();
    const queryClient = useQueryClient();

    const { data: currencies, isLoading: isLoadingCurrencies } = useQuery<Currency[]>({
        queryKey: ['currencies'],
        queryFn: fetchCurrencies,
        staleTime: Infinity, // This is static data
    });

    const sortedAndFormattedCurrencies = useMemo(() => {
        if (!currencies) return [];

        const top10Codes = ['USD', 'EUR', 'JPY', 'GBP', 'CNY', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD'];

        const top10: Currency[] = [];
        const rest: Currency[] = [];

        currencies.forEach(currency => {
            if (top10Codes.includes(currency.code)) {
                top10.push(currency);
            } else {
                rest.push(currency);
            }
        });

        // Sort top10 according to the predefined order
        top10.sort((a, b) => top10Codes.indexOf(a.code) - top10Codes.indexOf(b.code));

        const allSorted = [...top10, ...rest];

        return allSorted.map(currency => {
            let displayLabel = '';
            if (currency.demonym) {
                displayLabel = `${currency.symbol} - ${currency.demonym} ${currency.majorSingle}`;
            } else {
                displayLabel = `${currency.symbol} - ${currency.name}`;
            }
            return {
                code: currency.code,
                label: displayLabel,
            };
        });
    }, [currencies]);


    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const { mutate: performDelete, isPending: isDeleting } = useMutation({
        mutationFn: async () => {
            if (!conventionId) throw new Error("Convention ID is missing.");
            const result = await deleteConvention(conventionId);
            if (!result.success) {
                throw new Error(result.error || "Failed to delete convention.");
            }
            return result;
        },
        onSuccess: (data) => {
            enqueueSnackbar(data.message || "Convention permanently deleted.", { variant: 'success' });
            queryClient.invalidateQueries({ queryKey: ["organizer-conventions"] });
            queryClient.invalidateQueries({ queryKey: ["conventions"] });
            // Redirect to the organizer's dashboard after successful deletion
            router.push('/organizer/conventions');
        },
        onError: (error: Error) => {
            enqueueSnackbar(error.message, { variant: 'error' });
        },
        onSettled: () => {
            setDeleteModalOpen(false);
        },
    });

    const handleChange = (field: keyof ConventionSettingData) => async (event: any) => {
        const newValue = event.target.value;
        setLocalValue(prev => ({ ...prev, [field]: newValue }));
        onFormChange(field, newValue);

        // Auto-save immediately when currency or timezone changes
        if ((field === 'currency') && conventionId && isEditing) {
            console.log(`[SettingsTab] Starting auto-save for ${field}...`);
            setIsSaving(true);
            try {
                // Ensure we are sending both currency and timezone
                const payload = {
                    currency: newValue,
                    timezone: localValue.timezone,
                };

                const settingsResponse = await fetch(`/api/organizer/conventions/${conventionId}/settings`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (settingsResponse.ok) {
                    enqueueSnackbar(`Currency updated successfully.`, { variant: 'success' });
                    // Optionally refetch related data if needed
                    queryClient.invalidateQueries({ queryKey: ['convention', conventionId] });
                } else {
                    const errorData = await settingsResponse.json();
                    enqueueSnackbar(errorData.error || `Failed to update currency.`, { variant: 'error' });
                    console.error('[SettingsTab] Failed to auto-save currency', errorData);
                }
            } catch (error) {
                enqueueSnackbar(`An error occurred while saving currency.`, { variant: 'error' });
                console.error('[SettingsTab] Error auto-saving currency:', error);
            } finally {
                setIsSaving(false);
            }
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
                            <InputLabel id="currency-label" shrink>Default Currency</InputLabel>
                            <Select
                                labelId="currency-label"
                                value={localValue.currency || ''}
                                onChange={handleChange('currency')}
                                label="Default Currency"
                                disabled={!isEditing || isLoadingCurrencies}
                                displayEmpty
                            >
                                <MenuItem value="" disabled>
                                    <em>Select Currency</em>
                                </MenuItem>
                                {isLoadingCurrencies ? (
                                    <MenuItem disabled>Loading currencies...</MenuItem>
                                ) : (
                                    sortedAndFormattedCurrencies.map((currency) => (
                                        <MenuItem key={currency.code} value={currency.code}>
                                            {currency.label}
                                        </MenuItem>
                                    ))
                                )}
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
                                                currency: localValue.currency || '',
                                                timezone: timezoneId
                                            }),
                                        });

                                        if (settingsResponse.ok) {
                                            enqueueSnackbar('Timezone updated successfully.', { variant: 'success' });
                                            console.log('[SettingsTab] Timezone auto-saved successfully');
                                        } else {
                                            console.error('[SettingsTab] Failed to auto-save timezone');
                                            enqueueSnackbar('Failed to update timezone.', { variant: 'error' });
                                        }
                                    } catch (error) {
                                        console.error('[SettingsTab] Error auto-saving timezone:', error);
                                        enqueueSnackbar('An error occurred while saving the timezone.', { variant: 'error' });
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

            {/* Danger Zone */}
            <Box sx={{ mt: 4 }}>
                <Typography variant="h6" color="error" gutterBottom>
                    Danger Zone
                </Typography>
                <Paper elevation={1} sx={{ p: 3, mt: 2, border: '1px solid', borderColor: 'error.main' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="subtitle1" fontWeight="bold">Delete this convention</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Once you delete a convention, there is no going back. Please be certain.
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={() => setDeleteModalOpen(true)}
                            disabled={!isEditing || isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Convention'}
                        </Button>
                    </Box>
                </Paper>
            </Box>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={performDelete}
                title="Delete Convention Permanently?"
                description={`Are you sure you want to permanently delete "${conventionName}"? This action is irreversible and will remove all associated data.`}
                confirmButtonText="Delete Permanently"
                isConfirming={isDeleting}
            />
        </Box>
    );
}; 