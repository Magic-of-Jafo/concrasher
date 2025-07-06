import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    Paper,
    Divider,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Tabs,
    Tab
} from '@mui/material';
import { Add as AddIcon, VideoLibrary as VideoIcon, Image as ImageIcon } from '@mui/icons-material';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import ImageUploader from '@/components/ui/ImageUploader';
import { CoverImageUploader } from './CoverImageUploader';
import { ProfileImageUploader } from './ProfileImageUploader';
import { PromotionalImageItem } from './PromotionalImageItem';
import { VideoLinkItem } from './VideoLinkItem';
import { updateConventionMedia } from '@/lib/actions';
import { type ConventionMediaData } from '@/lib/validators';

interface MediaTabProps {
    conventionId: string;
    initialMedia?: ConventionMediaData[];
    initialCoverImageUrl?: string;
    initialProfileImageUrl?: string;
    onSave?: (success: boolean, message?: string) => void;
}

export const MediaTab: React.FC<MediaTabProps> = ({
    conventionId,
    initialMedia = [],
    initialCoverImageUrl,
    initialProfileImageUrl,
    onSave,
}) => {
    const [media, setMedia] = useState<ConventionMediaData[]>(initialMedia);
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(initialCoverImageUrl || null);
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(initialProfileImageUrl || null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showVideoDialog, setShowVideoDialog] = useState(false);
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [isFetchingVideoTitle, setIsFetchingVideoTitle] = useState(false);
    const [galleryTab, setGalleryTab] = useState(0); // 0 for images, 1 for videos

    // Separate images and videos
    const images = media.filter(m => m.type === 'IMAGE');
    const videos = media.filter(m => m.type === 'VIDEO_LINK');

    // Debug logging (can be removed when stable)
    // console.log('[MediaTab] Current media state:', media);
    // console.log('[MediaTab] Filtered images:', images);
    // console.log('[MediaTab] Filtered videos:', videos);

    useEffect(() => {
        if (initialMedia !== undefined) {
            setMedia(initialMedia);
        }
    }, [initialMedia]);

    useEffect(() => {
        setCoverImageUrl(initialCoverImageUrl || null);
    }, [initialCoverImageUrl]);

    useEffect(() => {
        setProfileImageUrl(initialProfileImageUrl || null);
    }, [initialProfileImageUrl]);

    // Handle cover image updates
    const handleCoverImageUpdate = useCallback((imageUrl: string | null) => {
        setCoverImageUrl(imageUrl);
    }, []);

    // Handle profile image updates
    const handleProfileImageUpdate = useCallback((imageUrl: string | null) => {
        setProfileImageUrl(imageUrl);
    }, []);

    // Handle gallery tab change
    const handleGalleryTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
        setGalleryTab(newValue);
    }, []);

    // Handle promotional image upload with auto-save
    const handlePromotionalImageUpload = useCallback(async (imageUrl: string) => {
        let updatedMediaForDatabase: ConventionMediaData[] = [];

        // Use functional update to avoid race conditions with multiple uploads
        setMedia(prev => {
            const newImage: ConventionMediaData = {
                conventionId,
                type: 'IMAGE',
                url: imageUrl,
                caption: '',
                order: prev.filter(m => m.type === 'IMAGE').length, // Count existing images
            };

            const newMedia = [...prev, newImage];
            updatedMediaForDatabase = newMedia; // Store for database save
            console.log('[MediaTab] Updated media state:', newMedia);
            console.log('[MediaTab] New image object:', newImage);
            return newMedia;
        });

        // Auto-save to database
        try {
            const result = await updateConventionMedia(conventionId, updatedMediaForDatabase);
            console.log('[MediaTab] Save result:', result);
            if (result.success) {
                const successMsg = 'Image added and saved successfully!';
                setSuccess(successMsg);
                setTimeout(() => setSuccess(null), 3000);
                if (onSave) onSave(true, successMsg);
            } else {
                console.error('[MediaTab] Save failed:', result.error);
                console.error('[MediaTab] Field errors:', result.fieldErrors);
                setError(result.error || 'Failed to save image to database');
                // Remove from local state if database save failed
                setMedia(prev => prev.filter(m => m.url !== imageUrl));
            }
        } catch (error) {
            console.error('[MediaTab] Save exception:', error);
            setError('Failed to save image to database');
            // Remove from local state if database save failed
            setMedia(prev => prev.filter(m => m.url !== imageUrl));
        }
    }, [conventionId, onSave]);

    // Handle drag and drop reordering for images with auto-save
    const handleImageDragEnd = useCallback(async (result: DropResult) => {
        if (!result.destination) return;

        const sourceIndex = result.source.index;
        const destIndex = result.destination.index;

        if (sourceIndex === destIndex) return;

        const newImages = Array.from(images);
        const [reorderedItem] = newImages.splice(sourceIndex, 1);
        newImages.splice(destIndex, 0, reorderedItem);

        // Update order property
        const updatedImages = newImages.map((img, index) => ({
            ...img,
            order: index
        }));

        // Update media array
        const updatedMedia = [
            ...updatedImages,
            ...media.filter(m => m.type === 'VIDEO_LINK')
        ];

        setMedia(updatedMedia);

        // Auto-save to database
        try {
            const result = await updateConventionMedia(conventionId, updatedMedia);
            if (result.success) {
                setSuccess('Image order updated!');
                setTimeout(() => setSuccess(null), 2000);
            } else {
                setError(result.error || 'Failed to save new order');
                // Restore previous state if save failed
                setMedia(media);
            }
        } catch (error) {
            setError('Failed to save new order');
            // Restore previous state if save failed
            setMedia(media);
        }
    }, [images, media, conventionId]);

    // Handle drag and drop reordering for videos with auto-save
    const handleVideoDragEnd = useCallback(async (result: DropResult) => {
        if (!result.destination) return;

        const sourceIndex = result.source.index;
        const destIndex = result.destination.index;

        if (sourceIndex === destIndex) return;

        const newVideos = Array.from(videos);
        const [reorderedItem] = newVideos.splice(sourceIndex, 1);
        newVideos.splice(destIndex, 0, reorderedItem);

        // Update order property
        const updatedVideos = newVideos.map((video, index) => ({
            ...video,
            order: index
        }));

        // Update media array
        const updatedMedia = [
            ...media.filter(m => m.type === 'IMAGE'),
            ...updatedVideos
        ];

        setMedia(updatedMedia);

        // Auto-save to database
        try {
            const result = await updateConventionMedia(conventionId, updatedMedia);
            if (result.success) {
                setSuccess('Video order updated!');
                setTimeout(() => setSuccess(null), 2000);
            } else {
                setError(result.error || 'Failed to save new order');
                // Restore previous state if save failed
                setMedia(media);
            }
        } catch (error) {
            setError('Failed to save new order');
            // Restore previous state if save failed
            setMedia(media);
        }
    }, [videos, media, conventionId]);

    // Handle media item updates with auto-save
    const handleMediaUpdate = useCallback(async (index: number, updatedMedia: ConventionMediaData) => {
        const newMedia = [...media];
        const actualIndex = newMedia.findIndex(m =>
            m.type === updatedMedia.type &&
            m.url === updatedMedia.url
        );

        if (actualIndex !== -1) {
            newMedia[actualIndex] = updatedMedia;
            setMedia(newMedia);

            // Auto-save to database
            try {
                const result = await updateConventionMedia(conventionId, newMedia);
                if (!result.success) {
                    setError(result.error || 'Failed to save changes');
                    // Restore previous state if save failed
                    setMedia(media);
                }
            } catch (error) {
                setError('Failed to save changes');
                // Restore previous state if save failed
                setMedia(media);
            }
        }
    }, [conventionId, media]);

    // Handle media item removal with file deletion and auto-save
    const handleMediaRemove = useCallback(async (mediaToRemove: ConventionMediaData) => {
        try {
            // Remove from local state first for immediate UI feedback
            const updatedMedia = media.filter(m =>
                !(m.type === mediaToRemove.type && m.url === mediaToRemove.url)
            );
            setMedia(updatedMedia);

            // Delete file from storage
            try {
                const deleteResponse = await fetch('/api/upload', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        key: mediaToRemove.url.replace('/uploads/', ''),
                    }),
                });

                if (!deleteResponse.ok) {
                    console.warn('Failed to delete file from storage:', mediaToRemove.url);
                }
            } catch (fileError) {
                console.warn('Error deleting file from storage:', fileError);
            }

            // Auto-save updated media list to database
            const result = await updateConventionMedia(conventionId, updatedMedia);
            if (result.success) {
                setSuccess('Image removed successfully!');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(result.error || 'Failed to update database');
                // Restore item to local state if database update failed
                setMedia(media);
            }
        } catch (error) {
            setError('Failed to remove image');
            // Restore item to local state if operation failed
            setMedia(media);
        }
    }, [conventionId, media]);

    // Utility function to fetch video title
    const fetchVideoTitle = async (url: string): Promise<string> => {
        try {
            // Improved regex patterns for YouTube and Vimeo
            const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
            const vimeoMatch = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/);

            if (youtubeMatch) {
                // Use YouTube oEmbed API (no API key required)
                const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
                if (response.ok) {
                    const data = await response.json();
                    return data.title || '';
                }
            } else if (vimeoMatch) {
                // Use Vimeo oEmbed API
                const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
                if (response.ok) {
                    const data = await response.json();
                    return data.title || '';
                }
            }
        } catch (error) {
            console.error('[MediaTab] Failed to fetch video title:', error);
        }
        return ''; // Return empty string if title fetch fails
    };

    // Handle video link addition with auto-save
    const handleAddVideoLink = useCallback(async () => {
        if (!newVideoUrl.trim()) return;

        // Basic validation for YouTube/Vimeo URLs using improved regex
        const youtubeMatch = newVideoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        const vimeoMatch = newVideoUrl.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/);

        if (!youtubeMatch && !vimeoMatch) {
            setError('Please enter a valid YouTube or Vimeo URL');
            return;
        }

        const videoUrl = newVideoUrl.trim();

        // Show loading state while fetching title
        setIsFetchingVideoTitle(true);
        setError(null);

        try {
            // Fetch video title
            const videoTitle = await fetchVideoTitle(videoUrl);

            // Additional sanitization for video title
            let sanitizedCaption = '';
            if (videoTitle) {
                sanitizedCaption = String(videoTitle)
                    .normalize('NFD') // Decompose accented characters
                    .replace(/[\u0300-\u036f]/g, '') // Remove diacritic marks, keep base letter
                    .trim()
                    .replace(/[^\w\s\-_.,:;!?@#$%^&*()+=\[\]{}|<>']/g, '') // Allow common punctuation per tests
                    .replace(/\s+/g, ' ') // Collapse consecutive spaces
                    .substring(0, 500); // Limit length
            }

            const newVideo: ConventionMediaData = {
                conventionId,
                type: 'VIDEO_LINK',
                url: videoUrl,
                caption: sanitizedCaption || undefined, // Use undefined if empty string
                order: videos.length,
            };

            // Add to local state immediately
            const updatedMedia = [...media, newVideo];
            setMedia(updatedMedia);
            setNewVideoUrl('');
            setShowVideoDialog(false);

            // Auto-save to database
            try {
                const result = await updateConventionMedia(conventionId, updatedMedia);

                if (result.success) {
                    setSuccess(videoTitle ?
                        `Video added! Title: "${videoTitle}"` :
                        'Video added successfully!'
                    );
                    setTimeout(() => setSuccess(null), 4000);
                } else {
                    console.error('[MediaTab] Database save failed:', result.error);
                    console.error('[MediaTab] Database field errors:', result.fieldErrors);
                    setError(result.error || 'Failed to save video link');
                    // Remove from local state if database save failed
                    setMedia(media);
                }
            } catch (error) {
                console.error('[MediaTab] Database save exception:', error);
                setError('Failed to save video link');
                // Remove from local state if database save failed
                setMedia(media);
            }
        } catch (error) {
            console.error('[MediaTab] Process video link error:', error);
            setError('Failed to process video link');
        } finally {
            setIsFetchingVideoTitle(false);
        }
    }, [newVideoUrl, conventionId, videos.length, media]);

    // Handle save
    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const mediaResult = await updateConventionMedia(conventionId, media);

            if (mediaResult.success) {
                setSuccess('Media updated successfully!');
                if (onSave) onSave(true, 'Media updated successfully!');
            } else {
                setError(mediaResult.error || 'Failed to update media');
                if (onSave) onSave(false, mediaResult.error);
            }
        } catch (error) {
            const errorMessage = 'An unexpected error occurred';
            setError(errorMessage);
            if (onSave) onSave(false, errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Convention Media
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}

            {/* Cover and Profile Images Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Convention Images
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                    Upload cover and profile images for your convention. These images will represent your convention across the platform.
                </Typography>

                <Box sx={{ display: 'flex', gap: 4, mb: 4 }}>
                    {/* Cover Image */}
                    <Box sx={{ flex: 1 }}>
                        <CoverImageUploader
                            conventionId={conventionId}
                            currentImageUrl={coverImageUrl || undefined}
                            onImageUpdate={handleCoverImageUpdate}
                        />
                    </Box>

                    {/* Profile Image */}
                    <Box sx={{ flex: 1 }}>
                        <ProfileImageUploader
                            conventionId={conventionId}
                            currentImageUrl={profileImageUrl || undefined}
                            onImageUpdate={handleProfileImageUpdate}
                        />
                    </Box>
                </Box>

                <Divider sx={{ mb: 4 }} />
            </Box>

            {/* Promotional Gallery Section */}
            <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Promotional Gallery
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Add images and videos to showcase your convention. Upload up to 10 images at once. Drag to reorder within each tab.
                    </Typography>
                </Box>

                {/* Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={galleryTab} onChange={handleGalleryTabChange} aria-label="promotional gallery tabs">
                        <Tab
                            label={`Images (${images.length})`}
                            icon={<ImageIcon />}
                            iconPosition="start"
                        />
                        <Tab
                            label={`Videos (${videos.length})`}
                            icon={<VideoIcon />}
                            iconPosition="start"
                        />
                    </Tabs>
                </Box>

                {/* Images Tab */}
                {galleryTab === 0 && (
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                                Promotional Images
                            </Typography>
                            <ImageUploader
                                label="Add Images"
                                onUploadSuccess={handlePromotionalImageUpload}
                                dropzoneHeight={40}
                                maxFileSizeMB={5}
                                conventionId={conventionId}
                                mediaType="promotional"
                                resetAfterUpload={true}
                                autoUpload={true}
                                multiple={true}
                                maxFiles={10}
                            />
                        </Box>

                        {images.length > 0 ? (
                            <DragDropContext onDragEnd={handleImageDragEnd}>
                                <Droppable droppableId="promotional-images">
                                    {(provided) => (
                                        <Box {...provided.droppableProps} ref={provided.innerRef}>
                                            <Box sx={{
                                                display: 'grid',
                                                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                                gap: 2
                                            }}>
                                                {images.map((image, index) => (
                                                    <Box key={image.id || `image-${index}`}>
                                                        <PromotionalImageItem
                                                            media={image}
                                                            index={index}
                                                            onUpdate={(updatedMedia) => handleMediaUpdate(index, updatedMedia)}
                                                            onRemove={() => handleMediaRemove(image)}
                                                        />
                                                    </Box>
                                                ))}
                                            </Box>
                                            {provided.placeholder}
                                        </Box>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                                <ImageIcon sx={{ fontSize: 48, mb: 2 }} />
                                <Typography variant="h6" gutterBottom>
                                    No images added yet
                                </Typography>
                                <Typography variant="body2">
                                    Upload images to showcase your convention
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Videos Tab */}
                {galleryTab === 1 && (
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                                Promotional Videos
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<VideoIcon />}
                                onClick={() => setShowVideoDialog(true)}
                                sx={{
                                    height: 40,
                                    px: 3,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Add Video
                            </Button>
                        </Box>

                        {videos.length > 0 ? (
                            <DragDropContext onDragEnd={handleVideoDragEnd}>
                                <Droppable droppableId="promotional-videos">
                                    {(provided) => (
                                        <Box {...provided.droppableProps} ref={provided.innerRef}>
                                            <Box sx={{
                                                display: 'grid',
                                                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                                gap: 2
                                            }}>
                                                {videos.map((video, index) => (
                                                    <Box key={video.id || `video-${index}`}>
                                                        <VideoLinkItem
                                                            media={video}
                                                            index={index}
                                                            onUpdate={(updatedMedia) => handleMediaUpdate(index, updatedMedia)}
                                                            onRemove={() => handleMediaRemove(video)}
                                                        />
                                                    </Box>
                                                ))}
                                            </Box>
                                            {provided.placeholder}
                                        </Box>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                                <VideoIcon sx={{ fontSize: 48, mb: 2 }} />
                                <Typography variant="h6" gutterBottom>
                                    No videos added yet
                                </Typography>
                                <Typography variant="body2">
                                    Add YouTube or Vimeo videos to showcase your convention
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}
            </Paper>

            {/* Video Dialog */}
            <Dialog open={showVideoDialog} onClose={() => !isFetchingVideoTitle && setShowVideoDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Video Link</DialogTitle>
                <DialogContent>
                    <TextField
                        label="YouTube or Vimeo URL"
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        fullWidth
                        margin="normal"
                        placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                        helperText={
                            isFetchingVideoTitle
                                ? "Fetching video title..."
                                : "Enter a valid YouTube or Vimeo URL. Title will be automatically fetched."
                        }
                        disabled={isFetchingVideoTitle}
                    />
                    {isFetchingVideoTitle && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                            <CircularProgress size={16} />
                            <Typography variant="body2" color="text.secondary">
                                Fetching video title...
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setShowVideoDialog(false)}
                        disabled={isFetchingVideoTitle}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAddVideoLink}
                        variant="contained"
                        disabled={!newVideoUrl.trim() || isFetchingVideoTitle}
                        startIcon={isFetchingVideoTitle ? <CircularProgress size={16} /> : undefined}
                    >
                        {isFetchingVideoTitle ? 'Adding...' : 'Add Video'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Auto-save info */}
            {media.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        🗸 All changes are automatically saved
                    </Typography>
                </Box>
            )}
        </Box>
    );
}; 