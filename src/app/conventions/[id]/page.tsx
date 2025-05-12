'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { format } from 'date-fns';
import { ConventionStatus } from '@prisma/client';

interface Convention {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  city: string;
  state: string;
  country: string;
  venueName?: string;
  description?: string;
  websiteUrl?: string;
  status: ConventionStatus;
  bannerImageUrl?: string;
  galleryImageUrls: string[];
}

export default function ConventionDetailPage() {
  const params = useParams<{ id: string }>();
  const [convention, setConvention] = useState<Convention | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConvention = async () => {
      if (!params?.id) return;
      
      try {
        const response = await fetch(`/api/conventions/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch convention');
        }
        const data = await response.json();
        setConvention(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchConvention();
  }, [params?.id]);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  if (!convention) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="warning">Convention not found</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {convention.bannerImageUrl && (
          <Box
            component="img"
            src={convention.bannerImageUrl}
            alt={`${convention.name} banner`}
            sx={{
              width: '100%',
              height: 300,
              objectFit: 'cover',
              borderRadius: 1,
              mb: 4,
            }}
          />
        )}

        <Paper elevation={3} sx={{ p: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1">
                  {convention.name}
                </Typography>
                <Chip
                  label={convention.status}
                  color={
                    convention.status === 'ACTIVE'
                      ? 'success'
                      : convention.status === 'UPCOMING'
                      ? 'primary'
                      : 'default'
                  }
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="text.secondary">
                Date & Time
              </Typography>
              <Typography>
                {format(new Date(convention.startDate), 'PPP')} -{' '}
                {format(new Date(convention.endDate), 'PPP')}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="text.secondary">
                Location
              </Typography>
              <Typography>
                {convention.venueName && `${convention.venueName}, `}
                {convention.city}, {convention.state}, {convention.country}
              </Typography>
            </Grid>

            {convention.description && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" color="text.secondary">
                  Description
                </Typography>
                <Typography>{convention.description}</Typography>
              </Grid>
            )}

            {convention.websiteUrl && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" color="text.secondary">
                  Website
                </Typography>
                <Typography
                  component="a"
                  href={convention.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: 'primary.main', textDecoration: 'none' }}
                >
                  {convention.websiteUrl}
                </Typography>
              </Grid>
            )}

            {convention.galleryImageUrls.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                  Gallery
                </Typography>
                <Grid container spacing={2}>
                  {convention.galleryImageUrls.map((url, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Box
                        component="img"
                        src={url}
                        alt={`Gallery image ${index + 1}`}
                        sx={{
                          width: '100%',
                          height: 200,
                          objectFit: 'cover',
                          borderRadius: 1,
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
} 