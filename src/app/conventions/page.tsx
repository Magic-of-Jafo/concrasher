'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Container, Typography, Button, Drawer, ToggleButton, ToggleButtonGroup, Popover } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import NearMeIcon from '@mui/icons-material/NearMe';
import { useTheme, useMediaQuery, IconButton } from '@mui/material';
import { useSession } from 'next-auth/react';
import ConventionGrid from './ConventionGrid';
import ConventionFilterPanel from './ConventionFilterPanel';
import { ConventionSearchParams } from '@/lib/search';
import { getConventions } from '@/lib/api/conventions';
import { ConventionStatus } from '@prisma/client';
import { DISPLAY, BODY } from '@/components/frontpage/FrontPage';

// The browse page in House Lights dress: same stage (cc tokens), same card
// language as the front page rail, in both themes. State lives in the
// component (URL params only seed the first render, for deep links).

interface ConventionsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

// One House Lights recipe for both segmented controls (status + sort). Styled
// as a single cohesive control — one border + radius around the group, hairline
// dividers between segments, gold fill for the active one — so it reads as a
// sleek toggle rather than a row of fat separate buttons. Compact on phones.
const segmentedSx = {
  borderRadius: '10px',
  border: '1px solid var(--cc-panel-border)',
  overflow: 'hidden',
  backgroundColor: 'var(--cc-panel)',
  '& .MuiToggleButtonGroup-grouped': {
    m: 0,
    border: 0,
    borderRadius: 0,
    '&:not(:last-of-type)': { borderRight: '1px solid var(--cc-panel-border)' },
  },
  '& .MuiToggleButton-root': {
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: { xs: '0.78rem', sm: '0.85rem' },
    letterSpacing: '0.01em',
    textTransform: 'none',
    color: 'var(--cc-muted)',
    px: { xs: 1.6, sm: 2.25 },
    // 44px stays the floor on every size (WCAG / PRODUCT.md touch targets);
    // compactness comes from type, padding, and the unified outline instead.
    minHeight: 44,
    '&:hover': { backgroundColor: 'var(--cc-hairline)', color: 'var(--cc-ink)' },
    '&.Mui-selected': {
      backgroundColor: 'var(--cc-gold)',
      color: 'var(--cc-gold-ink)',
      '&:hover': { backgroundColor: 'var(--cc-gold)', filter: 'brightness(1.04)' },
    },
    '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '-3px' },
  },
} as const;

export default function ConventionsPage({ searchParams }: ConventionsPageProps) {
  const { status: authStatus } = useSession();
  const [conventions, setConventions] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Distance unit from the server (mi for US home bases); present only when
  // the nearest sort actually applied.
  const [distanceUnit, setDistanceUnit] = useState<'mi' | 'km' | undefined>(undefined);
  // The "Nearest me" explainer for ineligible viewers. Anchored to the sort
  // control; variant picks the ONE next action that unlocks the feature.
  const [nearestPrompt, setNearestPrompt] = useState<'signed-out' | 'no-home-base' | null>(null);
  const sortGroupRef = useRef<HTMLDivElement | null>(null);

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
  }, []);

  const handleStatusChange = (_event: React.MouseEvent<HTMLElement>, newStatus: ConventionStatus | null) => {
    if (newStatus) {
      setFilters(prevFilters => ({ ...prevFilters, status: [newStatus] }));
    }
  };

  const handleSortChange = (_event: React.MouseEvent<HTMLElement>, newSort: 'soonest' | 'nearest' | null) => {
    if (!newSort) return;
    if (newSort === 'nearest' && authStatus === 'unauthenticated') {
      // No round trip needed: we already know why it can't work.
      setNearestPrompt('signed-out');
      return;
    }
    // Signed in (or session still resolving): request it optimistically; the
    // server's meta bounces it back if there's no geocoded home base yet.
    setNearestPrompt(null);
    setFilters(prev => ({ ...prev, sort: newSort }));
  };

  // Fetch conventions when filters change (debounced for typing).
  useEffect(() => {
    let isMounted = true;
    const timeoutId = setTimeout(async () => {
      try {
        const response = await getConventions(filters);
        if (isMounted) {
          setConventions(response.items);
          setDistanceUnit(response.sortApplied === 'nearest' ? response.unit : undefined);
          if (filters.sort === 'nearest' && response.sortApplied !== 'nearest') {
            // The server declined (no home base yet): explain, revert the toggle.
            setNearestPrompt(response.reason === 'signed-out' ? 'signed-out' : 'no-home-base');
            setFilters(prev => (prev.sort === 'nearest' ? { ...prev, sort: 'soonest' } : prev));
          }
          setIsInitialLoading(false);
        }
      } catch {
        if (isMounted) setIsInitialLoading(false);
      }
    }, 300);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [filters]);

  const status = filters.status?.[0] || 'PUBLISHED';
  const showingPast = status === 'PAST';

  const activeFilterCount = [filters.query, filters.city, filters.state, filters.country, filters.startDate, filters.endDate]
    .filter(Boolean).length;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'var(--cc-bg)',
        backgroundImage: 'var(--cc-field)',
        backgroundRepeat: 'no-repeat',
        color: 'var(--cc-ink)',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ py: { xs: 3, md: 4 } }}>
          <Typography
            component="h1"
            sx={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 'clamp(1.55rem, 4.5vw, 2.1rem)',
              letterSpacing: '-0.015em',
              lineHeight: 1.15,
              color: 'var(--cc-ink)',
              textWrap: 'balance',
              m: 0,
            }}
          >
            All Conventions
          </Typography>
          <Typography
            suppressHydrationWarning
            sx={{ fontFamily: BODY, fontSize: '0.92rem', color: 'var(--cc-muted)', mt: 0.5, mb: 2 }}
          >
            {isInitialLoading
              ? 'Setting the stage…'
              : showingPast
                ? `${conventions.length} past ${conventions.length === 1 ? 'convention' : 'conventions'}`
                : `${conventions.length} ${conventions.length === 1 ? 'convention' : 'conventions'} coming up worldwide`}
          </Typography>

          {/* Controls: Active/Past + (mobile) the filter drawer trigger. */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flexWrap: 'wrap', mb: { xs: 2, md: 1 } }}>
            <ToggleButtonGroup
              value={status}
              exclusive
              onChange={handleStatusChange}
              aria-label="Show active or past conventions"
              sx={segmentedSx}
            >
              <ToggleButton value="PUBLISHED" aria-label="Upcoming conventions">Upcoming</ToggleButton>
              <ToggleButton value="PAST" aria-label="Past conventions">Past</ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup
              ref={sortGroupRef}
              value={filters.sort || 'soonest'}
              exclusive
              onChange={handleSortChange}
              aria-label="Sort order"
              sx={segmentedSx}
            >
              <ToggleButton value="soonest" aria-label="Sort by date">Soonest</ToggleButton>
              <ToggleButton value="nearest" aria-label="Sort by distance from your home base">
                <NearMeIcon sx={{ fontSize: '0.95rem', mr: 0.5 }} />
                {/* Phones get the short label; the aria-label carries the meaning. */}
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Nearest me</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Nearest</Box>
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Why "Nearest me" didn't sort: one action, right where they tapped. */}
            <Popover
              open={nearestPrompt !== null}
              anchorEl={sortGroupRef.current}
              onClose={() => setNearestPrompt(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: -8, horizontal: 'left' }}
              slotProps={{
                paper: {
                  sx: {
                    backgroundColor: 'var(--cc-bg)',
                    backgroundImage: 'none',
                    color: 'var(--cc-ink)',
                    border: '1px solid var(--cc-panel-border)',
                    borderRadius: '8px',
                    maxWidth: 320,
                    p: 2,
                  },
                },
              }}
            >
              <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.98rem', mb: 0.5 }}>
                See what&apos;s closest to home
              </Typography>
              <Typography sx={{ fontFamily: BODY, fontSize: '0.88rem', color: 'var(--cc-muted)', mb: 1.5 }}>
                {nearestPrompt === 'signed-out'
                  ? 'Log in and set your home base, and we’ll sort every convention by distance from you.'
                  : 'Tell us your home city and we’ll sort every convention by distance from you.'}
              </Typography>
              <Button
                href={nearestPrompt === 'signed-out' ? '/login?from=/conventions' : '/profile'}
                fullWidth
                sx={{
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  textTransform: 'none',
                  backgroundColor: 'var(--cc-gold)',
                  color: 'var(--cc-gold-ink)',
                  borderRadius: '8px',
                  minHeight: 44,
                  '&:hover': { backgroundColor: 'var(--cc-gold)', filter: 'brightness(1.06)' },
                  '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
                }}
              >
                {nearestPrompt === 'signed-out' ? 'Log in or sign up' : 'Add your home base'}
              </Button>
            </Popover>

            {isMobile && (
              <Button
                startIcon={<FilterListIcon sx={{ fontSize: '1rem' }} />}
                onClick={() => setDrawerOpen(true)}
                aria-label="Open filters"
                sx={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: { xs: '0.78rem', sm: '0.85rem' },
                  textTransform: 'none',
                  color: 'var(--cc-muted)',
                  border: '1px solid var(--cc-panel-border)',
                  borderRadius: '10px',
                  backgroundColor: 'var(--cc-panel)',
                  px: { xs: 1.6, sm: 2.25 },
                  minHeight: 44,
                  // Right-aligned: the drawer trigger is a different kind of
                  // control than the two segmented pickers beside it.
                  ml: 'auto',
                  '&:hover': { backgroundColor: 'var(--cc-hairline)', color: 'var(--cc-ink)', borderColor: 'var(--cc-cyan)' },
                  '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
                }}
              >
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Button>
            )}
          </Box>

          {isMobile ? (
            <Drawer
              anchor="right"
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              PaperProps={{
                sx: {
                  width: '90vw',
                  maxWidth: 360,
                  backgroundColor: 'var(--cc-bg)',
                  backgroundImage: 'none',
                  color: 'var(--cc-ink)',
                },
              }}
            >
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography component="h2" sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '1.1rem', color: 'var(--cc-ink)' }}>
                    Filters
                  </Typography>
                  <IconButton
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close filters"
                    sx={{ color: 'var(--cc-muted)', '&:hover': { color: 'var(--cc-ink)' } }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
                <ConventionFilterPanel
                  onFilterChange={handleFilterChange}
                  initialFilters={filters}
                />
                <Button
                  fullWidth
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    mt: 1,
                    fontFamily: DISPLAY,
                    fontWeight: 800,
                    textTransform: 'none',
                    backgroundColor: 'var(--cc-gold)',
                    color: 'var(--cc-gold-ink)',
                    borderRadius: '8px',
                    minHeight: 44,
                    '&:hover': { backgroundColor: 'var(--cc-gold)', filter: 'brightness(1.06)' },
                    '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
                  }}
                >
                  Show results
                </Button>
              </Box>
            </Drawer>
          ) : (
            <Box sx={{ mb: 2 }}>
              <ConventionFilterPanel
                onFilterChange={handleFilterChange}
                initialFilters={filters}
              />
            </Box>
          )}

          {isInitialLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }} aria-label="Loading conventions" role="status">
              {[0, 1, 2, 3].map((i) => (
                <Box
                  key={i}
                  sx={{
                    height: 88,
                    borderRadius: '8px',
                    backgroundColor: 'var(--cc-panel)',
                    border: '1px solid var(--cc-hairline)',
                    animation: 'home-bloom 1.2s ease-in-out infinite alternate',
                    opacity: 0.55,
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  }}
                />
              ))}
            </Box>
          ) : conventions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
              <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '1.1rem', color: 'var(--cc-ink)', mb: 0.75 }}>
                No conventions match
              </Typography>
              <Typography sx={{ fontFamily: BODY, fontSize: '0.92rem', color: 'var(--cc-muted)', maxWidth: '42ch', mx: 'auto' }}>
                Try clearing a filter, widening the dates, or switching between Upcoming and Past.
              </Typography>
            </Box>
          ) : (
            <ConventionGrid conventions={conventions} showingPast={showingPast} distanceUnit={distanceUnit} />
          )}
        </Box>
      </Container>
    </Box>
  );
}
