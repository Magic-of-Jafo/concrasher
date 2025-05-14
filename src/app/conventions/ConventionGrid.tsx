"use client";

import { Box, Typography, Card, CardContent, useTheme, useMediaQuery } from "@mui/material";
import { Convention } from "@prisma/client";
import { useRouter } from "next/navigation";

interface ConventionGridProps {
  conventions: Convention[];
  loading?: boolean;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export default function ConventionGrid({ 
  conventions = [], 
  loading = false,
  totalPages = 1,
  currentPage = 1,
  onPageChange
}: ConventionGridProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getDaysUntilStart = (startDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Reset time to start of day
    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!conventions || conventions.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No conventions found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {conventions.map((convention) => {
          const days = getDaysUntilStart(convention.startDate);
          const daysText = days === 1 ? "1 Day" : `${days} Days`;
          const city = convention.city || '';
          const state = convention.state || '';
          const country = convention.country || '';
          const location = country === 'United States' || country === 'USA' || country === 'US'
            ? (state ? `${city}, ${state}` : city)
            : `${city}, ${country}`;

          return (
            <Card 
              key={convention.id}
              sx={{ 
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
              onClick={() => router.push(`/conventions/${convention.slug}`)}
            >
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: 2,
                  alignItems: isMobile ? 'flex-start' : 'center'
                }}>
                  <Box sx={{ 
                    width: isMobile ? '100%' : '16.66%',
                    minWidth: isMobile ? 'auto' : '100px'
                  }}>
                    <Typography variant="subtitle1" color="primary">
                      {daysText}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: isMobile ? '100%' : '33.33%',
                    minWidth: isMobile ? 'auto' : '200px'
                  }}>
                    <Typography variant="h6" component="div">
                      {convention.name}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: isMobile ? '100%' : '25%',
                    minWidth: isMobile ? 'auto' : '130px'
                  }}>
                    <Typography variant="body1">
                      {convention.startDate ? new Date(convention.startDate).toLocaleDateString() : "N/A"}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: isMobile ? '100%' : '25%',
                    minWidth: isMobile ? 'auto' : '200px'
                  }}>
                    <Typography variant="body1">
                      {location}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
} 