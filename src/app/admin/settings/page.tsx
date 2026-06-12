'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';
import AdminGuard from '@/components/auth/AdminGuard';
import AiSettingsForm from '@/components/admin/AiSettingsForm';

export default function AdminSettingsPage() {
    return (
        <AdminGuard>
            <Box sx={{ maxWidth: 700, mx: 'auto', px: 2, py: 4 }}>
                <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 700 }}>
                    AI Settings
                </Typography>
                <Card>
                    <CardContent>
                        <AiSettingsForm />
                    </CardContent>
                </Card>
            </Box>
        </AdminGuard>
    );
}
