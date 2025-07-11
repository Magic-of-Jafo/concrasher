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
    imageUrl,
    profileImageUrl,
    slug,
  } = convention;

  // Format dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
        boxShadow: 2,
        borderRadius: 3,
        p: 2,
        pb: 1,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 6 },
        minHeight: 140,
      }}
    >
      <CardMedia
        component="img"
        image={getS3ImageUrl(profileImageUrl || imageUrl)}
        alt={name}
        sx={{ width: { xs: '100%', sm: 120 }, height: 120, borderRadius: 2, objectFit: 'cover', mr: { sm: 2 }, mb: { xs: 2, sm: 0 } }}
      />
      <CardContent sx={{ flex: 1, p: 0, pr: 2, pb: 1 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {city}{city && ','} {stateAbbreviation || stateName}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {formatDate(startDate)}{endDate && ` – ${formatDate(endDate)}`}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1 }}>
          {tags.map((tag: string) => (
            <Chip key={tag} label={tag} size="small" color="primary" variant="outlined" />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ConventionCard; 