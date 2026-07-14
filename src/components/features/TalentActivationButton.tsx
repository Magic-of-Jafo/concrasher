"use client";

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { activateTalentProfile, deactivateTalentProfile } from '@/lib/actions';

interface TalentActivationButtonProps {
  initialIsActive: boolean;
  hasTalentProfile: boolean;
}

export default function TalentActivationButton({ initialIsActive, hasTalentProfile }: TalentActivationButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [isActive, setIsActive] = useState(initialIsActive);
  // The Settings pane can remount when the tab list changes (the Talent tab
  // appears/disappears on toggle). Re-sync from the authoritative prop the
  // parent feeds us so the switch reflects the live state after a remount,
  // instead of snapping back to the page-load value.
  useEffect(() => { setIsActive(initialIsActive); }, [initialIsActive]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Turning the profile OFF hides it from fans and organizers — confirm first.
  const [confirmOpen, setConfirmOpen] = useState(false);

  const applyResult = (
    result: { success: boolean; message?: string; error?: string; isActive?: boolean } | undefined,
    shouldBeActive: boolean,
  ) => {
    if (result && result.success && result.isActive !== undefined) {
      setMessage(result.message || (shouldBeActive ? "Talent profile activated!" : "Talent profile deactivated."));
      setIsActive(result.isActive);
      // Dispatch event to notify other components of the change
      window.dispatchEvent(new CustomEvent('talentProfileUpdated', {
        detail: { isActive: result.isActive, hasProfile: true }
      }));
    } else if (result) {
      setError(result.error || (shouldBeActive ? "Failed to activate talent profile." : "Failed to deactivate talent profile."));
      if (result.isActive !== undefined) {
        setIsActive(result.isActive); // Sync state even on error if returned
      }
    }
  };

  const handleToggleTalentProfile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const shouldBeActive = event.target.checked;
    setError(null);
    setMessage(null);

    if (shouldBeActive && !isActive) {
      setIsPending(true);
      const result = await activateTalentProfile();
      applyResult(result, true);
      setIsPending(false);
    } else if (!shouldBeActive && isActive) {
      // Don't deactivate yet — ask first. The switch is controlled by
      // `isActive`, so it stays ON until the user confirms.
      setConfirmOpen(true);
    }
  };

  const handleConfirmDeactivate = async () => {
    setConfirmOpen(false);
    setIsPending(true);
    const result = await deactivateTalentProfile();
    applyResult(result, false);
    setIsPending(false);
  };

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
      {!hasTalentProfile && !isActive && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          First-time activation will create your talent profile
        </Typography>
      )}
      {isPending && <Typography variant="caption" sx={{ ml: 1, display: 'block' }}>Processing...</Typography>}
      {message && <Typography color="primary" sx={{ mt: 1 }}>{message}</Typography>}
      {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        aria-labelledby="deactivate-talent-title"
      >
        <DialogTitle id="deactivate-talent-title">Hide your Talent profile?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Turning this off hides your Talent profile from fans and organizers.
            Anyone who clicks your name will see your regular member profile
            instead. Your Talent details are kept, and you can turn it back on
            anytime.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} autoFocus>
            Keep it visible
          </Button>
          <Button color="error" onClick={handleConfirmDeactivate} disabled={isPending}>
            {isPending ? <CircularProgress size={20} /> : 'Hide Talent profile'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
