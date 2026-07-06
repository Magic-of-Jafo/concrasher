"use client";

import React, { useState, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    CircularProgress, Alert, ToggleButtonGroup, ToggleButton, Stack, Divider,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LinkIcon from '@mui/icons-material/Link';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ImageIcon from '@mui/icons-material/Image';
import { usePasteImage } from '@/hooks/usePasteImage';

type SourceType = 'url' | 'pdf' | 'image';

export interface BasicInfoResult {
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

const GEN_STAGES = [
    'Gathering the page…',
    'Reading the details…',
    'Pulling out the basics…',
    'Almost there…',
];

const Field = ({ label, value }: { label: string; value: string | null }) =>
    value ? (
        <Box sx={{ display: 'flex', gap: 1 }}>
            <Typography variant="caption" sx={{ minWidth: 96, color: 'text.secondary', flexShrink: 0 }}>{label}</Typography>
            <Typography variant="body2" sx={{ minWidth: 0, wordBreak: 'break-word' }}>{value}</Typography>
        </Box>
    ) : null;

export default function BasicInfoHelperDialog({
    open, onClose, onApplied,
}: {
    open: boolean;
    onClose: () => void;
    onApplied: (info: BasicInfoResult) => void;
}) {
    const [sourceType, setSourceType] = useState<SourceType>('url');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<{ source: string; info: BasicInfoResult } | null>(null);
    const [stageIdx, setStageIdx] = useState(0);
    const abortRef = useRef<AbortController | null>(null);
    const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Accept a clipboard-pasted image while the Image source is active.
    usePasteImage(setFile, { enabled: open && sourceType === 'image' });

    const stopStages = () => { if (stageTimerRef.current) { clearInterval(stageTimerRef.current); stageTimerRef.current = null; } };
    const reset = () => { setPreview(null); setError(null); setFile(null); };
    const close = () => {
        abortRef.current?.abort();
        abortRef.current = null;
        stopStages();
        setLoading(false);
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
            if ((sourceType === 'pdf' || sourceType === 'image') && file) {
                const fd = new FormData();
                fd.append(sourceType, file);
                fd.append('sourceType', sourceType);
                res = await fetch('/api/organizer/scrape-convention-info', { method: 'POST', body: fd, signal: controller.signal });
            } else if (sourceType === 'pdf') {
                setError('Choose a PDF file first.'); setLoading(false); stopStages(); return;
            } else {
                res = await fetch('/api/organizer/scrape-convention-info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source: { type: sourceType, url: url.trim() || undefined } }),
                    signal: controller.signal,
                });
            }
            const data = await res.json();
            if (!res.ok) setError(data.error || 'Could not read that source.');
            else setPreview({ source: data.source, info: data.info });
        } catch (e: any) {
            if (e?.name !== 'AbortError') setError(e?.message || 'Request failed.');
        } finally {
            abortRef.current = null;
            stopStages();
            setLoading(false);
        }
    };

    const info = preview?.info;
    const dates = info
        ? (info.startDate && info.endDate
            ? (info.startDate === info.endDate ? info.startDate : `${info.startDate} → ${info.endDate}`)
            : (info.startDate || null))
        : null;
    const location = info
        ? [info.city, info.stateName, info.country].filter(Boolean).join(', ') || null
        : null;

    return (
        <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon color="primary" /> Listing Helper
            </DialogTitle>
            <DialogContent dividers>
                {!preview ? (
                    <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Point the helper at the event&apos;s page (paste a link, or upload a flyer/PDF) and it&apos;ll pull out the name, dates, location, description, and links. You&apos;ll review everything before it fills the form.
                        </Typography>

                        <ToggleButtonGroup exclusive fullWidth size="small" value={sourceType} onChange={(_, v) => v && setSourceType(v)} sx={{ mb: 2 }}>
                            <ToggleButton value="url"><LinkIcon fontSize="small" sx={{ mr: 0.5 }} /> URL</ToggleButton>
                            <ToggleButton value="pdf"><UploadFileIcon fontSize="small" sx={{ mr: 0.5 }} /> PDF</ToggleButton>
                            <ToggleButton value="image"><ImageIcon fontSize="small" sx={{ mr: 0.5 }} /> Image</ToggleButton>
                        </ToggleButtonGroup>

                        {sourceType === 'url' && (
                            <TextField
                                fullWidth size="small" label="Event page URL"
                                placeholder="https://…"
                                value={url} onChange={e => setUrl(e.target.value)}
                                helperText="The event's main/about page works best. Non-English pages are translated."
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
                                    placeholder="https://…/flyer.jpg"
                                    value={url} onChange={e => setUrl(e.target.value)}
                                    helperText="Paste a link to a flyer/poster image, or upload one below."
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
                ) : info ? (
                    <>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2">Review the details</Typography>
                            <Button size="small" onClick={reset}>Start over</Button>
                        </Box>
                        <Typography variant="caption" color="text.secondary">Source: {preview.source}</Typography>

                        <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                            <Field label="Name" value={info.name} />
                            <Field label="Dates" value={dates} />
                            <Field label="Location" value={location} />
                            <Field label="Website" value={info.websiteUrl} />
                            <Field label="Registration" value={info.registrationUrl} />
                            <Field label="Summary" value={info.descriptionShort} />
                        </Stack>
                        {info.descriptionMain && (
                            <>
                                <Divider sx={{ my: 1.5 }} />
                                <Typography variant="caption" color="text.secondary">Description</Typography>
                                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{info.descriptionMain}</Typography>
                            </>
                        )}
                        <Alert severity="info" sx={{ mt: 2 }}>
                            These will fill the Basic Info form. Review and edit anything, then Save Changes as usual.
                        </Alert>
                    </>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button onClick={close} color={loading ? 'error' : 'inherit'}>Cancel</Button>
                {!preview ? (
                    <Button onClick={generate} variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}>
                        {loading ? 'Reading…' : 'Generate preview'}
                    </Button>
                ) : (
                    <Button onClick={() => { if (info) onApplied(info); close(); }} variant="contained">
                        Use these details
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
