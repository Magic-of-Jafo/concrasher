import React from 'react';
import { Card, CardContent, CardMedia, Typography, Box, Chip, Button, Stack, useTheme, useMediaQuery } from '@mui/material';
import Link from 'next/link';
import { getProfileImageUrl, getS3ImageUrl } from '@/lib/defaults';

interface ConventionCardProps {
  convention: any; // TODO: Replace with proper type
}

const ConventionCard: React.FC<ConventionCardProps> = ({ convention }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  const daysInfo = getDaysInfo();

  // Days countdown component
  const DaysDisplay = ({ showOnMobile = false }) => {
    const displayProps = showOnMobile
      ? { display: { xs: 'flex', sm: 'none' } }
      : { display: { xs: 'none', sm: 'flex' } };

    if (daysInfo.type === 'future') {
      return (
        <Box sx={{
          ...displayProps,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: showOnMobile ? 'auto' : '31px',
          height: showOnMobile ? 'auto' : '60px',
          flexShrink: 0,
          textAlign: 'center',
          mb: showOnMobile ? 0 : 0
        }}>
          <Typography sx={{
            color: '#000000',
            fontSize: showOnMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            lineHeight: '1.1em'
          }}>
            IN
          </Typography>
          <Typography sx={{
            color: '#004d7a',
            fontSize: showOnMobile ? '1.1rem' : '1.5rem',
            fontWeight: 600,
            lineHeight: '1.1em'
          }}>
            {daysInfo.days}
          </Typography>
          <Typography sx={{
            color: '#000000',
            fontSize: showOnMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            lineHeight: '1.1em'
          }}>
            DAYS
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
            ...displayProps,
            fontSize: showOnMobile ? '0.75rem' : '0.875rem',
            mb: showOnMobile ? 0 : 0,
            textAlign: 'center',
            lineHeight: '1.2em'
          }}
        >
          {daysInfo.text}
        </Typography>
      );
    }
  };

  return (
    <Card
      component={Link}
      href={`/conventions/${slug || id}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        borderRadius: '12px',
        border: '2px solid rgba(0, 0, 0, 0.32)',
        boxShadow: '0px 6px 21px -7px rgba(0, 0, 0, 0.25)',
        p: 2,
        transition: 'box-shadow 0.2s',
        '&:hover': {
          boxShadow: '0px 8px 25px -5px rgba(0, 0, 0, 0.35)'
        },
        minHeight: isMobile ? 'auto' : 140,
      }}
    >
      {isMobile ? (
        // Mobile Layout: Compact side-by-side arrangement
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}>
          {/* Top row: Image left, Title right */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            {/* Square image on left */}
            <CardMedia
              component="img"
              image={getS3ImageUrl(profileImageUrl || coverImageUrl)}
              alt={name}
              sx={{
                width: 80,
                height: 80,
                borderRadius: 3,
                objectFit: 'cover',
                flexShrink: 0
              }}
            />

            {/* Convention title on right */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{
                  fontFamily: 'Poppins',
                  fontSize: '1.5rem',
                  lineHeight: '1.3em',
                  wordBreak: 'break-word'
                }}
              >
                {name}
              </Typography>
            </Box>
          </Box>

          {/* Bottom row: Days left, Location/dates right */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            {/* Days countdown on left */}
            <Box sx={{ width: 80, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
              <DaysDisplay showOnMobile={true} />
            </Box>

            {/* Location and dates on right */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 0.5,
                  fontSize: '0.875rem',
                  lineHeight: '1.3em',
                  fontWeight: 500
                }}
              >
                {city}{city && ','} {stateAbbreviation || stateName}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1.5,
                  fontSize: '0.875rem',
                  lineHeight: '1.3em'
                }}
              >
                {formatDate(startDate)}{endDate && ` – ${formatDate(endDate)}`}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {tags.slice(0, 2).map((tag: string) => (
                  <Chip key={tag} label={tag} size="small" color="primary" variant="outlined" />
                ))}
              </Stack>
            </Box>
          </Box>
        </Box>
      ) : (
        // Desktop Layout: Horizontal with square image
        <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          gap: 2
        }}>
          {/* Days text - positioned to the left */}
          <DaysDisplay showOnMobile={false} />

          {/* Square image */}
          <CardMedia
            component="img"
            image={getS3ImageUrl(profileImageUrl || coverImageUrl)}
            alt={name}
            sx={{
              width: 120,
              height: 120,
              borderRadius: 3,
              objectFit: 'cover',
              flexShrink: 0
            }}
          />

          {/* Content */}
          <Box sx={{ flex: 1 }}>
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
                fontSize: '0.875rem',
                lineHeight: '1.43em'
              }}
            >
              {city}{city && ','} {stateAbbreviation || stateName}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1,
                fontSize: '0.875rem',
                lineHeight: '1.43em'
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
      )}
    </Card>
  );
};

export default ConventionCard; 