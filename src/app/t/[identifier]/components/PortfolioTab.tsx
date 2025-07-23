'use client';

import React from 'react';
import { Box, Typography, Card, CardMedia, CardContent, Chip, Link } from '@mui/material';
import { PlayCircle as VideoIcon, Image as ImageIcon } from '@mui/icons-material';
import { getS3ImageUrl } from '@/lib/defaults';

interface PortfolioTabProps {
    media: Array<{
        id: string;
        url: string;
        type: 'IMAGE' | 'VIDEO_LINK';
        caption: string | null;
        order: number | null;
    }>;
}

const PortfolioTab: React.FC<PortfolioTabProps> = ({ media }) => {
    const getVideoThumbnail = (url: string) => {
        // Extract YouTube video ID for thumbnail
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
        if (youtubeMatch) {
            return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
        }

        // For Vimeo, we'd need their API, so return a placeholder
        if (url.includes('vimeo.com')) {
            return null; // Will show play icon only
        }

        return null;
    };

    const getVideoTitle = (url: string) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return 'YouTube Video';
        }
        if (url.includes('vimeo.com')) {
            return 'Vimeo Video';
        }
        return 'Video';
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Media & Portfolio
            </Typography>

            {media.length > 0 ? (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(3, 1fr)',
                        },
                        gap: 2,
                    }}
                >
                    {media.map((item) => (
                        <Card key={item.id} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                            {item.type === 'IMAGE' ? (
                                <CardMedia
                                    component="img"
                                    height="200"
                                    image={getS3ImageUrl(item.url) || item.url}
                                    alt={item.caption || 'Portfolio image'}
                                    sx={{ objectFit: 'cover' }}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        height: 200,
                                        backgroundColor: 'grey.100',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        backgroundImage: getVideoThumbnail(item.url)
                                            ? `url(${getVideoThumbnail(item.url)})`
                                            : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <VideoIcon
                                            sx={{
                                                fontSize: '3rem',
                                                color: 'white',
                                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                                            }}
                                        />
                                    </Box>
                                </Box>
                            )}

                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                                        {item.caption || (item.type === 'IMAGE' ? 'Portfolio Image' : getVideoTitle(item.url))}
                                    </Typography>
                                    <Chip
                                        icon={item.type === 'IMAGE' ? <ImageIcon /> : <VideoIcon />}
                                        label={item.type === 'IMAGE' ? 'Image' : 'Video'}
                                        size="small"
                                        variant="outlined"
                                        sx={{ ml: 1, fontSize: '0.75rem' }}
                                    />
                                </Box>

                                {item.type === 'VIDEO_LINK' && (
                                    <Link
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        variant="body2"
                                        sx={{
                                            color: 'primary.main',
                                            textDecoration: 'none',
                                            fontSize: '0.8rem',
                                            '&:hover': {
                                                textDecoration: 'underline',
                                            },
                                        }}
                                    >
                                        Watch Video →
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            ) : (
                <Box
                    sx={{
                        textAlign: 'center',
                        py: 6,
                        px: 2,
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        color: 'text.secondary',
                    }}
                >
                    <ImageIcon sx={{ fontSize: '3rem', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
                        No Portfolio Items
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.9rem', mb: 2 }}>
                        This talent hasn't uploaded any portfolio items yet.
                    </Typography>
                    <Chip
                        label="Feature Coming Soon"
                        size="small"
                        variant="outlined"
                        sx={{ opacity: 0.7 }}
                    />
                </Box>
            )}
        </Box>
    );
};

export default PortfolioTab; 