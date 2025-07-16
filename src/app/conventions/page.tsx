'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Container, Typography, Button, Drawer, ToggleButton, ToggleButtonGroup } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useTheme, useMediaQuery } from '@mui/material';
import ConventionGrid from './ConventionGrid';
import ConventionFilterPanel from './ConventionFilterPanel';
import { ConventionSearchParams } from '@/lib/search';
import { getConventions } from '@/lib/api/conventions';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConventionStatus } from '@prisma/client';

interface ConventionsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

// We move the state management out of the URL and into the component state.
// This will keep the URL clean.
export default function ConventionsPage({ searchParams }: ConventionsPageProps) {
  const router = useRouter();
  const [conventions, setConventions] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Initialize state from URL search params for deep linking, but manage it internally afterward.
  const [filters, setFilters] = useState<ConventionSearchParams>(() => {
    const limitFromURL = searchParams.limit;
    const parsedLimit = Number(limitFromURL);
    return {
      limit: parsedLimit || 200,
      query: (searchParams.query as string) || '',
      city: (searchParams.city as string) || '',
      state: (searchParams.state as string) || '',
      country: (searchParams.country as string) || '',
      startDate: (searchParams.startDate as string) || undefined,
      endDate: (searchParams.endDate as string) || undefined,
      status: [(searchParams.status as ConventionStatus) || 'PUBLISHED'],
    };
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleFilterChange = useCallback((newFilters: Partial<ConventionSearchParams>) => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
    if (isMobile) setDrawerOpen(false);
  }, [isMobile]);

  // Handle toggle change
  const handleStatusChange = (_event: React.MouseEvent<HTMLElement>, newStatus: ConventionStatus | null) => {
    if (newStatus) {
      setFilters(prevFilters => ({ ...prevFilters, status: [newStatus] }));
    }
  };

  // Fetch conventions when filters change
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    const fetchConventions = async () => {
      try {
        // Use the state 'filters' object for the API call
        const response = await getConventions(filters);
        if (isMounted) {
          setConventions(response.items);
          setIsInitialLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };
    // Debounce the API call
    timeoutId = setTimeout(() => {
      fetchConventions();
    }, 300);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [filters]); // Depend on the internal filters state

  const status = filters.status?.[0] || 'PUBLISHED';

  return (
    <Container maxWidth="lg" sx={{
      minHeight: '100vh',
    }}>
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h1" component="h1" gutterBottom>
            Advanced Search
          </Typography>
          <ToggleButtonGroup
            value={status}
            exclusive
            onChange={handleStatusChange}
            aria-label="active or past conventions"
            size="small"
            sx={{ ml: 2 }}
          >
            <ToggleButton value="PUBLISHED" aria-label="Active">Active</ToggleButton>
            <ToggleButton value="PAST" aria-label="Past">Past</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {isMobile ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => setDrawerOpen(true)}
                aria-label="Open filters"
              >
                Filters
              </Button>
            </Box>
            <Drawer
              anchor="right"
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              PaperProps={{ sx: { width: '90vw', maxWidth: 360 } }}
            >
              <Box sx={{ p: 2, width: '100%' }}>
                <ConventionFilterPanel
                  onFilterChange={handleFilterChange}
                  initialFilters={filters}
                />
              </Box>
            </Drawer>
          </>
        ) : (
          <Box sx={{ mb: 2 }}>
            <ConventionFilterPanel
              onFilterChange={handleFilterChange}
              initialFilters={filters}
            />
          </Box>
        )}
        {isInitialLoading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Loading...</Typography>
          </Box>
        ) : conventions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>No conventions found</Typography>
          </Box>
        ) : (
          <ConventionGrid conventions={conventions} />
        )}
      </Box>
    </Container>
  );
} 