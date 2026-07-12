'use client';

import { useState } from 'react';
import { Box, Button, Divider, Tabs, Tab } from '@mui/material';
import RoleApplicationList from '@/components/admin/RoleApplicationList';
import SeoSettingsForm from '@/components/admin/SeoSettingsForm';
import AiSettingsForm from '@/components/admin/AiSettingsForm';
import SignupAnalyticsDashboard from '@/components/admin/SignupAnalyticsDashboard';
import UserManagement from '@/components/admin/UserManagement';
import { SectionHeading } from '@/components/ui/profileTheme';
import Link from 'next/link';

interface AdminSettingsTabProps {
    applications: any[];
    onApplicationProcessed: (applicationId: string) => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function AdminTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`admin-tabpanel-${index}`}
            aria-labelledby={`admin-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ pt: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `admin-tab-${index}`,
        'aria-controls': `admin-tabpanel-${index}`,
    };
}

export default function AdminSettingsTab({ applications, onApplicationProcessed }: AdminSettingsTabProps) {
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const sectionDivider = <Divider sx={{ my: 4 }} />;

    return (
        <Box>
            <Box sx={{ borderBottom: '2px solid var(--cc-hairline)' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="Admin panel tabs"
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{
                        minHeight: 44,
                        '& .MuiTabs-indicator': { backgroundColor: 'var(--cc-gold)', height: 2 },
                        '& .MuiTab-root': {
                            fontFamily: 'var(--font-montserrat), system-ui, arial, sans-serif',
                            fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.04em',
                            textTransform: 'none', minHeight: 44, color: 'var(--cc-muted)',
                            '&.Mui-selected': { color: 'var(--cc-gold)' },
                        },
                    }}
                >
                    <Tab label="Settings" {...a11yProps(0)} />
                    <Tab label="Reports" {...a11yProps(1)} />
                    <Tab label="User Management" {...a11yProps(2)} />
                </Tabs>
            </Box>

            <AdminTabPanel value={tabValue} index={0}>
                {/* Settings Tab Content */}
                <Box>
                    <SectionHeading title="Convention Management" description="Add, edit, feature, or remove any convention on the platform." />
                    <Button variant="contained" component={Link} href="/admin/conventions">
                        Manage All Conventions
                    </Button>

                    {sectionDivider}

                    <SectionHeading title="Role Applications" description="Approve or reject requests for organizer, talent, and brand roles." />
                    <RoleApplicationList
                        applications={applications}
                        onApplicationProcessed={onApplicationProcessed}
                    />

                    {sectionDivider}

                    <SectionHeading title="AI Settings" description="The OpenAI key and model that power the Schedule Helper and enrichment." />
                    <AiSettingsForm />

                    {sectionDivider}

                    <SectionHeading title="Site-Wide SEO Settings" description="Global metadata, organization details, and tracking scripts." />
                    <SeoSettingsForm />
                </Box>
            </AdminTabPanel>

            <AdminTabPanel value={tabValue} index={1}>
                {/* Reports Tab Content */}
                <SignupAnalyticsDashboard />
            </AdminTabPanel>

            <AdminTabPanel value={tabValue} index={2}>
                {/* User Management Tab Content */}
                <UserManagement />
            </AdminTabPanel>
        </Box>
    );
} 