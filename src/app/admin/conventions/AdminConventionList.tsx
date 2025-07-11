'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  TextField,
  Typography,
  Button,
  ButtonGroup,
  ToggleButton,
  InputAdornment,
  Grid,
} from '@mui/material';
import { format } from 'date-fns';
import { Convention, ConventionStatus } from '@prisma/client';
import NextLink from 'next/link';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ClearIcon from '@mui/icons-material/Clear';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { deleteConvention } from '@/lib/actions';
import { useDebounce } from '@/hooks/useDebounce';



type FilterValue = ConventionStatus | 'PAST';

interface AdminConventionListProps {
  error: string | null;
  setError: (error: string | null) => void;
}

export default function AdminConventionList({ error, setError }: AdminConventionListProps) {
  const [conventions, setConventions] = useState<Convention[]>([]);
  const [loading, setLoading] = useState(true);
  const [conventionToDelete, setConventionToDelete] = useState<Convention | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isExpiring, setIsExpiring] = useState(false);
  const [matchCounts, setMatchCounts] = useState<Record<ConventionStatus, number> | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ConventionStatus>(ConventionStatus.PUBLISHED);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const fetchConventions = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (debouncedSearchQuery) {
      params.set('query', debouncedSearchQuery);
    }

    params.set('status', activeFilter);

    // Only apply the 'current' view for published conventions
    if (activeFilter === ConventionStatus.PUBLISHED) {
      params.set('view', 'current');
    }

    try {
      const response = await fetch(`/api/conventions?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'An unknown error occurred.';
        throw new Error(errorMessage);
      }

      setConventions(data.items);
      setMatchCounts(data.matchCounts);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConventions();
  }, [debouncedSearchQuery, activeFilter]);

  useEffect(() => {
    if (!confirmingDeleteId) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConfirmingDeleteId(null);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-delete-button-id]')) {
        setConfirmingDeleteId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [confirmingDeleteId]);

  const handleDeleteIconClick = (conventionId: string) => {
    setConfirmingDeleteId(conventionId);
  };

  const triggerDeleteConfirmation = (convention: Convention) => {
    setConventionToDelete(convention);
    setConfirmingDeleteId(null);
  };

  const handleConfirmDelete = async () => {
    if (!conventionToDelete) return;
    setIsDeleting(true);
    setError(null);

    const result = await deleteConvention(conventionToDelete.id);

    setIsDeleting(false);
    if (result.success) {
      setConventionToDelete(null);
      fetchConventions(); // Refresh the list
    } else {
      setError(result.error || 'Failed to delete convention.');
    }
  };

  const handleStatusChange = (status: ConventionStatus) => {
    setActiveFilter(status);
  };

  const handleFindExpired = async () => {
    setIsExpiring(true);
    setError(null);
    try {
      const response = await fetch('/api/conventions/expire', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        // Use the error message from the API, or a fallback.
        const errorMessage = data.error || data.message || 'An unknown error occurred.';
        throw new Error(errorMessage);
      }

      console.log(data.message); // Log success message
      // TODO: Maybe show a success snackbar/toast here in the future
      if (activeFilter === 'PAST') {
        fetchConventions(); // Refresh if we are viewing past conventions
      } else {
        setActiveFilter('PAST'); // Switch to past view to see the change
      }
    } catch (err: any) {
      // Also catch network errors from fetch itself
      setError(err.message || 'A network error occurred. Please try again.');
    } finally {
      setIsExpiring(false);
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setSearchQuery('');
    }
  };

  const filterOptions: { label: string; value: ConventionStatus }[] = [
    { label: 'Published', value: ConventionStatus.PUBLISHED },
    { label: 'Draft', value: ConventionStatus.DRAFT },
    { label: 'Cancelled', value: ConventionStatus.CANCELLED },
    { label: 'Past', value: ConventionStatus.PAST },
  ];

  const currentFilterLabel = filterOptions.find(f => f.value === activeFilter)?.label || 'Conventions';

  return (
    <Box sx={{ display: 'flex', gap: 3 }}>
      <Box sx={{ minWidth: '300px', maxWidth: '350px' }}>
        <Paper sx={{ p: 2, position: 'sticky', top: '80px' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle1" gutterBottom component="div" sx={{ fontWeight: 'bold' }}>
                Status
              </Typography>
              <ButtonGroup
                orientation="vertical"
                fullWidth
                sx={{
                  '& .MuiButtonGroup-grouped': {
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    '&:not(:last-of-type)': {
                      borderBottom: 0,
                    },
                  }
                }}
              >
                {filterOptions.map(({ label, value }) => (
                  <Button
                    key={value}
                    variant={activeFilter === value ? 'contained' : 'outlined'}
                    onClick={() => setActiveFilter(value)}
                    sx={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <span>{label}</span>
                    {matchCounts && matchCounts[value] > 0 && activeFilter !== value && (
                      <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: 'success.main',
                        ml: 1
                      }} />
                    )}
                  </Button>
                ))}
              </ButtonGroup>
            </Box>

            <Button
              variant="outlined"
              size="small"
              onClick={handleFindExpired}
              disabled={isExpiring}
            >
              {isExpiring ? 'Working...' : 'Set Expired'}
            </Button>
            <TextField
              label="Search"
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {searchQuery && (
                      <IconButton
                        aria-label="clear search"
                        onClick={() => setSearchQuery('')}
                        edge="end"
                      >
                        <ClearIcon />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Paper>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h4" gutterBottom>
          {currentFilterLabel}
        </Typography>
        {loading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '40%' }}>Convention ({currentFilterLabel})</TableCell>
                  <TableCell sx={{ width: '25%' }}>Dates</TableCell>
                  <TableCell sx={{ width: '25%' }}>Location</TableCell>
                  <TableCell sx={{ width: '10%' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conventions.map((convention) => (
                  <TableRow key={convention.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell
                      component="th"
                      scope="row"
                      sx={{
                        maxWidth: '300px', // Set a maximum width for the name column
                        wordWrap: 'break-word',
                        whiteSpace: 'normal',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.2
                      }}
                    >
                      {convention.name}
                    </TableCell>
                    <TableCell>
                      {convention.startDate ? format(new Date(convention.startDate), 'PPP') : 'TBD'}
                    </TableCell>
                    <TableCell>{convention.city && convention.stateAbbreviation ? `${convention.city}, ${convention.stateAbbreviation}` : 'TBD'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        <IconButton
                          component={NextLink}
                          href={`/conventions/${convention.id}`}
                          aria-label="view"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton component={NextLink} href={`/organizer/conventions/${convention.id}/edit`} aria-label="edit">
                          <EditIcon />
                        </IconButton>
                        {confirmingDeleteId === convention.id ? (
                          <Button
                            variant="contained"
                            color="error"
                            onClick={() => triggerDeleteConfirmation(convention)}
                            data-delete-button-id={convention.id}
                            size="small"
                          >
                            DELETE
                          </Button>
                        ) : (
                          <IconButton
                            onClick={() => handleDeleteIconClick(convention.id)}
                            aria-label="delete"
                            data-delete-button-id={convention.id}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <ConfirmationModal
          isOpen={!!conventionToDelete}
          onClose={() => setConventionToDelete(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete ${conventionToDelete?.name}?`}
          description="Are you sure you want to delete this convention? This action cannot be undone."
          isConfirming={isDeleting}
        />
      </Box>
    </Box>
  );
} 