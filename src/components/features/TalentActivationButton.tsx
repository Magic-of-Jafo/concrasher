"use client";

import React, { useState } from 'react';
import { Typography, Switch } from '@mui/material';
import { Role } from '@prisma/client';
import { activateTalentRole, deactivateTalentRole } from '@/lib/actions';

interface TalentActivationButtonProps {
  initialRoles: Role[];
}

export default function TalentActivationButton({ initialRoles }: TalentActivationButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isTalent = roles.includes(Role.TALENT);

  const handleToggleTalent = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsPending(true);
    setError(null);
    setMessage(null);
    const shouldBeTalent = event.target.checked;

    let result;
    if (shouldBeTalent) {
      if (!isTalent) {
        result = await activateTalentRole();
      } else {
        setIsPending(false);
        return;
      }
    } else {
      if (isTalent) {
        result = await deactivateTalentRole();
      } else {
        setIsPending(false);
        return;
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
    setIsPending(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Switch
          checked={isTalent}
          onChange={handleToggleTalent}
          disabled={isPending}
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
