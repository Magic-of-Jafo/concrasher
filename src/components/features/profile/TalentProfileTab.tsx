"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
    Box,
    Button,
    Paper,
    Typography,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    CardActions
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import TalentProfileEditor from './TalentProfileEditor';

interface TalentProfileTabProps {
    userId: string;
    user: any;
}

interface TalentProfile {
    id: string;
    displayName: string;
    tagline?: string;
    bio?: string;
    profilePictureUrl?: string;
    websiteUrl?: string;
    contactEmail?: string;
    skills?: string[];
}

export default function TalentProfileTab({ userId, user }: TalentProfileTabProps) {
    const { data: session } = useSession();
    const [talentProfile, setTalentProfile] = useState<TalentProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitializing, setIsInitializing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check if user has a talent profile
    useEffect(() => {
        const checkTalentProfile = async () => {
            try {
                const response = await fetch(`/api/talent-profiles/${userId}`);

                if (response.ok) {
                    const profile = await response.json();
                    setTalentProfile(profile);
                } else if (response.status === 404) {
                    // No talent profile exists
                    setTalentProfile(null);
                } else {
                    throw new Error('Failed to check talent profile');
                }
            } catch (err) {
                setError('Failed to load talent profile');
                console.error('Error checking talent profile:', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            checkTalentProfile();
        }
    }, [userId]);

    const handleInitializeProfile = async () => {
        setIsInitializing(true);
        setError(null);

        try {
            const response = await fetch('/api/talent-profiles/initialize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const newProfile = await response.json();
                setTalentProfile(newProfile);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to initialize talent profile');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to initialize talent profile');
        } finally {
            setIsInitializing(false);
        }
    };

    const handleProfileUpdate = async (updatedData: any) => {
        console.log('handleProfileUpdate called with:', updatedData);

        try {
            // Save the data to the database
            const response = await fetch(`/api/talent-profiles/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save talent profile');
            }

            // Fetch the updated profile to refresh the state
            const profileResponse = await fetch(`/api/talent-profiles/${userId}`);
            if (profileResponse.ok) {
                const profile = await profileResponse.json();
                setTalentProfile(profile);
            }
        } catch (err) {
            console.error('Error saving talent profile:', err);
            setError(err instanceof Error ? err.message : 'Failed to save talent profile');
        }
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        );
    }

    // Show initialization card if no talent profile exists
    if (!talentProfile) {
        return (
            <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
                <Card>
                    <CardContent>
                        <Typography variant="h5" gutterBottom>
                            Initialize Your Talent Profile
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                            Click the button to create your Talent Profile page.
                        </Typography>
                    </CardContent>
                    <CardActions>
                        <Button
                            variant="contained"
                            startIcon={isInitializing ? <CircularProgress size={20} /> : <AddIcon />}
                            onClick={handleInitializeProfile}
                            disabled={isInitializing}
                            size="large"
                        >
                            {isInitializing ? 'Initializing...' : 'Initialize Talent Profile'}
                        </Button>
                    </CardActions>
                </Card>
            </Box>
        );
    }

    // Show the talent profile editor if profile exists
    return (
        <TalentProfileEditor
            userId={userId}
            user={{
                firstName: user.firstName,
                lastName: user.lastName,
                stageName: user.stageName
            }}
            initialData={talentProfile}
            onSave={handleProfileUpdate}
        />
    );
} 