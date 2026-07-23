'use client';

import React, { useMemo, useState } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, MenuItem, Select, FormControl, InputLabel, Collapse, Button, Link } from '@mui/material';
import { DISPLAY, BODY } from '@/lib/fonts';
import { SectionKicker } from './VenueSection';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import NextLink from 'next/link';
import ScheduleSection from './ScheduleSection';
import { conventionDayDate, formatConventionDay } from '@/lib/scheduleDates';
import { timezoneLabel } from '@/lib/timezone-display';

interface Performance {
    id: string;
    dayOffset: number | null;
    startTimeMinutes: number | null;
    durationMinutes: number | null;
    soldOut?: boolean;
    venueId?: string | null;
    locationName?: string | null;
    venue?: { venueName?: string | null } | null;
}
interface PriceTier { label: string; amount: number | string; }
interface Production {
    id: string;
    title: string;
    tagline?: string | null;
    ageRating?: string | null;
    description?: string | null;
    coverImageUrl?: string | null;
    detailsUrl?: string | null;
    priceTiers?: PriceTier[] | null;
    priceNote?: string | null;
    performances: Performance[];
}
interface FestivalConvention {
    startDate: string;
    endDate: string;
    type?: string;
    productions?: Production[];
    venues?: { id: string; venueName: string }[];
    scheduleDays?: any[];
    timezone?: { ianaId: string } | null;
}

const fmtMins = (m: number): string => {
    const h = Math.floor(m / 60) % 24;
    const mm = (m % 60).toString().padStart(2, '0');
    const period = h >= 12 ? 'PM' : 'AM';
    const dh = h % 12 || 12;
    return `${dh}:${mm} ${period}`;
};

// "11 shows · 8:00 PM · Jun 30 – Jul 11"
function runSummary(start: string, perfs: Performance[]): string {
    const placed = perfs.filter(p => typeof p.dayOffset === 'number' && typeof p.startTimeMinutes === 'number');
    if (placed.length === 0) return 'Dates TBA';
    const offs = placed.map(p => p.dayOffset as number);
    const minOff = Math.min(...offs), maxOff = Math.max(...offs);
    const times = Array.from(new Set(placed.map(p => p.startTimeMinutes as number)));
    const timePart = times.length === 1 ? ` · ${fmtMins(times[0])}` : '';
    const dateA = formatConventionDay(start, minOff, 'MMM d');
    const dateB = formatConventionDay(start, maxOff, 'MMM d');
    const datePart = minOff === maxOff ? dateA : `${dateA} – ${dateB}`;
    return `${placed.length} show${placed.length === 1 ? '' : 's'}${timePart} · ${datePart}`;
}

function ProductionCard({ production, start, venueFilter }: { production: Production; start: string; venueFilter: string }) {
    const [open, setOpen] = useState(false);

    const perfs = (production.performances || [])
        .filter(p => venueFilter === 'all' || p.venueId === venueFilter)
        .sort((a, b) => (a.dayOffset ?? 0) - (b.dayOffset ?? 0) || (a.startTimeMinutes ?? 0) - (b.startTimeMinutes ?? 0));
    if (perfs.length === 0) return null;

    return (
        <Box
            sx={{
                borderRadius: '12px', overflow: 'hidden',
                border: '1px solid var(--cc-panel-border)', backgroundColor: 'var(--cc-panel)',
                transition: 'border-color .2s, transform .2s',
                '&:hover': { borderColor: 'var(--cc-cyan)', transform: 'translateY(-2px)' },
                '@media (prefers-reduced-motion: reduce)': { '&:hover': { transform: 'none' } },
            }}
        >
            {production.coverImageUrl ? (
                <Box component="img" src={production.coverImageUrl} alt={production.title}
                    sx={{ width: '100%', display: 'block', aspectRatio: '3 / 2', objectFit: 'cover' }} />
            ) : (
                <Box sx={{
                    width: '100%', aspectRatio: '3 / 2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--cc-hero-scene)', backgroundSize: 'var(--cc-hero-bokeh-size)',
                    color: 'var(--cc-hero-sub)',
                }}>
                    <AutoAwesomeIcon sx={{ fontSize: 44 }} />
                </Box>
            )}
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" component="h3" sx={{ fontFamily: DISPLAY, fontWeight: 800, lineHeight: 1.2, color: 'var(--cc-ink)' }}>
                    {production.title}
                </Typography>
                {production.tagline && (
                    <Typography variant="body2" sx={{ mt: 0.25, fontFamily: BODY, color: 'var(--cc-muted)' }}>{production.tagline}</Typography>
                )}

                <Typography variant="body2" sx={{ mt: 1, fontFamily: DISPLAY, fontWeight: 700, color: 'var(--cc-cyan)', textShadow: 'var(--cc-glow-cyan)' }}>
                    {runSummary(start, perfs)}
                </Typography>

                <Button
                    onClick={() => setOpen(o => !o)}
                    size="small"
                    endIcon={<ExpandMoreIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />}
                    sx={{ mt: 0.5, ml: -1, fontFamily: DISPLAY, fontWeight: 700, textTransform: 'none', color: 'var(--cc-ink)', borderRadius: '8px', '&:hover': { backgroundColor: 'var(--cc-panel)' } }}
                >
                    {open ? 'Less' : 'Show times & details'}
                </Button>

                <Collapse in={open} unmountOnExit>
                    <Box sx={{ pt: 1 }}>
                        {production.description && (
                            <Typography variant="body2" sx={{ mb: 1.5, whiteSpace: 'pre-wrap', fontFamily: BODY, color: 'var(--cc-muted)' }}>
                                {production.description}
                            </Typography>
                        )}

                        <Typography variant="overline" sx={{ fontFamily: DISPLAY, color: 'var(--cc-soft)' }}>Performances</Typography>
                        <Box sx={{ mb: 1.5 }}>
                            {perfs.map(p => (
                                <Box key={p.id} sx={{ display: 'flex', gap: 1, alignItems: 'baseline', py: 0.3, flexWrap: 'wrap' }}>
                                    <Typography variant="body2" sx={{ fontFamily: DISPLAY, fontWeight: 700, minWidth: 132, color: 'var(--cc-ink)' }}>
                                        {formatConventionDay(start, p.dayOffset ?? 0, 'EEE, MMM d')}
                                        {typeof p.startTimeMinutes === 'number' ? ` · ${fmtMins(p.startTimeMinutes)}` : ''}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontFamily: BODY, color: 'var(--cc-muted)' }}>
                                        {[p.venue?.venueName, p.locationName].filter(Boolean).join(' · ')}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>

                        {Array.isArray(production.priceTiers) && production.priceTiers.length > 0 && (
                            <>
                                <Typography variant="overline" sx={{ fontFamily: DISPLAY, color: 'var(--cc-soft)' }}>Tickets</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: production.priceNote ? 0.5 : 1 }}>
                                    {production.priceTiers.map((t, i) => (
                                        <Box key={i} component="span" sx={{ fontFamily: BODY, fontSize: '0.75rem', fontWeight: 600, color: 'var(--cc-muted)', border: '1px solid var(--cc-panel-border)', borderRadius: '8px', px: 1, py: 0.4 }}>
                                            {`${t.label}: $${t.amount}`}
                                        </Box>
                                    ))}
                                </Box>
                                {production.priceNote && (
                                    <Typography variant="caption" sx={{ display: 'block', mb: 1, fontFamily: BODY, color: 'var(--cc-soft)' }}>{production.priceNote}</Typography>
                                )}
                            </>
                        )}

                        {production.detailsUrl && (
                            <Link component={NextLink} href={production.detailsUrl} target="_blank" rel="noopener noreferrer"
                                sx={{ fontWeight: 700, fontFamily: DISPLAY, color: 'var(--cc-cyan)' }}>
                                Full details →
                            </Link>
                        )}
                    </Box>
                </Collapse>
            </Box>
        </Box>
    );
}

export default function FestivalSchedule({ convention }: { convention: FestivalConvention }) {
    const [view, setView] = useState<'cards' | 'timeline'>('cards');
    const [venueFilter, setVenueFilter] = useState<string>('all');

    const productions = useMemo(
        () => [...(convention.productions || [])],
        [convention.productions],
    );

    // venues that actually host a performance (for the filter)
    const venues = useMemo(() => {
        const byId = new Map<string, string>();
        for (const p of productions) {
            for (const perf of p.performances || []) {
                if (perf.venueId) byId.set(perf.venueId, perf.venue?.venueName || 'Venue');
            }
        }
        return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
    }, [productions]);

    const visibleProductions = productions.filter(p =>
        venueFilter === 'all' || (p.performances || []).some(perf => perf.venueId === venueFilter)
    );

    return (
        <Box sx={{ width: '100%', pb: 4 }}>
            <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 4 }, pb: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                <SectionKicker>Shows</SectionKicker>
                {(() => {
                    const tz = timezoneLabel((convention as any).timezone?.ianaId, (convention as any).timezone?.value);
                    return tz ? (
                        <Typography sx={{ fontFamily: BODY, fontSize: '0.8rem', color: 'var(--cc-muted)', mt: -1, mb: 1.5 }}>
                            All times are local to the venue ({tz}).
                        </Typography>
                    ) : null;
                })()}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    {view === 'cards' && venues.length > 1 && (
                        <FormControl size="small" sx={{ minWidth: 170 }}>
                            <InputLabel id="venue-filter">Venue</InputLabel>
                            <Select labelId="venue-filter" label="Venue" value={venueFilter} onChange={e => setVenueFilter(e.target.value)}>
                                <MenuItem value="all">All venues</MenuItem>
                                {venues.map(v => <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    )}
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={view}
                        onChange={(_, v) => v && setView(v)}
                        sx={{
                            '& .MuiToggleButton-root': {
                                fontFamily: DISPLAY, fontWeight: 700, textTransform: 'none',
                                color: 'var(--cc-muted)', borderColor: 'var(--cc-panel-border)',
                            },
                            '& .MuiToggleButton-root.Mui-selected': {
                                color: 'var(--cc-gold-ink)', backgroundColor: 'var(--cc-gold)',
                                '&:hover': { backgroundColor: 'var(--cc-gold)' },
                            },
                        }}
                    >
                        <ToggleButton value="cards"><ViewModuleIcon fontSize="small" sx={{ mr: 0.5 }} /> Shows</ToggleButton>
                        <ToggleButton value="timeline"><ViewTimelineIcon fontSize="small" sx={{ mr: 0.5 }} /> By day</ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            </Box>

            {view === 'timeline' ? (
                <ScheduleSection convention={convention as any} />
            ) : visibleProductions.length === 0 ? (
                <Typography sx={{ px: { xs: 2, sm: 3, md: 4 }, fontFamily: BODY, fontSize: '0.95rem', color: 'var(--cc-muted)' }}>
                    No shows have been announced yet.
                </Typography>
            ) : (
                <Box sx={{ px: { xs: 1.5, sm: 3, md: 4 }, display: 'grid', gap: 2, alignItems: 'start', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
                    {visibleProductions.map(p => (
                        <ProductionCard key={p.id} production={p} start={convention.startDate} venueFilter={venueFilter} />
                    ))}
                </Box>
            )}
        </Box>
    );
}
