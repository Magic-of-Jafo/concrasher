'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import Link from 'next/link';
import { getS3ImageUrl } from '@/lib/defaults';
import { HomeConvention, formatDateRange, formatLocation, getCountdown } from '../home/home-types';
import { DISPLAY, BODY, GoldButton } from './FrontPage';
import { isMajorName } from './FrontMajors';

// Top Billing (the anchor story) + the Happening/Up Next rail, at matching
// height. The rail always owns the next three chronological conventions (the
// doctrine's hero trio). Top Billing auto-picks from everything AFTER the
// trio, preferring a major, then a convention with artwork, so the slot never
// duplicates the rail and never sits empty. A curated/paid FeaturedBilling
// queue replaces the auto-pick later (see memory: homepage-redesign-direction).

function pickBilling(conventions: HomeConvention[]): HomeConvention | null {
    const pool = conventions.slice(3);
    if (pool.length === 0) return conventions[0] ?? null;
    return pool.find((c) => isMajorName(c.name)) ?? pool.find((c) => c.imageUrl) ?? pool[0];
}

function billingHeadline(c: HomeConvention): string {
    const when = c.startDate
        ? new Date(c.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
        : null;
    if (c.city && when) return `${c.city} turns its house lights down ${when}.`;
    if (when) return `${c.name} takes the stage ${when}.`;
    return c.name;
}

export default function FrontBilling({ conventions }: { conventions: HomeConvention[] }) {
    const rail = conventions.slice(0, 3);
    const billing = pickBilling(conventions);
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
                        Top Billing
                    </Typography>
                    <Box
                        sx={{
                            aspectRatio: '16 / 8.5',
                            borderRadius: '12px',
                            border: '1px solid var(--cc-panel-border)',
                            mb: 2,
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background:
                                'radial-gradient(ellipse 70% 60% at 50% 110%, rgba(255,46,136,.28), transparent 65%), radial-gradient(ellipse 60% 50% at 50% -10%, rgba(41,230,255,.14), transparent 60%), var(--cc-panel)',
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
                    </Box>
                    <Typography
                        component="h1"
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

            <Box component="aside" sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography
                    component="h2"
                    sx={{
                        fontFamily: DISPLAY, fontSize: '0.72rem', fontWeight: 800,
                        letterSpacing: '0.2em', textTransform: 'uppercase',
                        color: 'var(--cc-cyan)', textShadow: 'var(--cc-glow-cyan)',
                        borderBottom: '1px solid var(--cc-panel-border)', pb: 1, m: 0,
                    }}
                >
                    Happening / Up next
                </Typography>
                {rail.map((c) => {
                    const cd = getCountdown(c.startDate, c.endDate);
                    return (
                        <Box
                            key={c.id}
                            component={Link}
                            href={`/conventions/${c.slug || c.id}`}
                            sx={{
                                flex: 1,
                                display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.25,
                                textDecoration: 'none',
                                borderBottom: '1px solid var(--cc-hairline)',
                                py: 1.75, px: 0.25,
                                transition: 'background-color 0.15s ease-out',
                                '&:hover': { backgroundColor: 'var(--cc-panel)' },
                                '&:last-child': { borderBottom: 'none' },
                                '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '-3px' },
                            }}
                        >
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
                            <Typography sx={{ fontFamily: DISPLAY, fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.25, color: 'var(--cc-ink)' }}>
                                {c.name}
                            </Typography>
                            <Typography sx={{ fontFamily: BODY, fontSize: '0.8rem', color: 'var(--cc-muted)' }}>
                                {formatLocation(c)} · {formatDateRange(c.startDate, c.endDate)}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
