"use client";

import React, { useState, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    CircularProgress, Alert, ToggleButtonGroup, ToggleButton, Table, TableHead,
    TableBody, TableRow, TableCell, Paper, Divider,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LinkIcon from '@mui/icons-material/Link';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ImageIcon from '@mui/icons-material/Image';
import { usePasteImage } from '@/hooks/usePasteImage';

type SourceType = 'url' | 'pdf' | 'image';

export interface PriceTierResult { label: string; amount: number; amountSecondary: number | null; }
export interface PriceTableResult {
    name: string | null;
    primaryLabel: string | null;
    secondaryLabel: string | null;
    tiers: PriceTierResult[];
}

const GEN_STAGES = [
    'Gathering the pricing page…',
    'Reading the prices…',
    'Building the price table…',
    'Almost there…',
];

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export default function PricingHelperDialog({
    open, onClose, conventionId, onApplied,
}: {
    open: boolean;
    onClose: () => void;
    conventionId: string;
    onApplied: (tables: PriceTableResult[], currency: string | null) => void;
}) {
    const [sourceType, setSourceType] = useState<SourceType>('url');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<{ source: string; currency: string | null; tables: PriceTableResult[] } | null>(null);
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
                res = await fetch(`/api/conventions/${conventionId}/scrape-pricing`, { method: 'POST', body: fd, signal: controller.signal });
            } else if (sourceType === 'pdf') {
                setError('Choose a PDF file first.'); setLoading(false); stopStages(); return;
            } else {
                res = await fetch(`/api/conventions/${conventionId}/scrape-pricing`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source: { type: sourceType, url: url.trim() || undefined } }),
                    signal: controller.signal,
                });
            }
            const data = await res.json();
            if (!res.ok) setError(data.error || 'Could not read that source.');
            else if (!data.tables?.length) setError('No price table was found. Try the registration/tickets page, a PDF, or the pricing image.');
            else setPreview({ source: data.source, currency: data.currency, tables: data.tables });
        } catch (e: any) {
            if (e?.name !== 'AbortError') setError(e?.message || 'Request failed.');
        } finally {
            abortRef.current = null;
            stopStages();
            setLoading(false);
        }
    };

    const tierCount = preview ? preview.tables.reduce((n, t) => n + t.tiers.length, 0) : 0;

    return (
        <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon color="primary" /> Pricing Helper
            </DialogTitle>
            <DialogContent dividers>
                {!preview ? (
                    <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Point the helper at the event&apos;s tickets/registration page — paste a link, or upload a PDF or the pricing image — and it&apos;ll pull out the price table. You&apos;ll review it before it fills the Pricing tab.
                        </Typography>

                        <ToggleButtonGroup exclusive fullWidth size="small" value={sourceType} onChange={(_, v) => v && setSourceType(v)} sx={{ mb: 2 }}>
                            <ToggleButton value="url"><LinkIcon fontSize="small" sx={{ mr: 0.5 }} /> URL</ToggleButton>
                            <ToggleButton value="pdf"><UploadFileIcon fontSize="small" sx={{ mr: 0.5 }} /> PDF</ToggleButton>
                            <ToggleButton value="image"><ImageIcon fontSize="small" sx={{ mr: 0.5 }} /> Image</ToggleButton>
                        </ToggleButtonGroup>

                        {sourceType === 'url' && (
                            <TextField
                                fullWidth size="small" label="Tickets / registration URL"
                                placeholder="https://…/tickets"
                                value={url} onChange={e => setUrl(e.target.value)}
                                helperText="Leave blank to use the convention's registration/website URL. Non-English pages are translated."
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
                                    placeholder="https://…/pricing.png"
                                    value={url} onChange={e => setUrl(e.target.value)}
                                    helperText="Paste a link to the pricing image, or upload one below."
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
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2">
                                Found {tierCount} categor{tierCount === 1 ? 'y' : 'ies'}{preview.tables.length > 1 ? ` across ${preview.tables.length} tables` : ''}{preview.currency ? ` · ${preview.currency}` : ''}
                            </Typography>
                            <Button size="small" onClick={reset}>Start over</Button>
                        </Box>
                        <Typography variant="caption" color="text.secondary">Source: {preview.source}</Typography>

                        <Box sx={{ mt: 1.5, maxHeight: 360, overflowY: 'auto' }}>
                            {preview.tables.map((t, ti) => (
                                <Paper key={ti} variant="outlined" sx={{ mb: 1.5, p: 1 }}>
                                    {t.name && <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t.name}</Typography>}
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Category</TableCell>
                                                <TableCell align="right">{t.primaryLabel || 'Price'}</TableCell>
                                                {t.secondaryLabel && <TableCell align="right">{t.secondaryLabel}</TableCell>}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {t.tiers.map((tier, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{tier.label}</TableCell>
                                                    <TableCell align="right">{fmt(tier.amount)}</TableCell>
                                                    {t.secondaryLabel && <TableCell align="right">{tier.amountSecondary != null ? fmt(tier.amountSecondary) : '—'}</TableCell>}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Paper>
                            ))}
                        </Box>

                        <Divider sx={{ my: 1 }} />
                        <Alert severity="info">
                            Clicking <strong>Use these prices</strong> saves them to the Pricing tab right away. You can still edit and re-save, or add early-bird dates, afterward. (Currency is set in Settings.)
                        </Alert>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={close} color={loading ? 'error' : 'inherit'}>Cancel</Button>
                {!preview ? (
                    <Button onClick={generate} variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}>
                        {loading ? 'Reading…' : 'Generate preview'}
                    </Button>
                ) : (
                    <Button onClick={() => { onApplied(preview.tables, preview.currency); close(); }} variant="contained">
                        Use these prices
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
