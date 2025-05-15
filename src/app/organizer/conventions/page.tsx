'use client';

import { Suspense, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from '@tanstack/react-query';
import { Convention, Role } from "@prisma/client";
import ConventionList from "./ConventionList";
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert as MuiAlert,
  Button,
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';

// API fetching function for useQuery
const fetchAllConventionsAPI = async () => {
  const response = await fetch("/api/organizer/conventions/all-conventions");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch conventions: ${response.statusText}`);
  }
  const data = await response.json();
  return data.conventions || [];
};

export default function OrganizerConventionsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"active" | "deleted">("active");

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
    if (viewMode === "active") {
      return allConventions.filter(c => c.deletedAt === null);
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
    </Box>
  );
} 