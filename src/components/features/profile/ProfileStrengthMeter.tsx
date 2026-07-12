'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import type { ProfileStrength } from '@/lib/profile-strength';

// Owner-only completion meter (never shown on the public page). Motivates
// finishing the profile with a themed bar, tier label, and an actionable list
// of what's left. See docs/profile-strength.md.

const DISPLAY = 'var(--font-montserrat), system-ui, arial, sans-serif';

export default function ProfileStrengthMeter({
    strength,
    title = 'Profile strength',
}: {
    strength: ProfileStrength;
    title?: string;
}) {
    const { score, tier, missing } = strength;
    const complete = missing.length === 0;

    return (
        <Box
            sx={{
                border: '1px solid var(--cc-panel-border)',
                borderRadius: '12px',
                backgroundColor: 'var(--cc-panel)',
                p: 2,
                mb: 3,
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.95rem', color: 'var(--cc-ink)' }}>
                    {title}
                </Typography>
                <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.95rem', color: 'var(--cc-gold)' }}>
                    {score}% · {tier}
                </Typography>
            </Box>

            <Box
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Profile strength ${score} percent`}
                sx={{ mt: 1.25, height: 8, borderRadius: '999px', backgroundColor: 'var(--cc-hairline)', overflow: 'hidden' }}
            >
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '999px',
                        transformOrigin: 'left',
                        transform: `scaleX(${score / 100})`,
                        backgroundColor: complete ? 'var(--cc-live)' : 'var(--cc-gold)',
                        transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                    }}
                />
            </Box>

            {complete ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.25 }}>
                    <CheckCircleIcon sx={{ fontSize: 18, color: 'var(--cc-live)' }} />
                    <Typography sx={{ fontSize: '0.85rem', color: 'var(--cc-ink)' }}>
                        Your profile is complete. Nicely done.
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ mt: 1.5 }}>
                    <Typography sx={{ fontSize: '0.8rem', color: 'var(--cc-muted)', mb: 0.75 }}>
                        Finish these to strengthen your profile:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {missing.map((item) => (
                            <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'var(--cc-soft)', flexShrink: 0 }} />
                                <Typography sx={{ fontSize: '0.85rem', color: 'var(--cc-ink)', flexGrow: 1 }}>
                                    {item.label}
                                </Typography>
                                <Typography sx={{ fontSize: '0.78rem', color: 'var(--cc-muted)', flexShrink: 0 }}>
                                    +{item.weight}%
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
}
