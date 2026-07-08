'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import Link from 'next/link';
import { getS3ImageUrl } from '@/lib/defaults';
import { HomeConvention, formatLocation, getCountdown } from '../home/home-types';
import { DISPLAY, BODY } from './FrontPage';
import { FlagCorner } from './FrontThumb';

// The majors strip: the four conventions everyone in the community talks
// about, deliberately unlabeled (the audience knows). Each tile binds to its
// next listed edition; when none is upcoming it degrades to a static
// descriptor and links to browse.

interface Major {
    key: string;
    short: string;
    descriptor: string;
    cadence: string;
    match: (name: string) => boolean;
}

const MAJORS: Major[] = [
    {
        key: 'sam',
        short: 'S.A.M.',
        descriptor: 'Society of American Magicians',
        cadence: 'Every summer',
        // Dots or ALL-CAPS only, so "Sam" in an unrelated name can't match.
        match: (n) => /society of american/i.test(n) || /(^|[^A-Za-z])S\.?A\.?M\.(?![A-Za-z])/.test(n) || /\bSAM\b/.test(n),
    },
    {
        key: 'ibm',
        short: 'I.B.M.',
        descriptor: 'International Brotherhood of Magicians',
        cadence: 'Every summer',
        match: (n) => !/british ring/i.test(n) && (/international brotherhood/i.test(n) || /\bI\.?B\.?M\.?\b/.test(n)),
    },
    {
        key: 'magiclive',
        short: 'MAGIC Live',
        descriptor: 'Las Vegas, NV',
        cadence: 'Every August',
        match: (n) => /magic\s*live/i.test(n),
    },
    {
        key: 'blackpool',
        short: 'Blackpool',
        descriptor: "The world's biggest magic convention",
        cadence: 'Every February',
        match: (n) => /blackpool/i.test(n),
    },
];

/** The next listed edition of each major (list arrives sorted by start date). */
export function findMajor(conventions: HomeConvention[], key: string): HomeConvention | null {
    const major = MAJORS.find((m) => m.key === key);
    if (!major) return null;
    return conventions.find((c) => major.match(c.name)) ?? null;
}

export function isMajorName(name: string): boolean {
    return MAJORS.some((m) => m.match(name));
}

export default function FrontMajors({ conventions }: { conventions: HomeConvention[] }) {
    return (
        <Box
            component="nav"
            aria-label="The majors"
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                gap: 1.5,
                mb: 4,
            }}
        >
            {MAJORS.map((major) => {
                const convention = conventions.find((c) => major.match(c.name)) ?? null;
                const countdown = convention ? getCountdown(convention.startDate, convention.endDate) : null;
                return (
                    <Box
                        key={major.key}
                        component={Link}
                        href={convention ? `/conventions/${convention.slug || convention.id}` : '/conventions'}
                        sx={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            textDecoration: 'none',
                            px: 1.25,
                            py: 2,
                            borderRadius: '8px',
                            background: 'var(--cc-majors-bg)',
                            border: '1px solid var(--cc-majors-border)',
                            transition: 'border-color 0.18s ease-out, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                            '&:hover': { borderColor: 'var(--cc-cyan)', transform: 'translateY(-2px)' },
                            '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
                            '@media (prefers-reduced-motion: reduce)': {
                                transition: 'border-color 0.18s',
                                '&:hover': { transform: 'none' },
                            },
                        }}
                    >
                        {/* The artwork leads; the eye lands here first, then spills
                            onto the text below. */}
                        {convention?.imageUrl ? (
                            <Box
                                component="img"
                                src={getS3ImageUrl(convention.imageUrl)}
                                alt=""
                                loading="lazy"
                                sx={{
                                    width: 84, height: 84, objectFit: 'cover',
                                    backgroundColor: '#ffffff', borderRadius: '8px',
                                    border: '1px solid var(--cc-panel-border)', mb: 1.25,
                                }}
                            />
                        ) : (
                            <Box
                                aria-hidden
                                sx={{
                                    width: 84, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '8px', border: '1px solid var(--cc-panel-border)',
                                    backgroundColor: 'var(--cc-panel)', mb: 1.25,
                                }}
                            >
                                <Typography component="span" sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '1.5rem', color: 'var(--cc-magenta)' }}>
                                    {major.short.replace(/[^A-Za-z]/g, '').slice(0, 2)}
                                </Typography>
                            </Box>
                        )}
                        <Typography
                            suppressHydrationWarning
                            sx={{
                                fontFamily: DISPLAY, fontSize: '0.66rem', fontWeight: 700,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                color: 'var(--cc-cyan)', textShadow: 'var(--cc-glow-cyan)', mb: 0.25,
                            }}
                        >
                            {countdown ? countdown.text : major.cadence}
                        </Typography>
                        <Typography sx={{ fontFamily: DISPLAY, fontSize: '1.05rem', fontWeight: 800, color: 'var(--cc-ink)' }}>
                            {major.short}
                        </Typography>
                        <Typography sx={{ fontFamily: BODY, fontSize: '0.72rem', color: 'var(--cc-muted)' }}>
                            {convention ? formatLocation(convention) : major.descriptor}
                        </Typography>
                        <FlagCorner country={convention?.country ?? null} />
                    </Box>
                );
            })}
        </Box>
    );
}
