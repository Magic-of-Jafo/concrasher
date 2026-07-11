'use client';

import React, { useMemo, useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { DISPLAY, BODY } from '@/lib/fonts';
import { alpha, darken } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { conventionDayDate, formatConventionDay } from '@/lib/scheduleDates';
import { getEventTypeColor } from '@/lib/eventTypes';

interface TalentLink {
    role?: string | null;
    nameAsListed?: string | null;
    talentProfile?: { id: string; displayName: string; userId?: string | null } | null;
}

interface ConventionScheduleItem {
    id: string;
    title: string;
    description?: string | null;
    locationName?: string | null;
    eventType?: string | null;
    startTimeMinutes?: number | null;
    durationMinutes?: number | null;
    talentLinks?: TalentLink[];
}

interface ScheduleDay {
    id: string;
    label?: string | null;
    dayOffset: number;
    events: ConventionScheduleItem[];
}

interface ScheduleSectionProps {
    convention: {
        startDate: string;
        endDate: string;
        scheduleDays: ScheduleDay[];
        timezone?: { ianaId: string } | null;
    };
}

// ── talent link helpers ───────────────────────────────────────────────────────
function ProfileLink({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <Link
            component={NextLink}
            href={`/t/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'var(--cc-cyan)', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
            {children}
        </Link>
    );
}

function renderTalentList(links: TalentLink[]): React.ReactNode {
    const valid = links.filter(l => l.talentProfile?.id);
    return valid.map((l, i) => (
        <React.Fragment key={`${l.talentProfile!.id}-${i}`}>
            {i > 0 && ', '}
            <ProfileLink id={l.talentProfile!.id}>{l.nameAsListed || l.talentProfile!.displayName}</ProfileLink>
        </React.Fragment>
    ));
}

// Link any tagged talent's name found inside free text (display-only styling).
function linkifyNames(text: string | null | undefined, links?: TalentLink[]): React.ReactNode {
    if (!text) return text;
    const valid = (links || []).filter(l => l.talentProfile?.id);
    if (valid.length === 0) return text;
    const nameToId = new Map<string, string>();
    for (const l of valid) {
        const id = l.talentProfile!.id;
        for (const n of [l.nameAsListed, l.talentProfile!.displayName]) {
            if (n && n.trim()) nameToId.set(n.trim(), id);
        }
    }
    const names = Array.from(nameToId.keys()).sort((a, b) => b.length - a.length);
    if (names.length === 0) return text;
    const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    return text.split(regex).map((part, i) => {
        const key = Array.from(nameToId.keys()).find(n => n.toLowerCase() === part.toLowerCase());
        return key
            ? <ProfileLink key={i} id={nameToId.get(key)!}>{part}</ProfileLink>
            : <React.Fragment key={i}>{part}</React.Fragment>;
    });
}

// Minutes-since-midnight (the convention's wall clock) → "7:00 PM".
const fmtMins = (m: number): string => {
    const h = Math.floor(m / 60) % 24;
    const mm = (m % 60).toString().padStart(2, '0');
    const period = h >= 12 ? 'PM' : 'AM';
    const dh = h % 12 || 12;
    return `${dh}:${mm} ${period}`;
};

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export default function ScheduleSection({ convention }: ScheduleSectionProps) {

    const sortedDays = useMemo(
        () => [...(convention.scheduleDays || [])].sort((a, b) => a.dayOffset - b.dayOffset),
        [convention.scheduleDays],
    );

    // Convention duration (for pre/post-convention chips).
    const durationDays = useMemo(() => {
        const ms = new Date(convention.endDate).getTime() - new Date(convention.startDate).getTime();
        return Math.round(ms / 86_400_000);
    }, [convention.startDate, convention.endDate]);

    // Auto-select today's day if the convention is currently running, so an
    // attendee opening the schedule lands on the right day with zero taps.
    // "Today" is the viewer's LOCAL calendar date (an attendee is in the
    // venue's timezone): UTC components would flip a US viewer to tomorrow
    // during the evening shows.
    const initialIndex = useMemo(() => {
        const now = new Date();
        const todayKey = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        const idx = sortedDays.findIndex(d => conventionDayDate(convention.startDate, d.dayOffset).getTime() === todayKey);
        return idx >= 0 ? idx : 0;
    }, [sortedDays, convention.startDate]);

    const [selected, setSelected] = useState(initialIndex);
    const activeIndex = Math.min(selected, Math.max(0, sortedDays.length - 1));

    if (sortedDays.length === 0) {
        return (
            <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
                <Typography component="h2" gutterBottom sx={{ fontFamily: DISPLAY, fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--cc-magenta)', textShadow: 'var(--cc-glow-magenta)' }}>
                    Schedule
                </Typography>
                <Typography sx={{ fontFamily: BODY, fontSize: '0.95rem', color: 'var(--cc-muted)', maxWidth: '52ch' }}>
                    The schedule hasn&apos;t been posted yet. Organizers usually publish it
                    closer to the convention, so check back.
                </Typography>
            </Box>
        );
    }

    const day = sortedDays[activeIndex];
    const events = [...(day.events || [])]
        .filter(e => e.startTimeMinutes != null)
        .sort((a, b) => (a.startTimeMinutes ?? 0) - (b.startTimeMinutes ?? 0));
    const phase = day.dayOffset < 0 ? 'Pre-Convention' : day.dayOffset > durationDays ? 'Post-Convention' : null;

    return (
        <Box sx={{ width: '100%', pb: 4 }}>
            <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 4 }, pb: 1.5 }}>
                <Typography component="h2" sx={{ fontFamily: DISPLAY, fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--cc-magenta)', textShadow: 'var(--cc-glow-magenta)' }}>
                    Schedule
                </Typography>
            </Box>

            {/* Sticky day tabs — stay pinned while scrolling a day's events on mobile. */}
            <Box
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 3,
                    backgroundColor: 'var(--cc-bg)',
                    backgroundImage: 'linear-gradient(var(--cc-panel), var(--cc-panel))',
                    backdropFilter: 'blur(8px)',
                    borderBottom: '1px solid var(--cc-hairline)',
                    borderRadius: '8px',
                    px: { xs: 1, sm: 2, md: 3 },
                }}
            >
                <Tabs
                    value={activeIndex}
                    onChange={(_, v) => setSelected(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{
                        minHeight: 0,
                        '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', backgroundColor: 'var(--cc-gold)' },
                        '& .MuiTab-root': { minHeight: 0, py: 1, px: { xs: 1.75, sm: 2.5 }, textTransform: 'none' },
                    }}
                >
                    {sortedDays.map((d, i) => (
                        <Tab
                            key={d.id}
                            disableRipple
                            label={
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.15 }}>
                                    <Typography component="span" sx={{ fontFamily: DISPLAY, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: activeIndex === i ? 'var(--cc-gold)' : 'var(--cc-soft)' }}>
                                        {formatConventionDay(convention.startDate, d.dayOffset, 'EEE').toUpperCase()}
                                    </Typography>
                                    <Typography component="span" sx={{ fontFamily: DISPLAY, fontSize: '0.95rem', fontWeight: activeIndex === i ? 800 : 600, color: activeIndex === i ? 'var(--cc-ink)' : 'var(--cc-muted)' }}>
                                        {formatConventionDay(convention.startDate, d.dayOffset, 'MMM d')}
                                    </Typography>
                                </Box>
                            }
                        />
                    ))}
                </Tabs>
            </Box>

            {/* Selected day */}
            <Box sx={{ px: { xs: 1.5, sm: 3, md: 4 }, pt: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 2, px: { xs: 0.5, sm: 0 } }}>
                    <Typography variant="h6" component="h3" sx={{ fontFamily: DISPLAY, fontWeight: 800, color: 'var(--cc-ink)' }}>
                        {formatConventionDay(convention.startDate, day.dayOffset, 'EEEE, MMMM d')}
                    </Typography>
                    {phase && (
                        <Box component="span" sx={{ fontFamily: DISPLAY, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cc-soft)', border: '1px solid var(--cc-panel-border)', borderRadius: '8px', px: 1, py: 0.25 }}>{phase}</Box>
                    )}
                </Box>

                {events.length === 0 ? (
                    <Typography variant="body2" sx={{ px: 0.5, py: 2, fontFamily: BODY, color: 'var(--cc-muted)' }}>
                        No events scheduled for this day yet.
                    </Typography>
                ) : (
                    <Box key={activeIndex}>
                        {events.map((event, i) => {
                            const color = getEventTypeColor(event.eventType);
                            const start = event.startTimeMinutes as number;
                            const isMilestone = !event.durationMinutes;
                            const talent = (event.talentLinks || []).filter(l => l.talentProfile?.id);
                            // "Featuring" is a catch-all: only performers NOT already named in
                            // the title or description, so no name is shown twice.
                            const proseText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
                            const featuring = talent.filter(l =>
                                ![l.nameAsListed, l.talentProfile?.displayName]
                                    .filter(Boolean)
                                    .some(n => proseText.includes(String(n).toLowerCase()))
                            );

                            return (
                                <Box
                                    key={event.id}
                                    sx={{
                                        position: 'relative',
                                        display: 'flex',
                                        gap: { xs: 1.25, sm: 2 },
                                        pl: { xs: 1.5, sm: 2 },
                                        pr: { xs: 1.25, sm: 2 },
                                        py: 1.4,
                                        mb: 1,
                                        borderRadius: '8px',
                                        bgcolor: alpha(color, 0.07),
                                        border: `1px solid ${alpha(color, 0.22)}`,
                                        overflow: 'hidden',
                                        transition: 'background-color .18s ease, transform .18s ease, box-shadow .18s ease',
                                        animation: `${fadeInUp} .35s ease both`,
                                        animationDelay: `${Math.min(i, 12) * 35}ms`,
                                        '&:before': {
                                            content: '""',
                                            position: 'absolute',
                                            left: 0, top: 0, bottom: 0,
                                            width: 4,
                                            bgcolor: color,
                                        },
                                        '&:hover': {
                                            bgcolor: alpha(color, 0.10),
                                            transform: 'translateY(-1px)',
                                            boxShadow: `0 4px 16px ${alpha(color, 0.18)}`,
                                        },
                                    }}
                                >
                                    {/* Time rail */}
                                    <Box sx={{ flexShrink: 0, minWidth: { xs: 64, sm: 74 }, pt: 0.1 }}>
                                        <Typography sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: { xs: '0.82rem', sm: '0.9rem' }, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums', color: 'var(--cc-ink)' }}>
                                            {fmtMins(start)}
                                        </Typography>
                                        {!isMilestone && (
                                            <Typography sx={{ color: 'var(--cc-soft)', fontSize: '0.72rem', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
                                                {fmtMins(start + (event.durationMinutes as number))}
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Content */}
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography component="div" sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: { xs: '0.92rem', sm: '1rem' }, lineHeight: 1.3, color: 'var(--cc-ink)' }}>
                                            {linkifyNames(event.title, event.talentLinks)}
                                        </Typography>
                                        {event.eventType && (
                                            <Box
                                                component="span"
                                                sx={{
                                                    display: 'inline-block',
                                                    mt: 0.6,
                                                    fontSize: '0.62rem',
                                                    fontWeight: 700,
                                                    letterSpacing: '0.04em',
                                                    textTransform: 'uppercase',
                                                    color,
                                                    bgcolor: alpha(color, 0.16),
                                                    '[data-theme="light"] &': { color: darken(color, 0.45) },
                                                    px: 0.75, py: '2px',
                                                    borderRadius: 1,
                                                }}
                                            >
                                                {event.eventType}
                                            </Box>
                                        )}

                                        {featuring.length > 0 && (
                                            <Typography variant="body2" sx={{ mt: 0.4, fontSize: '0.82rem', fontFamily: BODY, color: 'var(--cc-muted)' }}>
                                                <Box component="span" sx={{ fontWeight: 600 }}>Featuring: </Box>
                                                {renderTalentList(featuring)}
                                            </Typography>
                                        )}

                                        {event.description && (
                                            <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.82rem', fontFamily: BODY, color: 'var(--cc-muted)', whiteSpace: 'pre-wrap' }}>
                                                {linkifyNames(event.description, event.talentLinks)}
                                            </Typography>
                                        )}

                                        {event.locationName && (
                                            <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.78rem', fontFamily: BODY, color: 'var(--cc-soft)' }}>
                                                📍 {event.locationName}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>
        </Box>
    );
}
