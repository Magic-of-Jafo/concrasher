'use client';

import React, { useMemo, useState } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, MenuItem, Select, FormControl, InputLabel, Collapse, Chip, Button, Link } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import NextLink from 'next/link';
import ScheduleSection from './ScheduleSection';
import { conventionDayDate, formatConventionDay } from '@/lib/scheduleDates';

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
    const theme = useTheme();
    const [open, setOpen] = useState(false);

    const perfs = (production.performances || [])
        .filter(p => venueFilter === 'all' || p.venueId === venueFilter)
        .sort((a, b) => (a.dayOffset ?? 0) - (b.dayOffset ?? 0) || (a.startTimeMinutes ?? 0) - (b.startTimeMinutes ?? 0));
    if (perfs.length === 0) return null;

    return (
        <Box
            sx={{
                borderRadius: 3, overflow: 'hidden',
                border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'box-shadow .2s, transform .2s',
                '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.14)' },
            }}
        >
            {production.coverImageUrl ? (
                <Box component="img" src={production.coverImageUrl} alt={production.title}
                    sx={{ width: '100%', display: 'block', aspectRatio: '3 / 2', objectFit: 'cover' }} />
            ) : (
                (() => {
                    const hue = production.title.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
                    return (
                        <Box sx={{
                            width: '100%', aspectRatio: '3 / 2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: `linear-gradient(135deg, hsl(${hue},62%,52%), hsl(${(hue + 45) % 360},68%,42%))`,
                            color: 'rgba(255,255,255,0.92)',
                        }}>
                            <AutoAwesomeIcon sx={{ fontSize: 44 }} />
                        </Box>
                    );
                })()
            )}
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                    {production.title}
                </Typography>
                {production.tagline && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{production.tagline}</Typography>
                )}

                <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, color: 'primary.main' }}>
                    {runSummary(start, perfs)}
                </Typography>

                <Button
                    onClick={() => setOpen(o => !o)}
                    size="small"
                    endIcon={<ExpandMoreIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />}
                    sx={{ mt: 0.5, ml: -1 }}
                >
                    {open ? 'Less' : 'Show times & details'}
                </Button>

                <Collapse in={open} unmountOnExit>
                    <Box sx={{ pt: 1 }}>
                        {production.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, whiteSpace: 'pre-wrap' }}>
                                {production.description}
                            </Typography>
                        )}

                        <Typography variant="overline" color="text.secondary">Performances</Typography>
                        <Box sx={{ mb: 1.5 }}>
                            {perfs.map(p => (
                                <Box key={p.id} sx={{ display: 'flex', gap: 1, alignItems: 'baseline', py: 0.3, flexWrap: 'wrap' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 132 }}>
                                        {formatConventionDay(start, p.dayOffset ?? 0, 'EEE, MMM d')}
                                        {typeof p.startTimeMinutes === 'number' ? ` · ${fmtMins(p.startTimeMinutes)}` : ''}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {[p.venue?.venueName, p.locationName].filter(Boolean).join(' — ')}
                                    </Typography>
                                    {p.soldOut && <Chip label="SOLD OUT" size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />}
                                </Box>
                            ))}
                        </Box>

                        {Array.isArray(production.priceTiers) && production.priceTiers.length > 0 && (
                            <>
                                <Typography variant="overline" color="text.secondary">Tickets</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: production.priceNote ? 0.5 : 1 }}>
                                    {production.priceTiers.map((t, i) => (
                                        <Chip key={i} size="small" variant="outlined"
                                            label={`${t.label}: $${typeof t.amount === 'number' ? t.amount : t.amount}`} />
                                    ))}
                                </Box>
                                {production.priceNote && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{production.priceNote}</Typography>
                                )}
                            </>
                        )}

                        {production.detailsUrl && (
                            <Link component={NextLink} href={production.detailsUrl} target="_blank" rel="noopener noreferrer"
                                sx={{ fontWeight: 600 }}>
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
                <Typography variant="h1" component="h1" sx={{ fontSize: { xs: '1.75rem', md: '2.75rem' }, fontWeight: 800, letterSpacing: '-0.02em' }}>
                    Shows
                </Typography>
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
                    <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v) => v && setView(v)}>
                        <ToggleButton value="cards"><ViewModuleIcon fontSize="small" sx={{ mr: 0.5 }} /> Shows</ToggleButton>
                        <ToggleButton value="timeline"><ViewTimelineIcon fontSize="small" sx={{ mr: 0.5 }} /> By day</ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            </Box>

            {view === 'timeline' ? (
                <ScheduleSection convention={convention as any} />
            ) : visibleProductions.length === 0 ? (
                <Typography variant="body1" color="text.secondary" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
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
