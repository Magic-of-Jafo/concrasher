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
import { ConventionStatus } from '@prisma/client';
import Link from 'next/link';

interface ConventionDetailPageProps {
  params: {
    id: string;
  };
}

const statusColors: Record<ConventionStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info'> = {
  [ConventionStatus.DRAFT]: 'default',
  [ConventionStatus.PUBLISHED]: 'primary',
  [ConventionStatus.PAST]: 'secondary',
  [ConventionStatus.CANCELLED]: 'error',
};

export default async function ConventionDetailPage({ params }: ConventionDetailPageProps) {
  const convention = await prisma.convention.findUnique({
    where: {
      slug: params.id,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      startDate: true,
      endDate: true,
      isTBD: true,
      isOneDayEvent: true,
      city: true,
      stateAbbreviation: true,
      stateName: true,
      country: true,
      venueName: true,
      descriptionMain: true,
      descriptionShort: true,
      coverImageUrl: true,
      profileImageUrl: true,
      websiteUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!convention) {
    notFound();
  }

  let registrationMessage = 'Registration status will be announced soon.';
  let showRegisterButton = false;

  if (convention.status === ConventionStatus.PUBLISHED) {
    if (convention.startDate && convention.endDate) {
      const now = new Date();
      const startDate = new Date(convention.startDate);
      const endDate = new Date(convention.endDate);
      if (now >= startDate && now <= endDate) {
        registrationMessage = 'Registration is currently open for this convention.';
        showRegisterButton = true;
      } else if (now < startDate) {
        registrationMessage = 'Registration will open soon. Check back later for updates.';
      } else {
        registrationMessage = 'This convention has recently concluded.';
      }
    } else if (convention.isTBD) {
      registrationMessage = 'The dates for this event are To Be Determined.';
    } else {
      registrationMessage = 'Event date information is pending.';
    }
  } else if (convention.status === ConventionStatus.PAST) {
    registrationMessage = 'This convention has ended.';
  } else if (convention.status === ConventionStatus.CANCELLED) {
    registrationMessage = 'This convention has been cancelled.';
  } else if (convention.status === ConventionStatus.DRAFT) {
    registrationMessage = 'Details for this convention are being drafted.';
  } else if (convention.isTBD) {
    registrationMessage = 'The dates for this convention are To Be Determined.';
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ position: 'relative', height: 300, mb: 3 }}>
          <Box
            component="img"
            src={convention.coverImageUrl || '/images/default-convention.jpg'}
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
            </Stack>

            <Box 
              sx={{ 
                '& p': { mb: 2 },
                '& ul, & ol': { mb: 2, pl: 3 },
                '& li': { mb: 1 },
                '& h1, & h2, & h3, & h4, & h5, & h6': { mb: 2, mt: 3 },
                '& a': { color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
                '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
                '& blockquote': { 
                  borderLeft: '4px solid',
                  borderColor: 'divider',
                  pl: 2,
                  py: 1,
                  my: 2,
                  fontStyle: 'italic'
                }
              }}
              dangerouslySetInnerHTML={{ __html: convention.descriptionMain || convention.descriptionShort || 'No description available.' }}
            />

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
                    {(() => {
                      if (convention.isTBD || !convention.startDate) {
                        return 'To Be Determined';
                      }
                      const startDateObj = new Date(convention.startDate);
                      
                      const formattedStartDate = format(startDateObj, 'MMMM d, yyyy');

                      if (convention.isOneDayEvent) {
                        return formattedStartDate;
                      }
                      
                      if (convention.endDate) {
                        const endDateObj = new Date(convention.endDate);
                        if (
                           startDateObj.getFullYear() === endDateObj.getFullYear() &&
                           startDateObj.getMonth() === endDateObj.getMonth() &&
                           startDateObj.getDate() === endDateObj.getDate()
                        ) {
                          return formattedStartDate;
                        } else {
                          const formattedEndDate = format(endDateObj, 'MMMM d, yyyy');
                          return `${formattedStartDate} - ${formattedEndDate}`;
                        }
                      }
                      return formattedStartDate;
                    })()}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body1" color="text.primary">
                    {convention.venueName}
                    <br />
                    {convention.city}
                    {convention.stateAbbreviation && `, ${convention.stateAbbreviation}`}
                    {convention.stateName && ` (${convention.stateName})`}
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
                {registrationMessage}
              </Typography>
              {showRegisterButton && (
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