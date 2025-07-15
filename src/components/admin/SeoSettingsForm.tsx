'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    TextField,
    Button,
    Container,
    Typography,
    Box,
    CircularProgress,
    Chip,
    Divider,
} from '@mui/material';
import { useSnackbar } from 'notistack';

const seoSettingsSchema = z.object({
    siteTitleTemplate: z.string().optional(),
    siteDescription: z.string().optional(),
    defaultKeywords: z.array(z.string()).optional(),
    organizationName: z.string().optional(),
    organizationUrl: z.string().url().or(z.literal('')).optional(),
    organizationLogo: z.string().url().or(z.literal('')).optional(),
    socialProfiles: z.array(z.string().url()).optional(),
    trackingScripts: z.string().optional(),
});

type SEOSettingsFormData = z.infer<typeof seoSettingsSchema>;

export default function SeoSettingsForm() {
    const { enqueueSnackbar } = useSnackbar();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [keywordInput, setKeywordInput] = useState('');
    const [socialProfiles, setSocialProfiles] = useState<string[]>([]);
    const [socialProfileInput, setSocialProfileInput] = useState('');

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SEOSettingsFormData>({
        resolver: zodResolver(seoSettingsSchema),
        defaultValues: {
            siteTitleTemplate: '',
            siteDescription: '',
            defaultKeywords: [],
            organizationName: '',
            organizationUrl: '',
            organizationLogo: '',
            socialProfiles: [],
            trackingScripts: '',
        },
    });

    useEffect(() => {
        async function fetchSeoSettings() {
            setIsLoading(true);
            try {
                const response = await fetch('/api/admin/seo-settings');
                if (!response.ok) {
                    throw new Error('Failed to fetch SEO settings');
                }
                const data = await response.json();
                reset({
                    siteTitleTemplate: data.siteTitleTemplate ?? '',
                    siteDescription: data.siteDescription ?? '',
                    organizationName: data.organizationName ?? '',
                    organizationUrl: data.organizationUrl ?? '',
                    organizationLogo: data.organizationLogo ?? '',
                    trackingScripts: data.trackingScripts ?? '',
                });
                setKeywords(data.defaultKeywords ?? []);
                setSocialProfiles(data.socialProfiles ?? []);
            } catch (error) {
                enqueueSnackbar('Error fetching SEO settings', { variant: 'error' });
            } finally {
                setIsLoading(false);
            }
        }
        fetchSeoSettings();
    }, [reset, enqueueSnackbar]);

    const handleAddKeyword = () => {
        if (keywordInput && !keywords.includes(keywordInput)) {
            setKeywords([...keywords, keywordInput]);
            setKeywordInput('');
        }
    };

    const handleDeleteKeyword = (keywordToDelete: string) => {
        setKeywords(keywords.filter((keyword) => keyword !== keywordToDelete));
    };

    const handleAddSocialProfile = () => {
        if (socialProfileInput && !socialProfiles.includes(socialProfileInput)) {
            // Basic URL validation
            try {
                new URL(socialProfileInput);
                setSocialProfiles([...socialProfiles, socialProfileInput]);
                setSocialProfileInput('');
            } catch (_) {
                enqueueSnackbar('Please enter a valid URL for the social profile.', { variant: 'error' });
            }
        }
    };

    const handleDeleteSocialProfile = (profileToDelete: string) => {
        setSocialProfiles(socialProfiles.filter((profile) => profile !== profileToDelete));
    };


    const onSubmit = async (data: SEOSettingsFormData) => {
        setIsSaving(true);
        try {
            const payload = {
                ...data,
                defaultKeywords: keywords,
                socialProfiles: socialProfiles,
            };
            const response = await fetch('/api/admin/seo-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            enqueueSnackbar('SEO settings saved successfully', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Error saving settings', { variant: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Box sx={{ mb: 2 }}>
                <Controller
                    name="siteTitleTemplate"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Site Title Template"
                            fullWidth
                            helperText={errors.siteTitleTemplate?.message || "Use %s to represent the page-specific title. E.g., %s | My Site"}
                            error={!!errors.siteTitleTemplate}
                        />
                    )}
                />
            </Box>
            <Box sx={{ mb: 2 }}>
                <Controller
                    name="siteDescription"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Default Site Description"
                            fullWidth
                            multiline
                            rows={4}
                            helperText={errors.siteDescription?.message}
                            error={!!errors.siteDescription}
                        />
                    )}
                />
            </Box>
            <Box sx={{ mb: 2 }}>
                <Typography variant="h6">Default Keywords</Typography>
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
                    />
                    <Button onClick={handleAddKeyword} variant="outlined">
                        Add
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {keywords.map((keyword) => (
                        <Chip
                            key={keyword}
                            label={keyword}
                            onDelete={() => handleDeleteKeyword(keyword)}
                        />
                    ))}
                </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
                Organization Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This information helps search engines understand who your organization is. It will be used to generate site-wide structured data.
            </Typography>

            <Box sx={{ mb: 2 }}>
                <Controller
                    name="organizationName"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Organization Name"
                            fullWidth
                            helperText={errors.organizationName?.message}
                            error={!!errors.organizationName}
                        />
                    )}
                />
            </Box>
            <Box sx={{ mb: 2 }}>
                <Controller
                    name="organizationUrl"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Organization Website URL"
                            fullWidth
                            helperText={errors.organizationUrl?.message || "The main URL of your organization's website."}
                            error={!!errors.organizationUrl}
                        />
                    )}
                />
            </Box>
            <Box sx={{ mb: 2 }}>
                <Controller
                    name="organizationLogo"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Organization Logo URL"
                            fullWidth
                            helperText={errors.organizationLogo?.message || "A direct link to your organization's logo image."}
                            error={!!errors.organizationLogo}
                        />
                    )}
                />
            </Box>
            <Box sx={{ mb: 2 }}>
                <Typography variant="h6">Social Media Profiles</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                        label="New Social Profile URL"
                        value={socialProfileInput}
                        onChange={(e) => setSocialProfileInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSocialProfile();
                            }
                        }}
                        fullWidth
                    />
                    <Button onClick={handleAddSocialProfile} variant="outlined">
                        Add
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {socialProfiles.map((profile) => (
                        <Chip
                            key={profile}
                            label={profile}
                            onDelete={() => handleDeleteSocialProfile(profile)}
                        />
                    ))}
                </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" gutterBottom>
                Tracking & Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add script tags for analytics services like Google Analytics, Facebook Pixel, Microsoft Clarity, etc. These will be injected into the site's head.
            </Typography>

            <Box sx={{ mb: 2 }}>
                <Controller
                    name="trackingScripts"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Header Scripts"
                            fullWidth
                            multiline
                            rows={8}
                            helperText={errors.trackingScripts?.message || "Paste the full script tags here."}
                            error={!!errors.trackingScripts}
                            variant="outlined"
                            sx={{ fontFamily: 'monospace' }}
                        />
                    )}
                />
            </Box>

            <Button type="submit" variant="contained" color="primary" disabled={isSaving}>
                {isSaving ? <CircularProgress size={24} /> : 'Save All Settings'}
            </Button>
        </form>
    );
} 