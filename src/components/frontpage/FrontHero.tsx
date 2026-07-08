'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import type { HeroMessage } from '../home/headlines';
import { DISPLAY, BODY } from './FrontPage';

// The hero band: a wide image slot under the masthead carrying the rotating
// objection-answering headline (picked server-side per page view).
//
// Aspect ratios (chosen 2026-07-08): 8:3 on desktop, 4:3 on mobile. Rotation
// images live in /public/hero (the server picks one at random per request);
// when none exist, the designed stage-light scene (--cc-hero-scene) fills in.
// Images render UNDER a bottom-weighted scrim so the headline always reads;
// object-position is center for now — the future admin uploader gets an
// anchor-point control per image.
export default function FrontHero({
    message,
    imageUrl,
}: {
    message: HeroMessage;
    imageUrl: string | null;
}) {
    return (
        <Box
            component="section"
            aria-label="Welcome"
            sx={{
                position: 'relative',
                aspectRatio: { xs: '4 / 3', sm: '8 / 3' },
                borderRadius: '12px',
                border: '1px solid var(--cc-panel-border)',
                overflow: 'hidden',
                mb: 4,
                background: 'var(--cc-hero-scene)',
                backgroundSize: 'var(--cc-hero-bokeh-size)',
            }}
        >
            {imageUrl && (
                <>
                    <Box
                        component="img"
                        src={imageUrl}
                        alt=""
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                        }}
                    />
                    {/* Bottom-weighted scrim: the photo stays visible up top, the
                        headline zone stays readable down below. */}
                    <Box
                        aria-hidden
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            background:
                                'linear-gradient(180deg, rgba(0, 0, 0, 0.12) 30%, rgba(0, 0, 0, 0.62) 78%, rgba(0, 0, 0, 0.78) 100%)',
                        }}
                    />
                </>
            )}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    px: { xs: 2.5, sm: 4, md: 5 },
                    pb: { xs: 2.5, sm: 3, md: 3.5 },
                }}
            >
                <Typography
                    component="h1"
                    sx={{
                        fontFamily: DISPLAY,
                        fontWeight: 800,
                        fontSize: 'clamp(1.5rem, 3.2vw, 2.4rem)',
                        lineHeight: 1.12,
                        letterSpacing: '-0.015em',
                        color: 'var(--cc-hero-ink)',
                        textWrap: 'balance',
                        maxWidth: '26ch',
                        m: 0,
                        textShadow: '0 2px 18px rgba(0, 0, 0, 0.55)',
                    }}
                >
                    {message.headline}
                </Typography>
                <Typography
                    sx={{
                        fontFamily: BODY,
                        fontSize: { xs: '0.85rem', md: '1rem' },
                        lineHeight: 1.55,
                        color: 'var(--cc-hero-sub)',
                        maxWidth: '56ch',
                        mt: 1,
                        textShadow: '0 1px 12px rgba(0, 0, 0, 0.6)',
                    }}
                >
                    {message.sub}
                </Typography>
            </Box>
        </Box>
    );
}
