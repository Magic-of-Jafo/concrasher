'use client';

import { Suspense, useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from '@tanstack/react-query';
import ConventionList from "./ConventionList";
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert as MuiAlert,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';

// Define Role enum locally since we know the values
enum Role {
  USER = 'USER',
  ORGANIZER = 'ORGANIZER',
  TALENT = 'TALENT',
  ADMIN = 'ADMIN'
}

// Define ConventionStatus enum locally if not already available from Prisma Client in this context
enum ConventionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PAST = 'PAST',
  CANCELLED = 'CANCELLED'
}

// Define Convention type locally - Attempting a closer match to Prisma Model
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
  seriesId: string; // Prisma: No ? so it's required
  deletedAt: Date | null;
  coverImageUrl: string | null;
  descriptionMain: string | null;
  descriptionShort: string | null;
  isOneDayEvent: boolean; // Prisma: @default(false)
  isTBD: boolean;         // Prisma: @default(false)
  profileImageUrl: string | null;
  // Explicitly excluding relational fields like: 
  // series: ConventionSeries
  // priceTiers: PriceTier[]
  // priceDiscounts: PriceDiscount[]
}

// API fetching function for useQuery
const fetchAllConventionsAPI = async (): Promise<Convention[]> => {
  const response = await fetch("/api/organizer/conventions/all-conventions");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch conventions: ${response.statusText}`);
  }
  const data = await response.json();
  const conventionsRaw: any[] = data.conventions || [];

  // Parse date strings into Date objects and ensure type conformity
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

export default function OrganizerConventionsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<"active" | "deleted">("active");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');

  useEffect(() => {
    if (searchParams) {
      const message = searchParams.get('toastMessage');
      if (message) {
        setSnackbarMessage(decodeURIComponent(message));
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }
    }
  }, [searchParams, router]);

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // Use React Query to fetch conventions
  const {
    data: allConventions = [],
    isLoading: isLoadingConventions,
    error: fetchConventionsError,
    refetch: refetchConventions,
  } = useQuery<Convention[], Error>({
    queryKey: ['conventions', 'all'],
    queryFn: fetchAllConventionsAPI,
    enabled: sessionStatus === "authenticated",
  });

  // Redirects based on session status
  if (sessionStatus === "unauthenticated") {
    router.push("/api/auth/signin");
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Typography>Redirecting to login...</Typography>
      </Box>
    ); 
  }
  
  const userRoles = (session?.user as { roles?: Role[] })?.roles || [];
  const isActualAdmin = userRoles.includes(Role.ADMIN);
  const isOrganizer = userRoles.includes(Role.ORGANIZER);

  if (sessionStatus === "authenticated" && !isActualAdmin && !isOrganizer) {
    router.push("/unauthorized");
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Typography>Unauthorized. Redirecting...</Typography>
      </Box>
    );
  }

  const displayedConventions = useMemo(() => {
    // DEBUG LINE - Log the raw conventions received from the API
    // Check the structure of one convention, especially startDate and endDate
    if (allConventions && allConventions.length > 0) {
      console.log('First convention object from API (in page.tsx):', JSON.stringify(allConventions[0], null, 2));
    }

    if (viewMode === "active") {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Only compare date part
      return allConventions
        .filter(c => c.deletedAt === null && (!c.endDate || new Date(c.endDate) >= today))
        .sort((a, b) => {
          // Sort by startDate ascending (soonest first)
          const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
          return aDate - bDate;
        });
    }
    return allConventions.filter(c => c.deletedAt !== null);
  }, [allConventions, viewMode]);

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: "active" | "deleted" | null,
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  // Combined loading state for session and initial data query
  if (sessionStatus === "loading" || (sessionStatus === "authenticated" && isLoadingConventions && !fetchConventionsError)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ mb: 0 }}>
          Manage Conventions ({viewMode === "deleted" ? "Deleted" : "Active"})
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
      
      {sessionStatus === "authenticated" && !isLoadingConventions && (
        <Suspense fallback={<Typography>Loading conventions list...</Typography>}>
          <ConventionList 
            conventions={displayedConventions} 
            isAdmin={isActualAdmin} 
            viewMode={viewMode} 
            onActionComplete={refetchConventions}
          />
        </Suspense>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
} 