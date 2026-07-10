'use client';

import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import Link from 'next/link';
import {
    HomeConvention,
    formatLocation,
    getCountdown,
    monthKey,
    monthLabel,
} from '../home/home-types';
import { DISPLAY, BODY } from './FrontPage';
import FrontThumb, { FlagCorner } from './FrontThumb';

// "The next 100 days": every listed convention inside the horizon, grouped by
// month in newspaper-free columns. Time-based on purpose; region grouping was
// rejected (90% of listings are US). Anything beyond the horizon lives on the
// browse page (and later in the auto-populated below-the-fold half).

const HORIZON_DAYS = 100;

function shortRange(c: HomeConvention): string {
    if (!c.startDate) return 'Dates TBD';
    const md = (iso: string) =>
        new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    if (!c.endDate || c.endDate === c.startDate) return md(c.startDate);
    return `${md(c.startDate)}–${new Date(c.endDate).toLocaleDateString('en-US', {
        day: 'numeric',
        timeZone: 'UTC',
        ...(new Date(c.startDate).getUTCMonth() === new Date(c.endDate).getUTCMonth() ? {} : { month: 'short' }),
    })}`;
}

export default function Front100Days({
    conventions,
    excludeIds,
}: {
    conventions: HomeConvention[];
    /** Conventions already shown above (rail trio + featured); never repeat them. */
    excludeIds?: string[];
}) {
    const groups = useMemo(() => {
        const horizon = Date.now() + HORIZON_DAYS * 86400000;
        const skip = new Set(excludeIds ?? []);
        const map = new Map<string, HomeConvention[]>();
        for (const c of conventions) {
            if (skip.has(c.id)) continue;
            if (!c.startDate || new Date(c.startDate).getTime() > horizon) continue;
            const key = monthKey(c.startDate);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(c);
        }
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [conventions, excludeIds]);

    if (groups.length === 0) return null;

    return (
        <Box component="section" sx={{ pt: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                <Typography component="h2" sx={{ fontFamily: DISPLAY, fontSize: '1.4rem', fontWeight: 800, color: 'var(--cc-ink)', m: 0 }}>
                    The next 100 days
                </Typography>
                <Typography
                    component={Link}
                    href="/conventions"
                    sx={{
                        fontFamily: BODY, fontSize: '0.8rem', color: 'var(--cc-soft)', textDecoration: 'none',
                        '&:hover': { color: 'var(--cc-cyan)', textDecoration: 'underline' },
                        '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
                    }}
                >
                    Looking further out? Browse all conventions
                </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', columnGap: 4.5, rowGap: 3 }}>
                {groups.map(([key, items]) => (
                    <Box key={key}>
                        <Typography
                            component="h3"
                            sx={{
                                fontFamily: DISPLAY, fontSize: '0.78rem', fontWeight: 800,
                                letterSpacing: '0.16em', textTransform: 'uppercase',
                                color: 'var(--cc-cyan)', textShadow: 'var(--cc-glow-cyan)',
                                borderBottom: '1px solid var(--cc-panel-border)', pb: 0.75, m: 0,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                            }}
                        >
                            {monthLabel(key)}
                            <Box component="span" sx={{ fontFamily: BODY, fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.04em', color: 'var(--cc-soft)', textShadow: 'none', textTransform: 'none' }}>
                                {items.length} {items.length === 1 ? 'convention' : 'conventions'}
                            </Box>
                        </Typography>
                        {items.map((c) => {
                            const cd = getCountdown(c.startDate, c.endDate);
                            return (
                                <Box
                                    key={c.id}
                                    component={Link}
                                    href={`/conventions/${c.slug || c.id}`}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    sx={{
                                        position: 'relative',
                                        display: 'flex', alignItems: 'center', gap: 1.25,
                                        textDecoration: 'none', py: 1.5, px: 0.25,
                                        borderBottom: '1px solid var(--cc-hairline)',
                                        transition: 'background-color 0.15s ease-out',
                                        '&:hover': { backgroundColor: 'var(--cc-panel)' },
                                        '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '-3px' },
                                    }}
                                >
                                    <FlagCorner country={c.country} />
                                    <FrontThumb convention={c} size={44} />
                                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                            <Typography suppressHydrationWarning sx={{ fontFamily: DISPLAY, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cc-soft)' }}>
                                                {shortRange(c)}
                                            </Typography>
                                            <Typography
                                                suppressHydrationWarning
                                                sx={{
                                                    fontFamily: DISPLAY, fontSize: '0.68rem', fontWeight: 800,
                                                    letterSpacing: '0.08em', textTransform: 'uppercase',
                                                    color: cd.kind === 'happening' ? 'var(--cc-live)' : 'var(--cc-magenta)',
                                                }}
                                            >
                                                {cd.kind === 'happening' ? '● Live' : cd.kind === 'future' ? cd.text.replace('In ', '') : cd.text}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{ fontFamily: DISPLAY, fontSize: '0.95rem', fontWeight: 800, lineHeight: 1.3, color: 'var(--cc-ink)', mt: 0.25 }}>
                                            {c.name}
                                        </Typography>
                                        <Typography sx={{ fontFamily: BODY, fontSize: '0.78rem', color: 'var(--cc-muted)' }}>
                                            {formatLocation(c)}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
