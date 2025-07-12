'use client';

import React, { useState } from 'react';
import {
    Typography,
    Paper,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    Card,
    CardMedia,
    CardContent,
    Box,
    Tabs,
    Tab,
} from '@mui/material';
import { getS3ImageUrl } from '@/lib/defaults';

interface ConventionMedia {
    id: string;
    type: 'IMAGE' | 'VIDEO_LINK';
    url: string;
    caption?: string | null;
}

interface MediaGallerySectionProps {
    convention: {
        media?: ConventionMedia[];
    };
}

export default function MediaGallerySection({ convention }: MediaGallerySectionProps) {
    const media = convention.media || [];

    if (media.length === 0) {
        return (
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h1" component="h1" gutterBottom>
                    Media Gallery
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    No media has been added for this convention yet.
                </Typography>
            </Paper>
        );
    }

    const images = media.filter((m) => m.type === 'IMAGE');
    const videos = media.filter((m) => m.type === 'VIDEO_LINK');

    const [tab, setTab] = useState<'photos' | 'videos'>('photos');

    const handleTabChange = (_e: React.SyntheticEvent, val: 'photos' | 'videos') => setTab(val);

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h1" component="h1" gutterBottom>
                Media Gallery
            </Typography>

            <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }} aria-label="media tabs">
                <Tab label={`Photos (${images.length})`} value="photos" />
                <Tab label={`Videos (${videos.length})`} value="videos" />
            </Tabs>

            {tab === 'photos' && images.length > 0 && (
                <Box sx={{ width: '100%', mb: 4 }}>
                    <ImageList variant="masonry" cols={3} gap={8}>
                        {images.map((img) => (
                            <ImageListItem key={img.id}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={getS3ImageUrl(img.url)}
                                    alt={img.caption || 'Convention image'}
                                    loading="lazy"
                                    style={{ width: '100%', height: 'auto' }}
                                />
                                {img.caption && <ImageListItemBar title={img.caption} />}
                            </ImageListItem>
                        ))}
                    </ImageList>
                </Box>
            )}

            {tab === 'videos' && videos.length > 0 && (
                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                    {videos.map((vid) => (
                        <Card key={vid.id}>
                            <CardMedia
                                component="iframe"
                                src={getEmbedUrl(vid.url)}
                                title={vid.caption || 'Convention video'}
                                sx={{ aspectRatio: '16/9', border: 0 }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                            {vid.caption && (
                                <CardContent>
                                    <Typography variant="body2">{vid.caption}</Typography>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </Box>
            )}
        </Paper>
    );
}

function getEmbedUrl(url: string): string {
    try {
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (ytMatch) {
            return `https://www.youtube.com/embed/${ytMatch[1]}`;
        }
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch) {
            return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        }
        return url;
    } catch {
        return url;
    }
} 