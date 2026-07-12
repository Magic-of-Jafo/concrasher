'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Avatar, CircularProgress, Alert } from '@mui/material';
import { useRouter } from 'next/navigation';
import { getClaimCandidatesForCurrentUser, claimTalentProfile } from '@/lib/actions';
import { getS3ImageUrl } from '@/lib/defaults';
import type { ClaimCandidate } from '@/lib/talent';

// "Is this you?" — surfaces unclaimed talent profiles (created from convention
// schedules) that match the signed-in user's name, and lets them claim one. The
// match runs exact + fuzzy, so a schedule misspelling still finds the person.
// Renders nothing until (and unless) there's a candidate.

const DISPLAY = 'var(--font-montserrat), system-ui, arial, sans-serif';

export default function ClaimNudge() {
    const router = useRouter();
    const [candidates, setCandidates] = useState<ClaimCandidate[] | null>(null);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        let active = true;
        getClaimCandidatesForCurrentUser()
            .then((c) => { if (active) setCandidates(c); })
            .catch(() => { if (active) setCandidates([]); });
        return () => { active = false; };
    }, []);

    if (dismissed || !candidates || candidates.length === 0) return null;

    const one = candidates.length === 1;

    const handleClaim = async (id: string) => {
        setClaimingId(id);
        setError(null);
        const res = await claimTalentProfile(id);
        setClaimingId(null);
        if (res.success) {
            router.refresh();
        } else {
            setError(res.error || 'Could not claim that profile.');
        }
    };

    return (
        <Box sx={{ border: '1px solid var(--cc-gold)', borderRadius: '12px', backgroundColor: 'var(--cc-panel)', p: 2.5, mb: 3 }}>
            <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '1.05rem', color: 'var(--cc-ink)', mb: 0.5 }}>
                Is this you?
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'var(--cc-muted)', mb: 1.75 }}>
                We found {one ? 'a talent profile' : 'talent profiles'} built from convention schedules that {one ? 'looks' : 'look'} like you.
                Claim {one ? 'it' : 'one'} to make it yours — the listings and appearances already on it come with it.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 1.75 }}>{error}</Alert>}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {candidates.map((c) => (
                    <Box
                        key={c.id}
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            border: '1px solid var(--cc-panel-border)', borderRadius: '8px', p: 1.25,
                        }}
                    >
                        <Avatar src={getS3ImageUrl(c.profilePictureUrl) || undefined} sx={{ width: 44, height: 44, flexShrink: 0 }} />
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                            <Typography sx={{ fontWeight: 700, color: 'var(--cc-ink)' }}>
                                {c.displayName}
                                {c.fuzzy && (
                                    <Typography component="span" sx={{ fontSize: '0.75rem', color: 'var(--cc-muted)', ml: 0.75 }}>
                                        (similar spelling)
                                    </Typography>
                                )}
                            </Typography>
                            {c.conventions.length > 0 && (
                                <Typography sx={{ fontSize: '0.8rem', color: 'var(--cc-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Listed at {c.conventions.map((x) => x.convention.name).join(', ')}
                                </Typography>
                            )}
                        </Box>
                        <Button
                            onClick={() => handleClaim(c.id)}
                            disabled={claimingId !== null}
                            sx={{
                                backgroundColor: 'var(--cc-gold)', color: 'var(--cc-gold-ink)',
                                fontWeight: 700, textTransform: 'none', borderRadius: '8px', px: 2, flexShrink: 0,
                                '&:hover': { backgroundColor: 'var(--cc-gold)', filter: 'brightness(1.05)' },
                            }}
                        >
                            {claimingId === c.id ? <CircularProgress size={18} sx={{ color: 'var(--cc-gold-ink)' }} /> : 'Claim'}
                        </Button>
                    </Box>
                ))}
            </Box>

            <Button onClick={() => setDismissed(true)} sx={{ mt: 1.5, color: 'var(--cc-muted)', textTransform: 'none', fontSize: '0.8rem', px: 0 }}>
                None of these are me
            </Button>
        </Box>
    );
}
