import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  Button,
  Stack,
} from '@mui/material';
import { format } from 'date-fns';
import { ConventionStatus, ConventionType } from '@prisma/client';
import Link from 'next/link';

// Define ConventionType enum locally since it's not exported from @prisma/client
enum ConventionType {
  GAMING = 'GAMING',
  ANIME = 'ANIME',
  COMIC = 'COMIC',
  SCI_FI = 'SCI_FI',
  FANTASY = 'FANTASY',
  HORROR = 'HORROR',
  GENERAL = 'GENERAL',
  OTHER = 'OTHER',
}

interface ConventionDetailPageProps {
  params: {
    slug: string;
  };
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

export default async function ConventionDetailPage({ params }: ConventionDetailPageProps) {
  const convention = await prisma.convention.findUnique({
    where: {
      slug: params.slug,
    },
  });

  if (!convention) {
    notFound();
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ position: 'relative', height: 300, mb: 3 }}>
          <Box
            component="img"
            src={convention.bannerImageUrl || '/images/default-convention.jpg'}
            alt={convention.name}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 1,
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom color="text.primary">
              {convention.name}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                label={convention.status}
                color={statusColors[convention.status]}
              />
              <Chip
                label={convention.type}
                color={typeColors[convention.type]}
              />
            </Stack>

            <Typography variant="body1" paragraph color="text.primary">
              {convention.description}
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom color="text.primary">
                Event Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body1" color="text.primary">
                    {format(new Date(convention.startDate), 'MMMM d, yyyy')} -{' '}
                    {format(new Date(convention.endDate), 'MMMM d, yyyy')}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body1" color="text.primary">
                    {convention.venueName}
                    <br />
                    {convention.city}, {convention.state}
                    <br />
                    {convention.country}
                  </Typography>
                </Box>
              </Box>
              {convention.websiteUrl && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    Website
                  </Typography>
                  <Typography variant="body1" color="text.primary">
                    <Link href={convention.websiteUrl} target="_blank" rel="noopener noreferrer">
                      {convention.websiteUrl}
                    </Link>
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3, bgcolor: 'background.paper' }}>
              <Typography variant="h6" gutterBottom color="text.primary">
                Registration
              </Typography>
              <Typography variant="body1" paragraph color="text.primary">
                {convention.status === 'ACTIVE' ? (
                  'Registration is currently open for this convention.'
                ) : convention.status === 'UPCOMING' ? (
                  'Registration will open soon. Check back later for updates.'
                ) : convention.status === 'PAST' ? (
                  'This convention has ended.'
                ) : convention.status === 'CANCELLED' ? (
                  'This convention has been cancelled.'
                ) : (
                  'Registration status will be announced soon.'
                )}
              </Typography>
              {convention.status === 'ACTIVE' && (
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  component={Link}
                  href={`/conventions/${convention.slug}/register`}
                >
                  Register Now
                </Button>
              )}
            </Paper>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
} 