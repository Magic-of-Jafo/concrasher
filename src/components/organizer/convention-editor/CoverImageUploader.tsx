import React, { useState, useCallback, useRef } from 'react';
import { usePasteImage, fileToInput } from '@/hooks/usePasteImage';
import ImageDropZone from '@/components/ui/ImageDropZone';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
    Alert,
    LinearProgress,
    Link,
    Slider
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { getS3ImageUrl } from '@/lib/defaults';

interface CoverImageUploaderProps {
    conventionId: string;
    currentImageUrl?: string;
    onImageUpdate: (imageUrl: string | null) => void;
}

export const CoverImageUploader: React.FC<CoverImageUploaderProps> = ({
    conventionId,
    currentImageUrl,
    onImageUpdate
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

    // Scale the loaded image so its HEIGHT matches the CROP BOX height (the white
    // rectangle), NOT the whole editing canvas. A narrower image then leaves gaps on
    // the sides inside the crop box; the user can zoom in from there. The saved file
    // is clamped to real pixels (no transparent padding); the display banner centers
    // a too-narrow image so any side bars come from the container, not the file.
    const [fitZoom, setFitZoom] = useState(1);
    const mediaSizeRef = useRef<{ width: number; height: number } | null>(null);
    const cropSizeRef = useRef<{ width: number; height: number } | null>(null);
    const fitToCropHeight = useCallback(() => {
        const m = mediaSizeRef.current;
        const c = cropSizeRef.current;
        if (m && c && m.height > 0) {
            const z = c.height / m.height;
            setFitZoom(z);
            setZoom(z);
        }
    }, []);

    // Canonical Facebook cover spec (851×315, ~2.7:1).
    const TARGET_WIDTH = 851;
    const TARGET_HEIGHT = 315;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            setError('File size must be less than 5MB');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select a valid image file');
            return;
        }

        // Check dimensions
        const img = new Image();
        img.onload = async () => {
            if (img.width > 10000 || img.height > 10000) {
                setError('Image dimensions must be less than 10,000 pixels');
                return;
            }

            setSelectedFile(file);

            try {
                // Load the original image as-is; onMediaLoaded/onCropSizeChange then
                // scale it so its height matches the crop-box height (fitToCropHeight).
                const reader = new FileReader();
                reader.onload = (e) => {
                    setZoom(1);
                    setFitZoom(1);
                    setImageSrc(e.target?.result as string);
                    setShowCropDialog(true);
                };
                reader.readAsDataURL(file);

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

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createCroppedImage = useCallback(async (
        imageSrc: string,
        cropArea: Area
    ): Promise<Blob> => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Failed to create canvas context');
        }

        const image = new Image();

        return new Promise((resolve, reject) => {
            image.onload = () => {
                // The crop box can extend past the image sides (narrower image fit by
                // height), which would bake transparent bars into the PNG. Clamp the
                // source rect to the real image pixels and size the canvas to match, so
                // the saved file is only real pixels — no transparent padding, no
                // distortion. The display banner centers it; side bars come from there.
                const scale = TARGET_WIDTH / cropArea.width; // aspect-locked: == TARGET_HEIGHT / cropArea.height

                const sx = Math.max(0, cropArea.x);
                const sy = Math.max(0, cropArea.y);
                const sRight = Math.min(image.naturalWidth, cropArea.x + cropArea.width);
                const sBottom = Math.min(image.naturalHeight, cropArea.y + cropArea.height);
                const sw = Math.max(1, sRight - sx);
                const sh = Math.max(1, sBottom - sy);

                canvas.width = Math.round(sw * scale);
                canvas.height = Math.round(sh * scale);

                ctx.drawImage(
                    image,
                    sx,
                    sy,
                    sw,
                    sh,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create blob'));
                        }
                    },
                    'image/png',
                    0.9 // Light compression
                );
            };
            image.onerror = () => reject(new Error('Failed to load image'));
            image.src = imageSrc;
        });
    }, []);

    const handleCropConfirm = useCallback(async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        setIsProcessing(true);
        setError(null);

        try {
            // Create cropped image
            const croppedBlob = await createCroppedImage(imageSrc, croppedAreaPixels);

            // Upload to server
            const formData = new FormData();
            formData.append('file', croppedBlob, 'cover-image.png');
            formData.append('conventionId', conventionId);
            formData.append('mediaType', 'cover');

            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload image');
            }

            const { url } = await uploadResponse.json();

            // Update convention with new cover image URL
            console.log(`[CoverImageUploader] Updating convention ${conventionId} with coverImageUrl:`, url);
            const updateResponse = await fetch(`/api/organizer/conventions/${conventionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    coverImageUrl: url,
                }),
            });

            console.log(`[CoverImageUploader] Update response status:`, updateResponse.status);

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                console.log(`[CoverImageUploader] Error response body:`, errorText);
                throw new Error('Failed to update convention');
            }

            const responseData = await updateResponse.json();
            console.log(`[CoverImageUploader] Success response body:`, responseData);

            // Update parent component
            onImageUpdate(url);

            // Clean up
            // Clean up object URL to prevent memory leaks
            if (imageSrc && imageSrc.startsWith('blob:')) {
                URL.revokeObjectURL(imageSrc);
            }

            setShowCropDialog(false);
            setImageSrc(null);
            setSelectedFile(null);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCroppedAreaPixels(null);

            // Reset file input to allow selecting the same file again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (error) {
            console.error('Error uploading cover image:', error);
            setError(error instanceof Error ? error.message : 'Failed to upload image');

            // Clean up object URL on error to prevent memory leaks
            if (imageSrc && imageSrc.startsWith('blob:')) {
                URL.revokeObjectURL(imageSrc);
            }
        } finally {
            setIsProcessing(false);
        }
    }, [imageSrc, croppedAreaPixels, conventionId, onImageUpdate]);

    const handleRemoveImage = useCallback(async () => {
        if (!currentImageUrl) return;

        setIsProcessing(true);
        setError(null);

        try {
            // Delete file from server
            const deleteResponse = await fetch('/api/upload', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    key: currentImageUrl, // Send the full URL
                }),
            });

            if (!deleteResponse.ok) {
                console.warn('Failed to delete file from server, continuing with database update');
            }

            // Update convention to remove cover image URL
            const updateResponse = await fetch(`/api/organizer/conventions/${conventionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    coverImageUrl: null,
                }),
            });

            if (!updateResponse.ok) {
                throw new Error('Failed to update convention');
            }

            // Update parent component
            onImageUpdate(null);
            setShowRemoveDialog(false);

            // Reset file input to allow selecting the same file again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (error) {
            console.error('Error removing cover image:', error);
            setError(error instanceof Error ? error.message : 'Failed to remove image');
        } finally {
            setIsProcessing(false);
        }
    }, [currentImageUrl, conventionId, onImageUpdate]);

    const handleCropCancel = useCallback(() => {
        // Clean up object URL to prevent memory leaks
        if (imageSrc && imageSrc.startsWith('blob:')) {
            URL.revokeObjectURL(imageSrc);
        }

        setShowCropDialog(false);
        setImageSrc(null);
        setSelectedFile(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setError(null);

        // Reset file input to allow selecting the same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [imageSrc]);

    return (
        <Box ref={containerRef}>
            <Typography variant="h6" gutterBottom>
                Cover Image
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Upload a cover image for your convention (851×315px). The image will be displayed as a banner.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {currentImageUrl ? (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ mb: 2 }}>
                        <img
                            src={getS3ImageUrl(currentImageUrl)}
                            alt="Cover Image"
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                height: 'auto',
                                aspectRatio: '851/315',
                                objectFit: 'contain',
                                borderRadius: '4px',
                            }}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Link
                            component="button"
                            variant="body2"
                            color="error"
                            onClick={() => setShowRemoveDialog(true)}
                        >
                            Remove Cover Image (Permanent)
                        </Link>
                    </Box>
                </Paper>
            ) : (
                <Box sx={{ mb: 2 }}>
                    <ImageDropZone
                        onPick={() => fileInputRef.current?.click()}
                        onFile={(f) => fileToInput(fileInputRef.current, f)}
                        label="Add a cover image"
                        hint="Click, drag an image here, or paste (Ctrl/Cmd+V) · 851×315"
                        disabled={isProcessing}
                    />
                </Box>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />

            {/* Crop Dialog */}
            <Dialog
                open={showCropDialog}
                onClose={handleCropCancel}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Crop Cover Image</DialogTitle>
                <DialogContent sx={{ height: '500px', position: 'relative', pb: 3 }}>
                    <Box sx={{ height: '400px', position: 'relative', mb: 2 }}>
                        {imageSrc && (
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={TARGET_WIDTH / TARGET_HEIGHT}
                                objectFit="contain"
                                minZoom={fitZoom}
                                restrictPosition={false}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                                onMediaLoaded={(m) => { mediaSizeRef.current = { width: m.width, height: m.height }; fitToCropHeight(); }}
                                onCropSizeChange={(c) => { cropSizeRef.current = c; fitToCropHeight(); }}
                            />
                        )}
                    </Box>
                    <Box sx={{ px: 2 }}>
                        <Typography variant="body2" gutterBottom>
                            Zoom
                        </Typography>
                        <Slider
                            value={zoom}
                            min={fitZoom}
                            max={Math.max(3, fitZoom * 3)}
                            step={0.01}
                            aria-labelledby="zoom-slider"
                            onChange={(_, value) => setZoom(value as number)}
                            disabled={isProcessing}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCropCancel} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCropConfirm}
                        variant="contained"
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Processing...' : 'Upload'}
                    </Button>
                </DialogActions>
                {isProcessing && <LinearProgress />}
            </Dialog>

            {/* Remove Confirmation Dialog */}
            <Dialog open={showRemoveDialog} onClose={() => setShowRemoveDialog(false)}>
                <DialogTitle>Remove Cover Image</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to permanently remove the cover image? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowRemoveDialog(false)} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRemoveImage}
                        color="error"
                        variant="contained"
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Removing...' : 'Remove'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}; 