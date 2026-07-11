'use client';

import React, { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    Link as MuiLink,
    MenuItem,
    Radio,
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
import { setFeaturedConvention, deleteConvention } from '@/lib/actions';

// Production-office surface (Two Rooms Rule): plain, dense, calm. No House
// Lights chrome here — this is the admin's workbench, not the auditorium.

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
    initialFeaturedId,
}: {
    rows: AdminConventionRow[];
    initialFeaturedId: string | null;
}) {
    const [rows, setRows] = useState(initialRows);
    const [featuredId, setFeaturedId] = useState<string | null>(initialFeaturedId);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
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

    const handleFeature = async (id: string | null) => {
        const previous = featuredId;
        setFeaturedId(id); // optimistic — a radio must feel instant
        const result = await setFeaturedConvention(id);
        if (result.success) {
            setToast({ message: id ? 'Featured convention updated.' : 'Featured selection returned to automatic.', severity: 'success' });
        } else {
            setFeaturedId(previous);
            setToast({ message: result.error || 'Could not update the featured convention.', severity: 'error' });
        }
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
            if (featuredId === target.id) setFeaturedId(null);
            setToast({ message: `Deleted "${target.name}".`, severity: 'success' });
        } else {
            setToast({ message: result.error || 'Delete failed.', severity: 'error' });
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Manage Conventions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Every convention on the site. The Featured radio picks the front page&apos;s
                headline slot; Automatic lets the site choose (majors first, then artwork,
                then soonest).
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
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                    {visible.length} of {rows.length} shown
                </Typography>
            </Box>

            <FormControlLabel
                sx={{ mb: 1 }}
                control={
                    <Radio
                        checked={featuredId === null}
                        onChange={() => handleFeature(null)}
                        inputProps={{ 'aria-label': 'Automatic featured selection' }}
                    />
                }
                label={<Typography variant="body2">Automatic featured selection (no manual pick)</Typography>}
            />

            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
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
                                <TableRow key={row.id} hover selected={featuredId === row.id}>
                                    <TableCell align="center">
                                        <Radio
                                            size="small"
                                            checked={featuredId === row.id}
                                            onChange={() => handleFeature(row.id)}
                                            disabled={!featurable}
                                            inputProps={{ 'aria-label': `Feature ${row.name}` }}
                                            title={featurable ? 'Feature on the front page' : 'Only published, upcoming conventions can be featured'}
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
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                                        No conventions match the current filters.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* delete confirm */}
            <Dialog open={!!confirmDelete} onClose={() => !busy && setConfirmDelete(null)}>
                <DialogTitle>Delete this convention?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        &quot;{confirmDelete?.name}&quot; will be permanently deleted, including its
                        schedule, pricing, venues, and media records. This cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(null)} disabled={busy}>Cancel</Button>
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
    );
}
