'use client';

import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConventionStatus } from '@prisma/client';

interface ConventionViewToggleProps {
  currentStatus: ConventionStatus | null;
}

export function ConventionViewToggle({ currentStatus }: ConventionViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newStatus: ConventionStatus | null,
  ) => {
    if (newStatus === null || !searchParams) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('status', newStatus);
    params.set('page', '1'); // Reset to first page when changing view
    router.push(`/conventions?${params.toString()}`);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 2,
      mb: 3 
    }}>
      <Typography variant="subtitle1" color="text.secondary">
        View:
      </Typography>
      <ToggleButtonGroup
        value={currentStatus || ''}
        exclusive
        onChange={handleChange}
        aria-label="convention view"
        size="small"
      >
        <ToggleButton value={ConventionStatus.ACTIVE} aria-label="active conventions">
          Active
        </ToggleButton>
        <ToggleButton value={ConventionStatus.PAST} aria-label="past conventions">
          Past
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
} 