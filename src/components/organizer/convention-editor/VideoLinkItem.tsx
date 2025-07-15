import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, IconButton, Card, CardContent, Typography, Link } from '@mui/material';
import { Delete as DeleteIcon, VideoLibrary as VideoIcon, DragIndicator as DragIcon } from '@mui/icons-material';
import { Draggable } from '@hello-pangea/dnd';
import { type ConventionMediaData } from '@/lib/validators';

interface VideoLinkItemProps {
    media: ConventionMediaData;
    index: number;
    onUpdate: (updatedMedia: ConventionMediaData) => void;
    onRemove: () => void;
}

export const VideoLinkItem: React.FC<VideoLinkItemProps> = ({
    media,
    index,
    onUpdate,
    onRemove,
}) => {
    const [caption, setCaption] = useState(media.caption || '');
    const [showSaved, setShowSaved] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleCaptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newCaption = event.target.value;
        setCaption(newCaption);

        // Debounce the update to avoid excessive database calls
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            onUpdate({ ...media, caption: newCaption });

            // Show "Saved" indicator
            setShowSaved(true);

            // Hide it after 500ms
            if (savedTimeoutRef.current) {
                clearTimeout(savedTimeoutRef.current);
            }
            savedTimeoutRef.current = setTimeout(() => {
                setShowSaved(false);
            }, 500);
        }, 500); // Wait 500ms after user stops typing
    };

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            if (savedTimeoutRef.current) {
                clearTimeout(savedTimeoutRef.current);
            }
        };
    }, []);

    // Extract video ID from YouTube/Vimeo URLs for preview
    const getVideoPreview = (url: string) => {
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        const vimeoMatch = url.match(/(?:vimeo\.com\/)([0-9]+)/);

        if (youtubeMatch) {
            return {
                type: 'youtube',
                id: youtubeMatch[1],
                thumbnailUrl: `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`,
                embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
            };
        }

        if (vimeoMatch) {
            return {
                type: 'vimeo',
                id: vimeoMatch[1],
                thumbnailUrl: `https://vumbnail.com/${vimeoMatch[1]}.jpg`,
                embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
            };
        }

        return null;
    };

    const videoPreview = getVideoPreview(media.url);

    return (
        <Draggable draggableId={media.id || `video-${index}`} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={{
                        ...provided.draggableProps.style,
                        marginBottom: 16,
                    }}
                >
                    <Card
                        variant="outlined"
                        sx={{
                            opacity: snapshot.isDragging ? 0.8 : 1,
                            transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                            transition: 'transform 0.2s ease, opacity 0.2s ease',
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                {/* Drag Handle */}
                                <Box
                                    {...provided.dragHandleProps}
                                    sx={{
                                        cursor: 'grab',
                                        color: 'text.secondary',
                                        display: 'flex',
                                        alignItems: 'center',
                                        pt: 1,
                                        '&:active': {
                                            cursor: 'grabbing',
                                        },
                                    }}
                                >
                                    <DragIcon />
                                </Box>

                                {/* Video Preview */}
                                <Box sx={{ flexShrink: 0, width: 160, height: 90 }}>
                                    {videoPreview ? (
                                        <Box
                                            component="img"
                                            src={videoPreview.thumbnailUrl}
                                            alt="Video thumbnail"
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                borderRadius: 1,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                            }}
                                            onError={(e) => {
                                                // Fallback to generic video icon if thumbnail fails
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                target.parentElement!.innerHTML = `
                            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #f5f5f5; border-radius: 4px; border: 1px solid #e0e0e0;">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="#666">
                                <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
                              </svg>
                            </div>
                          `;
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: 'grey.100',
                                                borderRadius: 1,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                            }}
                                        >
                                            <VideoIcon sx={{ fontSize: 32, color: 'grey.500' }} />
                                        </Box>
                                    )}
                                </Box>

                                {/* Video Info */}
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        {videoPreview?.type === 'youtube' ? 'YouTube' :
                                            videoPreview?.type === 'vimeo' ? 'Vimeo' : 'Video'} Link
                                    </Typography>
                                    <Link href={media.url} target="_blank" rel="noopener noreferrer" sx={{ fontSize: '0.875rem', wordBreak: 'break-word' }}>
                                        {media.url}
                                    </Link>
                                    <Box sx={{ position: 'relative' }}>
                                        <TextField
                                            label="Caption (optional)"
                                            value={caption}
                                            onChange={handleCaptionChange}
                                            fullWidth
                                            margin="normal"
                                            size="small"
                                            multiline
                                            rows={2}
                                            placeholder="Add a caption for this video..."
                                        />
                                        {showSaved && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8,
                                                    bgcolor: 'success.main',
                                                    color: 'white',
                                                    px: 1,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'medium',
                                                    animation: 'fadeInOut 0.5s ease-in-out',
                                                    '@keyframes fadeInOut': {
                                                        '0%': { opacity: 0, transform: 'scale(0.8)' },
                                                        '50%': { opacity: 1, transform: 'scale(1)' },
                                                        '100%': { opacity: 0, transform: 'scale(0.8)' },
                                                    },
                                                }}
                                            >
                                                Saved
                                            </Box>
                                        )}
                                    </Box>
                                </Box>

                                {/* Remove Button */}
                                <IconButton
                                    onClick={onRemove}
                                    color="error"
                                    size="small"
                                    sx={{ mt: 1 }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        </CardContent>
                    </Card>
                </div>
            )}
        </Draggable>
    );
}; 