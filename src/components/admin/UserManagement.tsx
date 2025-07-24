'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Button,
    Pagination,
    Chip,
    Avatar,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    IconButton,
    InputAdornment
} from '@mui/material';
import {
    Search as SearchIcon,
    Person as PersonIcon,
    Delete as DeleteIcon,
    CheckCircle as VerifiedIcon,
    Cancel as UnverifiedIcon,
    Clear as ClearIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { useDebounce } from '@/hooks/useDebounce';
import { getS3ImageUrl } from '@/lib/defaults';

interface User {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
    roles: string[];
    emailVerified: Date | null;
    createdAt: string;
}

interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

interface UsersResponse {
    users: User[];
    pagination: PaginationInfo;
}

const UserManagement: React.FC = () => {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const queryClient = useQueryClient();
    const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms debounce

    // Fetch users data
    const { data, isLoading, error } = useQuery<UsersResponse>({
        queryKey: ['admin-users', page, debouncedSearchTerm],
        queryFn: async () => {
            const url = new URL('/api/admin/users', window.location.origin);
            url.searchParams.set('page', page.toString());
            url.searchParams.set('limit', '50');
            if (debouncedSearchTerm) {
                url.searchParams.set('search', debouncedSearchTerm);
            }

            const response = await fetch(url.toString());

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return response.json();
        },
        staleTime: 30 * 1000, // 30 seconds
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete user');
            }
            return response.json();
        },
        onSuccess: () => {
            // Refresh the user list
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        },
    });

    // Reset page when search changes
    React.useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm]);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            handleClearSearch();
        }
    };

    const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
        setPage(newPage);
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (userToDelete) {
            deleteUserMutation.mutate(userToDelete.id);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setUserToDelete(null);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'ADMIN': return 'error';
            case 'ORGANIZER': return 'primary';
            case 'TALENT': return 'success';
            case 'BRAND_CREATOR': return 'info';
            default: return 'default';
        }
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                    Loading users...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error">
                Failed to load users: {error instanceof Error ? error.message : 'Unknown error'}
            </Alert>
        );
    }

    const { users = [], pagination } = data || {};

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                User Management
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                Manage and monitor all platform users. Search, view profiles, and perform administrative actions.
            </Typography>

            {/* Search Bar */}
            <Box sx={{ mb: 3 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                        endAdornment: searchTerm && (
                            <InputAdornment position="end">
                                <IconButton
                                    size="small"
                                    onClick={handleClearSearch}
                                    edge="end"
                                    aria-label="clear search"
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                    sx={{ maxWidth: 500 }}
                />
            </Box>

            {/* User Statistics */}
            <Box sx={{ mb: 3, display: 'flex', gap: 3, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    <strong>Total Users:</strong> {pagination?.totalUsers || 0}
                </Typography>
                {debouncedSearchTerm && (
                    <Typography variant="body2" color="text.secondary">
                        <strong>Search Results:</strong> {users.length} users found
                    </Typography>
                )}
            </Box>

            {/* Users Table */}
            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>User</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Roles</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Joined</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar
                                                src={user.image ? getS3ImageUrl(user.image) : undefined}
                                                sx={{ width: 40, height: 40 }}
                                            >
                                                <PersonIcon />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle2">
                                                    {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    ID: {user.id.slice(0, 8)}...
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {user.email}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {user.roles.map((role) => (
                                                <Chip
                                                    key={role}
                                                    label={role}
                                                    size="small"
                                                    color={getRoleColor(role) as any}
                                                    variant="outlined"
                                                />
                                            ))}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {user.emailVerified ? (
                                                <>
                                                    <VerifiedIcon color="success" fontSize="small" />
                                                    <Typography variant="caption" color="success.main">
                                                        Verified
                                                    </Typography>
                                                </>
                                            ) : (
                                                <>
                                                    <UnverifiedIcon color="warning" fontSize="small" />
                                                    <Typography variant="caption" color="warning.main">
                                                        Unverified
                                                    </Typography>
                                                </>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatDate(user.createdAt)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                component={Link}
                                                href={`/u/${user.id}`}
                                                size="small"
                                                variant="outlined"
                                            >
                                                View Profile
                                            </Button>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDeleteClick(user)}
                                                disabled={deleteUserMutation.isPending}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            {debouncedSearchTerm
                                                ? 'No users found matching your search criteria'
                                                : 'No users found'
                                            }
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <Pagination
                            count={pagination.totalPages}
                            page={pagination.currentPage}
                            onChange={handlePageChange}
                            color="primary"
                            showFirstButton
                            showLastButton
                        />
                    </Box>
                )}
            </Paper>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleDeleteCancel}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Delete User</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the user <strong>{userToDelete?.email}</strong>?
                        <br /><br />
                        This action will permanently delete the user account and cannot be undone.
                        The user will no longer be able to access their account.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleDeleteCancel}
                        disabled={deleteUserMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                        disabled={deleteUserMutation.isPending}
                    >
                        {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                    </Button>
                </DialogActions>
            </Dialog>

            {deleteUserMutation.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {deleteUserMutation.error instanceof Error
                        ? deleteUserMutation.error.message
                        : 'Failed to delete user'
                    }
                </Alert>
            )}
        </Box>
    );
};

export default UserManagement; 