"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Tabs, Tab, Box, Paper } from '@mui/material';
import SettingsTab from './profile/SettingsTab';
import { User, Role, RoleApplication, Brand } from '@prisma/client';
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
    onApplicationProcessed
}: ProfileTabsProps) {
    const [value, setValue] = useState(0); // Will be updated after indices are calculated
    const [talentProfileActive, setTalentProfileActive] = useState(user?.talentProfile?.isActive ?? false);
    const [hasTalentProfile, setHasTalentProfile] = useState(!!user?.talentProfile);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    // Listen for talent profile activation changes
    React.useEffect(() => {
        const handleTalentProfileUpdate = (event: any) => {
            // Use event data immediately if available
            if (event.detail && typeof event.detail.isActive === 'boolean') {
                setTalentProfileActive(event.detail.isActive);
                // If profile was created, update hasTalentProfile state
                if (event.detail.hasProfile) {
                    setHasTalentProfile(true);
                }
            } else {
                // Fallback to API call
                fetch(`/api/profile/${user.id}`)
                    .then(res => res.json())
                    .then(data => {
                        setTalentProfileActive(data.user.talentProfile?.isActive ?? false);
                        setHasTalentProfile(!!data.user.talentProfile);
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

    const hasTalentRole = user?.roles?.includes(Role.TALENT);
    const showTalentTab = hasTalentProfile && talentProfileActive; // Show tab only if profile exists and is active
    const isAdmin = user?.roles?.includes(Role.ADMIN);
    const hasBrandCreatorRole = user?.roles?.includes(Role.BRAND_CREATOR);

    // Calculate tab indices dynamically
    let currentIndex = 2; // Start after Basic Info (0) and Account Settings (1)
    const brandsTabIndex = hasBrandCreatorRole ? currentIndex++ : -1;
    const talentTabIndex = showTalentTab ? currentIndex++ : -1;
    const adminTabIndex = isAdmin ? currentIndex : -1;

    // Default to Basic Info tab (index 0)
    React.useEffect(() => {
        setValue(0);
    }, []);


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
                {hasBrandCreatorRole && <Tab label="My Brands" {...a11yProps(brandsTabIndex)} />}
                {showTalentTab && <Tab label="Talent Profile" {...a11yProps(talentTabIndex)} />}
                {isAdmin && <Tab label="Admin Panel" {...a11yProps(adminTabIndex)} />}
            </Tabs>

            <Box sx={{ flexGrow: 1 }}>
                <CustomTabPanel value={value} index={0}>
                    <Paper sx={{ p: 2 }}>
                        <BasicInfoDisplay
                            user={user}
                            currentImageUrl={currentImageUrl}
                            onImageUpdate={onImageUpdate}
                        />
                    </Paper>
                </CustomTabPanel>
                <CustomTabPanel value={value} index={1}>
                    <SettingsTab user={user} roleApplications={roleApplications} ownedBrands={ownedBrands} />
                </CustomTabPanel>
                {hasBrandCreatorRole && (
                    <CustomTabPanel value={value} index={brandsTabIndex}>
                        <BrandsTab
                            userId={user.id}
                            user={user}
                        />
                    </CustomTabPanel>
                )}
                {showTalentTab && (
                    <CustomTabPanel value={value} index={talentTabIndex}>
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