'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import Link from 'next/link';
import { getS3ImageUrl } from '@/lib/defaults';
import { HomeConvention, formatDateRange, formatLocation, getCountdown } from '../home/home-types';
import { DISPLAY, BODY, GoldButton } from './FrontPage';
import { isMajorName } from './FrontMajors';
import FrontThumb, { FlagCorner } from './FrontThumb';

// Featured (the anchor story) + the Happening/Up Next rail. The rail owns the
// next three chronological conventions (the doctrine's hero trio) and they
// appear ONLY here (excluded from the 100-days list; redundancy is the enemy).
// Featured picks past the trio so the two never overlap.

// Interim editorial control until the admin FeaturedBilling queue exists:
// name-matched overrides, first match wins. Currently Abbott's (historical
// significance; MAGIC Live is sold out, so featuring it sells nothing).
const EDITORIAL_PICKS: RegExp[] = [/abbott/i];

/** The featured convention: editorial override first, then auto-pick from
 *  everything after the rail trio (majors first, then artwork, then nearest). */
export function pickFeatured(conventions: HomeConvention[]): HomeConvention | null {
    const pool = conventions.slice(3);
    for (const re of EDITORIAL_PICKS) {
        const hit = pool.find((c) => re.test(c.name)) ?? conventions.find((c) => re.test(c.name));
        if (hit) return hit;
    }
    if (pool.length === 0) return conventions[0] ?? null;
    return pool.find((c) => isMajorName(c.name)) ?? pool.find((c) => c.imageUrl) ?? pool[0];
}

// Plain and true: say what's happening, where, and when. (An earlier draft
// used "turns its house lights down", which read as shows-only and confused
// more than it sold. Conventions are more than shows.)
function billingHeadline(c: HomeConvention): string {
    const when = c.startDate
        ? new Date(c.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
        : null;
    if (c.city && when) return `${c.name} comes to ${c.city}, ${when}.`;
    if (when) return `${c.name} starts ${when}.`;
    return c.name;
}

export default function FrontBilling({
    billing,
    rail,
}: {
    billing: HomeConvention | null;
    rail: HomeConvention[];
}) {
    if (!billing && rail.length === 0) {
        return (
            <Typography sx={{ fontFamily: BODY, fontSize: '0.95rem', color: 'var(--cc-muted)', textAlign: 'center', py: 6 }}>
                No upcoming conventions listed right now. New events are added all the time.
            </Typography>
        );
    }
    const countdown = billing ? getCountdown(billing.startDate, billing.endDate) : null;

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.55fr 1fr' }, gap: { xs: 4, md: 5 } }}>
            {billing && (
                <Box component="article">
                    <Typography
                        sx={{
                            fontFamily: DISPLAY, fontSize: '0.75rem', fontWeight: 800,
                            letterSpacing: '0.24em', textTransform: 'uppercase',
                            color: 'var(--cc-magenta)', textShadow: 'var(--cc-glow-magenta)', mb: 1.5,
                        }}
                    >
                        Featured
                    </Typography>
                    <Box
                        sx={{
                            position: 'relative',
                            aspectRatio: '16 / 8.5',
                            borderRadius: '12px',
                            border: '1px solid var(--cc-panel-border)',
                            mb: 2,
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--cc-hero-scene)',
                            backgroundSize: 'var(--cc-hero-bokeh-size)',
                        }}
                    >
                        {billing.imageUrl ? (
                            <Box
                                component="img"
                                src={getS3ImageUrl(billing.imageUrl)}
                                alt=""
                                sx={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#ffffff' }}
                            />
                        ) : (
                            <Typography
                                component="span"
                                sx={{
                                    fontFamily: DISPLAY, fontWeight: 800,
                                    fontSize: 'clamp(1.75rem, 4vw, 2.9rem)', color: 'var(--cc-ink)',
                                    textShadow: 'var(--cc-glow-art)', px: 2, textAlign: 'center',
                                }}
                            >
                                {billing.name}
                            </Typography>
                        )}
                        <FlagCorner country={billing.country} />
                    </Box>
                    <Typography
                        component="h2"
                        sx={{
                            fontFamily: DISPLAY, fontWeight: 800,
                            fontSize: 'clamp(1.75rem, 3.6vw, 2.6rem)', lineHeight: 1.08,
                            letterSpacing: '-0.015em', color: 'var(--cc-ink)', textWrap: 'balance', m: 0,
                        }}
                    >
                        {billingHeadline(billing)}
                    </Typography>
                    {billing.descriptionShort && (
                        <Typography sx={{ fontFamily: BODY, fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--cc-muted)', mt: 1.5, maxWidth: '54ch' }}>
                            {billing.descriptionShort}
                        </Typography>
                    )}
                    <Typography suppressHydrationWarning sx={{ fontFamily: DISPLAY, fontSize: '0.85rem', fontWeight: 700, color: 'var(--cc-ink)', mt: 1, mb: 2.5 }}>
                        {formatLocation(billing)} · {formatDateRange(billing.startDate, billing.endDate)}
                        {countdown && countdown.kind === 'future' && (
                            <>
                                {' · '}
                                <Box component="span" sx={{ color: 'var(--cc-cyan)', textShadow: 'var(--cc-glow-cyan)' }}>
                                    {countdown.text.toLowerCase().replace('in ', '')} out
                                </Box>
                            </>
                        )}
                    </Typography>
                    <GoldButton href={`/conventions/${billing.slug || billing.id}`}>See the listing</GoldButton>
                </Box>
            )}

            <Box component="aside">
                <Typography
                    component="h2"
                    sx={{
                        fontFamily: DISPLAY, fontSize: '0.72rem', fontWeight: 800,
                        letterSpacing: '0.2em', textTransform: 'uppercase',
                        color: 'var(--cc-cyan)', textShadow: 'var(--cc-glow-cyan)',
                        borderBottom: '1px solid var(--cc-panel-border)', pb: 1, mb: 1.5, mt: 0,
                    }}
                >
                    Happening / Up next
                </Typography>
                {/* The trio: tight stack of prominent cards; these three appear
                    nowhere else on the page. */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    {rail.map((c) => {
                        const cd = getCountdown(c.startDate, c.endDate);
                        return (
                            <Box
                                key={c.id}
                                component={Link}
                                href={`/conventions/${c.slug || c.id}`}
                                sx={{
                                    position: 'relative',
                                    display: 'flex', alignItems: 'center', gap: 1.5,
                                    textDecoration: 'none',
                                    backgroundColor: 'var(--cc-panel)',
                                    border: '1px solid var(--cc-panel-border)',
                                    borderRadius: '8px',
                                    p: 1.5,
                                    transition: 'border-color 0.18s ease-out, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                                    '&:hover': { borderColor: 'var(--cc-cyan)', transform: 'translateY(-2px)' },
                                    '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
                                    '@media (prefers-reduced-motion: reduce)': {
                                        transition: 'border-color 0.18s',
                                        '&:hover': { transform: 'none' },
                                    },
                                }}
                            >
                                <FrontThumb convention={c} size={64} />
                                <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25, pr: 3 }}>
                                    <Typography
                                        suppressHydrationWarning
                                        sx={{
                                            fontFamily: DISPLAY, fontSize: '0.68rem', fontWeight: 800,
                                            letterSpacing: '0.12em', textTransform: 'uppercase',
                                            color: cd.kind === 'happening' ? 'var(--cc-live)' : 'var(--cc-magenta)',
                                            textShadow: cd.kind === 'happening' ? 'var(--cc-glow-live)' : 'none',
                                        }}
                                    >
                                        {cd.kind === 'happening' ? '● Happening now' : cd.text}
                                    </Typography>
                                    <Typography sx={{ fontFamily: DISPLAY, fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.25, color: 'var(--cc-ink)' }}>
                                        {c.name}
                                    </Typography>
                                    <Typography sx={{ fontFamily: BODY, fontSize: '0.8rem', color: 'var(--cc-muted)' }}>
                                        {formatLocation(c)} · {formatDateRange(c.startDate, c.endDate)}
                                    </Typography>
                                </Box>
                                <FlagCorner country={c.country} />
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );
}
