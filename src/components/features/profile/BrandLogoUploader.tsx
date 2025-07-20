"use client";

import React, { useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
    Box,
    Avatar,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
    IconButton,
    Alert,
    Typography,
    Slider,
    LinearProgress,
    CircularProgress
} from '@mui/material';
import { Upload as UploadIcon, Close as CloseIcon } from '@mui/icons-material';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop/types';

const TARGET_WIDTH = 400;
const TARGET_HEIGHT = 400;

interface BrandLogoUploaderProps {
    currentImageUrl?: string | null;
    onImageUpdate: (url: string | null) => void;
    brandId?: string; // Brand ID for S3 folder structure
}

const BrandLogoUploader: React.FC<BrandLogoUploaderProps> = ({
    currentImageUrl,
    onImageUpdate,
    brandId
}) => {
    const { data: session, status } = useSession();

    // Don't render until session is loaded
    if (status === 'loading') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }
    const [showCropDialog, setShowCropDialog] = useState(false);
    const [showRemoveDialog, setShowRemoveDialog] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getS3ImageUrl = (url: string | null): string | null => {
        if (!url) return null;
        // If it's already a full S3 URL or data URL, return as is
        if (url.startsWith('https://') || url.startsWith('data:')) return url;
        // Otherwise, construct the full S3 URL
        const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
        if (!bucketName) {
            console.warn('NEXT_PUBLIC_S3_BUCKET_NAME not defined');
            return url; // Return original URL if env var is not available
        }
        return `https://${bucketName}.s3.us-east-1.amazonaws.com/${url}`;
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
            return;
        }

        // Validate file size (3MB limit)
        if (file.size > 3 * 1024 * 1024) {
            setError('File size must be less than 3MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImageSrc(reader.result as string);
            setShowCropDialog(true);
        };
        reader.readAsDataURL(file);
    };

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCancelCrop = () => {
        setShowCropDialog(false);
        setImageSrc(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const createCroppedImage = useCallback((imageSrc: string, cropArea: Area): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('No 2d context'));
                    return;
                }

                canvas.width = TARGET_WIDTH;
                canvas.height = TARGET_HEIGHT;

                ctx.drawImage(
                    image,
                    cropArea.x,
                    cropArea.y,
                    cropArea.width,
                    cropArea.height,
                    0, 0, TARGET_WIDTH, TARGET_HEIGHT
                );

                canvas.toBlob(
                    (blob) => {
                        if (blob) { resolve(blob); }
                        else { reject(new Error('Failed to create blob')); }
                    }, 'image/png', 0.9
                );
            });
            image.addEventListener('error', (error) => {
                reject(error);
            });
            image.src = imageSrc;
        });
    }, []);

    const handleCropConfirm = useCallback(async () => {
        if (!imageSrc || !croppedAreaPixels || !session?.user?.id) {
            setError('Session not available');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const croppedBlob = await createCroppedImage(imageSrc, croppedAreaPixels);

            // For new brands (brandId is 'temp'), store the blob temporarily
            if (brandId === 'temp') {
                // Store the blob in a data URL for later upload
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result as string;
                    onImageUpdate(dataUrl); // Store as data URL temporarily
                    handleCancelCrop();
                };
                reader.readAsDataURL(croppedBlob);
                return;
            }

            // For existing brands, upload immediately
            const formData = new FormData();
            formData.append('file', croppedBlob, 'brand-logo.png');
            formData.append('mediaType', 'brand');
            formData.append('brandId', brandId!);

            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                const err = await uploadResponse.json();
                throw new Error(err.error || 'Failed to upload image');
            }

            const { url } = await uploadResponse.json();
            onImageUpdate(url);
            handleCancelCrop();
        } catch (error) {
            console.error(error);
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setIsProcessing(false);
        }
    }, [imageSrc, croppedAreaPixels, onImageUpdate, createCroppedImage, session, brandId]);

    const handleRemove = async () => {
        if (!currentImageUrl) return;

        setIsProcessing(true);
        setError(null);
        try {
            // Call the DELETE endpoint
            const response = await fetch('/api/upload', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key: currentImageUrl }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to delete image from storage.');
            }

            // Clear the image from the brand
            onImageUpdate(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsProcessing(false);
            setShowRemoveDialog(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Box sx={{ position: 'relative', width: 200, height: 200 }}>
                <Avatar src={getS3ImageUrl(currentImageUrl || null) || undefined} sx={{ width: 200, height: 200 }} variant="circular" />
                {currentImageUrl && (
                    <IconButton
                        aria-label="remove brand logo"
                        onClick={() => setShowRemoveDialog(true)}
                        disabled={isProcessing}
                        sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            color: 'common.white',
                            backgroundColor: 'error.main',
                            '&:hover': {
                                backgroundColor: 'error.dark',
                            },
                            width: 24,
                            height: 24,
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>

            {!currentImageUrl && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <Button
                        variant="outlined"
                        startIcon={<UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                    >
                        Upload Logo
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                        Brand Logo Size:<br />400x400 - Max 3MB
                    </Typography>
                </Box>
            )}

            <input
                type="file"
                hidden
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/png, image/jpeg, image/gif"
            />
            {error && <Alert severity="error" sx={{ mt: 1, width: '100%' }}>{error}</Alert>}

            {/* Crop Dialog */}
            <Dialog open={showCropDialog} onClose={handleCancelCrop} maxWidth="sm" fullWidth>
                <DialogTitle>Crop Your Logo</DialogTitle>
                <DialogContent>
                    <Box sx={{ width: '100%', height: 400, position: 'relative' }}>
                        {imageSrc && (
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        )}
                    </Box>
                    <Box sx={{ p: 2, pt: 3 }}>
                        <Typography gutterBottom>Zoom</Typography>
                        <Slider
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="zoom-slider"
                            onChange={(e, newValue) => setZoom(newValue as number)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelCrop} disabled={isProcessing}>Cancel</Button>
                    <Button onClick={handleCropConfirm} variant="contained" disabled={isProcessing}>
                        {isProcessing ? <LinearProgress sx={{ width: '100%' }} /> : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Remove Confirmation Dialog */}
            <Dialog
                open={showRemoveDialog}
                onClose={() => setShowRemoveDialog(false)}
            >
                <DialogTitle>Delete Brand Logo?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This action is permanent and cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowRemoveDialog(false)} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button onClick={handleRemove} color="error" variant="contained" disabled={isProcessing}>
                        {isProcessing ? <LinearProgress sx={{ width: '100%' }} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default BrandLogoUploader; 