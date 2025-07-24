'use client';

import React, { useState } from 'react';
import {
    Box,
    Avatar,
    Typography,
    Button,
    Chip,
    Container,
    Tabs,
    Tab,
    Divider,
    useMediaQuery,
    useTheme,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Work as BookIcon,
    Email as ContactIcon,
    PersonAdd as FollowIcon,
    Share as ShareIcon,
    Edit as EditIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { Role, ConventionStatus } from '@prisma/client';
import { getS3ImageUrl } from '@/lib/defaults';
import { formatRoleLabel, getRoleColor } from '@/lib/user-utils';
import AboutTab from './components/AboutTab';
import PortfolioTab from './components/PortfolioTab';
import UpcomingShowsTab from './components/UpcomingShowsTab';
import ContactTab from './components/ContactTab';
import TalentProfileEditor from '@/components/features/profile/TalentProfileEditor';

interface TalentProfileData {
    id: string;
    userId: string;
    displayName: string;
    tagline: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    websiteUrl: string | null;
    contactEmail: string | null;
    skills: string[];
    createdAt: Date;
    updatedAt: Date;
    user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        roles: Role[];
        createdAt: Date;
    };
    media: Array<{
        id: string;
        url: string;
        type: 'IMAGE' | 'VIDEO_LINK';
        caption: string | null;
        order: number | null;
    }>;
    conventions: Array<{
        id: string;
        convention: {
            id: string;
            name: string;
            startDate: Date | null;
            endDate: Date | null;
            city: string | null;
            country: string | null;
            status: ConventionStatus;
        };
    }>;
}

interface PublicTalentProfileProps {
    talentProfile: TalentProfileData;
    currentUserId?: string | null;
}

const PublicTalentProfile: React.FC<PublicTalentProfileProps> = ({ talentProfile, currentUserId }) => {
    const [currentTab, setCurrentTab] = useState(0);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [profileData, setProfileData] = useState(talentProfile);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const isOwner = currentUserId === talentProfile.userId;

    const quickActions = [
        { icon: BookIcon, label: 'Book' },
        { icon: ContactIcon, label: 'Contact' },
        { icon: FollowIcon, label: 'Follow' },
        { icon: ShareIcon, label: 'Share' },
    ];

    const handleEditProfile = () => {
        setIsEditModalOpen(true);
    };

    const handleCloseEdit = () => {
        setIsEditModalOpen(false);
    };

    const handleSaveProfile = async (updatedData: any) => {
        try {
            const response = await fetch(`/api/talent-profiles/${talentProfile.userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
            });

            if (response.ok) {
                const updatedProfile = await response.json();
                setProfileData({ ...profileData, ...updatedProfile });
                setIsEditModalOpen(false);
            } else {
                throw new Error('Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Cover Image Area */}
            <Box
                sx={{
                    height: { xs: 120, sm: 180 },
                    background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                    position: 'relative',
                }}
            />

            <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
                {/* Profile Type Indicator */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 2,
                        mt: { xs: -6, sm: -8 },
                        mb: 1,
                    }}
                >
                    <Chip
                        label="Talent Profile"
                        size="small"
                        sx={{
                            backgroundColor: 'rgba(255, 107, 53, 0.1)',
                            color: '#ff6b35',
                            border: '1px solid rgba(255, 107, 53, 0.3)',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                        }}
                    />
                    <Typography
                        component="a"
                        href={`/u/${talentProfile.user.id}`}
                        variant="body2"
                        sx={{
                            color: 'primary.main',
                            textDecoration: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            '&:hover': {
                                textDecoration: 'underline',
                            },
                        }}
                    >
                        View User Profile →
                    </Typography>
                </Box>

                {/* Profile Header */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        mb: 3,
                    }}
                >
                    {/* Avatar */}
                    <Avatar
                        src={getS3ImageUrl(profileData.profilePictureUrl) || undefined}
                        sx={{
                            width: { xs: 100, sm: 150, md: 180 },
                            height: { xs: 100, sm: 150, md: 180 },
                            border: '4px solid white',
                            boxShadow: 3,
                            mb: 2,
                        }}
                    />

                    {/* Name and Tagline */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                        <Typography
                            variant="h4"
                            component="h1"
                            fontWeight="bold"
                            textAlign="center"
                            sx={{
                                fontSize: { xs: '1.5rem', sm: '2rem' },
                            }}
                        >
                            {profileData.displayName}
                        </Typography>
                        {isOwner && (
                            <IconButton
                                onClick={handleEditProfile}
                                size="small"
                                sx={{
                                    ml: 1,
                                    color: 'text.secondary',
                                    '&:hover': {
                                        color: 'primary.main',
                                    },
                                }}
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Box>

                    {/* Tagline */}
                    {profileData.tagline && (
                        <Typography
                            variant="h6"
                            color="text.secondary"
                            textAlign="center"
                            sx={{
                                fontSize: { xs: '1rem', sm: '1.25rem' },
                                fontWeight: 400,
                                mb: 2,
                                fontStyle: 'italic',
                            }}
                        >
                            {profileData.tagline}
                        </Typography>
                    )}

                    {/* Role Badges */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
                        {talentProfile.user.roles.filter(role => role !== Role.USER).map((role) => (
                            <Chip
                                key={role}
                                label={formatRoleLabel(role)}
                                size="small"
                                variant="filled"
                                sx={{
                                    backgroundColor: '#ff6b35',
                                    color: 'white',
                                    fontWeight: 600,
                                    '&:hover': {
                                        backgroundColor: '#e55a2e',
                                    },
                                }}
                            />
                        ))}
                    </Box>

                    {/* Member Since */}
                    <Typography variant="body2" color="text.secondary">
                        Talent since {new Date(talentProfile.createdAt).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric'
                        })}
                    </Typography>
                </Box>

                {/* Quick Actions */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem' }}>
                        Quick Actions
                    </Typography>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                            gap: 1,
                            mb: 2,
                        }}
                    >
                        {quickActions.map((action, index) => (
                            <Button
                                key={index}
                                variant="outlined"
                                startIcon={<action.icon />}
                                disabled={true}
                                sx={{
                                    py: 1,
                                    fontSize: '0.875rem',
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    '&.Mui-disabled': {
                                        borderColor: 'divider',
                                        color: 'text.secondary',
                                    },
                                }}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </Box>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            textAlign: 'center',
                            fontStyle: 'italic',
                            fontSize: '0.875rem'
                        }}
                    >
                        Coming Soon
                    </Typography>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* Tabbed Content */}
                <Box>
                    <Tabs
                        value={currentTab}
                        onChange={handleTabChange}
                        variant="fullWidth"
                        sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            mb: 3,
                            '& .MuiTab-root': {
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                textTransform: 'none',
                                minWidth: 'auto',
                                px: { xs: 0.5, sm: 1 },
                            },
                        }}
                    >
                        <Tab label="About" />
                        <Tab label={isMobile ? "Media" : "Media"} />
                        <Tab label={isMobile ? "Appearances" : "Upcoming Appearances"} />
                        <Tab label="Contact" />
                    </Tabs>

                    {/* Tab Content */}
                    <Box sx={{ pb: 4 }}>
                        {currentTab === 0 && <AboutTab talentProfile={profileData} />}
                        {currentTab === 1 && <PortfolioTab media={profileData.media} />}
                        {currentTab === 2 && <UpcomingShowsTab conventions={profileData.conventions} />}
                        {currentTab === 3 && <ContactTab talentProfile={profileData} />}
                    </Box>
                </Box>
            </Container>

            {/* Edit Profile Modal */}
            <Dialog
                open={isEditModalOpen}
                onClose={handleCloseEdit}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: { xs: 0, sm: 2 },
                        maxHeight: '90vh',
                        margin: { xs: 0, sm: '32px' },
                        width: { xs: '100%', sm: 'calc(100% - 64px)' },
                        maxWidth: { xs: '100%', sm: 'md' },
                        boxShadow: { xs: 'none', sm: 3 },
                        border: 'none',
                        outline: 'none',
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" component="div">
                        Edit Talent Profile
                    </Typography>
                    <IconButton onClick={handleCloseEdit} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 2, px: { xs: 0, sm: 3 } }}>
                    <TalentProfileEditor
                        userId={talentProfile.userId}
                        user={{
                            firstName: talentProfile.user.firstName || undefined,
                            lastName: talentProfile.user.lastName || undefined,
                        }}
                        initialData={{
                            id: profileData.id,
                            displayName: profileData.displayName,
                            tagline: profileData.tagline || undefined,
                            bio: profileData.bio || undefined,
                            profilePictureUrl: profileData.profilePictureUrl || undefined,
                            websiteUrl: profileData.websiteUrl || undefined,
                            contactEmail: profileData.contactEmail || undefined,
                            skills: profileData.skills || [],
                        }}
                        onSave={handleSaveProfile}
                        onCancel={handleCloseEdit}
                    />
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default PublicTalentProfile; 