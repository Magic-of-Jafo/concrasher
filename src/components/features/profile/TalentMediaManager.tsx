'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, IconButton, TextField, CircularProgress, Alert } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useSession } from 'next-auth/react';
import { addTalentMedia, removeTalentMedia, type TalentMediaItem } from '@/lib/actions';
import { getS3ImageUrl } from '@/lib/defaults';
import { MAX_UPLOAD_MB, MAX_UPLOAD_BYTES } from '@/lib/upload-limits';

// Talent gallery: upload photos and add video links. Saves each item to the
// TalentProfileMedia table immediately (no separate "save"), and reports the
// live count so the profile-strength meter updates. House Lights themed.

function hostOf(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export default function TalentMediaManager({
    initialMedia,
    onCountChange,
}: {
    initialMedia: TalentMediaItem[];
    onCountChange?: (count: number) => void;
}) {
    const { data: session } = useSession();
    const [media, setMedia] = useState<TalentMediaItem[]>(initialMedia || []);
    const [uploading, setUploading] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [addingVideo, setAddingVideo] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { onCountChange?.(media.length); }, [media.length, onCountChange]);

    const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length || !session?.user?.id) return;
        setError(null);
        setUploading(true);
        const added: TalentMediaItem[] = [];
        try {
            for (const file of files) {
                if (file.size > MAX_UPLOAD_BYTES) { setError(`Each photo must be under ${MAX_UPLOAD_MB}MB.`); continue; }
                if (!file.type.startsWith('image/')) { setError('Only image files can be uploaded here.'); continue; }
                const fd = new FormData();
                fd.append('file', file);
                fd.append('userId', session.user.id);
                fd.append('mediaType', 'talent');
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error || 'Upload failed.'); continue; }
                const { url } = await res.json();
                const add = await addTalentMedia({ url, type: 'IMAGE' });
                if (add.success && add.media) added.push(add.media);
                else setError(add.error || 'Could not save the photo.');
            }
            if (added.length) setMedia((prev) => [...prev, ...added]);
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleAddVideo = async () => {
        const url = videoUrl.trim();
        if (!url) return;
        setError(null);
        setAddingVideo(true);
        const add = await addTalentMedia({ url, type: 'VIDEO_LINK' });
        setAddingVideo(false);
        if (add.success && add.media) {
            setMedia((prev) => [...prev, add.media!]);
            setVideoUrl('');
        } else {
            setError(add.error || 'Could not add the video link.');
        }
    };

    const handleRemove = async (id: string) => {
        setBusyId(id);
        setError(null);
        const res = await removeTalentMedia(id);
        setBusyId(null);
        if (res.success) setMedia((prev) => prev.filter((m) => m.id !== id));
        else setError(res.error || 'Could not remove that item.');
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Photos &amp; Videos
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'var(--cc-muted)' }}>
                Show organizers your act. Upload photos, or paste a link to a video (YouTube, Vimeo, etc.).
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {media.length > 0 && (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                        gap: 1.5,
                        mb: 2,
                    }}
                >
                    {media.map((m) => (
                        <Box
                            key={m.id}
                            sx={{
                                position: 'relative',
                                aspectRatio: '1 / 1',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid var(--cc-panel-border)',
                                backgroundColor: 'var(--cc-panel)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {m.type === 'IMAGE' ? (
                                <Box component="img" src={getS3ImageUrl(m.url)} alt={m.caption || ''} loading="lazy"
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            ) : (
                                <Box
                                    component="a"
                                    href={m.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, textDecoration: 'none', color: 'var(--cc-ink)', p: 1, textAlign: 'center' }}
                                >
                                    <PlayCircleOutlineIcon sx={{ fontSize: 34, color: 'var(--cc-cyan)' }} />
                                    <Typography sx={{ fontSize: '0.72rem', color: 'var(--cc-muted)', wordBreak: 'break-word' }}>
                                        {hostOf(m.url)}
                                    </Typography>
                                </Box>
                            )}
                            <IconButton
                                size="small"
                                onClick={() => handleRemove(m.id)}
                                disabled={busyId === m.id}
                                aria-label="Remove media"
                                sx={{
                                    position: 'absolute', top: 4, right: 4,
                                    backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff',
                                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.75)' },
                                }}
                            >
                                {busyId === m.id ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <DeleteOutlineIcon sx={{ fontSize: 18 }} />}
                            </IconButton>
                        </Box>
                    ))}
                </Box>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-start' }}>
                <Button
                    variant="outlined"
                    startIcon={uploading ? <CircularProgress size={16} /> : <AddPhotoAlternateIcon />}
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? 'Uploading…' : 'Add photos'}
                </Button>
                <input ref={fileRef} type="file" hidden multiple accept="image/png, image/jpeg, image/gif, image/webp" onChange={handleFiles} />

                <Box sx={{ display: 'flex', gap: 1, flexGrow: 1, minWidth: 240 }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Paste a video link"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddVideo(); } }}
                    />
                    <Button variant="outlined" onClick={handleAddVideo} disabled={addingVideo || !videoUrl.trim()}>
                        {addingVideo ? <CircularProgress size={16} /> : 'Add'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}
