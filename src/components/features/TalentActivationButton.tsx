"use client";

import React, { useState, useTransition } from 'react';
import { Button, Typography, Switch } from '@mui/material';
import { Role } from '@prisma/client';
import { activateTalentRole, deactivateTalentRole } from '@/lib/actions';

interface TalentActivationButtonProps {
  initialRoles: Role[];
}

export default function TalentActivationButton({ initialRoles }: TalentActivationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isTalent = roles.includes(Role.TALENT);

  const handleToggleTalent = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const shouldBeTalent = event.target.checked;
    setError(null);
    setMessage(null);

    startTransition(async () => {
      let result;
      if (shouldBeTalent) {
        if (!isTalent) { // Only activate if not already talent
          result = await activateTalentRole();
        } else {
          return; // Already talent, no change needed by activating again
        }
      } else {
        if (isTalent) { // Only deactivate if currently talent
          result = await deactivateTalentRole();
        } else {
          return; // Not talent, no change needed by deactivating again
        }
      }

      if (result && result.success && result.roles) {
        setMessage(result.message || (shouldBeTalent ? "Talent role activated!" : "Talent role deactivated!"));
        setRoles(result.roles);
      } else if (result) {
        setError(result.error || (shouldBeTalent ? "Failed to activate Talent role." : "Failed to deactivate Talent role."));
        if (result.roles) { 
          setRoles(result.roles); // Sync roles even on error if returned
        }
      }
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Switch
          checked={isTalent}
          onChange={handleToggleTalent}
          disabled={isPending} // Only disable if a transition is pending
          inputProps={{ 'aria-label': isTalent ? 'Deactivate Talent Role' : 'Activate Talent Role' }}
        />
        <Typography sx={{ ml: 1 }}>
          {isTalent ? "Talent Role Active" : "Activate Talent Profile"}
        </Typography>
      </div>
      {isPending && <Typography variant="caption" sx={{ ml: 1, display: 'block' }}>Processing...</Typography>}
      {message && <Typography color="primary" sx={{ mt: 1 }}>{message}</Typography>}
      {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
    </div>
  );
} 