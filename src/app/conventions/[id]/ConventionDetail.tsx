'use client';

import { Box, Container, Typography, Paper, Chip, Link } from '@mui/material';
import { format } from 'date-fns';
import Image from 'next/image';
import { Convention, ConventionStatus } from '@prisma/client';

interface ConventionDetailProps {
  convention: Convention;
}

export default function ConventionDetail({ convention }: ConventionDetailProps) {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
        {/* Hero Section */}
        {convention.bannerImageUrl && (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: { xs: 200, sm: 250, md: 300 },
              mb: { xs: 2, sm: 3, md: 4 },
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <Image
              src={convention.bannerImageUrl}
              alt={`${convention.name} banner`}
              fill
              style={{ objectFit: 'cover' }}
              priority
              sizes="(max-width: 600px) 100vw, (max-width: 960px) 100vw, 1200px"
            />
          </Box>
        )}

        {/* Main Content */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Header Section */}
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: { xs: 1, sm: 2 }
            }}>
              <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
                {convention.name}
              </Typography>
              <Chip
                label={convention.status}
                color={
                  convention.status === ConventionStatus.ACTIVE
                    ? 'success'
                    : convention.status === ConventionStatus.DRAFT
                    ? 'default'
                    : 'primary'
                }
              />
            </Box>
          </Paper>

          {/* Info and Description Section */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3
          }}>
            {/* Info Section */}
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, flex: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
                <Box>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 0.5 }}>
                    Date & Time
                  </Typography>
                  <Typography>
                    {format(new Date(convention.startDate), 'PPP')} -{' '}
                    {format(new Date(convention.endDate), 'PPP')}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 0.5 }}>
                    Location
                  </Typography>
                  <Typography>
                    {convention.venueName && `${convention.venueName}, `}
                    {convention.city}, {convention.state}, {convention.country}
                  </Typography>
                </Box>

                {convention.websiteUrl && (
                  <Box>
                    <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 0.5 }}>
                      Website
                    </Typography>
                    <Link
                      href={convention.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ 
                        color: 'primary.main',
                        wordBreak: 'break-all'
                      }}
                    >
                      {convention.websiteUrl}
                    </Link>
                  </Box>
                )}
              </Box>
            </Paper>

            {/* Description Section */}
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, flex: 1 }}>
              {convention.description && (
                <Box>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
                    Description
                  </Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                    {convention.description}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>

          {/* Gallery Section */}
          {convention.galleryImageUrls && convention.galleryImageUrls.length > 0 && (
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Gallery
              </Typography>
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)'
                },
                gap: 2
              }}>
                {convention.galleryImageUrls.map((url, index) => (
                  <Box 
                    key={index}
                    sx={{ 
                      position: 'relative',
                      width: '100%',
                      paddingTop: '75%', // 4:3 aspect ratio
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <Image
                      src={url}
                      alt={`Gallery image ${index + 1}`}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw"
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    </Container>
  );
} 