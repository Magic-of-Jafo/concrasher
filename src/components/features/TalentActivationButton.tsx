"use client";

import React, { useState } from 'react';
import { Typography, Switch } from '@mui/material';
import { activateTalentProfile, deactivateTalentProfile } from '@/lib/actions';

interface TalentActivationButtonProps {
  initialIsActive: boolean;
  hasTalentProfile: boolean;
}

export default function TalentActivationButton({ initialIsActive, hasTalentProfile }: TalentActivationButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggleTalentProfile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsPending(true);
    setError(null);
    setMessage(null);
    const shouldBeActive = event.target.checked;

    let result;
    if (shouldBeActive && !isActive) {
      result = await activateTalentProfile();
    } else if (!shouldBeActive && isActive) {
      result = await deactivateTalentProfile();
    } else {
      setIsPending(false);
      return;
    }

    if (result && result.success && result.isActive !== undefined) {
      setMessage(result.message || (shouldBeActive ? "Talent profile activated!" : "Talent profile deactivated!"));
      setIsActive(result.isActive);
      // Dispatch event to notify other components of the change
      window.dispatchEvent(new CustomEvent('talentProfileUpdated', {
        detail: { isActive: result.isActive }
      }));
    } else if (result) {
      setError(result.error || (shouldBeActive ? "Failed to activate talent profile." : "Failed to deactivate talent profile."));
      if (result.isActive !== undefined) {
        setIsActive(result.isActive); // Sync state even on error if returned
      }
    }
    setIsPending(false);
  };

  if (!hasTalentProfile) {
    return (
      <div>
        <Typography color="text.secondary">
          Create a talent profile first to activate it.
        </Typography>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Switch
          checked={isActive}
          onChange={handleToggleTalentProfile}
          disabled={isPending}
          inputProps={{ 'aria-label': isActive ? 'Deactivate Talent Profile' : 'Activate Talent Profile' }}
        />
        <Typography sx={{ ml: 1 }}>
          {isActive ? "Talent Profile Active" : "Activate Talent Profile"}
        </Typography>
      </div>
      {isPending && <Typography variant="caption" sx={{ ml: 1, display: 'block' }}>Processing...</Typography>}
      {message && <Typography color="primary" sx={{ mt: 1 }}>{message}</Typography>}
      {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
    </div>
  );
}
