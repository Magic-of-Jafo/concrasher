'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    Stack,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Alert,
    Tooltip,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CloudUpload as UploadIcon,
    AutoAwesome as AutoAwesomeIcon,
    Event as EventIcon,
} from '@mui/icons-material';
import {
    getProductionsForConvention,
    createProduction,
    updateProduction,
    deleteProduction,
    type ProductionInput,
} from '@/lib/actions';
import { getS3ImageUrl } from '@/lib/defaults';
import { usePasteImage, fileToInput } from '@/hooks/usePasteImage';
import PerformancesDialog from './PerformancesDialog';
import FestivalHelperDialog from './FestivalHelperDialog';

interface VenueOption { id: string; name: string; }

interface ProductionRow {
    id: string;
    title: string;
    tagline: string | null;
    ageRating: string | null;
    description: string | null;
    coverImageUrl: string | null;
    detailsUrl: string | null;
    priceNote: string | null;
    order: number;
    _count?: { performances: number };
}

interface FestivalShowsTabProps {
    conventionId: string;
    startDate: Date | string | null;
    endDate: Date | string | null;
    venues: VenueOption[];
}

const emptyForm: ProductionInput = {
    title: '',
    tagline: '',
    ageRating: '',
    description: '',
    coverImageUrl: '',
    detailsUrl: '',
    priceNote: '',
};

const FestivalShowsTab: React.FC<FestivalShowsTabProps> = ({ conventionId, startDate, endDate, venues }) => {
    const [shows, setShows] = useState<ProductionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [perfShow, setPerfShow] = useState<ProductionRow | null>(null);
    const [helperOpen, setHelperOpen] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ProductionInput>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Paste a show poster while the add/edit dialog is open.
    usePasteImage((file) => fileToInput(fileInputRef.current, file), { enabled: dialogOpen });

    const [deleteTarget, setDeleteTarget] = useState<ProductionRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await getProductionsForConvention(conventionId);
        if (res.success) {
            setShows(res.data as ProductionRow[]);
            setError(null);
        } else {
            setError(res.error || 'Failed to load shows.');
        }
        setLoading(false);
    }, [conventionId]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setEditingId(null);
        setForm(emptyForm);
        setFormError(null);
        setDialogOpen(true);
    };

    const openEdit = (show: ProductionRow) => {
        setEditingId(show.id);
        setForm({
            title: show.title,
            tagline: show.tagline ?? '',
            ageRating: show.ageRating ?? '',
            description: show.description ?? '',
            coverImageUrl: show.coverImageUrl ?? '',
            detailsUrl: show.detailsUrl ?? '',
            priceNote: show.priceNote ?? '',
        });
        setFormError(null);
        setDialogOpen(true);
    };

    const handleField = (field: keyof ProductionInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setFormError('Image must be under 5MB.'); return; }
        setUploading(true);
        setFormError(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('conventionId', conventionId);
            fd.append('mediaType', 'production');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Upload failed');
            const { url } = await res.json();
            setForm((prev) => ({ ...prev, coverImageUrl: url }));
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Upload failed.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        if (!form.title?.trim()) { setFormError('A show title is required.'); return; }
        setSaving(true);
        setFormError(null);
        const res = editingId
            ? await updateProduction(editingId, form)
            : await createProduction(conventionId, form);
        setSaving(false);
        if (res.success) {
            setDialogOpen(false);
            await load();
        } else {
            setFormError(res.error || 'Failed to save show.');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const res = await deleteProduction(deleteTarget.id);
        setDeleting(false);
        if (res.success) {
            setDeleteTarget(null);
            await load();
        } else {
            setError(res.error || 'Failed to delete show.');
        }
    };

    if (loading) {
        return (
            <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                    <Typography variant="h6">Shows</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Each show is a production. Add performances (dates, times, venues) on the next step.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={() => setHelperOpen(true)}>
                        Schedule Helper
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
                        Add Show
                    </Button>
                </Box>
            </Box>

            {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {shows.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
                    <AutoAwesomeIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="h6" gutterBottom>No shows yet</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Add your festival&apos;s shows here. Each one can run at multiple times and venues.
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add your first show</Button>
                </Paper>
            ) : (
                <Stack spacing={1.5}>
                    {shows.map((show) => (
                        <Paper key={show.id} variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Box
                                sx={{
                                    width: 96, height: 64, flexShrink: 0, borderRadius: 1, overflow: 'hidden',
                                    bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                {show.coverImageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={getS3ImageUrl(show.coverImageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <AutoAwesomeIcon sx={{ color: 'text.disabled' }} />
                                )}
                            </Box>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography variant="subtitle1" noWrap>{show.title}</Typography>
                                {show.tagline && (
                                    <Typography variant="body2" color="text.secondary" noWrap>{show.tagline}</Typography>
                                )}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
                                    <EventIcon sx={{ fontSize: 16 }} />
                                    <Typography variant="caption">
                                        {(show._count?.performances ?? 0)} performance{(show._count?.performances ?? 0) === 1 ? '' : 's'}
                                        {show.ageRating ? ` · ${show.ageRating}` : ''}
                                    </Typography>
                                </Box>
                            </Box>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<EventIcon />}
                                onClick={() => setPerfShow(show)}
                                sx={{ flexShrink: 0 }}
                            >
                                Performances
                            </Button>
                            <Tooltip title="Edit show">
                                <IconButton onClick={() => openEdit(show)}><EditIcon /></IconButton>
                            </Tooltip>
                            <Tooltip title="Delete show">
                                <IconButton color="error" onClick={() => setDeleteTarget(show)}><DeleteIcon /></IconButton>
                            </Tooltip>
                        </Paper>
                    ))}
                </Stack>
            )}

            {/* Add / edit dialog */}
            <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? 'Edit Show' : 'Add Show'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {formError && <Alert severity="error">{formError}</Alert>}

                        {/* Poster */}
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                            <Box
                                sx={{
                                    width: 144, height: 96, flexShrink: 0, borderRadius: 1, overflow: 'hidden',
                                    bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                {form.coverImageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={getS3ImageUrl(form.coverImageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <AutoAwesomeIcon sx={{ color: 'text.disabled' }} />
                                )}
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Cover image — landscape works best (around 3:2).
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    {form.coverImageUrl ? 'Replace image' : 'Upload image'}
                                </Button>
                                {form.coverImageUrl && (
                                    <Button size="small" color="error" sx={{ ml: 1 }} onClick={() => setForm((p) => ({ ...p, coverImageUrl: '' }))}>
                                        Remove
                                    </Button>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleUpload} />
                            </Box>
                        </Box>

                        <TextField label="Show title" required fullWidth value={form.title} onChange={handleField('title')} />
                        <TextField label="Tagline" fullWidth value={form.tagline ?? ''} onChange={handleField('tagline')} placeholder="A one-line hook" />
                        <TextField label="Age rating" fullWidth value={form.ageRating ?? ''} onChange={handleField('ageRating')} placeholder="e.g. All ages, 18+" />
                        <TextField
                            label="Description"
                            fullWidth
                            multiline
                            minRows={3}
                            value={form.description ?? ''}
                            onChange={handleField('description')}
                        />
                        <TextField label="Details / tickets URL" fullWidth value={form.detailsUrl ?? ''} onChange={handleField('detailsUrl')} placeholder="https://…" />
                        <TextField label="Pricing note" fullWidth value={form.priceNote ?? ''} onChange={handleField('priceNote')} placeholder="e.g. $25 / $20 concession" />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving || uploading}>
                        {saving ? <CircularProgress size={22} color="inherit" /> : 'Save Show'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
                <DialogTitle>Delete show?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Remove <strong>{deleteTarget?.title}</strong>? Its performances will be kept as standalone schedule events, not deleted.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
                        {deleting ? <CircularProgress size={22} color="inherit" /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {perfShow && (
                <PerformancesDialog
                    open={!!perfShow}
                    onClose={() => setPerfShow(null)}
                    productionId={perfShow.id}
                    productionTitle={perfShow.title}
                    startDate={startDate}
                    endDate={endDate}
                    venues={venues}
                    onChanged={load}
                />
            )}

            <FestivalHelperDialog
                open={helperOpen}
                onClose={() => setHelperOpen(false)}
                conventionId={conventionId}
                hasExistingShows={shows.length > 0}
                onApplied={(summary) => {
                    setNotice(`Added ${summary.shows} show${summary.shows === 1 ? '' : 's'} and ${summary.performances} performance${summary.performances === 1 ? '' : 's'}.`);
                    load();
                }}
            />
        </Box>
    );
};

export default FestivalShowsTab;
