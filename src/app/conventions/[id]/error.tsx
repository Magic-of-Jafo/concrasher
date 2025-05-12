'use client';

import { Box, Container, Typography, Button, Paper } from '@mui/material';
import Link from 'next/link';
import { useEffect } from 'react';

export default function ConventionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, sm: 4 },
            textAlign: 'center',
            maxWidth: 600,
            width: '100%',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Convention Not Found
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            We couldn't find the convention you're looking for. This could be because:
          </Typography>
          
          <Box component="ul" sx={{ textAlign: 'left', mb: 3 }}>
            <Typography component="li" variant="body1" color="text.secondary">
              The convention has been removed
            </Typography>
            <Typography component="li" variant="body1" color="text.secondary">
              The URL might be incorrect
            </Typography>
            <Typography component="li" variant="body1" color="text.secondary">
              The convention might be private or not yet published
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={reset}
              sx={{ minWidth: 120 }}
            >
              Try Again
            </Button>
            <Button
              component={Link}
              href="/conventions"
              variant="outlined"
              sx={{ minWidth: 120 }}
            >
              View All Conventions
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
} 