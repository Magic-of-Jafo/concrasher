import React from 'react';
import { Card, CardContent, CardMedia, Typography, Box, Chip, Button, Stack } from '@mui/material';
import Link from 'next/link';
import { getProfileImageUrl, getS3ImageUrl } from '@/lib/defaults';

interface ConventionCardProps {
  convention: any; // TODO: Replace with proper type
}

const ConventionCard: React.FC<ConventionCardProps> = ({ convention }) => {
  const {
    id,
    name,
    city,
    stateName,
    stateAbbreviation,
    startDate,
    endDate,
    tags = [],
    coverImageUrl,
    profileImageUrl,
    slug,
  } = convention;

  // Format dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate days until convention starts
  const getDaysInfo = () => {
    if (!startDate) return { type: 'no-date', text: '', days: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date(startDate);
    end.setHours(0, 0, 0, 0);

    if (today >= start && today <= end) {
      return { type: 'happening', text: 'Happening Now!', days: 0 };
    }

    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { type: 'over', text: 'Event Over', days: 0 };
    } else if (diffDays === 0) {
      return { type: 'today', text: 'Starts Today', days: 0 };
    } else if (diffDays === 1) {
      return { type: 'tomorrow', text: 'Starts Tomorrow', days: 1 };
    } else {
      return { type: 'future', text: '', days: diffDays };
    }
  };

  return (
    <Card
      component={Link}
      href={`/conventions/${slug || id}`}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'stretch',
        textDecoration: 'none',
        borderRadius: '12px',
        border: '2px solid rgba(0, 0, 0, 0.32)',
        boxShadow: '0px 6px 21px -7px rgba(0, 0, 0, 0.25)',
        p: 2,
        transition: 'box-shadow 0.2s',
        '&:hover': {
          boxShadow: '0px 8px 25px -5px rgba(0, 0, 0, 0.35)'
        },
        minHeight: 140,
      }}
    >
      {/* Wrapper frame for consistent layout */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        width: '100%',
        height: '100%',
        gap: 2
      }}>
        {/* Days text - positioned to the left */}
        <Box sx={{
          display: { xs: 'none', sm: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '31px',
          height: '60px',
          flexShrink: 0,
          textAlign: 'center'
        }}>
          {(() => {
            const daysInfo = getDaysInfo();
            if (daysInfo.type === 'future') {
              return (
                <>
                  <Typography
                    sx={{
                      color: '#000000',
                      textAlign: 'center',
                      fontFamily: 'Roboto',
                      fontSize: '0.875rem',
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '1.7142857142857142em'
                    }}
                  >
                    IN
                  </Typography>
                  <Typography
                    sx={{
                      color: '#0049',
                      fontFamily: 'Roboto',
                      fontSize: '1.5rem',
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '1.7142857142857142em'
                    }}
                  >
                    {daysInfo.days}
                  </Typography>
                  <Typography
                    sx={{
                      color: '#000000',
                      fontFamily: 'Roboto',
                      fontSize: '0.875rem',
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '1.7142857142857142em'
                    }}
                  >
                    Days
                  </Typography>
                </>
              );
            } else {
              return (
                <Typography
                  variant="subtitle2"
                  color={daysInfo.type === 'happening' ? 'success.main' : 'primary'}
                  fontWeight={600}
                  sx={{ fontSize: '0.875rem' }}
                >
                  {daysInfo.text}
                </Typography>
              );
            }
          })()}
        </Box>

        {/* Image */}
        <CardMedia
          component="img"
          image={getS3ImageUrl(profileImageUrl || coverImageUrl)}
          alt={name}
          sx={{ width: { xs: '100%', sm: 120 }, height: 120, borderRadius: 2, objectFit: 'cover', mb: { xs: 2, sm: 0 } }}
        />

        {/* Content */}
        <Box sx={{ flex: 1 }}>
          {/* Days text for mobile - positioned above the content */}
          {(() => {
            const daysInfo = getDaysInfo();
            if (daysInfo.type === 'future') {
              return (
                <Box sx={{
                  display: { xs: 'block', sm: 'none' },
                  mb: 1,
                  textAlign: 'center'
                }}>
                  <Typography
                    sx={{
                      color: '#000000',
                      textAlign: 'center',
                      fontFamily: 'Roboto',
                      fontSize: '0.875rem',
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '1.7142857142857142em'
                    }}
                  >
                    IN
                  </Typography>
                  <Typography
                    sx={{
                      color: '#0049',
                      fontFamily: 'Roboto',
                      fontSize: '1.5rem',
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '1.7142857142857142em'
                    }}
                  >
                    {daysInfo.days}
                  </Typography>
                  <Typography
                    sx={{
                      color: '#000000',
                      fontFamily: 'Roboto',
                      fontSize: '0.875rem',
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '1.7142857142857142em'
                    }}
                  >
                    Days
                  </Typography>
                </Box>
              );
            } else {
              return (
                <Typography
                  variant="subtitle2"
                  color={daysInfo.type === 'happening' ? 'success.main' : 'primary'}
                  fontWeight={600}
                  sx={{
                    display: { xs: 'block', sm: 'none' },
                    mb: 1,
                    fontSize: '0.875rem'
                  }}
                >
                  {daysInfo.text}
                </Typography>
              );
            }
          })()}

          <Typography
            variant="h6"
            fontWeight={700}
            gutterBottom
            sx={{
              fontFamily: 'Poppins',
              fontSize: '1.25rem',
              lineHeight: '1.6em'
            }}
          >
            {name}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 0.5,
              fontFamily: 'Roboto',
              fontSize: '0.875rem',
              lineHeight: '1.4300000326974052em'
            }}
          >
            {city}{city && ','} {stateAbbreviation || stateName}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1,
              fontFamily: 'Roboto',
              fontSize: '0.875rem',
              lineHeight: '1.4300000326974052em'
            }}
          >
            {formatDate(startDate)}{endDate && ` – ${formatDate(endDate)}`}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1 }}>
            {tags.map((tag: string) => (
              <Chip key={tag} label={tag} size="small" color="primary" variant="outlined" />
            ))}
          </Stack>
        </Box>
      </Box>
    </Card>
  );
};

export default ConventionCard; 