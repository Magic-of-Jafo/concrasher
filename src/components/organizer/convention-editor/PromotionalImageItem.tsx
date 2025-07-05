import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, IconButton, Card, CardContent, Typography } from '@mui/material';
import { Delete as DeleteIcon, DragIndicator as DragIcon } from '@mui/icons-material';
import { Draggable } from '@hello-pangea/dnd';
import { type ConventionMediaData } from '@/lib/validators';

interface PromotionalImageItemProps {
    media: ConventionMediaData;
    index: number;
    onUpdate: (updatedMedia: ConventionMediaData) => void;
    onRemove: () => void;
}

export const PromotionalImageItem: React.FC<PromotionalImageItemProps> = ({
    media,
    index,
    onUpdate,
    onRemove,
}) => {
    const [caption, setCaption] = useState(media.caption || '');
    const [showSaved, setShowSaved] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout>();
    const savedTimeoutRef = useRef<NodeJS.Timeout>();

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

    return (
        <Draggable draggableId={media.id || `new-${index}`} index={index}>
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

                                {/* Image Preview */}
                                <Box sx={{ flexShrink: 0, width: 120, height: 90 }}>
                                    <Box
                                        component="img"
                                        src={media.url}
                                        alt="Promotional image"
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                        onError={(e) => {
                                            // Fallback for broken images
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            target.parentElement!.innerHTML = `
                        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #f5f5f5; border-radius: 4px; border: 1px solid #e0e0e0;">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="#666">
                            <path d="M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19M19,19H5V5H19V19Z"/>
                          </svg>
                        </div>
                      `;
                                        }}
                                    />
                                </Box>

                                {/* Image Info */}
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', wordBreak: 'break-word', mb: 1 }}>
                                        {media.url}
                                    </Typography>
                                    <Box sx={{ position: 'relative' }}>
                                        <TextField
                                            label="Caption (optional)"
                                            value={caption}
                                            onChange={handleCaptionChange}
                                            fullWidth
                                            size="small"
                                            multiline
                                            rows={2}
                                            placeholder="Add a caption for this image..."
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