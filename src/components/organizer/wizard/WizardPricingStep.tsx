'use client';

import React, { useState } from 'react';
import { Box, Button, Alert, CircularProgress, Chip, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PricingHelperDialog, { type PriceTableResult } from '../convention-editor/PricingHelperDialog';
import type { WizardStepContext } from './ConventionWizard';

// Wizard step: import pricing from the discovered registration/tickets page (or a
// pasted URL) and save the tiers straight to the convention. Mirrors the flatten
// + PUT that PricingTab does on accept.

export default function WizardPricingStep({ ctx }: { ctx: WizardStepContext }) {
    const { convention, refresh, discovered } = ctx;
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const apply = async (tables: PriceTableResult[]) => {
        setSaving(true);
        setError(null);
        try {
            const tiers = tables.flatMap((t) =>
                t.tiers.map((tier, i) => ({
                    label: tier.label,
                    amount: Number(tier.amount),
                    amountSecondary: tier.amountSecondary == null ? null : Number(tier.amountSecondary),
                    tab: t.name || '',
                    order: i,
                })),
            );
            const res = await fetch(`/api/conventions/${convention.id}/pricing/tiers`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceTiers: tiers }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || data.message || 'Failed to save pricing.');
            }
            // Channel labels (two-column tables) → settings.
            const twoCol = tables.find((t) => t.secondaryLabel);
            if (twoCol) {
                await fetch(`/api/organizer/conventions/${convention.id}/settings`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        baseChannelLabel: twoCol.primaryLabel || 'At the Door',
                        secondaryChannelLabel: twoCol.secondaryLabel,
                    }),
                }).catch(() => { /* labels are secondary; tiers already saved */ });
            }
            await refresh();
            setSaved(tiers.length);
        } catch (e: any) {
            setError(e?.message || 'Failed to save pricing.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box>
            {discovered?.pricing && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    We found a likely registration/pricing page and pre-filled it — just click below.
                </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                    onClick={() => { setSaved(null); setOpen(true); }}
                    disabled={saving}
                >
                    Import pricing
                </Button>
                {saved != null && <Chip size="small" color="success" label={`Saved ${saved} categor${saved === 1 ? 'y' : 'ies'}`} />}
            </Box>
            {error && <Alert severity="warning" sx={{ mt: 1.5 }}>{error}</Alert>}

            {open && (
                <PricingHelperDialog
                    open={open}
                    onClose={() => setOpen(false)}
                    conventionId={convention.id}
                    initialUrl={discovered?.pricing || convention.websiteUrl || ''}
                    onApplied={(tables) => apply(tables)}
                />
            )}
        </Box>
    );
}
