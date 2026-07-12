'use client';

import React from 'react';
import { Box, Typography, Divider, Button, Chip, Alert, CircularProgress } from '@mui/material';
import { Email as EmailIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import ProfileForm from '@/components/features/ProfileForm';
import UserProfilePictureUploader from './UserProfilePictureUploader';
import ClaimNudge from './ClaimNudge';
import ProfileStrengthMeter from './ProfileStrengthMeter';
import { memberStrength } from '@/lib/profile-strength';
import { User, Role } from '@prisma/client';
import { useState } from 'react';

interface BasicInfoDisplayProps {
    user: {
        id: string;
        name: string | null;
        firstName: string | null;
        lastName: string | null;
        stageName: string | null;
        email: string | null;
        bio: string | null;
        roles: Role[];
        emailVerified?: Date | null;
        useStageNamePublicly?: boolean | null;
    };
    currentImageUrl?: string | null;
    onImageUpdate?: (url: string | null) => void;
}

const BasicInfoDisplay: React.FC<BasicInfoDisplayProps> = ({ user, currentImageUrl, onImageUpdate }) => {
    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Mirror the name/bio fields locally so the strength meter updates the moment
    // the form saves, without waiting for a page refetch of the `user` prop.
    const [profileFields, setProfileFields] = useState({
        firstName: user.firstName,
        lastName: user.lastName,
        stageName: user.stageName,
        bio: user.bio,
    });

    const handleProfileFieldsUpdate = (data: { firstName?: string | null; lastName?: string | null; stageName?: string | null; bio?: string | null }) => {
        setProfileFields((prev) => ({
            firstName: data.firstName ?? prev.firstName,
            lastName: data.lastName ?? prev.lastName,
            stageName: data.stageName ?? prev.stageName,
            bio: data.bio ?? prev.bio,
        }));
    };

    const handleSuccess = () => {
        // Profile updated successfully - parent component will handle any refresh if needed
    };

    const handleResendVerification = async () => {
        setIsResending(true);
        setResendMessage(null);

        try {
            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok) {
                setResendMessage({
                    type: 'success',
                    message: 'Verification email sent successfully! Please check your inbox.'
                });
            } else {
                setResendMessage({
                    type: 'error',
                    message: data.error || 'Failed to send verification email. Please try again.'
                });
            }
        } catch (error) {
            setResendMessage({
                type: 'error',
                message: 'An error occurred while sending the verification email.'
            });
        } finally {
            setIsResending(false);
        }
    };

    return (
        <Box>
            {/* "Is this you?" — offer to claim a matching scraped talent profile. */}
            <ClaimNudge />

            {/* Owner-only completion meter (motivation, not shown publicly). */}
            <ProfileStrengthMeter
                dismissKey="member"
                strength={memberStrength({
                    image: currentImageUrl,
                    firstName: profileFields.firstName,
                    lastName: profileFields.lastName,
                    stageName: profileFields.stageName,
                    bio: profileFields.bio,
                })}
            />

            {/* Profile Picture Upload - Top Priority */}
            {currentImageUrl !== undefined && onImageUpdate && (
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                    <UserProfilePictureUploader
                        currentImageUrl={currentImageUrl}
                        onImageUpdate={onImageUpdate}
                        user={user}
                    />
                </Box>
            )}

            {/* Profile Edit Form - Always Visible */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Edit Profile</Typography>
                <ProfileForm
                    currentFirstName={user.firstName}
                    currentLastName={user.lastName}
                    currentStageName={user.stageName}
                    currentBio={user.bio}
                    currentUseStageNamePublicly={user.useStageNamePublicly}
                    onSuccess={handleSuccess}
                    onProfileUpdate={handleProfileFieldsUpdate}
                />
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Account Information */}
            <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Account Information</Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography><strong>Email:</strong> {user.email}</Typography>
                    {user.emailVerified ? (
                        <Chip
                            icon={<CheckCircleIcon />}
                            label="Verified"
                            color="success"
                            size="small"
                            variant="outlined"
                        />
                    ) : (
                        <Chip
                            icon={<EmailIcon />}
                            label="Unverified"
                            color="warning"
                            size="small"
                            variant="outlined"
                        />
                    )}
                </Box>

                {!user.emailVerified && (
                    <Box sx={{ mb: 2 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleResendVerification}
                            disabled={isResending}
                            startIcon={isResending ? <CircularProgress size={16} /> : <EmailIcon />}
                        >
                            {isResending ? 'Sending...' : 'Resend Verification Email'}
                        </Button>
                        {resendMessage && (
                            <Alert
                                severity={resendMessage.type}
                                sx={{ mt: 1 }}
                                onClose={() => setResendMessage(null)}
                            >
                                {resendMessage.message}
                            </Alert>
                        )}
                    </Box>
                )}

                <Box component="div" sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography component="span" sx={{ fontWeight: 700 }}>Roles:</Typography>
                    {user.roles.map((role: Role) => (
                        <Box component="span" key={role} sx={{
                            display: 'inline-block',
                            px: 1.25,
                            py: 0.35,
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            border: '1px solid var(--cc-panel-border)',
                            backgroundColor: 'var(--cc-panel)',
                            color: 'var(--cc-muted)',
                        }}>
                            {role}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export default BasicInfoDisplay; 