'use client';

import React, { useState } from 'react';
import {
    Box, Typography, TextField, Button, Alert, CircularProgress, Paper, Chip, Tooltip, Divider,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { WizardStepContext } from './ConventionWizard';

// Wizard step 1: paste the convention's main website URL. One click then does
// two things in parallel: extracts the basic listing details (dates, location,
// descriptions) for review, and discovers the site's section pages (schedule,
// pricing, hotel, talent) to pre-seed the later steps.

interface BasicInfo {
    name: string | null;
    startDate: string | null;
    endDate: string | null;
    isOneDayEvent: boolean;
    city: string | null;
    stateName: string | null;
    country: string | null;
    websiteUrl: string | null;
    registrationUrl: string | null;
    descriptionShort: string | null;
    descriptionMain: string | null;
}

const RUN_STAGES = [
    'Reading your website…',
    'Pulling out the details…',
    'Finding your schedule, pricing, and hotel pages…',
    'Almost there…',
];

const SECTION_LABELS: Record<string, string> = {
    schedule: 'Schedule page',
    pricing: 'Pricing / registration page',
    hotel: 'Hotel / venue page',
    talent: 'Performers page',
};

export default function WizardWebsiteStep({ ctx }: { ctx: WizardStepContext }) {
    const { convention, refresh, discovered, setDiscovered } = ctx;
    const [url, setUrl] = useState(convention.websiteUrl || '');
    const [running, setRunning] = useState(false);
    const [stageIdx, setStageIdx] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<BasicInfo | null>(null);
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);

    const run = async () => {
        const target = url.trim();
        if (!target) return;
        setRunning(true);
        setError(null);
        setPreview(null);
        setApplied(false);
        setStageIdx(0);
        const stageTimer = setInterval(() => setStageIdx((i) => Math.min(i + 1, RUN_STAGES.length - 1)), 2500);
        try {
            const [infoRes, linksRes] = await Promise.all([
                fetch('/api/organizer/scrape-convention-info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source: { type: 'url', url: target } }),
                }),
                fetch(`/api/conventions/${convention.id}/discover-links`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: target }),
                }),
            ]);

            const linksData = await linksRes.json().catch(() => ({}));
            if (linksRes.ok && linksData.links) setDiscovered(linksData.links);

            const infoData = await infoRes.json().catch(() => ({}));
            if (!infoRes.ok) {
                setError(infoData.error || 'Could not read that website.');
            } else {
                setPreview(infoData.info);
            }
        } catch (e: any) {
            setError(e?.message || 'Request failed.');
        } finally {
            clearInterval(stageTimer);
            setRunning(false);
        }
    };

    const apply = async () => {
        if (!preview) return;
        setApplying(true);
        setError(null);
        try {
            const body: any = { websiteUrl: url.trim() };
            // Adopt the name from the website — that's the whole point of skipping
            // the name step. The organizer can rename inline anytime afterward.
            if (preview.name && preview.name.trim()) body.name = preview.name.trim();
            if (preview.registrationUrl) body.registrationUrl = preview.registrationUrl;
            if (preview.city) body.city = preview.city;
            if (preview.stateName) body.stateName = preview.stateName;
            if (preview.country) body.country = preview.country;
            if (preview.descriptionShort) body.descriptionShort = preview.descriptionShort;
            if (preview.descriptionMain) body.descriptionMain = preview.descriptionMain;
            if (preview.startDate) {
                body.startDate = preview.startDate;
                body.endDate = preview.endDate || preview.startDate;
                body.isTBD = false;
                body.isOneDayEvent = !!preview.isOneDayEvent;
            }
            const res = await fetch(`/api/organizer/conventions/${convention.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to save.');
            }
            await refresh();
            setApplied(true);
        } catch (e: any) {
            setError(e?.message || 'Failed to save.');
        } finally {
            setApplying(false);
        }
    };

    const dates = preview?.startDate
        ? (preview.endDate && preview.endDate !== preview.startDate
            ? `${preview.startDate} to ${preview.endDate}`
            : preview.startDate)
        : null;
    const location = preview ? [preview.city, preview.stateName, preview.country].filter(Boolean).join(', ') : null;

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <TextField
                    size="small"
                    label="Convention website"
                    placeholder="https://www.yourconvention.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && url.trim() && !running) run(); }}
                    disabled={running}
                    sx={{ flexGrow: 1, minWidth: 260 }}
                />
                <Button
                    variant="contained"
                    onClick={run}
                    disabled={!url.trim() || running}
                    startIcon={running ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                >
                    {running ? 'Reading…' : 'Import from my website'}
                </Button>
            </Box>

            {running && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">{RUN_STAGES[stageIdx]}</Typography>
                </Box>
            )}
            {error && <Alert severity="warning" sx={{ mt: 1.5 }}>{error}</Alert>}

            {preview && (
                <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Here&apos;s what we found</Typography>
                    <Field label="Name" value={preview.name?.trim() || 'not found (keeping current name)'} />
                    <Field label="Dates" value={dates || 'not found (the listing will show Date TBD)'} />
                    <Field label="Location" value={location || 'not found'} />
                    <Field label="Registration link" value={preview.registrationUrl || 'not found'} />
                    <Field label="Summary" value={preview.descriptionShort || 'not found'} />
                    {preview.descriptionMain && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">Description</Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxHeight: 140, overflowY: 'auto' }}>
                                {preview.descriptionMain}
                            </Typography>
                        </Box>
                    )}
                    {preview.name && preview.name.trim() && preview.name.trim().toLowerCase() !== convention.name.trim().toLowerCase() && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            We&apos;ll name your listing &ldquo;{preview.name.trim()}&rdquo; (currently {convention.name}).
                            You can rename it anytime from the header above.
                        </Typography>
                    )}

                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {applied ? (
                            <Alert severity="success" sx={{ py: 0, flexGrow: 1 }}>Saved to your listing.</Alert>
                        ) : (
                            <Button variant="contained" onClick={apply} disabled={applying}
                                startIcon={applying ? <CircularProgress size={16} /> : undefined}>
                                {applying ? 'Saving…' : 'Looks right, save it'}
                            </Button>
                        )}
                        <Button size="small" onClick={run} disabled={running}>Re-run</Button>
                    </Box>
                </Paper>
            )}

            {discovered && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Pages found for the next steps</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {(Object.keys(SECTION_LABELS) as Array<keyof typeof SECTION_LABELS>).map((key) => {
                            const found = (discovered as any)[key] as string | null;
                            return found ? (
                                <Tooltip key={key} title={found}>
                                    <Chip size="small" color="success" icon={<CheckCircleIcon />} label={SECTION_LABELS[key]} />
                                </Tooltip>
                            ) : (
                                <Tooltip key={key} title="Not found on your site. You can paste that page's address on its step.">
                                    <Chip size="small" variant="outlined" icon={<HelpOutlineIcon />} label={SECTION_LABELS[key]} />
                                </Tooltip>
                            );
                        })}
                    </Box>
                </Box>
            )}
        </Box>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <Box sx={{ display: 'flex', gap: 1, py: 0.25 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, flexShrink: 0 }}>{label}</Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{value}</Typography>
        </Box>
    );
}
