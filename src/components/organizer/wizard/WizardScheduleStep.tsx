'use client';

import React, { useState } from 'react';
import { Box, Button, Alert, CircularProgress, Chip, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AiScheduleDialog from '../convention-editor/AiScheduleDialog';
import FestivalHelperDialog from '../convention-editor/FestivalHelperDialog';
import type { WizardStepContext } from './ConventionWizard';

// Wizard step: build the schedule from the discovered schedule page. Branches on
// convention type — festivals get the Shows helper (productions + performances),
// everything else gets the schedule helper. Both dialogs save to the DB on apply.
export default function WizardScheduleStep({ ctx }: { ctx: WizardStepContext }) {
    const { convention, refresh, discovered } = ctx;
    const isFestival = convention.type === 'FESTIVAL';
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const seededUrl = discovered?.schedule || convention.websiteUrl || '';

    const onScheduleApplied = (s: { days: number; events: number; talent: number }) => {
        setResult(`Added ${s.events} event${s.events === 1 ? '' : 's'} across ${s.days} day${s.days === 1 ? '' : 's'}.`);
        refresh().catch(() => { /* non-fatal */ });
    };
    const onFestivalApplied = (s: { shows: number; performances: number; venues: number; talent: number }) => {
        setResult(`Added ${s.shows} show${s.shows === 1 ? '' : 's'} (${s.performances} performance${s.performances === 1 ? '' : 's'}).`);
        refresh().catch(() => { /* non-fatal */ });
    };

    return (
        <Box>
            {discovered?.schedule && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    We found a likely schedule page and pre-filled it — just click below.
                </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button
                    variant="contained"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={() => { setResult(null); setOpen(true); }}
                >
                    {isFestival ? 'Import shows' : 'Import schedule'}
                </Button>
                {result && <Chip size="small" color="success" label={result} />}
            </Box>

            {isFestival
                ? open && (
                    <FestivalHelperDialog
                        open={open}
                        onClose={() => setOpen(false)}
                        conventionId={convention.id}
                        hasExistingShows={false}
                        initialUrl={seededUrl}
                        onApplied={onFestivalApplied}
                    />
                )
                : open && (
                    <AiScheduleDialog
                        open={open}
                        onClose={() => setOpen(false)}
                        conventionId={convention.id}
                        hasExistingEvents={false}
                        initialUrl={seededUrl}
                        onApplied={onScheduleApplied}
                    />
                )}
        </Box>
    );
}
