'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Grid,
    Chip,
    IconButton,
    Alert,
    CircularProgress,
    Divider
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { TalentProfileCreateInput, TalentProfileUpdateInput } from '@/lib/validators';
import TalentProfileImageUploader from './TalentProfileImageUploader';
import ProseMirrorEditor from '@/components/ui/ProseMirrorEditor';

interface TalentProfileEditorProps {
    userId: string;
    user?: {
        firstName?: string;
        lastName?: string;
        stageName?: string;
    };
    initialData?: {
        id?: string;
        displayName?: string;
        tagline?: string;
        bio?: string;
        profilePictureUrl?: string;
        websiteUrl?: string;
        contactEmail?: string;
        skills?: string[];
    };
    onSave?: (data: TalentProfileCreateInput | TalentProfileUpdateInput) => void;
    onCancel?: () => void;
    onDeleteDialogStateChange?: (isOpen: boolean) => void;
}

export default function TalentProfileEditor({
    userId,
    user,
    initialData,
    onSave,
    onCancel,
    onDeleteDialogStateChange
}: TalentProfileEditorProps) {
    const [formData, setFormData] = useState({
        displayName: initialData?.displayName || user?.stageName || '',
        tagline: initialData?.tagline || '',
        bio: initialData?.bio || '',
        profilePictureUrl: initialData?.profilePictureUrl || '',
        websiteUrl: initialData?.websiteUrl || '',
        contactEmail: initialData?.contactEmail || '',
        skills: initialData?.skills || [] as string[]
    });

    const [newSkill, setNewSkill] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleInputChange = (field: keyof typeof formData, value: string | string[]) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddSkill = () => {
        if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
            handleInputChange('skills', [...formData.skills, newSkill.trim()]);
            setNewSkill('');
        }
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        handleInputChange('skills', formData.skills.filter(skill => skill !== skillToRemove));
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleAddSkill();
        }
    };

    const validateForm = (): boolean => {
        if (!formData.displayName.trim()) {
            setError('Display name is required');
            return false;
        }
        if (formData.displayName.length < 2) {
            setError('Display name must be at least 2 characters');
            return false;
        }
        if (formData.displayName.length > 50) {
            setError('Display name must be 50 characters or less');
            return false;
        }
        if (formData.tagline && formData.tagline.length > 100) {
            setError('Tagline must be 100 characters or less');
            return false;
        }
        if (formData.bio) {
            // Strip HTML tags for character count validation
            const textContent = formData.bio.replace(/<[^>]*>/g, '');
            if (textContent.length > 2000) {
                setError('Bio must be 2000 characters or less (excluding formatting)');
                return false;
            }
        }
        if (formData.websiteUrl && !formData.websiteUrl.match(/^https?:\/\/.+/)) {
            setError('Website URL must be a valid URL starting with http:// or https://');
            return false;
        }
        if (formData.contactEmail && !formData.contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            setError('Contact email must be a valid email address');
            return false;
        }
        return true;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {

            // Then, update the talent profile
            const talentProfileData = {
                displayName: formData.displayName.trim(),
                tagline: formData.tagline.trim() || undefined,
                bio: formData.bio.trim() || undefined,
                profilePictureUrl: formData.profilePictureUrl.trim() || undefined,
                websiteUrl: formData.websiteUrl.trim() || undefined,
                contactEmail: formData.contactEmail.trim() || undefined,
                skills: formData.skills.length > 0 ? formData.skills : undefined
            };

            if (onSave) {
                onSave(talentProfileData);
            } else {
                // Default API call if no onSave handler provided
                const url = initialData?.id
                    ? `/api/talent-profiles/${userId}`
                    : '/api/talent-profiles';

                const method = initialData?.id ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(talentProfileData),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to save talent profile');
                }

                const responseData = await response.json();
                setSuccess('Talent profile saved successfully!');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while saving');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (url: string | null) => {
        handleInputChange('profilePictureUrl', url || '');

        // Automatically save the image URL to the database (or clear it if url is null)
        if (initialData?.id) {
            try {
                const response = await fetch(`/api/talent-profiles/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        profilePictureUrl: url || '', // Clear the URL if url is null
                    }),
                });

                if (response.ok) {
                    // Notify parent component about the image change for real-time updates
                    if (onSave) {
                        const updatedData = { profilePictureUrl: url || '' };
                        onSave(updatedData);
                    }
                }
            } catch (error) {
                // Error saving image URL
            }
        }
    };

    const handleDeleteDialogStateChange = (isOpen: boolean) => {
        setIsDeleteDialogOpen(isOpen);
        onDeleteDialogStateChange?.(isOpen);
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 800, pb: 2.5 }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Profile Picture */}
                {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                <Grid item xs={12} sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%'
                }}>
                    <Paper elevation={0} sx={{
                        p: 0,
                        boxShadow: 'none',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'center',
                        borderRadius: 0,
                        '&.MuiPaper-root': {
                            boxShadow: 'none',
                            backgroundColor: 'transparent',
                            border: 'none'
                        }
                    }}>
                        <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
                            Profile Picture
                        </Typography>
                        <TalentProfileImageUploader
                            currentImageUrl={formData.profilePictureUrl}
                            onImageUpdate={handleImageUpload}
                            talentProfileId={initialData?.id}
                            onDeleteDialogStateChange={handleDeleteDialogStateChange}
                        />
                    </Paper>
                </Grid>

                {/* Basic Information */}
                {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 0, boxShadow: 'none', border: 'none' }}>
                        <Typography variant="h6" gutterBottom>
                            Basic Information
                        </Typography>

                        {/* User's Real Name Display */}
                        {(user?.firstName || user?.lastName) && (
                            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Your Name
                                </Typography>
                                <Typography variant="body1">
                                    {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                                </Typography>
                            </Box>
                        )}

                        <Grid container spacing={2}>
                            {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Display Name"
                                    value={formData.displayName}
                                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                                    helperText="Your stage name or professional name as you want to appear to convention organizers"
                                />
                            </Grid>
                            {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Tagline"
                                    value={formData.tagline}
                                    onChange={(e) => handleInputChange('tagline', e.target.value)}
                                    helperText="A short, catchy description (max 100 characters)"
                                    inputProps={{ maxLength: 100 }}
                                />
                            </Grid>

                            {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Bio
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Tell convention organizers about yourself, your experience, and what you bring to events
                                </Typography>
                                <ProseMirrorEditor
                                    value={formData.bio}
                                    onChange={(content) => handleInputChange('bio', content)}
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* Contact Information */}
                {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 0, boxShadow: 'none', border: 'none' }}>
                        <Typography variant="h6" gutterBottom>
                            Contact Information
                        </Typography>
                        <TextField
                            fullWidth
                            label="Contact Email"
                            value={formData.contactEmail}
                            onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                            helperText="This email will be visible to convention organizers"
                            sx={{ mt: 2 }}
                        />
                        <TextField
                            fullWidth
                            label="Website URL"
                            value={formData.websiteUrl}
                            onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                            helperText="Your personal or professional website"
                            sx={{ mt: 2 }}
                        />
                    </Paper>
                </Grid>

                {/* List Your Lectures */}
                {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 0, boxShadow: 'none', border: 'none' }}>
                        <Typography variant="h6" gutterBottom>
                            List Your Lectures
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            This tells attendees what to expect at the convention.
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <TextField
                                fullWidth
                                label="List individually"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="e.g., Cosplay, Voice Acting, Panel Hosting"
                            />
                            <IconButton
                                onClick={handleAddSkill}
                                disabled={!newSkill.trim()}
                                color="primary"
                            >
                                <AddIcon />
                            </IconButton>
                        </Box>

                        {formData.skills.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {formData.skills.map((skill, index) => (
                                    <Chip
                                        key={index}
                                        label={skill}
                                        onDelete={() => handleRemoveSkill(skill)}
                                        deleteIcon={<DeleteIcon />}
                                        color="primary"
                                        variant="outlined"
                                    />
                                ))}
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Action Buttons */}
                {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                <Grid item xs={12} sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%'
                }}>
                    <Box sx={{
                        display: 'flex',
                        gap: 2,
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        {onCancel && (
                            <Button
                                variant="outlined"
                                onClick={onCancel}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={isLoading}
                            startIcon={isLoading ? <CircularProgress size={20} /> : null}
                        >
                            {isLoading ? 'Saving...' : 'Save Profile'}
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
} 