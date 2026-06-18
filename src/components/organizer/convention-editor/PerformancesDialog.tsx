'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Stack,
    Typography,
    IconButton,
    TextField,
    MenuItem,
    Divider,
    Paper,
    Collapse,
    CircularProgress,
    Alert,
    Chip,
    Tooltip,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    Add as AddIcon,
    Repeat as RepeatIcon,
    Event as EventIcon,
} from '@mui/icons-material';
import {
    getPerformancesForProduction,
    createPerformance,
    createPerformancesBulk,
    updatePerformance,
    deletePerformance,
    type PerformanceInput,
} from '@/lib/actions';
import { formatConventionDay } from '@/lib/scheduleDates';

interface VenueOption { id: string; name: string; }

interface PerformanceRow {
    id: string;
    dayOffset: number;
    startTimeMinutes: number | null;
    durationMinutes: number | null;
    locationName: string | null;
    soldOut: boolean;
    venue?: { id: string; venueName: string } | null;
}

interface PerformancesDialogProps {
    open: boolean;
    onClose: () => void;
    productionId: string;
    productionTitle: string;
    startDate: Date | string | null;
    endDate: Date | string | null;
    venues: VenueOption[];
    onChanged: () => void;
}

const minutesToInput = (m: number | null | undefined): string =>
    m == null ? '' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const inputToMinutes = (t: string): number | null => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
};

const minutesToLabel = (m: number | null): string => {
    if (m == null) return 'Time TBA';
    const h = Math.floor(m / 60);
    const min = m % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
};

const PerformancesDialog: React.FC<PerformancesDialogProps> = ({
    open, onClose, productionId, productionTitle, startDate, endDate, venues, onChanged,
}) => {
    const [perfs, setPerfs] = useState<PerformanceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // single add/edit form
    const [editingId, setEditingId] = useState<string | null>(null);
    const [dayOffset, setDayOffset] = useState(0);
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState('');
    const [venueId, setVenueId] = useState('');

    // "add to several days" helper
    const [repeatOpen, setRepeatOpen] = useState(false);
    const [repeatDays, setRepeatDays] = useState<Set<number>>(new Set());
    const [repeatTime, setRepeatTime] = useState('');
    const [repeatDuration, setRepeatDuration] = useState('');
    const [repeatVenue, setRepeatVenue] = useState('');

    const days = useMemo(() => {
        if (!startDate) return [{ dayOffset: 0, label: 'Day 1' }];
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : start;
        const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
        const endUTC = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
        const count = Math.max(0, Math.round((endUTC - startUTC) / 86400000));
        return Array.from({ length: count + 1 }, (_, i) => ({
            dayOffset: i,
            label: formatConventionDay(startDate, i, 'EEE, MMM d'),
        }));
    }, [startDate, endDate]);

    const dayLabel = useCallback(
        (off: number) => days.find((d) => d.dayOffset === off)?.label ?? `Day ${off + 1}`,
        [days]
    );
    const venueName = useCallback(
        (id?: string | null) => (id ? venues.find((v) => v.id === id)?.name : undefined),
        [venues]
    );

    const load = useCallback(async () => {
        setLoading(true);
        const res = await getPerformancesForProduction(productionId);
        if (res.success) { setPerfs(res.data as PerformanceRow[]); setError(null); }
        else setError(res.error || 'Failed to load performances.');
        setLoading(false);
    }, [productionId]);

    useEffect(() => { if (open) { load(); resetForm(); setRepeatOpen(false); setRepeatDays(new Set()); } }, [open, load]);

    const resetForm = () => {
        setEditingId(null);
        setDayOffset(0);
        setTime('');
        setDuration('');
        setVenueId('');
    };

    const startEdit = (p: PerformanceRow) => {
        setEditingId(p.id);
        setDayOffset(p.dayOffset);
        setTime(minutesToInput(p.startTimeMinutes));
        setDuration(p.durationMinutes != null ? String(p.durationMinutes) : '');
        setVenueId(p.venue?.id ?? '');
    };

    const formInput = (): PerformanceInput => ({
        dayOffset,
        startTimeMinutes: inputToMinutes(time),
        durationMinutes: duration ? parseInt(duration, 10) : null,
        venueId: venueId || null,
    });

    const saveSingle = async () => {
        setBusy(true);
        setError(null);
        const res = editingId
            ? await updatePerformance(editingId, formInput())
            : await createPerformance(productionId, formInput());
        setBusy(false);
        if (res.success) { resetForm(); await load(); onChanged(); }
        else setError(res.error || 'Failed to save.');
    };

    const addRepeated = async () => {
        if (repeatDays.size === 0) { setError('Pick at least one day.'); return; }
        setBusy(true);
        setError(null);
        const list: PerformanceInput[] = Array.from(repeatDays).map((off) => ({
            dayOffset: off,
            startTimeMinutes: inputToMinutes(repeatTime),
            durationMinutes: repeatDuration ? parseInt(repeatDuration, 10) : null,
            venueId: repeatVenue || null,
        }));
        const res = await createPerformancesBulk(productionId, list);
        setBusy(false);
        if (res.success) {
            setRepeatDays(new Set());
            setRepeatOpen(false);
            await load();
            onChanged();
        } else setError(res.error || 'Failed to add showings.');
    };

    const remove = async (id: string) => {
        setBusy(true);
        const res = await deletePerformance(id);
        setBusy(false);
        if (res.success) { await load(); onChanged(); if (editingId === id) resetForm(); }
        else setError(res.error || 'Failed to delete.');
    };

    const toggleRepeatDay = (off: number) => {
        setRepeatDays((prev) => {
            const next = new Set(prev);
            next.has(off) ? next.delete(off) : next.add(off);
            return next;
        });
    };

    return (
        <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
            <DialogTitle>
                Performances
                <Typography variant="body2" color="text.secondary">{productionTitle}</Typography>
            </DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

                {/* Existing performances */}
                {loading ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={28} /></Box>
                ) : perfs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No showings yet. Add one below — or use “Repeat” to schedule the same showing across several days.
                    </Typography>
                ) : (
                    <Stack spacing={1} sx={{ mb: 2 }}>
                        {perfs.map((p) => (
                            <Paper
                                key={p.id}
                                variant="outlined"
                                sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, bgcolor: editingId === p.id ? 'action.selected' : undefined }}
                            >
                                <EventIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Typography variant="body2" noWrap>
                                        {dayLabel(p.dayOffset)} · {minutesToLabel(p.startTimeMinutes)}
                                        {p.durationMinutes ? ` · ${p.durationMinutes} min` : ''}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                        {p.venue?.venueName || venueName(p.venue?.id) || p.locationName || 'Venue TBA'}
                                    </Typography>
                                </Box>
                                <Tooltip title="Edit"><IconButton size="small" onClick={() => startEdit(p)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => remove(p.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                            </Paper>
                        ))}
                    </Stack>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Single add / edit form */}
                <Typography variant="subtitle2" gutterBottom>
                    {editingId ? 'Edit showing' : 'Add a showing'}
                </Typography>
                <Stack spacing={2}>
                    <TextField select label="Day" value={dayOffset} onChange={(e) => setDayOffset(Number(e.target.value))} fullWidth size="small">
                        {days.map((d) => <MenuItem key={d.dayOffset} value={d.dayOffset}>{d.label}</MenuItem>)}
                    </TextField>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField label="Start time" type="time" value={time} onChange={(e) => setTime(e.target.value)} size="small" fullWidth InputLabelProps={{ shrink: true }} inputProps={{ step: 300 }} />
                        <TextField label="Duration (min)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} size="small" fullWidth />
                    </Box>
                    {venues.length > 0 && (
                        <TextField select label="Venue" value={venueId} onChange={(e) => setVenueId(e.target.value)} fullWidth size="small">
                            <MenuItem value="">— None —</MenuItem>
                            {venues.map((v) => <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>)}
                        </TextField>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        {editingId && <Button size="small" onClick={resetForm} disabled={busy}>Cancel edit</Button>}
                        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={saveSingle} disabled={busy}>
                            {editingId ? 'Update' : 'Add'}
                        </Button>
                    </Box>
                </Stack>

                {/* Repeat helper */}
                {!editingId && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Button startIcon={<RepeatIcon />} size="small" onClick={() => setRepeatOpen((o) => !o)}>
                            {repeatOpen ? 'Hide' : 'Add this show to several days at once'}
                        </Button>
                        <Collapse in={repeatOpen}>
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Playing at the same time on several days? Tap each day it plays and we&apos;ll add a showing for each one.
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, my: 1 }}>
                                    {days.map((d) => (
                                        <Chip
                                            key={d.dayOffset}
                                            label={d.label}
                                            size="small"
                                            color={repeatDays.has(d.dayOffset) ? 'primary' : 'default'}
                                            variant={repeatDays.has(d.dayOffset) ? 'filled' : 'outlined'}
                                            onClick={() => toggleRepeatDay(d.dayOffset)}
                                        />
                                    ))}
                                </Box>
                                <Stack spacing={2} sx={{ mt: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <TextField label="Start time" type="time" value={repeatTime} onChange={(e) => setRepeatTime(e.target.value)} size="small" fullWidth InputLabelProps={{ shrink: true }} inputProps={{ step: 300 }} />
                                        <TextField label="Duration (min)" type="number" value={repeatDuration} onChange={(e) => setRepeatDuration(e.target.value)} size="small" fullWidth />
                                    </Box>
                                    {venues.length > 0 && (
                                        <TextField select label="Venue" value={repeatVenue} onChange={(e) => setRepeatVenue(e.target.value)} fullWidth size="small">
                                            <MenuItem value="">— None —</MenuItem>
                                            {venues.map((v) => <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>)}
                                        </TextField>
                                    )}
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <Button variant="contained" size="small" startIcon={<RepeatIcon />} onClick={addRepeated} disabled={busy || repeatDays.size === 0}>
                                            Add {repeatDays.size || ''} showing{repeatDays.size === 1 ? '' : 's'}
                                        </Button>
                                    </Box>
                                </Stack>
                            </Box>
                        </Collapse>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={busy}>Done</Button>
            </DialogActions>
        </Dialog>
    );
};

export default PerformancesDialog;
