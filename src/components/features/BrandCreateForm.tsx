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

interface BrandCreateFormProps {
    initialData?: Brand | null;
    createSchema?: ZodType<BrandCreateInput, ZodTypeDef, BrandCreateInput>;
    updateSchema?: ZodType<BrandUpdateInput, ZodTypeDef, BrandUpdateInput>;
}

export default function BrandCreateForm({
    initialData,
    createSchema = BrandCreateSchema,
    updateSchema = BrandUpdateSchema
}: BrandCreateFormProps) {

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
            const result = isEditMode
                ? await updateBrand(data as BrandUpdateInput)
                : await createBrand(data as BrandCreateInput);

            if (result.success) {
                router.push('/profile');
            } else {
                setServerError(result.error || 'An unknown error occurred.');
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
                    <TextField
                        margin="normal"
                        fullWidth
                        id="logoUrl"
                        label="Logo URL"
                        {...register('logoUrl')}
                        error={!!errors.logoUrl}
                        helperText={errors.logoUrl?.message}
                        disabled={isPending || isSubmitting}
                    />
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
