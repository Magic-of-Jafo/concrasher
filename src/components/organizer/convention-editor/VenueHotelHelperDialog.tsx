"use client";

import React, { useState, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    CircularProgress, Alert, ToggleButtonGroup, ToggleButton, Paper, Divider, Chip, Link,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LinkIcon from '@mui/icons-material/Link';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ImageIcon from '@mui/icons-material/Image';
import { usePasteImage } from '@/hooks/usePasteImage';

type SourceType = 'url' | 'pdf' | 'image';

export interface ScrapedPlaceResult {
    name: string | null;
    websiteUrl: string | null;
    googleMapsUrl: string | null;
    streetAddress: string | null;
    city: string | null;
    stateRegion: string | null;
    postalCode: string | null;
    country: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    description: string | null;
    amenities: string[];
    parkingInfo: string | null;
    publicTransportInfo: string | null;
    groupPrice: string | null;
    groupRateOrBookingCode: string | null;
    bookingLink: string | null;
    bookingCutoffDate: string | null;
}
export interface VenueHotelResult {
    sameLocation: boolean | null;
    venue: ScrapedPlaceResult | null;
    hotels: ScrapedPlaceResult[];
}

const GEN_STAGES = [
    'Gathering the page…',
    'Reading the venue details…',
    'Looking for the hotel & room block…',
    'Almost there…',
];

function PlacePreview({ title, place }: { title: string; place: ScrapedPlaceResult }) {
    const addr = [place.streetAddress, place.city, place.stateRegion, place.postalCode, place.country].filter(Boolean).join(', ');
    return (
        <Paper variant="outlined" sx={{ mb: 1.5, p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{title}</Typography>
            {place.name && <Typography variant="body2" sx={{ fontWeight: 600 }}>{place.name}</Typography>}
            {addr && <Typography variant="body2" color="text.secondary">{addr}</Typography>}
            {(place.contactPhone || place.contactEmail) && (
                <Typography variant="body2" color="text.secondary">
                    {[place.contactPhone, place.contactEmail].filter(Boolean).join(' · ')}
                </Typography>
            )}
            {(place.groupPrice || place.groupRateOrBookingCode || place.bookingCutoffDate) && (
                <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>Room rate</Typography>
                    {place.groupPrice && <Typography variant="body2">{place.groupPrice}</Typography>}
                    {place.groupRateOrBookingCode && <Typography variant="body2">Code: <strong>{place.groupRateOrBookingCode}</strong></Typography>}
                    {place.bookingCutoffDate && <Typography variant="body2" color="warning.main">Book by {place.bookingCutoffDate}</Typography>}
                </Box>
            )}
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {place.websiteUrl && <Chip size="small" label="Website" component={Link} href={place.websiteUrl} target="_blank" clickable />}
                {place.bookingLink && <Chip size="small" color="primary" label="Booking link" component={Link} href={place.bookingLink} target="_blank" clickable />}
                {place.googleMapsUrl && <Chip size="small" label="Map" component={Link} href={place.googleMapsUrl} target="_blank" clickable />}
            </Box>
        </Paper>
    );
}

export default function VenueHotelHelperDialog({
    open, onClose, conventionId, onApplied,
}: {
    open: boolean;
    onClose: () => void;
    conventionId: string;
    onApplied: (result: VenueHotelResult) => void;
}) {
    const [sourceType, setSourceType] = useState<SourceType>('url');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<{ source: string } & VenueHotelResult | null>(null);
    const [stageIdx, setStageIdx] = useState(0);
    const abortRef = useRef<AbortController | null>(null);
    const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
                res = await fetch(`/api/conventions/${conventionId}/scrape-venue`, { method: 'POST', body: fd, signal: controller.signal });
            } else if (sourceType === 'pdf') {
                setError('Choose a PDF file first.'); setLoading(false); stopStages(); return;
            } else {
                res = await fetch(`/api/conventions/${conventionId}/scrape-venue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source: { type: sourceType, url: url.trim() || undefined } }),
                    signal: controller.signal,
                });
            }
            const data = await res.json();
            const hotels = Array.isArray(data.hotels) ? data.hotels : (data.hotel ? [data.hotel] : []);
            if (!res.ok) setError(data.error || 'Could not read that source.');
            else if (!data.venue && !hotels.length) setError('No venue or hotel details were found. Try the venue/travel page, a PDF, or an image.');
            else setPreview({ source: data.source, sameLocation: data.sameLocation, venue: data.venue, hotels });
        } catch (e: any) {
            if (e?.name !== 'AbortError') setError(e?.message || 'Request failed.');
        } finally {
            abortRef.current = null;
            stopStages();
            setLoading(false);
        }
    };

    const sameLoc = preview?.sameLocation !== false; // default true when null

    return (
        <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon color="primary" /> Venue &amp; Hotel Helper
            </DialogTitle>
            <DialogContent dividers>
                {!preview ? (
                    <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Point the helper at the event&apos;s venue / travel / hotel page — paste a link, or upload a PDF or a screenshot — and it&apos;ll pull out the venue, address, map link, and room-block details. You&apos;ll review it before it fills the tab.
                        </Typography>

                        <ToggleButtonGroup exclusive fullWidth size="small" value={sourceType} onChange={(_, v) => v && setSourceType(v)} sx={{ mb: 2 }}>
                            <ToggleButton value="url"><LinkIcon fontSize="small" sx={{ mr: 0.5 }} /> URL</ToggleButton>
                            <ToggleButton value="pdf"><UploadFileIcon fontSize="small" sx={{ mr: 0.5 }} /> PDF</ToggleButton>
                            <ToggleButton value="image"><ImageIcon fontSize="small" sx={{ mr: 0.5 }} /> Image</ToggleButton>
                        </ToggleButtonGroup>

                        {sourceType === 'url' && (
                            <TextField
                                fullWidth size="small" label="Venue / hotel / travel URL"
                                placeholder="https://…/venue"
                                value={url} onChange={e => setUrl(e.target.value)}
                                helperText="Leave blank to use the convention's website. Non-English pages are translated."
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
                                    placeholder="https://…/venue.png"
                                    value={url} onChange={e => setUrl(e.target.value)}
                                    helperText="Paste a link to the image, or upload one below."
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
                            <Chip
                                size="small"
                                color={sameLoc ? 'success' : 'default'}
                                label={sameLoc ? 'Attendees stay at the venue' : 'Separate host hotel'}
                            />
                            <Button size="small" onClick={reset}>Start over</Button>
                        </Box>
                        <Typography variant="caption" color="text.secondary">Source: {preview.source}</Typography>

                        <Box sx={{ mt: 1.5 }}>
                            {preview.venue && <PlacePreview title="Venue" place={preview.venue} />}
                            {preview.hotels.map((h, i) => (
                                <PlacePreview
                                    key={i}
                                    title={preview.hotels.length === 1 ? 'Host hotel' : (i === 0 ? 'Primary hotel' : `Hotel ${i + 1}`)}
                                    place={h}
                                />
                            ))}
                        </Box>

                        <Divider sx={{ my: 1 }} />
                        <Alert severity="info">
                            This fills any <strong>empty</strong> fields on the Venue/Hotel tab — it won&apos;t overwrite what you&apos;ve already entered{preview.sameLocation === true ? ', and sets “attendees stay at the venue”' : ''}. Review and save. You can run it again — e.g. from a screenshot — to top up missing details like the nightly rate.
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
                    <Button onClick={() => { onApplied({ sameLocation: preview.sameLocation, venue: preview.venue, hotels: preview.hotels }); close(); }} variant="contained">
                        Use these details
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
