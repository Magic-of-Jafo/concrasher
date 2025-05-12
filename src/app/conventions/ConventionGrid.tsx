import { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Skeleton,
  Pagination,
  Stack,
} from '@mui/material';
import { Convention, ConventionStatus, ConventionType } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface ConventionGridProps {
  conventions: Convention[];
  totalPages: number;
  currentPage: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}

const statusColors: Record<ConventionStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info'> = {
  DRAFT: 'default',
  UPCOMING: 'info',
  ACTIVE: 'primary',
  PAST: 'secondary',
  CANCELLED: 'error',
};

const typeColors: Record<ConventionType, 'default' | 'primary' | 'secondary' | 'error' | 'info'> = {
  GAMING: 'primary',
  ANIME: 'secondary',
  COMIC: 'info',
  SCI_FI: 'default',
  FANTASY: 'primary',
  HORROR: 'error',
  GENERAL: 'default',
  OTHER: 'default',
};

export function ConventionGrid({
  conventions,
  totalPages,
  currentPage,
  isLoading = false,
  onPageChange,
}: ConventionGridProps) {
  const router = useRouter();

  const handleConventionClick = (slug: string) => {
    router.push(`/conventions/${slug}`);
  };

  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {[...Array(6)].map((_, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ bgcolor: 'background.paper' }}>
              <Skeleton variant="rectangular" height={140} />
              <CardContent>
                <Skeleton variant="text" height={32} />
                <Skeleton variant="text" height={24} />
                <Skeleton variant="text" height={24} />
                <Box sx={{ mt: 1 }}>
                  <Skeleton variant="rectangular" height={24} width={100} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (conventions.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No conventions found matching your criteria
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {conventions.map((convention) => (
          <Grid item xs={12} sm={6} md={4} key={convention.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                bgcolor: 'background.paper',
                '&:hover': {
                  boxShadow: 6,
                },
              }}
              onClick={() => handleConventionClick(convention.slug)}
            >
              {convention.bannerImageUrl && (
                <CardMedia
                  component="img"
                  sx={{
                    height: 140,
                    objectFit: 'cover',
                    aspectRatio: '16/9',
                    width: '100%',
                  }}
                  image={convention.bannerImageUrl}
                  alt={convention.name}
                />
              )}
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h6" component="h2" color="text.primary">
                  {convention.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {format(new Date(convention.startDate), 'MMM d, yyyy')} -{' '}
                  {format(new Date(convention.endDate), 'MMM d, yyyy')}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {convention.city}, {convention.state}, {convention.country}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={convention.status}
                    size="small"
                    color={statusColors[convention.status]}
                  />
                  <Chip
                    label={convention.type}
                    size="small"
                    color={typeColors[convention.type]}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {totalPages > 1 && (
        <Stack spacing={2} alignItems="center" sx={{ mt: 4 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => onPageChange(page)}
            color="primary"
            sx={{
              '& .MuiPaginationItem-root': {
                color: 'text.primary',
              },
            }}
          />
        </Stack>
      )}
    </Box>
  );
} 