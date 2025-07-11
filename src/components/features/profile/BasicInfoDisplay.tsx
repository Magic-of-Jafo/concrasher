'use client';

import React from 'react';
import { Box, Typography, Divider, Button } from '@mui/material';
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
    };
}

const BasicInfoDisplay: React.FC<BasicInfoDisplayProps> = ({ user }) => {
    const [isEditing, setIsEditing] = useState(false);

    const handleSuccess = () => {
        setIsEditing(false);
        // We might want to trigger a data re-fetch here in the parent component
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Account Information</Typography>
                {!isEditing && (
                    <Button onClick={() => setIsEditing(true)}>Edit</Button>
                )}
            </Box>

            <Typography><strong>Email:</strong> {user.email}</Typography>
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