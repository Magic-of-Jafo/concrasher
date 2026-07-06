'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Paper, Typography, Stepper, Step, StepLabel, StepContent, Button,
    Alert, CircularProgress, Link as MuiLink, Chip, Divider, TextField, IconButton, Tooltip,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import EditIcon from '@mui/icons-material/Edit';
import Link from 'next/link';
import WizardWebsiteStep from './WizardWebsiteStep';
import WizardVenueStep from './WizardVenueStep';
import WizardPricingStep from './WizardPricingStep';
import WizardImagesStep from './WizardImagesStep';
import WizardScheduleStep from './WizardScheduleStep';

// The Convention Listing Wizard: walks an organizer from a bare DRAFT (series +
// name, created on /organizer/conventions/new) to a published listing, running
// the import helpers with as little typing as possible. Save-as-you-go: every
// step persists immediately, so closing the browser loses nothing and reopening
// this page resumes. See docs/convention-wizard-prd.md.

interface WizardConvention {
    id: string;
    name: string;
    slug: string;
    status: string;
    type?: string;
    isTBD?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    city?: string | null;
    country?: string | null;
    websiteUrl?: string | null;
    coverImageUrl?: string | null;
    profileImageUrl?: string | null;
    descriptionShort?: string | null;
    // Relations the GET returns — used to detect which steps are already filled.
    venues?: unknown[];
    hotels?: unknown[];
    priceTiers?: unknown[];
    productions?: unknown[];
    scheduleItems?: unknown[];
}

export interface WizardStepDef {
    key: string;
    label: string;
    /** One-line explanation shown under the step title. */
    blurb: string;
    /** Renders the step body. W2–W4 fill these in; a null renderer shows the
     *  placeholder pointing at the full editor. */
    render?: (ctx: WizardStepContext) => React.ReactNode;
    /** Whether the underlying data looks filled-in (drives the checklist). */
    isComplete?: (c: WizardConvention) => boolean;
}

export interface DiscoveredLinks {
    schedule: string | null;
    pricing: string | null;
    hotel: string | null;
    talent: string | null;
}

export interface WizardStepContext {
    convention: WizardConvention;
    refresh: () => Promise<void>;
    goNext: () => void;
    /** Section pages found on the convention's website; seeds the later steps. */
    discovered: DiscoveredLinks | null;
    setDiscovered: (links: DiscoveredLinks) => void;
}

const STEPS: WizardStepDef[] = [
    {
        key: 'website',
        label: 'Your website',
        blurb: "Paste your convention's website and the wizard imports your basic details, then finds your schedule, pricing, and hotel pages for the later steps.",
        isComplete: (c) => !!c.websiteUrl,
        render: (ctx) => <WizardWebsiteStep ctx={ctx} />,
    },
    {
        key: 'images',
        label: 'Images',
        blurb: 'Cover banner and profile image. Paste from your clipboard, drop a file, or use an image URL.',
        isComplete: (c) => !!(c.coverImageUrl || c.profileImageUrl),
        render: (ctx) => <WizardImagesStep ctx={ctx} />,
    },
    {
        key: 'venue',
        label: 'Venue & hotel',
        blurb: 'Where it happens and where attendees stay, imported from your venue or hotel page.',
        render: (ctx) => <WizardVenueStep ctx={ctx} />,
        isComplete: (c) => !!(c.venues?.length || c.hotels?.length),
    },
    {
        key: 'pricing',
        label: 'Pricing',
        blurb: 'Your registration prices, imported from your tickets or registration page.',
        render: (ctx) => <WizardPricingStep ctx={ctx} />,
        isComplete: (c) => !!c.priceTiers?.length,
    },
    {
        key: 'schedule',
        label: 'Schedule',
        blurb: 'Your programme of events (or shows, for festivals), imported from your schedule page.',
        render: (ctx) => <WizardScheduleStep ctx={ctx} />,
        isComplete: (c) => !!(c.scheduleItems?.length || c.productions?.length),
    },
];

export default function ConventionWizard({ conventionId }: { conventionId: string }) {
    const router = useRouter();
    const [convention, setConvention] = useState<WizardConvention | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeStep, setActiveStep] = useState(0);
    const [publishing, setPublishing] = useState(false);
    const [discovered, setDiscoveredState] = useState<DiscoveredLinks | null>(null);

    // Discovered section links survive a reload (sessionStorage, per convention).
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(`wizard-links-${conventionId}`);
            if (raw) setDiscoveredState(JSON.parse(raw));
        } catch { /* ignore */ }
    }, [conventionId]);
    const setDiscovered = useCallback((links: DiscoveredLinks) => {
        setDiscoveredState(links);
        try { sessionStorage.setItem(`wizard-links-${conventionId}`, JSON.stringify(links)); } catch { /* ignore */ }
    }, [conventionId]);

    const refresh = useCallback(async () => {
        const res = await fetch(`/api/organizer/conventions/${conventionId}`);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Could not load this convention.');
        }
        setConvention(await res.json());
    }, [conventionId]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/organizer/conventions/${conventionId}`);
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'Could not load this convention.');
                }
                const c: WizardConvention = await res.json();
                setConvention(c);
                // Resume on the first unfinished step (so re-entering picks up where
                // they left off), capped at Review.
                const firstIncomplete = STEPS.findIndex((s) => !(s.isComplete && s.isComplete(c)));
                setActiveStep(firstIncomplete === -1 ? STEPS.length : firstIncomplete);
            } catch (e: any) {
                setError(e?.message || 'Could not load this convention.');
            } finally {
                setLoading(false);
            }
        })();
    // Runs once on mount; refresh() handles subsequent reloads without moving the step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conventionId]);

    const goNext = useCallback(() => setActiveStep((s) => Math.min(s + 1, STEPS.length)), []);
    const goBack = useCallback(() => setActiveStep((s) => Math.max(s - 1, 0)), []);

    const publish = async () => {
        setPublishing(true);
        setError(null);
        try {
            const res = await fetch(`/api/conventions/${conventionId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'PUBLISHED' }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to publish.');
            }
            router.push(`/conventions/${convention?.slug || conventionId}`);
        } catch (e: any) {
            setError(e?.message || 'Failed to publish.');
            setPublishing(false);
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
    }
    if (!convention) {
        return <Alert severity="error">{error || 'Could not load this convention.'}</Alert>;
    }

    const isPublished = convention.status === 'PUBLISHED';

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesomeIcon color="primary" />
                    <EditableName name={convention.name} conventionId={conventionId} onSaved={refresh} />
                </Box>
                <Chip
                    size="small"
                    color={isPublished ? 'success' : 'default'}
                    label={isPublished ? 'Published' : 'Draft (not public yet)'}
                />
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Work through the steps below. Everything saves as you go, and you can leave
                and come back anytime. Skip anything; each section can be filled in later,
                here or in the{' '}
                <MuiLink component={Link} href={`/organizer/conventions/${conventionId}/edit`}>
                    full editor
                </MuiLink>.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Stepper activeStep={activeStep} orientation="vertical" nonLinear>
                {STEPS.map((step, idx) => {
                    const complete = step.isComplete ? step.isComplete(convention) : undefined;
                    return (
                        <Step key={step.key} completed={complete === true && idx < activeStep} expanded={false}>
                            <StepLabel
                                optional={complete === true ? <Typography variant="caption" color="success.main">Filled in</Typography> : undefined}
                                onClick={() => setActiveStep(idx)}
                                sx={{ cursor: 'pointer' }}
                            >
                                {step.label}
                            </StepLabel>
                            <StepContent>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {step.blurb}
                                </Typography>

                                {step.render ? (
                                    step.render({ convention, refresh, goNext, discovered, setDiscovered })
                                ) : (
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        This step&apos;s import is coming to the wizard shortly. For now you can fill this
                                        section in the{' '}
                                        <MuiLink component={Link} href={`/organizer/conventions/${conventionId}/edit`}>
                                            full editor
                                        </MuiLink>{' '}
                                        or skip ahead and come back later.
                                    </Alert>
                                )}

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button variant="contained" onClick={goNext}>
                                        {idx === STEPS.length - 1 ? 'Review' : 'Next'}
                                    </Button>
                                    {idx > 0 && <Button onClick={goBack}>Back</Button>}
                                    <Button color="inherit" onClick={goNext}>Skip</Button>
                                </Box>
                            </StepContent>
                        </Step>
                    );
                })}

                {/* Review & publish */}
                <Step completed={isPublished} expanded={false}>
                    <StepLabel onClick={() => setActiveStep(STEPS.length)} sx={{ cursor: 'pointer' }}>
                        Review &amp; publish
                    </StepLabel>
                    <StepContent>
                        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Listing checklist</Typography>
                            <ChecklistLine done={!!convention.name} label={`Name: ${convention.name}`} />
                            <ChecklistLine
                                done={!!convention.startDate}
                                label={convention.startDate
                                    ? `Dates: ${fmtDate(convention.startDate)}${convention.endDate ? ` – ${fmtDate(convention.endDate)}` : ''}`
                                    : 'Dates: not set, so the listing will show “Date TBD”'}
                                warnInsteadOfMiss
                            />
                            <ChecklistLine done={!!(convention.city || convention.country)} label={`Location: ${[convention.city, convention.country].filter(Boolean).join(', ') || 'not set'}`} />
                            <ChecklistLine done={!!convention.websiteUrl} label={`Website: ${convention.websiteUrl || 'not set'}`} />
                            <ChecklistLine done={!!convention.coverImageUrl} label="Cover image" />
                            <ChecklistLine done={!!convention.profileImageUrl} label="Profile image" />
                            <ChecklistLine done={!!convention.descriptionShort} label="Description" />
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="caption" color="text.secondary">
                                Anything unchecked can be added later, from this wizard or the full editor.
                            </Typography>
                        </Paper>

                        {isPublished ? (
                            <Alert severity="success" sx={{ mb: 2 }}>
                                This convention is live.{' '}
                                <MuiLink component={Link} href={`/conventions/${convention.slug}`}>View the public page</MuiLink>.
                            </Alert>
                        ) : (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Publishing makes this listing visible on the site immediately. You can keep
                                improving it after it&apos;s live.
                            </Alert>
                        )}

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {!isPublished && (
                                <Button variant="contained" color="success" onClick={publish} disabled={publishing}
                                    startIcon={publishing ? <CircularProgress size={16} /> : undefined}>
                                    {publishing ? 'Publishing…' : 'Publish now'}
                                </Button>
                            )}
                            <Button onClick={goBack}>Back</Button>
                            <Button color="inherit" onClick={() => router.push('/profile?tab=organizer')}>
                                Save &amp; finish later
                            </Button>
                        </Box>
                    </StepContent>
                </Step>
            </Stepper>
        </Box>
    );
}

// Inline-editable convention name in the wizard header. Since the wizard skips
// the name step (the website import fills it), this is the organizer's rename
// path: click the pencil, edit, Enter/blur to save (Esc cancels).
function EditableName({ name, conventionId, onSaved }: { name: string; conventionId: string; onSaved: () => Promise<void> }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(name);
    const [saving, setSaving] = useState(false);
    useEffect(() => { setValue(name); }, [name]);

    const save = async () => {
        setEditing(false);
        const v = value.trim();
        if (!v || v === name) { setValue(name); return; }
        setSaving(true);
        try {
            const res = await fetch(`/api/organizer/conventions/${conventionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: v }),
            });
            if (res.ok) await onSaved();
            else setValue(name);
        } catch { setValue(name); }
        finally { setSaving(false); }
    };

    if (editing) {
        return (
            <TextField
                value={value}
                autoFocus
                size="small"
                variant="standard"
                onChange={(e) => setValue(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); save(); }
                    if (e.key === 'Escape') { setValue(name); setEditing(false); }
                }}
                InputProps={{ sx: { typography: 'h4' } }}
                sx={{ minWidth: 240 }}
            />
        );
    }
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="h4" component="h1">{name}</Typography>
            <Tooltip title="Rename">
                <span>
                    <IconButton size="small" onClick={() => setEditing(true)} disabled={saving} aria-label="Rename convention">
                        {saving ? <CircularProgress size={16} /> : <EditIcon fontSize="small" />}
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );
}

function ChecklistLine({ done, label, warnInsteadOfMiss = false }: { done: boolean; label: string; warnInsteadOfMiss?: boolean }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
            {done
                ? <CheckCircleIcon fontSize="small" color="success" />
                : <RadioButtonUncheckedIcon fontSize="small" color={warnInsteadOfMiss ? 'warning' : 'disabled'} />}
            <Typography variant="body2" color={done ? 'text.primary' : 'text.secondary'}>{label}</Typography>
        </Box>
    );
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
}
