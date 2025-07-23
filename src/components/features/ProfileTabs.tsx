"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Tabs, Tab, Box, Paper } from '@mui/material';
import Grid from '@mui/material/Grid';
import SettingsTab from './profile/SettingsTab';
import { User, Role, RoleApplication, Brand } from '@prisma/client';
import UserProfilePictureUploader from '@/components/features/profile/UserProfilePictureUploader';
import BasicInfoDisplay from './profile/BasicInfoDisplay';
import AdminSettingsTab from './profile/AdminSettingsTab';
import TalentProfileTab from './profile/TalentProfileTab';
import BrandsTab from './profile/BrandsTab';
import React from 'react'; // Added for useEffect

interface ProfileTabsProps {
    user: any; // Using 'any' for now to match fetched data structure
    roleApplications: any[];
    ownedBrands: any[];
    currentImageUrl?: string | null;
    onImageUpdate: (url: string | null) => void;
    pendingApplications: any[];
    onApplicationProcessed: (applicationId: string) => void;
    initialTab?: string;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`profile-tabpanel-${index}`}
            aria-labelledby={`profile-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `profile-tab-${index}`,
        'aria-controls': `profile-tabpanel-${index}`,
    };
}

export default function ProfileTabs({
    user,
    roleApplications,
    ownedBrands,
    currentImageUrl,
    onImageUpdate,
    pendingApplications,
    onApplicationProcessed,
    initialTab = 'profile'
}: ProfileTabsProps) {
    const [value, setValue] = useState(() => {
        if (initialTab === 'settings') return 1;
        if (initialTab === 'brands') return 2;
        if (initialTab === 'talent') return 3;
        if (initialTab === 'admin') return 4;
        return 0;
    });
    const [talentProfileActive, setTalentProfileActive] = useState(user?.talentProfile?.isActive ?? false);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    // Listen for talent profile activation changes
    React.useEffect(() => {
        const handleTalentProfileUpdate = (event: any) => {
            // Use event data immediately if available
            if (event.detail && typeof event.detail.isActive === 'boolean') {
                setTalentProfileActive(event.detail.isActive);
            } else {
                // Fallback to API call
                fetch(`/api/profile/${user.id}`)
                    .then(res => res.json())
                    .then(data => {
                        setTalentProfileActive(data.talentProfile?.isActive ?? false);
                    })
                    .catch(console.error);
            }
        };

        // Listen for updates from the talent activation button
        window.addEventListener('talentProfileUpdated', handleTalentProfileUpdate);
        return () => {
            window.removeEventListener('talentProfileUpdated', handleTalentProfileUpdate);
        };
    }, [user.id]);

    const hasTalentRole = user?.roles?.includes('TALENT');
    const hasTalentProfile = !!user?.talentProfile;
    const showTalentTab = hasTalentProfile && talentProfileActive; // Show tab only if profile exists and is active
    const isAdmin = user?.roles?.includes('ADMIN');

    let adminTabIndex = 2; // Default index if no other roles are present
    if (user?.roles?.includes('ORGANIZER')) adminTabIndex++;
    if (showTalentTab) adminTabIndex++;


    return (
        <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 200px)' }}>

            <Tabs
                orientation="vertical"
                variant="scrollable"
                value={value}
                onChange={handleChange}
                aria-label="Profile Settings Tabs"
                sx={{
                    borderRight: 1,
                    borderColor: 'divider',
                    position: 'sticky',
                    top: '20px',
                    minWidth: 180,
                    '& .MuiTab-root': {
                        alignItems: 'flex-start',
                    }
                }}
            >
                <Tab label="Basic Info" {...a11yProps(0)} />
                <Tab label="Account Settings" {...a11yProps(1)} />
                {user?.roles?.includes('ORGANIZER') && <Tab label="My Brands" {...a11yProps(2)} />}
                {showTalentTab && <Tab label="Talent Profile" {...a11yProps(3)} />}
                {isAdmin && <Tab label="Admin Settings" {...a11yProps(adminTabIndex)} />}
            </Tabs>

            <Box sx={{ flexGrow: 1 }}>
                <CustomTabPanel value={value} index={0}>
                    <Grid container spacing={3}>
                        {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                        <Grid item xs={12} md={7} lg={8}>
                            <Paper sx={{ p: 2, height: '100%' }}>
                                <BasicInfoDisplay user={user} />
                            </Paper>
                        </Grid>
                        {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                        <Grid item xs={12} md={5} lg={4}>
                            <Paper sx={{ p: 2, height: '100%', minHeight: { xs: 'auto', md: 350 } }}>
                                <UserProfilePictureUploader
                                    currentImageUrl={currentImageUrl}
                                    onImageUpdate={onImageUpdate}
                                    user={user}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                </CustomTabPanel>
                <CustomTabPanel value={value} index={1}>
                    <SettingsTab user={user} roleApplications={roleApplications} ownedBrands={ownedBrands} />
                </CustomTabPanel>
                {user?.roles?.includes('ORGANIZER') && (
                    <CustomTabPanel value={value} index={2}>
                        <BrandsTab
                            userId={user.id}
                            user={user}
                        />
                    </CustomTabPanel>
                )}
                {showTalentTab && (
                    <CustomTabPanel value={value} index={3}>
                        <TalentProfileTab
                            userId={user.id}
                            user={user}
                        />
                    </CustomTabPanel>
                )}
                {isAdmin && (
                    <CustomTabPanel value={value} index={adminTabIndex}>
                        <AdminSettingsTab
                            applications={pendingApplications}
                            onApplicationProcessed={onApplicationProcessed}
                        />
                    </CustomTabPanel>
                )}
            </Box>
        </Box>
    );
} 