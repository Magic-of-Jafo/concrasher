"use client";

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Tab, Box, Paper } from '@mui/material';
import SettingsTab from './profile/SettingsTab';
import { Role } from '@prisma/client';
import BasicInfoDisplay from './profile/BasicInfoDisplay';
import AdminSettingsTab from './profile/AdminSettingsTab';
import TalentProfileTab from './profile/TalentProfileTab';
import BrandsTab from './profile/BrandsTab';
import OrganizerConventionsTab from './profile/OrganizerConventionsTab';
import React from 'react';

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
    const searchParams = useSearchParams();
    const [talentProfileActive, setTalentProfileActive] = useState(user?.talentProfile?.isActive ?? false);
    const [hasTalentProfile, setHasTalentProfile] = useState(!!user?.talentProfile);

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

    const isOrganizer = user?.roles?.includes(Role.ORGANIZER);
    const showTalentTab = hasTalentProfile && talentProfileActive; // Show tab only if profile exists and is active
    const isAdmin = user?.roles?.includes(Role.ADMIN);
    const hasBrandCreatorRole = user?.roles?.includes(Role.BRAND_CREATOR);

    // Build the tab list dynamically. Each role-gated capability lives here so the
    // profile page is the single place users manage everything they have access to.
    const tabDefs = useMemo(() => {
        const defs: { key: string; label: string; render: () => React.ReactNode }[] = [
            {
                key: 'basic',
                label: 'Basic Info',
                render: () => (
                    <Paper sx={{ p: { xs: 0, md: 2 }, boxShadow: 'none', border: 'none' }}>
                        <BasicInfoDisplay
                            user={user}
                            currentImageUrl={currentImageUrl}
                            onImageUpdate={onImageUpdate}
                        />
                    </Paper>
                ),
            },
        ];

        if (isOrganizer) {
            defs.push({
                key: 'organizer',
                label: 'My Conventions',
                render: () => <OrganizerConventionsTab />,
            });
        }

        if (showTalentTab) {
            defs.push({
                key: 'talent',
                label: 'Talent Profile',
                render: () => <TalentProfileTab userId={user.id} user={user} />,
            });
        }

        if (hasBrandCreatorRole) {
            defs.push({
                key: 'brands',
                label: 'My Brands',
                render: () => <BrandsTab userId={user.id} user={user} />,
            });
        }

        defs.push({
            key: 'settings',
            label: 'Account Settings',
            render: () => (
                <Paper sx={{ p: { xs: 0, md: 2 }, boxShadow: 'none', border: 'none' }}>
                    <SettingsTab user={user} roleApplications={roleApplications} ownedBrands={ownedBrands} />
                </Paper>
            ),
        });

        if (isAdmin) {
            defs.push({
                key: 'admin',
                label: 'Admin Panel',
                render: () => (
                    <AdminSettingsTab
                        applications={pendingApplications}
                        onApplicationProcessed={onApplicationProcessed}
                    />
                ),
            });
        }

        return defs;
    }, [user, currentImageUrl, onImageUpdate, isOrganizer, showTalentTab, hasBrandCreatorRole, isAdmin, roleApplications, ownedBrands, pendingApplications, onApplicationProcessed]);

    // Honor ?tab=<key> deep links (used by the header/account menu); fall back to first tab.
    const requestedTab = searchParams?.get('tab');
    const requestedIndex = requestedTab ? tabDefs.findIndex(t => t.key === requestedTab) : -1;
    const [value, setValue] = useState(requestedIndex >= 0 ? requestedIndex : 0);

    // If the deep link changes (or tabs become available after load), follow it.
    React.useEffect(() => {
        const idx = requestedTab ? tabDefs.findIndex(t => t.key === requestedTab) : -1;
        if (idx >= 0 && idx !== value) {
            setValue(idx);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestedTab, tabDefs.length]);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;
    const safeValue = value < tabDefs.length ? value : 0;

    return (
        <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 200px)', flexDirection: isMobile ? 'column' : 'row' }}>

            <Tabs
                orientation={isMobile ? 'horizontal' : 'vertical'}
                variant="scrollable"
                value={safeValue}
                onChange={handleChange}
                aria-label="Profile Settings Tabs"
                sx={{
                    borderRight: isMobile ? 0 : 1,
                    borderBottom: isMobile ? 1 : 0,
                    borderColor: 'divider',
                    position: isMobile ? 'static' : 'sticky',
                    top: '20px',
                    minWidth: isMobile ? '100%' : 180,
                    '& .MuiTab-root': {
                        alignItems: 'flex-start',
                    }
                }}
            >
                {tabDefs.map((t, i) => (
                    <Tab key={t.key} label={t.label} {...a11yProps(i)} />
                ))}
            </Tabs>

            <Box sx={{ flexGrow: 1 }}>
                {tabDefs.map((t, i) => (
                    <CustomTabPanel key={t.key} value={safeValue} index={i}>
                        {t.render()}
                    </CustomTabPanel>
                ))}
            </Box>
        </Box>
    );
}
