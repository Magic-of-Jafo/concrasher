'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Box, Typography, Paper, Checkbox, IconButton, Button, TextField, Autocomplete,
    CircularProgress, Alert, Chip, Tooltip,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LockIcon from '@mui/icons-material/Lock';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useSession } from 'next-auth/react';
import {
    getConventionTalentArrangement,
    saveConventionTalentArrangement,
    addTalentToConvention,
    type ConventionTalentRow,
} from '@/lib/actions';
import { resolveTalentCardImage } from '@/lib/talent-cards';
import { getS3ImageUrl } from '@/lib/defaults';
import { MAX_UPLOAD_MB, MAX_UPLOAD_BYTES } from '@/lib/upload-limits';

/**
 * The organizer's talent billing board. Rows arrive automatically from the
 * Schedule Helper; the organizer arranges them in two sections:
 *
 *   HEADLINERS — an explicit choice (drag into the zone, or tap the star on
 *   any row — the mobile-friendly path). These render poster-size on the
 *   public Talent tab. Nobody is a headliner by accident: zero stars means a
 *   uniform public grid.
 *
 *   EVERYONE ELSE — the supporting cast, in billing order.
 *
 * Card images follow the talent-controls-promotion rule: talent with promo
 * photos lock out organizer uploads; organizers pick among the talent's own
 * photos or upload one only when the talent has none.
 */

interface SearchResult {
    id: string;
    displayName: string;
    aliases: string[];
    claimed: boolean;
}

function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export default function TalentTab({ conventionId }: { conventionId: string }) {
    const { data: session } = useSession();
    const [rows, setRows] = useState<ConventionTalentRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingLinkId, setUploadingLinkId] = useState<string | null>(null);

    // Add-by-name state
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadTargetRef = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await getConventionTalentArrangement(conventionId);
            if (cancelled) return;
            if (res.success && res.rows) setRows(res.rows);
            else setError(res.error || 'Could not load talent.');
        })();
        return () => { cancelled = true; };
    }, [conventionId]);

    // Type-ahead over the talent pool.
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) { setOptions([]); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/talent/search?q=${encodeURIComponent(q)}`);
                if (res.ok) {
                    const j = await res.json();
                    setOptions(j.results || []);
                }
            } finally {
                setSearching(false);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [query]);

    // Rows are stored as ONE ordered list (headliners first); the two sections
    // are views over the isHeadliner flag.
    const headliners = (rows ?? []).filter((r) => r.isHeadliner);
    const supporting = (rows ?? []).filter((r) => !r.isHeadliner);

    /** Persist the current arrangement (order = combined list position). */
    const persist = useCallback(async (next: ConventionTalentRow[]) => {
        setSaving(true);
        setError(null);
        const res = await saveConventionTalentArrangement(
            conventionId,
            next.map((r, i) => ({ linkId: r.linkId, order: i, isVisible: r.isVisible, isHeadliner: r.isHeadliner, imageUrl: r.imageUrl })),
        );
        setSaving(false);
        if (res.success && res.rows) setRows(res.rows);
        else setError(res.error || 'Could not save the arrangement.');
    }, [conventionId]);

    const commit = (nextHeadliners: ConventionTalentRow[], nextSupporting: ConventionTalentRow[]) => {
        const combined = [
            ...nextHeadliners.map((r) => ({ ...r, isHeadliner: true })),
            ...nextSupporting.map((r) => ({ ...r, isHeadliner: false })),
        ];
        setRows(combined);
        void persist(combined);
    };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination || !rows) return;
        const from = result.source.droppableId;
        const to = result.destination.droppableId;
        const lists: Record<string, ConventionTalentRow[]> = {
            headliners: [...headliners],
            supporting: [...supporting],
        };
        const [moved] = lists[from].splice(result.source.index, 1);
        lists[to].splice(result.destination.index, 0, moved);
        commit(lists.headliners, lists.supporting);
    };

    /** The star: the tap-friendly way to make (or unmake) a headliner. */
    const toggleHeadliner = (linkId: string) => {
        if (!rows) return;
        const row = rows.find((r) => r.linkId === linkId);
        if (!row) return;
        if (row.isHeadliner) {
            // Demote: goes to the top of the supporting cast.
            commit(headliners.filter((r) => r.linkId !== linkId), [row, ...supporting]);
        } else {
            // Promote: joins the end of the headliner row.
            commit([...headliners, row], supporting.filter((r) => r.linkId !== linkId));
        }
    };

    const toggleVisible = (linkId: string) => {
        if (!rows) return;
        const next = rows.map((r) => (r.linkId === linkId ? { ...r, isVisible: !r.isVisible } : r));
        setRows(next);
        void persist(next);
    };

    /** Organizer picks one of the talent's promo photos. */
    const pickPromo = (linkId: string, url: string) => {
        if (!rows) return;
        const next = rows.map((r) => {
            if (r.linkId !== linkId) return r;
            const imageUrl = url === r.promoPhotos[0]?.url ? null : url; // default = store null
            return {
                ...r,
                imageUrl,
                resolved: resolveTalentCardImage({ chosenUrl: imageUrl, promoUrls: r.promoPhotos.map((p) => p.url), profilePictureUrl: r.profilePictureUrl }),
            };
        });
        setRows(next);
        void persist(next);
    };

    /** Organizer uploads their own image — only offered when the talent has no promo photos. */
    const startUpload = (linkId: string) => {
        uploadTargetRef.current = linkId;
        fileInputRef.current?.click();
    };

    const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const linkId = uploadTargetRef.current;
        if (!file || !linkId || !rows || !session?.user?.id) return;
        if (file.size > MAX_UPLOAD_BYTES) { setError(`The image must be under ${MAX_UPLOAD_MB}MB.`); return; }
        if (!file.type.startsWith('image/')) { setError('Only image files can be used.'); return; }
        setUploadingLinkId(linkId);
        setError(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('userId', session.user.id);
            fd.append('mediaType', 'talent');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error || 'Upload failed.'); return; }
            const { url } = await res.json();
            const next = rows.map((r) => (r.linkId === linkId
                ? { ...r, imageUrl: url, resolved: resolveTalentCardImage({ chosenUrl: url, promoUrls: [], profilePictureUrl: r.profilePictureUrl }) }
                : r));
            setRows(next);
            await persist(next);
        } finally {
            setUploadingLinkId(null);
            uploadTargetRef.current = null;
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAdd = async (picked: SearchResult | string | null) => {
        if (!picked) return;
        setAdding(true);
        setError(null);
        const input = typeof picked === 'string' ? { name: picked } : { talentId: picked.id };
        const res = await addTalentToConvention(conventionId, input);
        setAdding(false);
        setQuery('');
        if (res.success && res.rows) setRows(res.rows);
        else setError(res.error || 'Could not add that talent.');
    };

    const renderRow = (row: ConventionTalentRow, index: number) => (
        <Draggable key={row.linkId} draggableId={row.linkId} index={index}>
            {(dragProvided, snapshot) => (
                <Paper
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    variant="outlined"
                    sx={{
                        p: 1.5,
                        display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                        opacity: row.isVisible ? 1 : 0.55,
                        backgroundColor: snapshot.isDragging ? 'action.hover' : undefined,
                    }}
                >
                    <Box {...dragProvided.dragHandleProps} sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', color: 'text.secondary' }} aria-label="Drag to reorder">
                        <DragIndicatorIcon />
                    </Box>

                    <Tooltip title={row.isHeadliner ? 'Remove from headliners' : 'Make a headliner (shows poster-size)'}>
                        <IconButton
                            size="small"
                            onClick={() => toggleHeadliner(row.linkId)}
                            aria-label={row.isHeadliner ? `Remove ${row.displayName} from headliners` : `Make ${row.displayName} a headliner`}
                            sx={{ color: row.isHeadliner ? 'warning.main' : 'text.disabled' }}
                        >
                            {row.isHeadliner ? <StarIcon /> : <StarBorderIcon />}
                        </IconButton>
                    </Tooltip>

                    <Tooltip title={row.isVisible ? 'Shown on the public Talent tab' : 'Hidden from the public Talent tab'}>
                        <Checkbox
                            checked={row.isVisible}
                            onChange={() => toggleVisible(row.linkId)}
                            inputProps={{ 'aria-label': `Show ${row.displayName} on the Talent tab` }}
                        />
                    </Tooltip>

                    {/* Card preview */}
                    {row.resolved.url ? (
                        <Box component="img" src={getS3ImageUrl(row.resolved.url)} alt=""
                            sx={{ width: 44, height: 55, objectFit: 'cover', borderRadius: '4px', border: '1px solid', borderColor: 'divider', flexShrink: 0 }} />
                    ) : (
                        <Box sx={{ width: 44, height: 55, borderRadius: '4px', border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'text.secondary', flexShrink: 0 }}>
                            {initials(row.displayName)}
                        </Box>
                    )}

                    <Box sx={{ minWidth: 140, flex: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                            {row.displayName}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                            {row.fromSchedule && <Chip label="From schedule" size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />}
                            {row.resolved.source === 'profile' && <Chip label="Using profile photo" size="small" variant="outlined" color="warning" sx={{ fontSize: '0.68rem', height: 20 }} />}
                            {row.resolved.source === 'none' && <Chip label="No photo" size="small" variant="outlined" color="warning" sx={{ fontSize: '0.68rem', height: 20 }} />}
                        </Box>
                    </Box>

                    {/* Image control — the talent-controls-promotion rule made visible. */}
                    {row.promoPhotos.length > 1 && (
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            {row.promoPhotos.map((p) => {
                                const selected = row.resolved.url === p.url;
                                return (
                                    <Box
                                        key={p.id}
                                        component="button"
                                        type="button"
                                        onClick={() => pickPromo(row.linkId, p.url)}
                                        aria-label={selected ? 'Selected promo photo' : 'Use this promo photo'}
                                        sx={{
                                            p: 0, width: 34, height: 42, borderRadius: '4px', overflow: 'hidden', cursor: 'pointer',
                                            border: selected ? '2px solid' : '1px solid',
                                            borderColor: selected ? 'primary.main' : 'divider',
                                        }}
                                    >
                                        <Box component="img" src={getS3ImageUrl(p.url)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                    {row.promoPhotos.length === 1 && (
                        <Tooltip title="Photo provided by the talent — they control their promo image.">
                            <Chip icon={<LockIcon sx={{ fontSize: 14 }} />} label="Talent's photo" size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 22 }} />
                        </Tooltip>
                    )}
                    {row.promoPhotos.length === 0 && (
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={uploadingLinkId === row.linkId ? <CircularProgress size={14} /> : <AddPhotoAlternateIcon />}
                            onClick={() => startUpload(row.linkId)}
                            disabled={uploadingLinkId !== null}
                            sx={{ whiteSpace: 'nowrap' }}
                        >
                            {row.imageUrl ? 'Replace image' : 'Add image'}
                        </Button>
                    )}
                </Paper>
            )}
        </Draggable>
    );

    if (rows === null && !error) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Featured Talent</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: '75ch' }}>
                Everyone detected by the Schedule Helper appears here automatically. Star (or drag
                into the Headliners section) the names that deserve poster-size billing, drag to set
                the order, untick to hide a card, and add anyone the schedule missed by name.
            </Typography>

            {/* Add by name */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 3, maxWidth: 480 }}>
                <Autocomplete
                    fullWidth
                    size="small"
                    freeSolo
                    options={options}
                    loading={searching}
                    inputValue={query}
                    onInputChange={(_, v) => setQuery(v)}
                    getOptionLabel={(o) => (typeof o === 'string' ? o : o.displayName)}
                    filterOptions={(x) => x}
                    onChange={(_, v) => { if (v) void handleAdd(v); }}
                    renderOption={(props, o) => (
                        <li {...props} key={o.id}>
                            <Box>
                                <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{o.displayName}</Typography>
                                {o.aliases.length > 0 && (
                                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>aka {o.aliases.join(', ')}</Typography>
                                )}
                            </Box>
                        </li>
                    )}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder="Add talent by name"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && query.trim() && options.length === 0) {
                                    e.preventDefault();
                                    void handleAdd(query.trim());
                                }
                            }}
                        />
                    )}
                />
                <Button
                    variant="outlined"
                    startIcon={adding ? <CircularProgress size={16} /> : <PersonAddIcon />}
                    onClick={() => query.trim() && handleAdd(query.trim())}
                    disabled={adding || !query.trim()}
                    sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                    Add
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {rows && rows.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body1" gutterBottom sx={{ fontWeight: 600 }}>No talent attached yet</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Run the Schedule Helper on the Schedule tab to detect performers automatically,
                        or add them by name above.
                    </Typography>
                </Paper>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    {/* ---- Headliners zone ---- */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                        <StarIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Headliners</Typography>
                        <Typography variant="caption" color="text.secondary">— poster-size on the public tab</Typography>
                    </Box>
                    <Droppable droppableId="headliners">
                        {(dropProvided, dropSnapshot) => (
                            <Box
                                ref={dropProvided.innerRef}
                                {...dropProvided.droppableProps}
                                sx={{
                                    display: 'flex', flexDirection: 'column', gap: 1,
                                    p: 1.5, mb: 3, borderRadius: '8px',
                                    border: '2px dashed',
                                    borderColor: dropSnapshot.isDraggingOver ? 'warning.main' : 'divider',
                                    backgroundColor: dropSnapshot.isDraggingOver ? 'action.hover' : 'transparent',
                                    minHeight: 76,
                                    transition: 'border-color 0.15s ease-out',
                                }}
                            >
                                {headliners.length === 0 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1.5 }}>
                                        Drag talent here (or tap the ☆ on a row) to feature them as headliners.
                                        With none chosen, all cards display the same size.
                                    </Typography>
                                )}
                                {headliners.map((row, index) => renderRow(row, index))}
                                {dropProvided.placeholder}
                            </Box>
                        )}
                    </Droppable>

                    {/* ---- Everyone else ---- */}
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 1 }}>
                        Everyone else
                    </Typography>
                    <Droppable droppableId="supporting">
                        {(dropProvided) => (
                            <Box ref={dropProvided.innerRef} {...dropProvided.droppableProps} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {supporting.map((row, index) => renderRow(row, index))}
                                {dropProvided.placeholder}
                            </Box>
                        )}
                    </Droppable>
                </DragDropContext>
            )}

            <input ref={fileInputRef} type="file" hidden accept="image/png, image/jpeg, image/webp" onChange={handleUploadFile} />

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                {saving ? 'Saving…' : 'Changes save automatically.'}
            </Typography>
        </Box>
    );
}
