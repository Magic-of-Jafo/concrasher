import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, FormHelperText, Button, Divider, TextField, Chip } from '@mui/material';
import { Grid } from '@mui/material';
import { ConventionSettingData } from '@/lib/validators';
import { TimezoneSelector } from '@/components/ui/TimezoneSelector';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { deleteConvention } from '@/lib/actions';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { useSnackbar } from 'notistack';
import { useSession } from 'next-auth/react';

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
    keywords: string[];
    onKeywordsChange: (keywords: string[]) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
    value,
    onFormChange,
    errors = {},
    isEditing,
    conventionId,
    conventionName,
    keywords,
    onKeywordsChange,
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [keywordInput, setKeywordInput] = useState('');
    const router = useRouter();
    const { enqueueSnackbar } = useSnackbar();
    const queryClient = useQueryClient();
    const { data: session } = useSession();

    const { data: currencies, isLoading: isLoadingCurrencies } = useQuery<Currency[]>({
        queryKey: ['currencies'],
        queryFn: fetchCurrencies,
        staleTime: Infinity, // This is static data
    });

    const initializeKeywordsMutation = useMutation({
        mutationFn: async () => {
            // Use admin endpoint if user is admin, otherwise use organizer endpoint
            const endpoint = session?.user?.roles?.includes('ADMIN')
                ? `/api/admin/conventions/${conventionId}/initialize-keywords`
                : `/api/organizer/conventions/${conventionId}/initialize-keywords`;

            const response = await fetch(endpoint, {
                method: 'POST',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to initialize keywords.');
            }
            return response.json();
        },
        onSuccess: (data) => {
            onKeywordsChange(data.keywords);
            enqueueSnackbar('Keywords initialized from default settings.', { variant: 'success' });
        },
        onError: (error: Error) => {
            enqueueSnackbar(error.message, { variant: 'error' });
        },
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

    const handleAddKeyword = () => {
        if (keywordInput && !keywords.includes(keywordInput)) {
            onKeywordsChange([...keywords, keywordInput]);
            setKeywordInput('');
        }
    };

    const handleDeleteKeyword = (keywordToDelete: string) => {
        onKeywordsChange(keywords.filter(keyword => keyword !== keywordToDelete));
    };

    const handleChange = (field: keyof ConventionSettingData) => async (event: any) => {
        const newValue = event.target.value;
        onFormChange(field, newValue);

        // Auto-save immediately when currency or timezone changes
        if ((field === 'currency') && conventionId && isEditing) {
            console.log(`[SettingsTab] Starting auto-save for ${field}...`);
            setIsSaving(true);
            try {
                // Ensure we are sending both currency and timezone
                const payload = {
                    currency: newValue,
                    timezone: value.timezone,
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
                                value={value.currency || ''}
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
                            value={value.timezone || undefined}
                            onChange={async (timezoneId, timezone) => {
                                console.log('[SettingsTab] TimezoneSelector onChange:', { timezoneId, timezone });

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
                                                currency: value.currency || '',
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
            </Paper>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" gutterBottom>
                SEO Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                Add keywords to improve your convention's discoverability on search engines. You can initialize this list from the site-wide defaults.
            </Typography>
            <Paper elevation={1} sx={{ p: 3, mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                    Convention Keywords
                </Typography>

                {/* Keyword Tips Guide */}
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
                        Quick Keyword Tips for Your Listing
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 2 }}>
                        Help the right people find your event with a few good keywords.
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                        <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                            <strong>Start with Defaults.</strong> Click the "Initialize Keywords from Defaults" button for a good start. It will add a list of general-purpose keywords that will likely do a decent job. It's good to remove any that don't apply.
                        </Typography>
                        <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                            <strong>Add Your Location.</strong> Add your state (<Box component="span" sx={{ bgcolor: 'grey.700', color: 'white', px: 0.5, py: 0.25, borderRadius: 0.5, fontFamily: 'monospace', fontSize: '0.875em' }}>Michigan</Box>) or main city (<Box component="span" sx={{ bgcolor: 'grey.700', color: 'white', px: 0.5, py: 0.25, borderRadius: 0.5, fontFamily: 'monospace', fontSize: '0.875em' }}>Detroit</Box>) to attract local attendees.
                            <br />
                            <Box component="span" sx={{ bgcolor: 'grey.700', color: 'white', px: 0.5, py: 0.25, borderRadius: 0.5, fontFamily: 'monospace', fontSize: '0.875em' }}>magic conventions in Texas</Box> or <Box component="span" sx={{ bgcolor: 'grey.700', color: 'white', px: 0.5, py: 0.25, borderRadius: 0.5, fontFamily: 'monospace', fontSize: '0.875em' }}>Orlando magician lectures</Box> for example.
                        </Typography>
                        <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                            <strong>Add Related Topics.</strong> Think about other styles your attendees like, such as <Box component="span" sx={{ bgcolor: 'grey.700', color: 'white', px: 0.5, py: 0.25, borderRadius: 0.5, fontFamily: 'monospace', fontSize: '0.875em' }}>close-up magic convention</Box> or <Box component="span" sx={{ bgcolor: 'grey.700', color: 'white', px: 0.5, py: 0.25, borderRadius: 0.5, fontFamily: 'monospace', fontSize: '0.875em' }}>card magic lecture</Box>.
                        </Typography>
                        <Typography component="li" variant="body2" sx={{ mb: 0 }}>
                            <strong>Add Your Guests.</strong> Use your guest performers' names in the keywords. People search for them! (e.g., <Box component="span" sx={{ bgcolor: 'grey.700', color: 'white', px: 0.5, py: 0.25, borderRadius: 0.5, fontFamily: 'monospace', fontSize: '0.875em' }}>[Guest Performer's Name] lecture</Box>).
                        </Typography>
                    </Box>
                </Box>

                {keywords && keywords.length > 0 ? (
                    <>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <TextField
                                label="New Keyword"
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddKeyword();
                                    }
                                }}
                                disabled={!isEditing}
                                fullWidth
                            />
                            <Button onClick={handleAddKeyword} variant="outlined" disabled={!isEditing}>
                                Add
                            </Button>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {keywords.map((keyword) => (
                                <Chip
                                    key={keyword}
                                    label={keyword}
                                    onDelete={() => handleDeleteKeyword(keyword)}
                                    disabled={!isEditing}
                                />
                            ))}
                        </Box>
                    </>
                ) : (
                    <Box>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            No keywords have been set for this convention.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => initializeKeywordsMutation.mutate()}
                            disabled={initializeKeywordsMutation.isPending || !isEditing}
                        >
                            {initializeKeywordsMutation.isPending ? 'Initializing...' : 'Initialize Keywords from Defaults'}
                        </Button>
                    </Box>
                )}
            </Paper>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" gutterBottom color="error">
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