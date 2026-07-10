'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import Link from 'next/link';
import { getS3ImageUrl } from '@/lib/defaults';
import { HomeConvention, formatLocation, getCountdown } from '../home/home-types';
import { DISPLAY, BODY } from './FrontPage';
import { FlagCorner } from './FrontThumb';

// The majors strip: four series-anchored cards, deliberately unlabeled (the
// audience knows). The server resolves each slot to its series' most recent
// edition (see getMajors in page.tsx); this component just presents:
//   upcoming edition  -> countdown kicker
//   dateless TBD next -> "TBD"
//   edition passed    -> the cadence line ("Every summer"), artwork retained
//   nothing known     -> descriptor + monogram tile

export interface MajorData {
    key: string;
    short: string;
    descriptor: string;
    cadence: string;
    status: 'upcoming' | 'tbd' | 'past' | 'none';
    convention: HomeConvention | null;
}

function kickerFor(m: MajorData): string {
    if (m.status === 'upcoming' && m.convention) return getCountdown(m.convention.startDate, m.convention.endDate).text;
    if (m.status === 'tbd') return 'TBD';
    return m.cadence;
}

export default function FrontMajors({ majors }: { majors: MajorData[] }) {
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
            {majors.map((major) => {
                const c = major.convention;
                return (
                    <Box
                        key={major.key}
                        component={Link}
                        href={c ? `/conventions/${c.slug || c.id}` : '/conventions'}
                        target={c ? '_blank' : undefined}
                        rel={c ? 'noopener noreferrer' : undefined}
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
                        {c?.imageUrl ? (
                            <Box
                                component="img"
                                src={getS3ImageUrl(c.imageUrl)}
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
                            {kickerFor(major)}
                        </Typography>
                        <Typography sx={{ fontFamily: DISPLAY, fontSize: '1.05rem', fontWeight: 800, color: 'var(--cc-ink)' }}>
                            {major.short}
                        </Typography>
                        <Typography sx={{ fontFamily: BODY, fontSize: '0.72rem', color: 'var(--cc-muted)' }}>
                            {c ? formatLocation(c) : major.descriptor}
                        </Typography>
                        <FlagCorner country={c?.country ?? null} />
                    </Box>
                );
            })}
        </Box>
    );
}
