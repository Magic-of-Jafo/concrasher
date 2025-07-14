"use client";

import { Box, Typography, Card, CardContent, useTheme, useMediaQuery, Skeleton, Avatar } from "@mui/material";
import { Convention } from "@prisma/client";
import { useRouter } from "next/navigation";

interface ConventionGridProps {
  conventions: Convention[];
  loading?: boolean;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

// Helper function to format Date object to DD Mmm YY using UTC methods
const formatDateToDDMonYY_UTC = (date: Date | string | null): string => {
  if (!date) {
    return "N/A";
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return "N/A";
  }
  const day = String(d.getUTCDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getUTCMonth()];
  const year = String(d.getUTCFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
};

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

  const getConventionStatusText = (startDate: Date | null, endDate: Date | null) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare dates only

    if (!startDate) return "Date TBD";

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date(startDate); // Assume single day if no end date
    end.setHours(0, 0, 0, 0);


    if (today >= start && today <= end) {
      return "Happening Now!";
    }

    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // This case should ideally be filtered out, but as a fallback:
      return "Event Over";
    } else if (diffDays === 0) {
      // This means startDate is today, but it's not "Happening Now!" yet (e.g. event starts later today)
      // Or if an event is single-day and already happened today but not marked as "Happening Now"
      // Let's refine this: if it's today and not "Happening Now", it means it starts today.
      return "Starts Today";
    } else if (diffDays === 1) {
      return "Starts Tomorrow";
    } else {
      return `In ${diffDays} Days`;
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[...Array(3)].map((_, index) => (
            <Card key={index}>
              <CardContent>
                <Skeleton variant="rectangular" width={'100%'} height={118} />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }

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
          const daysText = getConventionStatusText(convention.startDate, convention.endDate);
          const city = convention.city || '';
          const state = convention.stateAbbreviation || '';
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
                    <Typography variant="subtitle1" color={daysText === "Happening Now!" ? "success.main" : "primary"}>
                      {daysText}
                    </Typography>
                  </Box>
                  <Box sx={{
                    width: isMobile ? '100%' : '33.33%',
                    minWidth: isMobile ? 'auto' : '200px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}>
                    <Avatar src={convention.profileImageUrl ?? undefined}>
                      {!convention.profileImageUrl && convention.name.charAt(0)}
                    </Avatar>
                    <Typography variant="h6" component="div">
                      {convention.name}
                    </Typography>
                  </Box>
                  <Box sx={{
                    width: isMobile ? '100%' : '25%',
                    minWidth: isMobile ? 'auto' : '130px'
                  }}>
                    <Typography variant="body1">
                      {formatDateToDDMonYY_UTC(convention.startDate)}
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