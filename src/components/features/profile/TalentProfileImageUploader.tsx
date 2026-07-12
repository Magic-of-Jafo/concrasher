'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePasteImage, fileToInput } from '@/hooks/usePasteImage';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Alert,
    LinearProgress,
    Slider,
    Avatar,
    Link,
} from '@mui/material';
import { CloudUpload as UploadIcon, AccountCircle } from '@mui/icons-material';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { getS3ImageUrl } from '@/lib/defaults';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/upload-limits';

interface TalentProfileImageUploaderProps {
    currentImageUrl?: string | null;
    onImageUpdate: (url: string | null) => void;
    talentProfileId?: string;
    onDeleteDialogStateChange?: (isOpen: boolean) => void;
}

const themedDialogPaperSx = {
    backgroundColor: 'var(--cc-bg)',
    backgroundImage: 'none',
    color: 'var(--cc-ink)',
    border: '1px solid var(--cc-panel-border)',
};

const AVATAR_SIZE = 140;

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
    const containerRef = useRef<HTMLDivElement>(null);
    usePasteImage((file) => fileToInput(fileInputRef.current, file), { targetRef: containerRef });

    const TARGET_WIDTH = 400;
    const TARGET_HEIGHT = 400;
    const MAX_FILE_SIZE = MAX_UPLOAD_BYTES;

    // Fit the loaded image to the crop box by its longer natural dimension (same
    // logic as the convention profile uploader): the whole image starts visible.
    const [fitZoom, setFitZoom] = useState(1);
    const mediaSizeRef = useRef<{ width: number; height: number; naturalWidth: number; naturalHeight: number } | null>(null);
    const cropSizeRef = useRef<{ width: number; height: number } | null>(null);
    const fitToCropBox = useCallback(() => {
        const m = mediaSizeRef.current;
        const c = cropSizeRef.current;
        if (!m || !c) return;
        const portrait = m.naturalHeight >= m.naturalWidth;
        const z = portrait
            ? (m.height > 0 ? c.height / m.height : 1)
            : (m.width > 0 ? c.width / m.width : 1);
        setFitZoom(z);
        setZoom(z);
    }, []);

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);

        if (file.size > MAX_FILE_SIZE) {
            setError(`File size must be less than ${MAX_UPLOAD_MB}MB`);
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
                const reader = new FileReader();
                reader.onload = (e) => {
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    setFitZoom(1);
                    mediaSizeRef.current = null;
                    cropSizeRef.current = null;
                    setImageSrc(e.target?.result as string);
                    setShowCropDialog(true);
                };
                reader.readAsDataURL(file);
            } catch (err) {
                console.error('Error preprocessing image:', err);
                setError('Failed to process image');
            }
        };
        img.onerror = () => {
            setError('Invalid image file');
        };
        img.src = URL.createObjectURL(file);
    }, [MAX_FILE_SIZE]);

    const handleCancelCrop = () => {
        setShowCropDialog(false);
        setImageSrc(null);
        setCroppedAreaPixels(null);
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
                ctx.clearRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
                ctx.drawImage(
                    image,
                    cropArea.x, cropArea.y, cropArea.width, cropArea.height,
                    0, 0, TARGET_WIDTH, TARGET_HEIGHT
                );
                canvas.toBlob(
                    (blob) => { blob ? resolve(blob) : reject(new Error('Failed to create blob')); },
                    'image/png', 0.9
                );
            });
            image.addEventListener('error', (err) => reject(err));
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
            formData.append('mediaType', 'talent');

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
    }, [imageSrc, croppedAreaPixels, onImageUpdate, createCroppedImage, session]);

    const handleRemove = async () => {
        if (!currentImageUrl) return;

        setIsProcessing(true);
        setError(null);
        try {
            const response = await fetch('/api/upload', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: currentImageUrl }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to delete image from storage.');
            }

            onImageUpdate(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsProcessing(false);
            setShowRemoveDialog(false);
            onDeleteDialogStateChange?.(false);
        }
    };

    const maxZoom = Math.max(3, fitZoom * 3);

    return (
        <Box ref={containerRef} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <Box
                sx={{
                    width: AVATAR_SIZE,
                    height: AVATAR_SIZE,
                    borderRadius: '50%',
                    border: '1px solid var(--cc-panel-border)',
                    backgroundColor: 'var(--cc-panel)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                }}
            >
                {currentImageUrl ? (
                    <Avatar
                        src={getS3ImageUrl(currentImageUrl) || undefined}
                        variant="circular"
                        sx={{ width: AVATAR_SIZE, height: AVATAR_SIZE, backgroundColor: 'transparent' }}
                    />
                ) : (
                    <AccountCircle sx={{ fontSize: AVATAR_SIZE * 0.62, color: 'var(--cc-soft)' }} />
                )}
            </Box>

            {currentImageUrl ? (
                <Link
                    component="button"
                    type="button"
                    onClick={() => {
                        setShowRemoveDialog(true);
                        onDeleteDialogStateChange?.(true);
                    }}
                    disabled={isProcessing}
                    sx={{
                        color: 'var(--cc-muted)',
                        textDecoration: 'underline',
                        textDecorationColor: 'var(--cc-panel-border)',
                        cursor: 'pointer',
                        border: 'none',
                        background: 'none',
                        fontSize: '0.8rem',
                        fontFamily: 'inherit',
                        '&:hover': { color: 'var(--cc-ink)' },
                        '&:disabled': { color: 'var(--cc-soft)', cursor: 'not-allowed' },
                    }}
                >
                    Delete image (permanent)
                </Link>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                    <Button
                        variant="outlined"
                        startIcon={<UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                    >
                        Upload Image
                    </Button>
                    <Typography sx={{ fontSize: '0.78rem', color: 'var(--cc-muted)', textAlign: 'center' }}>
                        Square crop · JPG or PNG · up to {MAX_UPLOAD_MB}MB
                    </Typography>
                </Box>
            )}

            <input
                type="file"
                hidden
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/png, image/jpeg, image/gif, image/webp"
            />
            {error && <Alert severity="error" sx={{ mt: 1, width: '100%' }}>{error}</Alert>}

            {/* Crop Dialog */}
            <Dialog
                open={showCropDialog}
                onClose={handleCancelCrop}
                maxWidth="sm"
                fullWidth
                slotProps={{ paper: { sx: themedDialogPaperSx } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Crop your image</DialogTitle>
                <DialogContent>
                    <Box sx={{ width: '100%', height: 360, position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                        {imageSrc && (
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                objectFit="contain"
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                                onMediaLoaded={(m) => {
                                    mediaSizeRef.current = { width: m.width, height: m.height, naturalWidth: m.naturalWidth, naturalHeight: m.naturalHeight };
                                    fitToCropBox();
                                }}
                                onCropSizeChange={(c) => {
                                    cropSizeRef.current = c;
                                    fitToCropBox();
                                }}
                                restrictPosition={false}
                                minZoom={fitZoom}
                                maxZoom={maxZoom}
                                showGrid={false}
                            />
                        )}
                    </Box>
                    <Box sx={{ px: 1, pt: 2 }}>
                        <Typography sx={{ fontSize: '0.85rem', color: 'var(--cc-muted)', mb: 0.5 }}>Zoom</Typography>
                        <Slider
                            value={zoom}
                            min={fitZoom}
                            max={maxZoom}
                            step={0.01}
                            aria-labelledby="zoom-slider"
                            onChange={(_, newValue) => setZoom(newValue as number)}
                            disabled={isProcessing}
                            sx={{ color: 'var(--cc-gold)' }}
                        />
                    </Box>
                    {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelCrop} disabled={isProcessing} sx={{ color: 'var(--cc-muted)', textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCropConfirm}
                        variant="contained"
                        disabled={isProcessing}
                        sx={{
                            backgroundColor: 'var(--cc-gold)', color: 'var(--cc-gold-ink)',
                            fontWeight: 700, textTransform: 'none', boxShadow: 'none',
                            '&:hover': { backgroundColor: 'var(--cc-gold)', filter: 'brightness(1.05)' },
                        }}
                    >
                        {isProcessing ? <LinearProgress sx={{ width: 60 }} /> : 'Save'}
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
                slotProps={{ paper: { sx: themedDialogPaperSx } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Delete profile picture?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: 'var(--cc-muted)' }}>
                        This action is permanent and cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setShowRemoveDialog(false);
                        onDeleteDialogStateChange?.(false);
                    }} disabled={isProcessing} sx={{ color: 'var(--cc-muted)', textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button onClick={handleRemove} color="error" variant="contained" disabled={isProcessing} sx={{ textTransform: 'none' }}>
                        {isProcessing ? <LinearProgress sx={{ width: 60 }} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TalentProfileImageUploader;
