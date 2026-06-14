'use client';

import { Suspense, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert as MuiAlert,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ConventionList from '@/app/organizer/conventions/ConventionList';

enum Role {
  USER = 'USER',
  ORGANIZER = 'ORGANIZER',
  TALENT = 'TALENT',
  ADMIN = 'ADMIN',
}

enum ConventionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PAST = 'PAST',
  CANCELLED = 'CANCELLED',
}

interface Convention {
  id: string;
  name: string;
  slug: string;
  startDate: Date | null;
  endDate: Date | null;
  city: string;
  country: string;
  venueName: string | null;
  websiteUrl: string | null;
  status: ConventionStatus;
  galleryImageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  stateAbbreviation: string | null;
  stateName: string | null;
  seriesId: string;
  deletedAt: Date | null;
  coverImageUrl: string | null;
  descriptionMain: string | null;
  descriptionShort: string | null;
  isOneDayEvent: boolean;
  isTBD: boolean;
  profileImageUrl: string | null;
}

const fetchAllConventionsAPI = async (): Promise<Convention[]> => {
  const response = await fetch('/api/organizer/conventions/all-conventions');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch conventions: ${response.statusText}`);
  }
  const data = await response.json();
  const conventionsRaw: any[] = data.conventions || [];

  return conventionsRaw.map((conv): Convention => ({
    ...conv,
    startDate: conv.startDate ? new Date(conv.startDate) : null,
    endDate: conv.endDate ? new Date(conv.endDate) : null,
    deletedAt: conv.deletedAt ? new Date(conv.deletedAt) : null,
    createdAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
    updatedAt: conv.updatedAt ? new Date(conv.updatedAt) : new Date(),
    status: conv.status || ConventionStatus.DRAFT,
    galleryImageUrls: conv.galleryImageUrls || [],
    isOneDayEvent: typeof conv.isOneDayEvent === 'boolean' ? conv.isOneDayEvent : false,
    isTBD: typeof conv.isTBD === 'boolean' ? conv.isTBD : false,
  }));
};

export default function OrganizerConventionsTab() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<'active' | 'deleted'>('active');

  const userRoles = (session?.user as { roles?: Role[] })?.roles || [];
  const isAdmin = userRoles.includes(Role.ADMIN);

  const {
    data: allConventions = [],
    isLoading: isLoadingConventions,
    error: fetchConventionsError,
    refetch: refetchConventions,
  } = useQuery<Convention[], Error>({
    queryKey: ['conventions', 'all'],
    queryFn: fetchAllConventionsAPI,
    enabled: sessionStatus === 'authenticated',
  });

  const displayedConventions = useMemo(() => {
    if (viewMode === 'active') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return allConventions
        .filter(c => c.deletedAt === null && (!c.endDate || new Date(c.endDate) >= today))
        .sort((a, b) => {
          const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
          return aDate - bDate;
        });
    }
    return allConventions.filter(c => c.deletedAt !== null);
  }, [allConventions, viewMode]);

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'active' | 'deleted' | null,
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 0 }}>
          My Conventions
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/organizer/conventions/new')}
          >
            Create Convention
          </Button>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="convention view toggle"
            size="small"
          >
            <ToggleButton value="active" aria-label="active conventions">
              Active
            </ToggleButton>
            <ToggleButton value="deleted" aria-label="deleted conventions">
              Deleted
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {fetchConventionsError && (
        <MuiAlert severity="error" sx={{ mb: 2 }}>
          {fetchConventionsError.message}
        </MuiAlert>
      )}

      {sessionStatus === 'authenticated' && isLoadingConventions && !fetchConventionsError ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Suspense fallback={<Typography>Loading conventions list...</Typography>}>
          <ConventionList
            conventions={displayedConventions}
            isAdmin={isAdmin}
            viewMode={viewMode}
            onActionComplete={refetchConventions}
          />
        </Suspense>
      )}
    </Box>
  );
}
