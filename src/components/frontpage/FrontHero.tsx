'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import type { HeroMessage } from '../home/headlines';
import { DISPLAY, BODY } from './FrontPage';

// The hero band: a wide image slot under the masthead carrying the rotating
// objection-answering headline (picked server-side per page view). Today the
// background is a designed stage-light scene (--cc-hero-scene, themed for
// both House Lights modes); the plan is admin-uploaded images (~10) rotating
// per refresh, which will slot in as a background-image layer UNDER the scrim
// so headlines always stay readable. See memory: homepage-redesign-direction.
export default function FrontHero({ message }: { message: HeroMessage }) {
    return (
        <Box
            component="section"
            aria-label="Welcome"
            sx={{
                borderRadius: '12px',
                border: '1px solid var(--cc-panel-border)',
                overflow: 'hidden',
                mb: 4,
                px: { xs: 2.5, sm: 4, md: 6 },
                py: { xs: 4, sm: 5, md: 6.5 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: 'var(--cc-hero-scene)',
                backgroundSize: 'var(--cc-hero-bokeh-size)',
            }}
        >
            <Typography
                component="h1"
                sx={{
                    fontFamily: DISPLAY,
                    fontWeight: 800,
                    fontSize: 'clamp(1.6rem, 3.4vw, 2.6rem)',
                    lineHeight: 1.12,
                    letterSpacing: '-0.015em',
                    color: 'var(--cc-hero-ink)',
                    textWrap: 'balance',
                    maxWidth: '24ch',
                    m: 0,
                    textShadow: '0 2px 18px rgba(0, 0, 0, 0.45)',
                }}
            >
                {message.headline}
            </Typography>
            <Typography
                sx={{
                    fontFamily: BODY,
                    fontSize: { xs: '0.9rem', md: '1rem' },
                    lineHeight: 1.6,
                    color: 'var(--cc-hero-sub)',
                    maxWidth: '52ch',
                    mt: 1.5,
                    textShadow: '0 1px 12px rgba(0, 0, 0, 0.5)',
                }}
            >
                {message.sub}
            </Typography>
        </Box>
    );
}
