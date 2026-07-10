'use client';

import React, { useState } from 'react';
import {
    Typography,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    Box,
    Tabs,
    Tab,
    Skeleton,
} from '@mui/material';
import { getS3ImageUrl } from '@/lib/defaults';
import { BODY } from '@/lib/fonts';
import { SectionKicker } from './VenueSection';

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

// Video component with proper aspect ratio to prevent layout shift
function VideoPlayer({ url, caption }: { url: string; caption?: string | null }) {
    const [isLoading, setIsLoading] = useState(true);
    const embedUrl = getEmbedUrl(url);

    return (
        <Box sx={{ position: 'relative', width: '100%' }}>
            {/* Aspect ratio container to prevent layout shift */}
            <Box sx={{
                position: 'relative',
                width: '100%',
                paddingTop: '56.25%', // 16:9 aspect ratio
                backgroundColor: 'var(--cc-panel)',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                {isLoading && (
                    <Skeleton
                        variant="rectangular"
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: 1
                        }}
                    />
                )}
                <iframe
                    src={embedUrl}
                    title={caption || 'Convention video'}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        border: 0,
                        zIndex: 2
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={() => setIsLoading(false)}
                />
            </Box>
        </Box>
    );
}

export default function MediaGallerySection({ convention }: MediaGallerySectionProps) {
    // Hook stays above the empty-state return (rules of hooks).
    const [tab, setTab] = useState<'photos' | 'videos'>('photos');

    const media = convention.media || [];

    if (media.length === 0) {
        return (
            <Box sx={{ py: 1 }}>
                <SectionKicker>Media</SectionKicker>
                <Typography sx={{ fontFamily: BODY, fontSize: '0.95rem', color: 'var(--cc-muted)' }}>
                    No media has been added for this convention yet.
                </Typography>
            </Box>
        );
    }

    const images = media.filter((m) => m.type === 'IMAGE');
    const videos = media.filter((m) => m.type === 'VIDEO_LINK');

    const handleTabChange = (_e: React.SyntheticEvent, val: 'photos' | 'videos') => setTab(val);

    return (
        <Box sx={{ py: 1 }}>
            <SectionKicker>Media</SectionKicker>

            <Tabs
                value={tab}
                onChange={handleTabChange}
                aria-label="media tabs"
                sx={{
                    mb: 2,
                    '& .MuiTabs-indicator': { backgroundColor: 'var(--cc-gold)' },
                    '& .MuiTab-root': { fontFamily: BODY, textTransform: 'none', color: 'var(--cc-muted)' },
                    '& .MuiTab-root.Mui-selected': { color: 'var(--cc-ink)' },
                }}
            >
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
                                    style={{ width: '100%', height: 'auto', borderRadius: 8 }}
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
                        <Box key={vid.id} sx={{ borderRadius: '12px', border: '1px solid var(--cc-panel-border)', backgroundColor: 'var(--cc-panel)', overflow: 'hidden' }}>
                            <VideoPlayer url={vid.url} caption={vid.caption} />
                            {vid.caption && (
                                <Typography sx={{ fontFamily: BODY, fontSize: '0.85rem', color: 'var(--cc-muted)', p: 1.5 }}>
                                    {vid.caption}
                                </Typography>
                            )}
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}

function getEmbedUrl(url: string): string {
    try {
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (ytMatch) {
            return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
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