"use client";

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Tab, Box, Paper } from '@mui/material';
import ParallaxTabs from '@/components/ui/ParallaxTabs';
import { profileSurfaceSx } from '@/components/ui/profileTheme';
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

        // Order: the base (user) profile first, the talent profile right below it,
        // then everything else.
        if (showTalentTab) {
            defs.push({
                key: 'talent',
                label: 'Talent Profile',
                render: () => <TalentProfileTab userId={user.id} user={user} />,
            });
        }

        if (isOrganizer) {
            defs.push({
                key: 'organizer',
                label: 'My Conventions',
                render: () => <OrganizerConventionsTab />,
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

    // Keep the deep-link URL (?tab=key) in sync on every switch, so refreshes and
    // back/forward land on the same tab (parity with the listing's tab URLs).
    const changeToKey = useCallback((key: string) => {
        const idx = tabDefs.findIndex((t) => t.key === key);
        if (idx < 0) return;
        setValue(idx);
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', key);
            window.history.pushState(null, '', url.toString());
        } catch { /* history unavailable */ }
    }, [tabDefs]);

    const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
        changeToKey(tabDefs[newValue]?.key ?? tabDefs[0].key);
    };

    // Honor browser back/forward between tabs.
    React.useEffect(() => {
        const onPop = () => {
            const key = new URLSearchParams(window.location.search).get('tab');
            const idx = key ? tabDefs.findIndex((t) => t.key === key) : 0;
            setValue(idx >= 0 ? idx : 0);
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, [tabDefs]);

    // Reactive so a fold/rotate flips between the mobile parallax bar and the
    // desktop sidebar without a reload.
    const [isMobile, setIsMobile] = useState(false);
    React.useEffect(() => {
        const mq = window.matchMedia('(max-width: 600px)');
        const sync = () => setIsMobile(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    const safeValue = value < tabDefs.length ? value : 0;
    const activeKey = tabDefs[safeValue]?.key ?? tabDefs[0].key;

    // Mobile: the linked-parallax scroll-tab bar (same look/feel as the public
    // listing). Desktop keeps the vertical sidebar below.
    if (isMobile) {
        return (
            <ParallaxTabs
                ariaLabel="Profile sections"
                tabs={tabDefs.map((t) => ({ key: t.key, label: t.label }))}
                value={activeKey}
                onChange={changeToKey}
                renderPane={(key) => (
                    <Box sx={profileSurfaceSx}>
                        {tabDefs.find((t) => t.key === key)?.render() ?? null}
                    </Box>
                )}
            />
        );
    }

    return (
        <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 200px)', flexDirection: isMobile ? 'column' : 'row' }}>

            <Tabs
                orientation={isMobile ? 'horizontal' : 'vertical'}
                variant="scrollable"
                value={safeValue}
                onChange={handleChange}
                aria-label="Profile Settings Tabs"
                sx={{
                    borderRight: 1,
                    borderColor: 'var(--cc-hairline)',
                    position: 'sticky',
                    top: '20px',
                    minWidth: 180,
                    '& .MuiTabs-indicator': { backgroundColor: 'var(--cc-gold)' },
                    '& .MuiTab-root': {
                        alignItems: 'flex-start',
                        textAlign: 'left',
                        fontFamily: 'var(--font-montserrat), system-ui, arial, sans-serif',
                        fontWeight: 700,
                        textTransform: 'none',
                        color: 'var(--cc-muted)',
                        '&.Mui-selected': { color: 'var(--cc-gold)' },
                    },
                }}
            >
                {tabDefs.map((t, i) => (
                    <Tab key={t.key} label={t.label} {...a11yProps(i)} />
                ))}
            </Tabs>

            <Box sx={{ flexGrow: 1, ...profileSurfaceSx }}>
                {tabDefs.map((t, i) => (
                    <CustomTabPanel key={t.key} value={safeValue} index={i}>
                        {t.render()}
                    </CustomTabPanel>
                ))}
            </Box>
        </Box>
    );
}
