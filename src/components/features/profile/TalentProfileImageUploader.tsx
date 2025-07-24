'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Paper,
    Alert,
    LinearProgress,
    Slider,
    Avatar,
    Link,
} from '@mui/material';
import { CloudUpload as UploadIcon, OpenInNew as OpenInNewIcon, AccountCircle } from '@mui/icons-material';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { getS3ImageUrl } from '@/lib/defaults';
import { getTalentProfileUrl } from '@/lib/user-utils';

interface TalentProfileImageUploaderProps {
    currentImageUrl?: string | null;
    onImageUpdate: (url: string | null) => void;
    talentProfileId?: string;
    onDeleteDialogStateChange?: (isOpen: boolean) => void;
}

const TalentProfileImageUploader: React.FC<TalentProfileImageUploaderProps> = ({
    currentImageUrl,
    onImageUpdate,
    talentProfileId,
    onDeleteDialogStateChange
}) => {
    const { data: session } = useSession();
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCropDialog, setShowCropDialog] = useState(false);
    const [showRemoveDialog, setShowRemoveDialog] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const TARGET_WIDTH = 400;
    const TARGET_HEIGHT = 400;
    const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);

        if (file.size > MAX_FILE_SIZE) {
            setError('File size must be less than 3MB');
            return;
        }

        if (!file.type.startsWith('image/')) {
            setError('Please select a valid image file');
            return;
        }

        const img = new Image();
        img.onload = async () => {
            if (img.width > 10000 || img.height > 10000) {
                setError('Image dimensions must be less than 10,000 pixels');
                return;
            }

            try {
                // Preprocess: Create a square canvas with the original image centered
                const maxDimension = Math.max(img.width, img.height);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    throw new Error('Failed to create canvas context');
                }

                canvas.width = maxDimension;
                canvas.height = maxDimension;

                ctx.drawImage(img, (maxDimension - img.width) / 2, (maxDimension - img.height) / 2);

                const processedBlob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas to Blob failed.')));
                });

                setImageSrc(URL.createObjectURL(processedBlob));
                setShowCropDialog(true);
            } catch (error) {
                console.error('Error preprocessing image:', error);
                setError('Failed to process image');
            }
        };
        img.onerror = () => {
            setError('Invalid image file');
        };
        img.src = URL.createObjectURL(file);
    }, []);

    const handleCancelCrop = () => {
        setShowCropDialog(false);
        setImageSrc(null);
        // Reset the file input to allow selecting the same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createCroppedImage = useCallback(async (imageSrc: string, cropArea: Area): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Failed to create canvas context'));
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
        if (!imageSrc || !croppedAreaPixels || !session?.user?.id) return;

        setIsProcessing(true);
        setError(null);

        try {
            const croppedBlob = await createCroppedImage(imageSrc, croppedAreaPixels);

            const formData = new FormData();
            formData.append('file', croppedBlob, 'talent-profile-image.png');
            formData.append('userId', session.user.id);
            formData.append('mediaType', 'talent'); // Use 'talent' mediaType for talent profile images

            // Use the generic upload route
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                const err = await uploadResponse.json();
                throw new Error(err.error || 'Failed to upload image');
            }

            const { url } = await uploadResponse.json();

            // Update the talent profile with the new image URL
            onImageUpdate(url);
            handleCancelCrop(); // Close dialog and reset input
        } catch (error) {
            console.error(error);
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setIsProcessing(false);
        }
    }, [imageSrc, croppedAreaPixels, onImageUpdate, createCroppedImage, session]);

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

            // Clear the image from the talent profile
            onImageUpdate(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsProcessing(false);
            setShowRemoveDialog(false);
            onDeleteDialogStateChange?.(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Box sx={{ position: 'relative', width: 200, height: 200 }}>
                <Avatar
                    src={getS3ImageUrl(currentImageUrl) || undefined}
                    sx={{
                        width: 200,
                        height: 200,
                        backgroundColor: currentImageUrl ? 'transparent' : 'grey.300',
                        color: currentImageUrl ? 'inherit' : 'grey.600'
                    }}
                    variant="circular"
                >
                    {!currentImageUrl && <AccountCircle sx={{ fontSize: 120 }} />}
                </Avatar>
            </Box>

            {currentImageUrl && (
                <>
                    <Link
                        component="button"
                        variant="body2"
                        onClick={() => {
                            setShowRemoveDialog(true);
                            onDeleteDialogStateChange?.(true);
                        }}
                        disabled={isProcessing}
                        sx={{
                            color: 'error.main',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            border: 'none',
                            background: 'none',
                            fontSize: '0.875rem',
                            fontFamily: 'inherit',
                            '&:hover': {
                                color: 'error.dark',
                            },
                            '&:disabled': {
                                color: 'text.disabled',
                                cursor: 'not-allowed',
                            }
                        }}
                    >
                        Delete image (permanent)
                    </Link>
                </>
            )}



            {!currentImageUrl && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <Button
                        variant="outlined"
                        startIcon={<UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                    >
                        Upload Image
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                        Profile Image Size:<br />400x400 - Max 3MB
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
                <DialogTitle>Crop Your Image</DialogTitle>
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
                onClose={() => {
                    setShowRemoveDialog(false);
                    onDeleteDialogStateChange?.(false);
                }}
            >
                <DialogTitle>Delete Profile Picture?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This action is permanent and cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setShowRemoveDialog(false);
                        onDeleteDialogStateChange?.(false);
                    }} disabled={isProcessing}>
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

export default TalentProfileImageUploader; 