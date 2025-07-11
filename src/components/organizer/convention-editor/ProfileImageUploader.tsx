import React, { useState, useCallback, useRef } from 'react';
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
import { CloudUpload as UploadIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { getS3ImageUrl } from '@/lib/defaults';

interface ProfileImageUploaderProps {
    conventionId: string;
    currentImageUrl?: string;
    onImageUpdate: (imageUrl: string | null) => void;
}

export const ProfileImageUploader: React.FC<ProfileImageUploaderProps> = ({
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

    const TARGET_WIDTH = 400;
    const TARGET_HEIGHT = 400;
    const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            setError('File size must be less than 3MB');
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
                // Preprocess: Create a square canvas with the original image centered
                const maxDimension = Math.max(img.width, img.height);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    throw new Error('Failed to create canvas context');
                }

                // Set canvas to be square with the larger dimension
                canvas.width = maxDimension;
                canvas.height = maxDimension;

                // Clear canvas (transparent background)
                ctx.clearRect(0, 0, maxDimension, maxDimension);

                // Calculate position to center the image
                const xOffset = (maxDimension - img.width) / 2;
                const yOffset = (maxDimension - img.height) / 2;

                // Draw the original image centered on the square canvas
                ctx.drawImage(img, xOffset, yOffset, img.width, img.height);

                // Convert canvas to blob with minimal compression
                const processedBlob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Failed to create processed image blob'));
                            }
                        },
                        'image/png',
                        0.95 // Minimal compression for quality
                    );
                });

                // Create object URL for the processed square image
                const processedImageUrl = URL.createObjectURL(processedBlob);

                setImageSrc(processedImageUrl);
                console.log(`[ProfileImageUploader] Original dimensions: ${img.width}x${img.height}`);
                console.log(`[ProfileImageUploader] Processed dimensions: ${maxDimension}x${maxDimension}`);
                console.log(`[ProfileImageUploader] Target dimensions: ${TARGET_WIDTH}x${TARGET_HEIGHT}`);
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
                canvas.width = TARGET_WIDTH;
                canvas.height = TARGET_HEIGHT;

                // Clear canvas with transparent background
                ctx.clearRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

                // Since we use aspect={1} in the cropper, the cropArea is always square
                // We should draw this square crop to fill the entire 400x400 canvas
                // This maintains the aspect ratio of the selected square area
                ctx.drawImage(
                    image,
                    cropArea.x,
                    cropArea.y,
                    cropArea.width,
                    cropArea.height,
                    0,
                    0,
                    TARGET_WIDTH,
                    TARGET_HEIGHT
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
            formData.append('file', croppedBlob, 'profile-image.png');
            formData.append('conventionId', conventionId);
            formData.append('mediaType', 'profile');

            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload image');
            }

            const { url } = await uploadResponse.json();

            // Update convention with new profile image URL
            console.log(`[ProfileImageUploader] Updating convention ${conventionId} with profileImageUrl:`, url);
            const updateResponse = await fetch(`/api/organizer/conventions/${conventionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    profileImageUrl: url,
                }),
            });

            console.log(`[ProfileImageUploader] Update response status:`, updateResponse.status);

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                console.log(`[ProfileImageUploader] Error response body:`, errorText);
                throw new Error('Failed to update convention');
            }

            const responseData = await updateResponse.json();
            console.log(`[ProfileImageUploader] Success response body:`, responseData);

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
            console.error('Error uploading profile image:', error);
            setError(error instanceof Error ? error.message : 'Failed to upload image');
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
                    key: currentImageUrl.replace('/uploads/', ''),
                }),
            });

            if (!deleteResponse.ok) {
                console.warn('Failed to delete file from server, continuing with database update');
            }

            // Update convention to remove profile image URL
            const updateResponse = await fetch(`/api/organizer/conventions/${conventionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    profileImageUrl: null,
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
            console.error('Error removing profile image:', error);
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
        <Box>
            <Typography variant="h6" gutterBottom>
                Profile Image
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Upload a profile image for your convention (400×400px). The image will be displayed as an avatar.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                {currentImageUrl ? (
                    <Box>
                        <Box sx={{ mb: 2 }}>
                            <img
                                src={getS3ImageUrl(currentImageUrl)}
                                alt="Profile Image"
                                style={{
                                    width: '200px',
                                    height: '200px',
                                    objectFit: 'contain',
                                    borderRadius: '4px',
                                    border: '1px solid #e0e0e0',
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
                                Remove Profile Image (Permanent)
                            </Link>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            No Profile Image
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Add a profile image to represent your convention
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<UploadIcon />}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                        >
                            Upload Profile Image
                        </Button>
                    </Box>
                )}
            </Paper>

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
                <DialogTitle>Crop Profile Image</DialogTitle>
                <DialogContent sx={{ height: '500px', position: 'relative', pb: 3 }}>
                    <Box sx={{ height: '400px', position: 'relative', mb: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {imageSrc && (
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1} // Square aspect ratio
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                                restrictPosition={false}
                                minZoom={0.1}
                                maxZoom={3}
                                showGrid={false}
                            />
                        )}
                    </Box>
                    <Box sx={{ px: 2 }}>
                        <Typography variant="body2" gutterBottom>
                            Zoom
                        </Typography>
                        <Slider
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
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
                <DialogTitle>Remove Profile Image</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to permanently remove the profile image? This action cannot be undone.
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