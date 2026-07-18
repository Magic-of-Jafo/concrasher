'use client';

import React, { useState } from 'react';
import {
    Box, Paper, Typography, TextField, Autocomplete, IconButton, Button, Tooltip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { saveMajorsSlots } from '@/lib/actions';

// Admin editor for the front page's majors strip. Each row is one card:
// admin-typed label + the convention series it represents. Drag to reorder,
// add up to MAX cards, remove any; the front page renders exactly this list.
// Saving an empty list returns the strip to its built-in defaults.

const MAX_SLOTS = 6;

export interface SeriesOption { id: string; name: string; }
export interface MajorsSlotDraft { id: string; label: string; seriesId: string; }

export default function AdminMajorsEditor({
    series,
    initialSlots,
}: {
    series: SeriesOption[];
    initialSlots: MajorsSlotDraft[];
}) {
    const [slots, setSlots] = useState<MajorsSlotDraft[]>(initialSlots);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);

    const update = (next: MajorsSlotDraft[]) => { setSlots(next); setDirty(true); setNotice(null); };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination || result.destination.index === result.source.index) return;
        const next = [...slots];
        const [moved] = next.splice(result.source.index, 1);
        next.splice(result.destination.index, 0, moved);
        update(next);
    };

    const addSlot = () => {
        update([...slots, { id: crypto.randomUUID(), label: '', seriesId: '' }]);
    };

    const incomplete = slots.some((s) => !s.seriesId);

    const save = async () => {
        setSaving(true);
        setNotice(null);
        try {
            const res = await saveMajorsSlots(slots);
            if (res.success) {
                setNotice({
                    severity: 'success',
                    text: slots.length
                        ? 'Saved. The front page now shows these cards in this order.'
                        : 'Cards cleared; the front page is back on its built-in defaults.',
                });
                setDirty(false);
            } else {
                setNotice({ severity: 'error', text: res.error || 'Could not save the cards.' });
            }
        } catch {
            setNotice({ severity: 'error', text: 'Could not save the cards.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>Front page cards</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                The series cards at the top of the front page. Each card shows its series&apos;
                most current convention (artwork borrows from the previous year when the
                current one has none). Drag to reorder; the label is exactly what the card displays.
            </Typography>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="majors-slots">
                    {(dropProvided) => (
                        <Box ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                            {slots.map((slot, index) => (
                                <Draggable key={slot.id} draggableId={slot.id} index={index}>
                                    {(dragProvided, snapshot) => (
                                        <Box
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            sx={{
                                                display: 'flex', alignItems: 'center', gap: 1.5,
                                                p: 1, mb: 1, borderRadius: 1,
                                                border: '1px solid', borderColor: 'divider',
                                                backgroundColor: snapshot.isDragging ? 'action.hover' : 'background.paper',
                                            }}
                                        >
                                            <Box
                                                {...dragProvided.dragHandleProps}
                                                sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', color: 'text.secondary' }}
                                                aria-label="Drag to reorder"
                                            >
                                                <DragIndicatorIcon />
                                            </Box>
                                            <TextField
                                                size="small"
                                                label="Card label"
                                                value={slot.label}
                                                placeholder={series.find((s) => s.id === slot.seriesId)?.name || 'e.g. S.A.M.'}
                                                onChange={(e) => update(slots.map((s) => (s.id === slot.id ? { ...s, label: e.target.value } : s)))}
                                                sx={{ width: 190, flexShrink: 0 }}
                                            />
                                            <Autocomplete
                                                size="small"
                                                options={series}
                                                getOptionLabel={(o) => o.name}
                                                isOptionEqualToValue={(o, v) => o.id === v.id}
                                                value={series.find((s) => s.id === slot.seriesId) || null}
                                                onChange={(_, v) => update(slots.map((s) => (s.id === slot.id ? { ...s, seriesId: v?.id || '' } : s)))}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Convention series"
                                                        error={!slot.seriesId}
                                                        helperText={!slot.seriesId ? 'Pick a series' : undefined}
                                                    />
                                                )}
                                                sx={{ flexGrow: 1, minWidth: 220 }}
                                            />
                                            <Tooltip title="Remove this card">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    aria-label="Remove card"
                                                    onClick={() => update(slots.filter((s) => s.id !== slot.id))}
                                                >
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    )}
                                </Draggable>
                            ))}
                            {dropProvided.placeholder}
                        </Box>
                    )}
                </Droppable>
            </DragDropContext>

            {slots.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    No cards. Saving like this returns the front page to its built-in defaults.
                </Typography>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                <Button startIcon={<AddIcon />} onClick={addSlot} disabled={slots.length >= MAX_SLOTS}>
                    Add card
                </Button>
                {slots.length >= MAX_SLOTS && (
                    <Typography variant="caption" color="text.secondary">Maximum of {MAX_SLOTS} cards.</Typography>
                )}
                <Box sx={{ flexGrow: 1 }} />
                <Button
                    variant="contained"
                    onClick={save}
                    disabled={!dirty || saving || incomplete}
                >
                    {saving ? 'Saving…' : 'Save cards'}
                </Button>
            </Box>
            {incomplete && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}>
                    Every card needs a series before saving.
                </Typography>
            )}
            {notice && (
                <Alert severity={notice.severity} onClose={() => setNotice(null)} sx={{ mt: 1.5 }}>
                    {notice.text}
                </Alert>
            )}
        </Paper>
    );
}
