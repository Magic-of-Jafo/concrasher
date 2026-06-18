"use client";

import React, { useState, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    CircularProgress, Alert, ToggleButtonGroup, ToggleButton, RadioGroup, FormControlLabel,
    Radio, Divider, Chip,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LinkIcon from '@mui/icons-material/Link';
import LanguageIcon from '@mui/icons-material/Language';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ImageIcon from '@mui/icons-material/Image';
import { getEventTypeColor } from '@/lib/eventTypes';
import { alpha, darken } from '@mui/material/styles';

type SourceType = 'url' | 'website' | 'pdf' | 'image';

interface PreviewEvent {
    dayOffset: number;
    title: string;
    eventType: string;
    description: string | null;
    startTimeMinutes: number;
    durationMinutes: number;
    location: string | null;
    performers: { name: string; role: string | null }[];
}
interface PreviewData {
    source: string;
    days: { dayOffset: number; label?: string | null }[];
    events: PreviewEvent[];
}

const fmtMins = (m: number): string => {
    const h = Math.floor(m / 60) % 24;
    const mm = (m % 60).toString().padStart(2, '0');
    const period = h >= 12 ? 'PM' : 'AM';
    const dh = h % 12 || 12;
    return `${dh}:${mm} ${period}`;
};

// Progress narration, mirroring the server pipeline (fetch → read → structure).
const GEN_STAGES = [
    'Gathering the schedule source…',
    'Reading the schedule…',
    'Organizing events & performers…',
    'Almost there…',
];

export default function AiScheduleDialog({
    open, onClose, conventionId, hasExistingEvents, onApplied,
}: {
    open: boolean;
    onClose: () => void;
    conventionId: string;
    hasExistingEvents: boolean;
    onApplied: (summary: { days: number; events: number; talent: number }) => void;
}) {
    const [sourceType, setSourceType] = useState<SourceType>('url');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [replace, setReplace] = useState(true);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [stageIdx, setStageIdx] = useState(0);
    const abortRef = useRef<AbortController | null>(null);
    const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopStages = () => {
        if (stageTimerRef.current) { clearInterval(stageTimerRef.current); stageTimerRef.current = null; }
    };

    const reset = () => { setPreview(null); setError(null); setFile(null); };
    const close = () => {
        abortRef.current?.abort();   // cancel any in-flight request
        abortRef.current = null;
        stopStages();
        setLoading(false);
        setApplying(false);
        reset();
        setUrl('');
        onClose();
    };

    const generate = async () => {
        setError(null);
        setLoading(true);
        setStageIdx(0);
        stopStages();
        stageTimerRef.current = setInterval(() => setStageIdx(i => Math.min(i + 1, GEN_STAGES.length - 1)), 2200);
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            let res: Response;
            if (sourceType === 'pdf') {
                if (!file) { setError('Choose a PDF file first.'); setLoading(false); return; }
                const fd = new FormData();
                fd.append('pdf', file);
                fd.append('mode', 'preview');
                fd.append('sourceType', 'pdf');
                fd.append('replace', String(replace));
                res = await fetch(`/api/conventions/${conventionId}/scrape-schedule`, { method: 'POST', body: fd, signal: controller.signal });
            } else if (sourceType === 'image' && file) {
                const fd = new FormData();
                fd.append('image', file);
                fd.append('mode', 'preview');
                fd.append('sourceType', 'image');
                fd.append('replace', String(replace));
                res = await fetch(`/api/conventions/${conventionId}/scrape-schedule`, { method: 'POST', body: fd, signal: controller.signal });
            } else {
                res = await fetch(`/api/conventions/${conventionId}/scrape-schedule`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: 'preview', replace, source: { type: sourceType, url: url.trim() || undefined } }),
                    signal: controller.signal,
                });
            }
            const data = await res.json();
            if (!res.ok) setError(data.error || 'Could not read that source.');
            else if (!data.events?.length) setError('No events were found in that source. Try a different page or a more specific schedule URL.');
            else setPreview(data);
        } catch (e: any) {
            if (e?.name !== 'AbortError') setError(e?.message || 'Request failed.');
        } finally {
            abortRef.current = null;
            stopStages();
            setLoading(false);
        }
    };

    const apply = async () => {
        if (!preview) return;
        setApplying(true);
        setError(null);
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const res = await fetch(`/api/conventions/${conventionId}/scrape-schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'apply', replace, schedule: { days: preview.days, events: preview.events } }),
                signal: controller.signal,
            });
            const data = await res.json();
            if (!res.ok) setError(data.error || 'Failed to save.');
            else { onApplied(data.summary); close(); }
        } catch (e: any) {
            if (e?.name !== 'AbortError') setError(e?.message || 'Request failed.');
        } finally {
            abortRef.current = null;
            setApplying(false);
        }
    };

    const byDay = new Map<number, PreviewEvent[]>();
    if (preview) {
        for (const e of preview.events) { if (!byDay.has(e.dayOffset)) byDay.set(e.dayOffset, []); byDay.get(e.dayOffset)!.push(e); }
    }
    const talentCount = preview ? new Set(preview.events.flatMap(e => e.performers.map(p => p.name.toLowerCase()))).size : 0;

    return (
        <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon color="primary" /> Schedule Helper
            </DialogTitle>
            <DialogContent dividers>
                {!preview ? (
                    <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Point the helper at your schedule — paste a link, scan the website, or upload a PDF — and it'll pull out the events, times, and performers for you. You'll preview everything before anything is saved.
                        </Typography>

                        <ToggleButtonGroup
                            exclusive
                            fullWidth
                            size="small"
                            value={sourceType}
                            onChange={(_, v) => v && setSourceType(v)}
                            sx={{ mb: 2 }}
                        >
                            <ToggleButton value="url"><LinkIcon fontSize="small" sx={{ mr: 0.5 }} /> URL</ToggleButton>
                            <ToggleButton value="website"><LanguageIcon fontSize="small" sx={{ mr: 0.5 }} /> Website</ToggleButton>
                            <ToggleButton value="pdf"><UploadFileIcon fontSize="small" sx={{ mr: 0.5 }} /> PDF</ToggleButton>
                            <ToggleButton value="image"><ImageIcon fontSize="small" sx={{ mr: 0.5 }} /> Image</ToggleButton>
                        </ToggleButtonGroup>

                        {sourceType === 'url' && (
                            <TextField
                                fullWidth size="small" label="Schedule page or PDF URL"
                                placeholder="https://…/schedule"
                                value={url} onChange={e => setUrl(e.target.value)}
                                helperText="A page or a PDF link. Leave blank to use the convention's website."
                            />
                        )}
                        {sourceType === 'website' && (
                            <TextField
                                fullWidth size="small" label="Website URL (optional override)"
                                placeholder="Leave blank to use the convention's website"
                                value={url} onChange={e => setUrl(e.target.value)}
                                helperText="We'll find the most schedule-like page on the site."
                            />
                        )}
                        {sourceType === 'pdf' && (
                            <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} fullWidth sx={{ justifyContent: 'flex-start' }}>
                                {file ? file.name : 'Choose a PDF…'}
                                <input type="file" accept="application/pdf,.pdf" hidden onChange={e => setFile(e.target.files?.[0] || null)} />
                            </Button>
                        )}
                        {sourceType === 'image' && (
                            <>
                                <TextField
                                    fullWidth size="small" label="Image URL"
                                    placeholder="https://…/schedule.jpg"
                                    value={url} onChange={e => setUrl(e.target.value)}
                                    helperText="Paste a link to the schedule image, or upload one below. Works for screenshots and non-English schedules."
                                    sx={{ mb: 1 }}
                                />
                                <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} fullWidth sx={{ justifyContent: 'flex-start' }}>
                                    {file ? file.name : 'Or upload an image…'}
                                    <input type="file" accept="image/*" hidden onChange={e => setFile(e.target.files?.[0] || null)} />
                                </Button>
                            </>
                        )}

                        {error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}
                        {loading && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
                                <CircularProgress size={18} />
                                <Typography variant="body2" color="text.secondary" sx={{ transition: 'opacity .2s' }}>
                                    {GEN_STAGES[stageIdx]}
                                </Typography>
                            </Box>
                        )}
                    </>
                ) : (
                    <>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                            <Typography variant="subtitle2">
                                Found <strong>{preview.events.length}</strong> events · {byDay.size} days · {talentCount} performers
                            </Typography>
                            <Button size="small" onClick={reset}>Start over</Button>
                        </Box>
                        <Typography variant="caption" color="text.secondary">Source: {preview.source}</Typography>

                        <Box sx={{ mt: 1.5, maxHeight: 340, overflowY: 'auto', pr: 0.5 }}>
                            {Array.from(byDay.keys()).sort((a, b) => a - b).map(off => (
                                <Box key={off} sx={{ mb: 1.5 }}>
                                    <Typography variant="overline" color="text.secondary">Day {off + 1}</Typography>
                                    {byDay.get(off)!.sort((a, b) => a.startTimeMinutes - b.startTimeMinutes).map((e, i) => {
                                        const color = getEventTypeColor(e.eventType);
                                        return (
                                            <Box key={i} sx={{ display: 'flex', gap: 1.5, py: 0.6, borderLeft: `3px solid ${color}`, pl: 1, mb: 0.5, bgcolor: alpha(color, 0.04) }}>
                                                <Typography variant="caption" sx={{ minWidth: 64, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                                    {fmtMins(e.startTimeMinutes)}
                                                </Typography>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {e.title}
                                                        <Box component="span" sx={{ ml: 0.75, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: darken(color, 0.45), bgcolor: alpha(color, 0.16), px: 0.6, py: '1px', borderRadius: 0.75 }}>
                                                            {e.eventType}
                                                        </Box>
                                                    </Typography>
                                                    {e.performers.length > 0 && (
                                                        <Typography variant="caption" color="text.secondary" display="block">
                                                            {e.performers.map(p => p.name).join(', ')}
                                                        </Typography>
                                                    )}
                                                    {e.description && (
                                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic' }}>
                                                            {e.description}
                                                        </Typography>
                                                    )}
                                                    {e.location && (
                                                        <Typography variant="caption" color="text.secondary" display="block">
                                                            📍 {e.location}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            ))}
                        </Box>

                        <Divider sx={{ my: 1.5 }} />
                        <RadioGroup row value={replace ? 'replace' : 'append'} onChange={e => setReplace(e.target.value === 'replace')}>
                            <FormControlLabel value="replace" control={<Radio size="small" />} label="Replace schedule" />
                            <FormControlLabel value="append" control={<Radio size="small" />} label="Add to existing" />
                        </RadioGroup>
                        {replace && hasExistingEvents && (
                            <Alert severity="warning" sx={{ mt: 0.5 }}>This will delete the current schedule and replace it with the events above.</Alert>
                        )}
                        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={close} color={loading || applying ? 'error' : 'inherit'}>Cancel</Button>
                {!preview ? (
                    <Button onClick={generate} variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}>
                        {loading ? 'Reading…' : 'Generate preview'}
                    </Button>
                ) : (
                    <Button onClick={apply} variant="contained" disabled={applying} startIcon={applying ? <CircularProgress size={16} /> : undefined}>
                        {applying ? 'Saving…' : (replace ? 'Replace schedule' : 'Add to schedule')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
