'use client';

import React from 'react';
import { Box, Typography, Divider, Button, Chip, Alert, CircularProgress } from '@mui/material';
import { Email as EmailIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import ProfileForm from '@/components/features/ProfileForm';
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
}

const BasicInfoDisplay: React.FC<BasicInfoDisplayProps> = ({ user }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleSuccess = () => {
        setIsEditing(false);
        // We might want to trigger a data re-fetch here in the parent component
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Account Information</Typography>
                {!isEditing && (
                    <Button onClick={() => setIsEditing(true)}>Edit</Button>
                )}
            </Box>

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
            <Typography component="div" sx={{ mb: 2 }}>
                <strong>Roles:</strong>{' '}
                {user.roles.map((role: Role) => (
                    <Box component="span" key={role} sx={{
                        display: 'inline-block',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        mr: 1,
                        backgroundColor:
                            role === Role.ADMIN ? 'secondary.light' :
                                role === Role.ORGANIZER ? 'primary.light' :
                                    role === Role.TALENT ? 'success.light' : 'grey.200',
                        color:
                            role === Role.ADMIN ? 'secondary.contrastText' :
                                role === Role.ORGANIZER ? 'primary.contrastText' :
                                    role === Role.TALENT ? 'success.contrastText' : 'text.primary',
                    }}>
                        {role}
                    </Box>
                ))}
            </Typography>
            <Divider sx={{ my: 2 }} />

            {isEditing ? (
                <ProfileForm
                    currentFirstName={user.firstName}
                    currentLastName={user.lastName}
                    currentStageName={user.stageName}
                    currentBio={user.bio}
                    currentUseStageNamePublicly={user.useStageNamePublicly}
                    onSuccess={handleSuccess}
                    onCancel={() => setIsEditing(false)}
                />
            ) : (
                <Box>
                    <Typography><strong>Name:</strong> {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not set'}</Typography>
                    <Typography><strong>Bio:</strong></Typography>
                    <Typography
                        variant="body2"
                        sx={{ pl: 2, '& p': { margin: 0 } }}
                        dangerouslySetInnerHTML={{ __html: user.bio || 'Not set' }}
                    />
                </Box>
            )}
        </Box>
    );
};

export default BasicInfoDisplay; 