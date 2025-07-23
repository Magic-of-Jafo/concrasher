'use client';

import React from 'react';
import { Box, Typography, Card, CardContent, Chip } from '@mui/material';
import { CalendarToday as CalendarIcon, LocationOn as LocationIcon } from '@mui/icons-material';

interface UpcomingAppearancesTabProps {
  userId: string;
}

const UpcomingAppearancesTab: React.FC<UpcomingAppearancesTabProps> = ({ userId }) => {
  // TODO: Replace with actual data fetching
  const upcomingAppearances: any[] = [];

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
        Upcoming Conventions
      </Typography>

      {upcomingAppearances.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {upcomingAppearances.map((appearance) => (
            <Card key={appearance.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    {appearance.conventionName}
                  </Typography>
                  <Chip
                    label={appearance.role}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CalendarIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {appearance.dates}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {appearance.location}
                  </Typography>
                </Box>

                {appearance.description && (
                  <Typography variant="body2" sx={{ mt: 2, lineHeight: 1.5 }}>
                    {appearance.description}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            px: 2,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            color: 'text.secondary',
          }}
        >
          <CalendarIcon sx={{ fontSize: '3rem', mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
            No Upcoming Appearances
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.9rem', mb: 2 }}>
            This user doesn't have any upcoming convention appearances scheduled.
          </Typography>
          <Chip
            label="Feature Coming Soon"
            size="small"
            variant="outlined"
            sx={{ opacity: 0.7 }}
          />
        </Box>
      )}
    </Box>
  );
};

export default UpcomingAppearancesTab; 