'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import 'flag-icons/css/flag-icons.min.css';
import { getS3ImageUrl } from '@/lib/defaults';
import { HomeConvention, countryToFlagCode } from '../home/home-types';
import { DISPLAY } from './FrontPage';

/** 4x3 flat country flag pinned to a card's lower-right corner (approved
 *  treatment: no border, no rounding, ~20x15). Parent needs position:relative. */
export function FlagCorner({ country }: { country: string | null }) {
    const code = countryToFlagCode(country);
    if (!code) return null;
    return (
        <Box
            component="span"
            className={`fi fi-${code}`}
            role="img"
            aria-label={country ?? undefined}
            title={country ?? undefined}
            sx={{ position: 'absolute', bottom: 10, right: 10, width: 20, height: 15 }}
        />
    );
}

// Small convention artwork for list rows: the profile/cover image on a white
// backing (transparent-PNG logos theme inconsistently otherwise), or a gold
// monogram on the panel surface when no artwork exists.

function initialsFor(name: string): string {
    const words = name
        .split(/\P{L}+/u)
        .filter((w) => w && !/^(the|of|and|a|an|at|in|on|to|for|de|la|le)$/i.test(w));
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export default function FrontThumb({ convention, size = 56 }: { convention: HomeConvention; size?: number }) {
    if (convention.imageUrl) {
        return (
            <Box
                component="img"
                src={getS3ImageUrl(convention.imageUrl)}
                alt=""
                loading="lazy"
                sx={{
                    width: size,
                    height: size,
                    flexShrink: 0,
                    objectFit: 'cover',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid var(--cc-panel-border)',
                }}
            />
        );
    }
    return (
        <Box
            aria-hidden
            sx={{
                width: size,
                height: size,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: '1px solid var(--cc-panel-border)',
                background: 'var(--cc-majors-bg)',
            }}
        >
            <Typography
                component="span"
                sx={{
                    fontFamily: DISPLAY,
                    fontWeight: 800,
                    fontSize: size >= 56 ? '1.1rem' : '0.85rem',
                    letterSpacing: '0.04em',
                    color: 'var(--cc-magenta)',
                }}
            >
                {initialsFor(convention.name)}
            </Typography>
        </Box>
    );
}
