"use client";

import React, { useState, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    CircularProgress, Alert, ToggleButtonGroup, ToggleButton, RadioGroup, FormControlLabel,
    Radio, Divider, Paper, Stack,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LinkIcon from '@mui/icons-material/Link';
import LanguageIcon from '@mui/icons-material/Language';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ImageIcon from '@mui/icons-material/Image';
import EventIcon from '@mui/icons-material/Event';
import { usePasteImage } from '@/hooks/usePasteImage';

type SourceType = 'url' | 'website' | 'pdf' | 'image';

interface PreviewPerformance { date: string; startMin: number; durationMin: number; }
interface PreviewShow {
    title: string;
    performer: string | null;
    venue: string | null;
    ageRating: string | null;
    performances: PreviewPerformance[];
}
interface PreviewData { source: string; shows: PreviewShow[]; }

const fmtMins = (m: number): string => {
    const h = Math.floor(m / 60) % 24;
    const mm = (m % 60).toString().padStart(2, '0');
    const period = h >= 12 ? 'PM' : 'AM';
    const dh = h % 12 || 12;
    return `${dh}:${mm} ${period}`;
};

const fmtDate = (d: string): string => {
    const dt = new Date(d + 'T00:00:00Z');
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const GEN_STAGES = [
    'Gathering the programme…',
    'Reading the programme…',
    'Grouping shows & performances…',
    'Almost there…',
];

export default function FestivalHelperDialog({
    open, onClose, conventionId, hasExistingShows, onApplied, initialUrl,
}: {
    open: boolean;
    onClose: () => void;
    conventionId: string;
    hasExistingShows: boolean;
    onApplied: (summary: { shows: number; performances: number; venues: number; talent: number }) => void;
    /** Pre-fill the URL field (e.g. a page the wizard discovered). */
    initialUrl?: string;
}) {
    const [sourceType, setSourceType] = useState<SourceType>('url');
    const [url, setUrl] = useState(initialUrl || '');
    const [file, setFile] = useState<File | null>(null);
    const [replace, setReplace] = useState(false);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [stageIdx, setStageIdx] = useState(0);
    const abortRef = useRef<AbortController | null>(null);
    const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Accept a clipboard-pasted image while the Image source is active.
    usePasteImage(setFile, { enabled: open && sourceType === 'image' });

    const stopStages = () => {
        if (stageTimerRef.current) { clearInterval(stageTimerRef.current); stageTimerRef.current = null; }
    };

    const reset = () => { setPreview(null); setError(null); setFile(null); };
    const close = () => {
        abortRef.current?.abort();
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
            else if (!data.shows?.length) setError('No shows were found in that source. Try a different page or a more specific programme URL or PDF.');
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
                body: JSON.stringify({ mode: 'apply', replace, schedule: { shows: preview.shows } }),
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

    const perfTotal = preview ? preview.shows.reduce((n, s) => n + s.performances.length, 0) : 0;
    const venueCount = preview ? new Set(preview.shows.map(s => s.venue).filter(Boolean)).size : 0;

    return (
        <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon color="primary" /> Schedule Helper
            </DialogTitle>
            <DialogContent dividers>
                {!preview ? (
                    <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Point the helper at your festival programme — paste a link, scan the website, or upload a PDF — and it&apos;ll pull out the shows, their performance times, and venues. You&apos;ll preview everything before anything is saved.
                        </Typography>

                        <ToggleButtonGroup exclusive fullWidth size="small" value={sourceType} onChange={(_, v) => v && setSourceType(v)} sx={{ mb: 2 }}>
                            <ToggleButton value="url"><LinkIcon fontSize="small" sx={{ mr: 0.5 }} /> URL</ToggleButton>
                            <ToggleButton value="website"><LanguageIcon fontSize="small" sx={{ mr: 0.5 }} /> Website</ToggleButton>
                            <ToggleButton value="pdf"><UploadFileIcon fontSize="small" sx={{ mr: 0.5 }} /> PDF</ToggleButton>
                            <ToggleButton value="image"><ImageIcon fontSize="small" sx={{ mr: 0.5 }} /> Image</ToggleButton>
                        </ToggleButtonGroup>

                        {sourceType === 'url' && (
                            <TextField
                                fullWidth size="small" label="Programme page or PDF URL"
                                placeholder="https://…/daily-schedule"
                                value={url} onChange={e => setUrl(e.target.value)}
                                helperText="A page or a PDF link. Leave blank to use the festival's website."
                            />
                        )}
                        {sourceType === 'website' && (
                            <TextField
                                fullWidth size="small" label="Website URL (optional override)"
                                placeholder="Leave blank to use the festival's website"
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
                                    placeholder="https://…/programme.jpg"
                                    value={url} onChange={e => setUrl(e.target.value)}
                                    helperText="Paste a link to the programme image, or upload one below. Works for screenshots and non-English programmes."
                                    sx={{ mb: 1 }}
                                />
                                <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} fullWidth sx={{ justifyContent: 'flex-start' }}>
                                    {file ? file.name : 'Or upload an image…'}
                                    <input type="file" accept="image/*" hidden onChange={e => setFile(e.target.files?.[0] || null)} />
                                </Button>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    …or paste an image straight from your clipboard (Ctrl/Cmd+V).
                                </Typography>
                            </>
                        )}

                        {error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}
                        {loading && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
                                <CircularProgress size={18} />
                                <Typography variant="body2" color="text.secondary">{GEN_STAGES[stageIdx]}</Typography>
                            </Box>
                        )}
                    </>
                ) : (
                    <>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                            <Typography variant="subtitle2">
                                Found <strong>{preview.shows.length}</strong> shows · {perfTotal} performances · {venueCount} venues
                            </Typography>
                            <Button size="small" onClick={reset}>Start over</Button>
                        </Box>
                        <Typography variant="caption" color="text.secondary">Source: {preview.source}</Typography>

                        <Stack spacing={1} sx={{ mt: 1.5, maxHeight: 340, overflowY: 'auto', pr: 0.5 }}>
                            {preview.shows.map((s, i) => {
                                const dates = s.performances.map(p => p.date).sort();
                                const first = dates[0];
                                const last = dates[dates.length - 1];
                                const range = first === last ? fmtDate(first) : `${fmtDate(first)} – ${fmtDate(last)}`;
                                const time = s.performances.length ? fmtMins(s.performances[0].startMin) : '';
                                return (
                                    <Paper key={i} variant="outlined" sx={{ p: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.title}</Typography>
                                        {(s.performer || s.venue || s.ageRating) && (
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {[s.performer, s.venue, s.ageRating ? `Ages ${s.ageRating}` : null].filter(Boolean).join(' · ')}
                                            </Typography>
                                        )}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
                                            <EventIcon sx={{ fontSize: 15 }} />
                                            <Typography variant="caption">
                                                {s.performances.length} performance{s.performances.length === 1 ? '' : 's'} · {range}{time ? ` · ${time}` : ''}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                );
                            })}
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />
                        <RadioGroup row value={replace ? 'replace' : 'append'} onChange={e => setReplace(e.target.value === 'replace')}>
                            <FormControlLabel value="append" control={<Radio size="small" />} label="Add to existing shows" />
                            <FormControlLabel value="replace" control={<Radio size="small" />} label="Replace all shows" />
                        </RadioGroup>
                        {replace && hasExistingShows && (
                            <Alert severity="warning" sx={{ mt: 0.5 }}>This will delete the current shows and their performances, and replace them with the ones above.</Alert>
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
                        {applying ? 'Saving…' : (replace ? 'Replace shows' : 'Add shows')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
