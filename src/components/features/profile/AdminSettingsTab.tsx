'use client';

import { useState } from 'react';
import { Box, Typography, Button, Paper, Divider, Tabs, Tab } from '@mui/material';
import RoleApplicationList from '@/components/admin/RoleApplicationList';
import SeoSettingsForm from '@/components/admin/SeoSettingsForm';
import SignupAnalyticsDashboard from '@/components/admin/SignupAnalyticsDashboard';
import UserManagement from '@/components/admin/UserManagement';
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

    return (
        <Box sx={{ px: 0, mx: 0 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                Admin Panel
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="Admin panel tabs">
                    <Tab label="Settings" {...a11yProps(0)} />
                    <Tab label="Reports" {...a11yProps(1)} />
                    <Tab label="User Management" {...a11yProps(2)} />
                </Tabs>
            </Box>

            <AdminTabPanel value={tabValue} index={0}>
                {/* Settings Tab Content */}
                <Box>
                    <Paper sx={{ p: '0 0', mb: 0, boxShadow: 'none', border: 'none' }}>
                        <Typography variant="h6" gutterBottom>
                            Convention Management
                        </Typography>
                        <Button
                            variant="contained"
                            component={Link}
                            href="/admin/conventions"
                        >
                            Manage All Conventions
                        </Button>
                    </Paper>
                    <Paper sx={{ p: '0 0', mb: 0, boxShadow: 'none', border: 'none' }}>
                        <Typography variant="h6" gutterBottom>
                            Role Applications
                        </Typography>
                        <RoleApplicationList
                            applications={applications}
                            onApplicationProcessed={onApplicationProcessed}
                        />
                    </Paper>
                    <Paper sx={{ p: '0 0', boxShadow: 'none', border: 'none' }}>
                        <Typography variant="h6" gutterBottom>
                            Site-Wide SEO Settings
                        </Typography>
                        <SeoSettingsForm />
                    </Paper>
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