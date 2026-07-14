'use client';

import React, { useRef, useState } from 'react';
import { Box, Typography, Button, IconButton, CircularProgress, Alert, Chip } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSession } from 'next-auth/react';
import { addTalentMedia, removeTalentMedia, type TalentMediaItem } from '@/lib/actions';
import { getS3ImageUrl } from '@/lib/defaults';
import { MAX_UPLOAD_MB, MAX_UPLOAD_BYTES } from '@/lib/upload-limits';
import { PROMO_PHOTO_LIMIT } from '@/lib/talent-cards';

// Promo photos: the talent-controlled images organizers MUST use when
// featuring this person at a convention. Distinct from the gallery (which
// shows the act) and from the profile picture (which identifies the person
// on their profile page). Max 3; the first is the default card image.

export default function PromoPhotoManager({
    initialPhotos,
}: {
    initialPhotos: TalentMediaItem[];
}) {
    const { data: session } = useSession();
    const [photos, setPhotos] = useState<TalentMediaItem[]>(initialPhotos || []);
    const [uploading, setUploading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const atLimit = photos.length >= PROMO_PHOTO_LIMIT;

    const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length || !session?.user?.id) return;
        setError(null);
        setUploading(true);
        try {
            for (const file of files) {
                if (photos.length + 1 > PROMO_PHOTO_LIMIT) { setError(`You can have up to ${PROMO_PHOTO_LIMIT} promo photos.`); break; }
                if (file.size > MAX_UPLOAD_BYTES) { setError(`Each photo must be under ${MAX_UPLOAD_MB}MB.`); continue; }
                if (!file.type.startsWith('image/')) { setError('Only image files can be uploaded here.'); continue; }
                const fd = new FormData();
                fd.append('file', file);
                fd.append('userId', session.user.id);
                fd.append('mediaType', 'talent');
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error || 'Upload failed.'); continue; }
                const { url } = await res.json();
                const add = await addTalentMedia({ url, type: 'PROMO_IMAGE' });
                if (add.success && add.media) setPhotos((prev) => [...prev, add.media!]);
                else setError(add.error || 'Could not save the photo.');
            }
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleRemove = async (id: string) => {
        setBusyId(id);
        setError(null);
        const res = await removeTalentMedia(id);
        setBusyId(null);
        if (res.success) setPhotos((prev) => prev.filter((m) => m.id !== id));
        else setError(res.error || 'Could not remove that photo.');
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Promo Photos
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'var(--cc-muted)' }}>
                Organizers use these when featuring you at a convention. Your first photo is the
                default. You control these; organizers can pick between them but never replace them.
                Portrait shots work best (up to {PROMO_PHOTO_LIMIT}).
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {photos.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 1.5, mb: 2, maxWidth: 480 }}>
                    {photos.map((m, i) => (
                        <Box
                            key={m.id}
                            sx={{
                                position: 'relative', aspectRatio: '4 / 5', borderRadius: '8px', overflow: 'hidden',
                                border: i === 0 ? '2px solid var(--cc-gold)' : '1px solid var(--cc-panel-border)',
                                backgroundColor: 'var(--cc-panel)',
                            }}
                        >
                            <Box component="img" src={getS3ImageUrl(m.url)} alt={`Promo photo ${i + 1}`} loading="lazy"
                                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            {i === 0 && (
                                <Chip
                                    label="Default"
                                    size="small"
                                    sx={{
                                        position: 'absolute', bottom: 6, left: 6, height: 'auto', py: 0.2,
                                        borderRadius: '8px', backgroundColor: 'var(--cc-gold)', color: 'var(--cc-gold-ink)',
                                        fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                                    }}
                                />
                            )}
                            <IconButton
                                size="small"
                                onClick={() => handleRemove(m.id)}
                                disabled={busyId === m.id}
                                aria-label="Remove promo photo"
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

            <Button
                variant="outlined"
                startIcon={uploading ? <CircularProgress size={16} /> : <AddPhotoAlternateIcon />}
                onClick={() => fileRef.current?.click()}
                disabled={uploading || atLimit}
            >
                {uploading ? 'Uploading…' : atLimit ? `Limit of ${PROMO_PHOTO_LIMIT} reached` : 'Add promo photo'}
            </Button>
            <input ref={fileRef} type="file" hidden multiple accept="image/png, image/jpeg, image/webp" onChange={handleFiles} />
        </Box>
    );
}
