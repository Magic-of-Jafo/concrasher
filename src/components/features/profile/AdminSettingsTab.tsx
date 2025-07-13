'use client';

import { Box, Typography, Button, Paper, Divider } from '@mui/material';
import RoleApplicationList from '@/components/admin/RoleApplicationList';
import SeoSettingsForm from '@/components/admin/SeoSettingsForm';

interface AdminSettingsTabProps {
    applications: any[];
    onApplicationProcessed: (applicationId: string) => void;
}

export default function AdminSettingsTab({ applications, onApplicationProcessed }: AdminSettingsTabProps) {
    return (
        <Box>
            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                    Role Applications
                </Typography>
                <RoleApplicationList
                    applications={applications}
                    onApplicationProcessed={onApplicationProcessed}
                />
            </Paper>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Site-Wide SEO Settings
                </Typography>
                <SeoSettingsForm />
            </Paper>
        </Box>
    );
} 