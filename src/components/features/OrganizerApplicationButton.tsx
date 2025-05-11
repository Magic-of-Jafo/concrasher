"use client";

import React, { useState, useTransition } from 'react';
import { Button, Typography } from '@mui/material'; // Assuming Material UI is used, Typography added here
import { Role, ApplicationStatus } from '@prisma/client'; // Removed RequestedRole as it's not used in this component
import { applyForOrganizerRole } from '@/lib/actions'; // Assuming aliased path

interface OrganizerApplicationButtonProps {
  currentRoles: Role[];
  existingApplicationStatus?: ApplicationStatus | null; // Status of an ORGANIZER application
}

export default function OrganizerApplicationButton({
  currentRoles,
  existingApplicationStatus,
}: OrganizerApplicationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayedApplicationStatus, setDisplayedApplicationStatus] = useState(existingApplicationStatus);

  const isOrganizer = currentRoles.includes(Role.ORGANIZER);

  const handleApply = async () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await applyForOrganizerRole();
      if (result.success) {
        setMessage(result.message || "Application submitted successfully!");
        if (result.applicationStatus) {
          setDisplayedApplicationStatus(result.applicationStatus);
        }
      } else {
        setError(result.error || "Failed to submit application.");
        if (result.applicationStatus) {
          setDisplayedApplicationStatus(result.applicationStatus);
        }
      }
    });
  };

  if (isOrganizer) {
    return <Typography variant="body1">Organizer role is active.</Typography>;
  }

  if (displayedApplicationStatus === ApplicationStatus.PENDING) {
    return (
      <Button variant="contained" disabled>
        Organizer Application Pending
      </Button>
    );
  }

  if (displayedApplicationStatus === ApplicationStatus.APPROVED) {
    return (
      <Button variant="contained" disabled>
        Organizer Application Approved
      </Button>
    );
  }
  
  return (
    <div>
      <Button
        variant="contained"
        onClick={handleApply}
        disabled={isPending}
      >
        {isPending ? "Submitting..." : "Apply for Organizer Role"}
      </Button>
      {message && <Typography color="primary" sx={{ mt: 1 }}>{message}</Typography>}
      {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
    </div>
  );
} 