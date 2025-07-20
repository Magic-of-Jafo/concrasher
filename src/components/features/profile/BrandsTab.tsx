"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardActions,
    Typography,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    IconButton,
    Chip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import BrandCreateForm from '../BrandCreateForm';
import { getUserBrands, deleteBrand } from '@/lib/actions';

// Utility function to construct S3 URL safely
const getS3ImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('https://') || url.startsWith('data:')) return url;
    const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
    if (!bucketName) {
        console.warn('NEXT_PUBLIC_S3_BUCKET_NAME not defined');
        return url; // Return original URL if env var is not available
    }
    return `https://${bucketName}.s3.us-east-1.amazonaws.com/${url}`;
};

interface Brand {
    id: string;
    name: string;
    description?: string;
    logoUrl?: string;
    websiteUrl?: string;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
}

interface BrandsTabProps {
    userId: string;
    user: any;
}

export default function BrandsTab({ userId, user }: BrandsTabProps) {
    const { data: session } = useSession();
    const [brands, setBrands] = useState<Brand[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

    // Safety check for userId
    if (!userId) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <Typography variant="h6" color="error">
                    User ID is required
                </Typography>
            </Box>
        );
    }

    // Fetch user's brands
    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const result = await getUserBrands(userId);
                if (result.success && result.brands) {
                    setBrands(result.brands);
                } else {
                    setError(result.error || 'Failed to load brands');
                }
            } catch (err) {
                setError('Failed to load brands');
                console.error('Error fetching brands:', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            fetchBrands();
        }
    }, [userId]);

    const handleAddBrand = () => {
        setEditingBrand(null);
        setIsModalOpen(true);
    };

    const handleEditBrand = (brand: Brand) => {
        setEditingBrand(brand);
        setIsModalOpen(true);
    };

    const handleDeleteBrand = async (brandId: string) => {
        if (!confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
            return;
        }

        try {
            const result = await deleteBrand(brandId);
            if (result.success) {
                // Remove the brand from the local state
                setBrands(prevBrands => prevBrands.filter(brand => brand.id !== brandId));
            } else {
                setError(result.error || 'Failed to delete brand');
            }
        } catch (err) {
            setError('Failed to delete brand');
            console.error('Error deleting brand:', err);
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingBrand(null);
        // Refresh brands list by refetching
        const fetchBrands = async () => {
            try {
                const result = await getUserBrands(userId);
                if (result.success && result.brands) {
                    setBrands(result.brands);
                }
            } catch (err) {
                console.error('Error refreshing brands:', err);
            }
        };
        fetchBrands();
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        );
    }

    return (
        <Box>
            {/* Header with Add Brand button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" component="h2">
                    My Brands
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddBrand}
                >
                    Add a Brand
                </Button>
            </Box>

            {/* Brands Grid */}
            {brands.length === 0 ? (
                <Card sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No brands yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Create your first brand to get started
                    </Typography>
                </Card>
            ) : (
                <Grid container spacing={3}>
                    {brands.map((brand) => (
                        // @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error
                        <Grid item xs={12} sm={6} md={4} key={brand.id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                {brand.logoUrl && (
                                    <Box sx={{ p: 2, textAlign: 'center' }}>
                                        <img
                                            src={getS3ImageUrl(brand.logoUrl) || ''}
                                            alt={`${brand.name} logo`}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100px',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    </Box>
                                )}
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="h6" component="h3" gutterBottom>
                                        {brand.name}
                                    </Typography>
                                    {brand.description && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            {brand.description}
                                        </Typography>
                                    )}
                                    {brand.websiteUrl && (
                                        <Chip
                                            label="Website"
                                            size="small"
                                            component="a"
                                            href={brand.websiteUrl}
                                            target="_blank"
                                            clickable
                                            sx={{ mr: 1 }}
                                        />
                                    )}
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                        Created: {new Date(brand.createdAt).toLocaleDateString()}
                                    </Typography>
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'space-between' }}>
                                    <Box>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEditBrand(brand)}
                                            color="primary"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDeleteBrand(brand.id)}
                                            color="error"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Add/Edit Brand Modal */}
            <Dialog
                open={isModalOpen}
                onClose={handleModalClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {editingBrand ? 'Edit Brand' : 'Add a Brand'}
                </DialogTitle>
                <DialogContent>
                    <BrandCreateForm
                        initialData={editingBrand as any || undefined}
                        onSuccess={handleModalClose}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleModalClose}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
} 