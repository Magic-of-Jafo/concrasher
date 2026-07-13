'use client';

import React, { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Link as MuiLink,
    MenuItem,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    TextField,
    Typography,
} from '@mui/material';
import Link from 'next/link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { setFeaturedConventions, deleteConvention } from '@/lib/actions';
import { profileSurfaceSx } from '@/components/ui/profileTheme';

// The admin's convention workbench — dense and calm, but on the House Lights
// surface so it matches the rest of the themed admin area.

export interface AdminConventionRow {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    type: string;
    startDate: string | null;
    endDate: string | null;
    city: string | null;
    stateAbbreviation: string | null;
    stateName: string | null;
    country: string | null;
    isTBD: boolean;
}

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error'> = {
    PUBLISHED: 'primary',
    DRAFT: 'default',
    PAST: 'secondary',
    CANCELLED: 'error',
};

function fmtDates(row: AdminConventionRow): string {
    if (row.isTBD || !row.startDate) return 'TBD';
    const md = (iso: string) =>
        new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    if (!row.endDate || row.endDate === row.startDate) return md(row.startDate);
    return `${md(row.startDate)} – ${md(row.endDate)}`;
}

function fmtLocation(row: AdminConventionRow): string {
    const isUS = /united states|usa/i.test(row.country || '');
    const parts = isUS
        ? [row.city, row.stateAbbreviation || row.stateName]
        : [row.city, row.country];
    return parts.filter(Boolean).join(', ') || '—';
}

/** Featuring an expired or unpublished convention sells nothing. */
function isFeaturable(row: AdminConventionRow): boolean {
    if (row.status !== 'PUBLISHED' || row.isTBD || !row.startDate) return false;
    const end = new Date(row.endDate || row.startDate);
    end.setHours(23, 59, 59, 999);
    return end.getTime() >= Date.now();
}

type SortBy = 'date' | 'name' | 'status';

export default function AdminConventionsTable({
    rows: initialRows,
    initialFeaturedIds,
}: {
    rows: AdminConventionRow[];
    initialFeaturedIds: string[];
}) {
    const [rows, setRows] = useState(initialRows);
    const [featuredIds, setFeaturedIds] = useState<Set<string>>(() => new Set(initialFeaturedIds));
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('PUBLISHED');
    const [sortBy, setSortBy] = useState<SortBy>('date');
    const [sortAsc, setSortAsc] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState<AdminConventionRow | null>(null);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        const filtered = rows.filter((r) => {
            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
            if (q && !r.name.toLowerCase().includes(q)) return false;
            return true;
        });
        const dir = sortAsc ? 1 : -1;
        return [...filtered].sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
            if (sortBy === 'status') return a.status.localeCompare(b.status) * dir || a.name.localeCompare(b.name);
            const at = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
            const bt = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
            return (at - bt) * dir;
        });
    }, [rows, search, statusFilter, sortBy, sortAsc]);

    const requestSort = (by: SortBy) => {
        if (sortBy === by) setSortAsc(!sortAsc);
        else { setSortBy(by); setSortAsc(true); }
    };

    // Persist the whole pool; the front page rotates one at random per load.
    const persistFeatured = async (next: Set<string>, successMsg: string) => {
        const previous = featuredIds;
        setFeaturedIds(next); // optimistic — a toggle must feel instant
        const result = await setFeaturedConventions([...next]);
        if (result.success) {
            setToast({ message: successMsg, severity: 'success' });
        } else {
            setFeaturedIds(previous);
            setToast({ message: result.error || 'Could not update the featured conventions.', severity: 'error' });
        }
    };

    const handleToggleFeature = (id: string) => {
        const next = new Set(featuredIds);
        const adding = !next.has(id);
        if (adding) next.add(id); else next.delete(id);
        persistFeatured(next, adding ? 'Added to featured rotation.' : 'Removed from featured rotation.');
    };

    const handleClearFeatured = () => {
        persistFeatured(new Set(), 'Featured cleared — the site now auto-picks.');
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setBusy(true);
        const target = confirmDelete;
        const result = await deleteConvention(target.id);
        setBusy(false);
        setConfirmDelete(null);
        if (result.success) {
            setRows((prev) => prev.filter((r) => r.id !== target.id));
            // If the deleted convention was in the featured rotation, drop it and
            // persist the trimmed pool so the stored setting stays clean.
            if (featuredIds.has(target.id)) {
                const next = new Set(featuredIds);
                next.delete(target.id);
                setFeaturedIds(next);
                void setFeaturedConventions([...next]);
            }
            setToast({ message: `Deleted "${target.name}".`, severity: 'success' });
        } else {
            setToast({ message: result.error || 'Delete failed.', severity: 'error' });
        }
    };

    return (
        <Box
            component="main"
            sx={{
                backgroundColor: 'var(--cc-bg)',
                backgroundImage: 'var(--cc-field)',
                backgroundRepeat: 'no-repeat',
                minHeight: '100vh',
            }}
        >
        <Container maxWidth="lg" sx={{ py: 4, ...profileSurfaceSx }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'var(--cc-ink)', fontWeight: 800 }}>
                Manage Conventions
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'var(--cc-muted)' }}>
                Every convention on the site. Tick the Featured box on any conventions you
                want in the front page&apos;s headline slot &mdash; one is shown at random on
                each visit. With none ticked, the site auto-picks (majors first, then
                artwork, then soonest).
            </Typography>

            {/* controls */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                <TextField
                    size="small"
                    label="Search by name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ minWidth: 220 }}
                />
                <TextField
                    size="small"
                    select
                    label="Status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ minWidth: 150 }}
                >
                    <MenuItem value="ALL">All statuses</MenuItem>
                    <MenuItem value="PUBLISHED">Published</MenuItem>
                    <MenuItem value="DRAFT">Draft</MenuItem>
                    <MenuItem value="PAST">Past</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </TextField>
                <Typography variant="body2" sx={{ ml: 'auto', color: 'var(--cc-muted)' }}>
                    {visible.length} of {rows.length} shown
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'var(--cc-muted)' }}>
                    {featuredIds.size === 0
                        ? 'No conventions featured — the site auto-picks.'
                        : `${featuredIds.size} featured — one shown at random per visit.`}
                </Typography>
                {featuredIds.size > 0 && (
                    <Button size="small" variant="outlined" onClick={handleClearFeatured}>
                        Clear all
                    </Button>
                )}
            </Box>

            <TableContainer sx={{ border: '1px solid var(--cc-panel-border)', backgroundColor: 'var(--cc-panel)', borderRadius: '12px' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 70 }} align="center">Featured</TableCell>
                            <TableCell sortDirection={sortBy === 'name' ? (sortAsc ? 'asc' : 'desc') : false}>
                                <TableSortLabel
                                    active={sortBy === 'name'}
                                    direction={sortBy === 'name' && !sortAsc ? 'desc' : 'asc'}
                                    onClick={() => requestSort('name')}
                                >
                                    Convention
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={sortBy === 'status' ? (sortAsc ? 'asc' : 'desc') : false}>
                                <TableSortLabel
                                    active={sortBy === 'status'}
                                    direction={sortBy === 'status' && !sortAsc ? 'desc' : 'asc'}
                                    onClick={() => requestSort('status')}
                                >
                                    Status
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={sortBy === 'date' ? (sortAsc ? 'asc' : 'desc') : false}>
                                <TableSortLabel
                                    active={sortBy === 'date'}
                                    direction={sortBy === 'date' && !sortAsc ? 'desc' : 'asc'}
                                    onClick={() => requestSort('date')}
                                >
                                    Dates
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visible.map((row) => {
                            const featurable = isFeaturable(row);
                            return (
                                <TableRow key={row.id} hover selected={featuredIds.has(row.id)}>
                                    <TableCell align="center">
                                        <Checkbox
                                            size="small"
                                            checked={featuredIds.has(row.id)}
                                            onChange={() => handleToggleFeature(row.id)}
                                            disabled={!featurable}
                                            inputProps={{ 'aria-label': `Feature ${row.name}` }}
                                            title={featurable ? 'Show in the featured rotation' : 'Only published, upcoming conventions can be featured'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <MuiLink
                                            component={Link}
                                            href={`/conventions/${row.slug || row.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            underline="hover"
                                            sx={{ fontWeight: 600 }}
                                        >
                                            {row.name}
                                        </MuiLink>
                                        {row.type === 'FESTIVAL' && (
                                            <Chip label="Festival" size="small" variant="outlined" sx={{ ml: 1, height: 20 }} />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={row.status} size="small" color={STATUS_COLORS[row.status] ?? 'default'} variant={row.status === 'PUBLISHED' ? 'filled' : 'outlined'} />
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDates(row)}</TableCell>
                                    <TableCell>{fmtLocation(row)}</TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                        <Button
                                            size="small"
                                            component={Link}
                                            href={`/conventions/${row.slug || row.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            startIcon={<OpenInNewIcon />}
                                        >
                                            View
                                        </Button>
                                        <Button
                                            size="small"
                                            component={Link}
                                            href={`/organizer/conventions/${row.id}/edit`}
                                            startIcon={<EditIcon />}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="small"
                                            color="error"
                                            startIcon={<DeleteOutlineIcon />}
                                            onClick={() => setConfirmDelete(row)}
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {visible.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6}>
                                    <Typography variant="body2" sx={{ py: 3, textAlign: 'center', color: 'var(--cc-muted)' }}>
                                        No conventions match the current filters.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* delete confirm */}
            <Dialog
                open={!!confirmDelete}
                onClose={() => !busy && setConfirmDelete(null)}
                slotProps={{ paper: { sx: { backgroundColor: 'var(--cc-bg)', backgroundImage: 'none', color: 'var(--cc-ink)', border: '1px solid var(--cc-panel-border)' } } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Delete this convention?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: 'var(--cc-muted)' }}>
                        &quot;{confirmDelete?.name}&quot; will be permanently deleted, including its
                        schedule, pricing, venues, and media records. This cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(null)} disabled={busy} sx={{ color: 'var(--cc-muted)' }}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained" disabled={busy}>
                        {busy ? 'Deleting…' : 'Delete permanently'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={!!toast}
                autoHideDuration={4000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={toast?.severity ?? 'success'} onClose={() => setToast(null)} sx={{ width: '100%' }}>
                    {toast?.message}
                </Alert>
            </Snackbar>
        </Container>
        </Box>
    );
}
