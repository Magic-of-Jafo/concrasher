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

export default function ConventionsPage({ searchParams }: ConventionsPageProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams()!;
  const [conventions, setConventions] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [status, setStatus] = useState<ConventionStatus>(
    (currentSearchParams.get('status') as ConventionStatus) || 'PUBLISHED'
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Convert search params to ConventionSearchParams using useMemo to prevent unnecessary recalculations
  const params = useMemo(() => {
    const limitFromURL = currentSearchParams.get('limit');
    const parsedLimit = Number(limitFromURL);
    return {
      limit: parsedLimit || 200, 
      query: currentSearchParams.get('query') || '',
      city: currentSearchParams.get('city') || '',
      state: currentSearchParams.get('state') || '',
      country: currentSearchParams.get('country') || '',
      startDate: currentSearchParams.get('startDate') || undefined,
      endDate: currentSearchParams.get('endDate') || undefined,
      status: [status],
    };
  }, [currentSearchParams, status]);

  const handleFilterChange = useCallback((newFilters: ConventionSearchParams) => {
    const params = new URLSearchParams(currentSearchParams.toString());
    // Only add non-empty values to the URL
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== '') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    // Always include status
    params.set('status', status);
    // Update URL
    router.push(`/conventions?${params.toString()}`);
    if (isMobile) setDrawerOpen(false); // Close drawer on mobile after applying filters
  }, [router, isMobile, status, currentSearchParams]);

  // Handle toggle change
  const handleStatusChange = (_event: React.MouseEvent<HTMLElement>, newStatus: ConventionStatus | null) => {
    if (newStatus) {
      setStatus(newStatus);
      // Update URL with new status
      const params = new URLSearchParams(currentSearchParams.toString());
      if (newStatus === 'PAST') {
        params.set('status', newStatus);
      } else {
        params.delete('status');
      }
      router.push(`/conventions?${params.toString()}`);
    }
  };

  // Fetch conventions when params change
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    const fetchConventions = async () => {
      try {
        const response = await getConventions(params);
        if (isMounted) {
          let fetchedItems = response.items;

          if (params.status && params.status.includes(ConventionStatus.PUBLISHED)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); 

            fetchedItems = fetchedItems.filter(conv => {
              if (!conv.endDate) return true; 
              const endDate = new Date(conv.endDate);
              endDate.setHours(0,0,0,0);
              return endDate >= today;
            });

            fetchedItems.sort((a, b) => {
              if (!a.startDate) return 1; 
              if (!b.startDate) return -1;
              return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
            });
          }
          
          setConventions(fetchedItems);
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
  }, [params]);

  return (
    <Container maxWidth="xl" sx={{
      backgroundColor: status === 'PAST' ? '#eaf6fb' : 'inherit',
      minHeight: '100vh',
      transition: 'background-color 0.3s',
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      paddingLeft: 0,
      paddingRight: 0,
    }}>
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Conventions
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
                  initialFilters={params}
                />
              </Box>
            </Drawer>
          </>
        ) : (
          <Box sx={{ mb: 2 }}>
            <ConventionFilterPanel
              onFilterChange={handleFilterChange}
              initialFilters={params}
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