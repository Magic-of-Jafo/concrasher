"use client";

import React, { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    BrandCreateSchema,
    BrandUpdateSchema,
    type BrandCreateInput,
    type BrandUpdateInput,
} from '@/lib/validators';
import { createBrand, updateBrand } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import {
    TextField,
    Button,
    Box,
    Typography,
    CircularProgress,
    Alert,
    Container,
    Paper,
} from '@mui/material';
import { Brand } from '@prisma/client';
import { ZodType, ZodTypeDef } from 'zod';
import BrandLogoUploader from './profile/BrandLogoUploader';

interface BrandCreateFormProps {
    initialData?: Brand | null;
    createSchema?: ZodType<BrandCreateInput, ZodTypeDef, BrandCreateInput>;
    updateSchema?: ZodType<BrandUpdateInput, ZodTypeDef, BrandUpdateInput>;
    onSuccess?: () => void;
}

export default function BrandCreateForm({
    initialData,
    createSchema = BrandCreateSchema,
    updateSchema = BrandUpdateSchema,
    onSuccess
}: BrandCreateFormProps) {
    const [logoUrl, setLogoUrl] = React.useState<string | null>(initialData?.logoUrl || null);

    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = React.useState<string | null>(null);
    const router = useRouter();

    const isEditMode = !!initialData;

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<BrandCreateInput | BrandUpdateInput>({
        resolver: zodResolver(isEditMode ? (updateSchema as any) : (createSchema as any)),
        defaultValues: isEditMode
            ? {
                id: initialData.id,
                name: initialData.name,
                description: initialData.description || '',
                websiteUrl: initialData.websiteUrl || '',
                logoUrl: initialData.logoUrl || '',
            }
            : {},
    });

    const onSubmit = (data: BrandCreateInput | BrandUpdateInput) => {
        setServerError(null);
        startTransition(async () => {
            try {
                let brandResult;

                if (isEditMode) {
                    // For editing, include the logo URL in the update
                    const formData = {
                        ...data,
                        logoUrl: logoUrl || '',
                    };
                    brandResult = await updateBrand(formData as BrandUpdateInput);
                } else {
                    // For new brands, create without logo first, then upload logo
                    const formData = {
                        ...data,
                        logoUrl: '', // Start with empty logo
                    };
                    brandResult = await createBrand(formData as BrandCreateInput);

                    // If brand creation was successful and we have a logo to upload
                    if (brandResult.success && brandResult.brand && logoUrl) {
                        // Check if logoUrl is a data URL (temporary) or S3 URL
                        if (logoUrl.startsWith('data:')) {
                            // Convert data URL to blob and upload to S3
                            const response = await fetch(logoUrl);
                            const blob = await response.blob();

                            const formData = new FormData();
                            formData.append('file', blob, 'brand-logo.png');
                            formData.append('mediaType', 'brand');
                            formData.append('brandId', brandResult.brand.id);

                            const uploadResponse = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData,
                            });

                            if (!uploadResponse.ok) {
                                const err = await uploadResponse.json();
                                setServerError(err.error || 'Failed to upload logo');
                                return;
                            }

                            const { url } = await uploadResponse.json();

                            // Update the brand with the S3 URL
                            const updateResult = await updateBrand({
                                id: brandResult.brand.id,
                                name: brandResult.brand.name,
                                description: brandResult.brand.description || '',
                                websiteUrl: brandResult.brand.websiteUrl || '',
                                logoUrl: url,
                            });

                            if (!updateResult.success) {
                                setServerError(updateResult.error || 'Failed to update brand with logo');
                                return;
                            }
                        } else {
                            // Logo is already an S3 URL, just update the brand
                            const updateResult = await updateBrand({
                                id: brandResult.brand.id,
                                name: brandResult.brand.name,
                                description: brandResult.brand.description || '',
                                websiteUrl: brandResult.brand.websiteUrl || '',
                                logoUrl: logoUrl,
                            });

                            if (!updateResult.success) {
                                setServerError(updateResult.error || 'Failed to update brand with logo');
                                return;
                            }
                        }
                    }
                }

                if (brandResult.success) {
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.push('/profile');
                    }
                } else {
                    setServerError(brandResult.error || 'An unknown error occurred.');
                }
            } catch (error) {
                setServerError('An unexpected error occurred.');
                console.error('Error in form submission:', error);
            }
        });
    };

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {isEditMode ? 'Edit Brand' : 'Create a New Brand'}
                </Typography>
                <Box
                    component="form"
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                    sx={{ mt: 1 }}
                >
                    {serverError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {serverError}
                        </Alert>
                    )}
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="name"
                        label="Brand Name"
                        autoFocus
                        {...register('name')}
                        error={!!errors.name}
                        helperText={errors.name?.message}
                        disabled={isPending || isSubmitting}
                    />
                    <TextField
                        margin="normal"
                        fullWidth
                        id="websiteUrl"
                        label="Website URL"
                        {...register('websiteUrl')}
                        error={!!errors.websiteUrl}
                        helperText={errors.websiteUrl?.message}
                        disabled={isPending || isSubmitting}
                    />
                    <Box sx={{ mt: 2, mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Brand Logo
                        </Typography>
                        <BrandLogoUploader
                            currentImageUrl={logoUrl}
                            onImageUpdate={setLogoUrl}
                            brandId={initialData?.id || 'temp'}
                        />
                    </Box>
                    <TextField
                        margin="normal"
                        fullWidth
                        id="description"
                        label="Brand Description (Optional)"
                        multiline
                        rows={4}
                        {...register('description')}
                        error={!!errors.description}
                        helperText={errors.description?.message}
                        disabled={isPending || isSubmitting}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={isPending || isSubmitting}
                    >
                        {isPending || isSubmitting ? (
                            <CircularProgress size={24} />
                        ) : isEditMode ? (
                            'Save Changes'
                        ) : (
                            'Create Brand'
                        )}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
