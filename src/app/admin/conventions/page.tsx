'use client';

import AdminConventionList from './AdminConventionList';
import { Suspense, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert } from '@mui/material';

export default function AdminConventionsPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h1" component="h1" gutterBottom>
          Manage All Conventions
        </Typography>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Suspense fallback={<CircularProgress />}>
          <AdminConventionList error={error} setError={setError} />
        </Suspense>
      </Paper>
    </Box>
  );
} 