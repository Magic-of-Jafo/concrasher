'use client';

import React from 'react';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Divider,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { add, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import Image from 'next/image';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { conventionDayDate } from '@/lib/scheduleDates';


interface TalentLink {
    role?: string | null;
    nameAsListed?: string | null;
    talentProfile?: { id: string; displayName: string; userId?: string | null } | null;
}

// Based on prisma/schema.prisma
interface ConventionScheduleItem {
    id: string;
    title: string;
    description?: string | null;
    locationName?: string | null;
    startTimeMinutes?: number | null;
    durationMinutes?: number | null;
    talentLinks?: TalentLink[];
}

// A blue link to a talent's public profile.
function ProfileLink({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <Link
            component={NextLink}
            href={`/t/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
            {children}
        </Link>
    );
}

// "@John Bannon, @Mike Pisciotta" — the event's tagged talent as profile links.
function renderTalentList(links: TalentLink[]): React.ReactNode {
    const valid = links.filter(l => l.talentProfile?.id);
    return valid.map((l, i) => (
        <React.Fragment key={`${l.talentProfile!.id}-${i}`}>
            {i > 0 && ', '}
            <ProfileLink id={l.talentProfile!.id}>{l.nameAsListed || l.talentProfile!.displayName}</ProfileLink>
        </React.Fragment>
    ));
}

// Turn any occurrence of a tagged talent's name inside free text into a profile
// link (display-only styling — the structured talent links are the source of
// truth). Longer names win so "John Bannon" beats a stray "John".
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
    const parts = text.split(regex);
    return parts.map((part, i) => {
        const key = Array.from(nameToId.keys()).find(n => n.toLowerCase() === part.toLowerCase());
        return key
            ? <ProfileLink key={i} id={nameToId.get(key)!}>{part}</ProfileLink>
            : <React.Fragment key={i}>{part}</React.Fragment>;
    });
}

interface ScheduleDay {
    id: string;
    label?: string | null;
    dayOffset: number;
    events: ConventionScheduleItem[];
}

interface ScheduleSectionProps {
    convention: {
        startDate: string; // ISO string
        endDate: string; // ISO string
        scheduleDays: ScheduleDay[];
        timezone?: {
            ianaId: string;
        } | null;
    };
}

const formatTime = (date: Date, timeZone: string): string => {
    try {
        return formatInTimeZone(date, timeZone, 'h:mm a');
    } catch (e) {
        console.error('Failed to format time with timezone:', timeZone, e);
        return format(date, 'h:mm a') + ' UTC';
    }
};

const formatDate = (date: Date, timeZone: string): string => {
    try {
        return formatInTimeZone(date, timeZone, 'eeee, MMMM d, yyyy');
    } catch (e) {
        console.error('Failed to format date with timezone:', timeZone, e);
        return format(date, 'eeee, MMMM d, yyyy');
    }
};


export default function ScheduleSection({ convention }: ScheduleSectionProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const scheduleDays: ScheduleDay[] = convention.scheduleDays || [];
    // Schedule times are stored as the convention's local wall-clock under the
    // relative model, so render them in UTC (no conversion) to avoid drift.
    // Per-viewer timezone conversion is a separate, deferred workstream.
    const timeZone = 'UTC';
    const conventionStartDate = new Date(convention.startDate);
    const conventionEndDate = new Date(convention.endDate);

    // Calculate the difference in days for the main convention duration
    const conventionDurationDays = Math.round((conventionEndDate.getTime() - conventionStartDate.getTime()) / (1000 * 60 * 60 * 24));

    // Responsive image sizing
    const imageSize = isMobile ? 120 : 200;
    const imageStyles = {
        position: 'absolute' as const,
        top: isMobile ? 8 : 16,
        right: isMobile ? 8 : 16,
        opacity: 0.7,
        zIndex: 1,
    };

    // Responsive h1 Typography styles
    const h1Styles = {
        fontSize: { xs: '1.5rem', md: '3rem' },
        lineHeight: { xs: 1.2, md: 1.167 },
    };

    if (scheduleDays.length === 0) {
        return (
            <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
                <Typography variant="h1" component="h1" gutterBottom sx={h1Styles}>
                    Schedule
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    The schedule for this convention has not been released yet.
                </Typography>
            </Box>
        );
    }

    const sortedDays = [...scheduleDays].sort((a, b) => a.dayOffset - b.dayOffset);
    const preConventionDays = sortedDays.filter(day => day.dayOffset < 0);
    const mainConventionDays = sortedDays.filter(day => day.dayOffset >= 0 && day.dayOffset <= conventionDurationDays);
    const postConventionDays = sortedDays.filter(day => day.dayOffset > conventionDurationDays);

    return (
        <Box sx={{ width: '100%' }}>
            {preConventionDays.length > 0 && (
                <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 }, position: 'relative', mb: 3 }}>
                    <Box sx={imageStyles}>
                        <Image
                            src="https://convention-crasher.s3.amazonaws.com/images/pre-con-schedule.png"
                            alt="Pre-convention schedule graphic"
                            width={imageSize}
                            height={imageSize}
                            unoptimized
                        />
                    </Box>
                    <Typography variant="h1" component="h2" gutterBottom sx={{ ...h1Styles, color: 'text.secondary', pr: isMobile ? 12 : 28 }}>
                        Pre-Convention Schedule
                    </Typography>
                    {preConventionDays.map(day => {
                        const dayDate = conventionDayDate(convention.startDate, day.dayOffset);
                        return (
                            <Box key={day.id} sx={{ mb: 4, mt: 2 }}>
                                <Typography variant="h6" component="h3" gutterBottom sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                                    {formatDate(dayDate, timeZone)}
                                </Typography>
                                <List>
                                    {[...day.events]
                                        .filter(event => event.startTimeMinutes != null)
                                        .sort((a, b) => (a.startTimeMinutes ?? 0) - (b.startTimeMinutes ?? 0))
                                        .map((event, index) => {
                                            const startTime = add(dayDate, { minutes: event.startTimeMinutes! });
                                            const endTime = add(startTime, { minutes: event.durationMinutes ?? 0 });

                                            return (
                                                <React.Fragment key={event.id}>
                                                    <ListItem>
                                                        <ListItemText
                                                            primary={
                                                                <Typography variant="h6">
                                                                    {`${formatTime(startTime, timeZone)} - ${formatTime(endTime, timeZone)}: `}
                                                                    {linkifyNames(event.title, event.talentLinks)}
                                                                </Typography>
                                                            }
                                                            secondary={
                                                                <>
                                                                    {event.locationName && <Typography component="span" display="block" variant="body2">Location: {event.locationName}</Typography>}
                                                                    {event.description && <Typography component="span" display="block" variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{linkifyNames(event.description, event.talentLinks)}</Typography>}
                                                                    {event.talentLinks && event.talentLinks.length > 0 && (
                                                                        <Typography component="span" display="block" variant="body2" sx={{ mt: 1 }}>
                                                                            Featuring: {renderTalentList(event.talentLinks)}
                                                                        </Typography>
                                                                    )}
                                                                </>
                                                            }
                                                        />
                                                    </ListItem>
                                                    {index < day.events.length - 1 && <Divider component="li" />}
                                                </React.Fragment>
                                            );
                                        })}
                                </List>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {mainConventionDays.length > 0 && (
                <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 }, position: 'relative', mb: 3 }}>
                    {(preConventionDays.length > 0 || postConventionDays.length > 0) && (
                        <Box sx={imageStyles}>
                            <Image
                                src="https://convention-crasher.s3.amazonaws.com/images/main-schedule.png"
                                alt="Main schedule graphic"
                                width={imageSize}
                                height={imageSize}
                                unoptimized
                            />
                        </Box>
                    )}
                    <Typography variant="h1" component="h2" gutterBottom sx={{ ...h1Styles, color: 'text.secondary', pr: (preConventionDays.length > 0 || postConventionDays.length > 0) ? (isMobile ? 12 : 28) : 0 }}>
                        Convention Schedule
                    </Typography>
                    {mainConventionDays.map(day => {
                        const dayDate = conventionDayDate(convention.startDate, day.dayOffset);

                        return (
                            <Box key={day.id} sx={{ mb: 4, mt: 2 }}>
                                <Typography variant="h6" component="h3" gutterBottom sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                                    {day.label} - {formatDate(dayDate, timeZone)}
                                </Typography>
                                <List>
                                    {[...day.events]
                                        .filter(event => event.startTimeMinutes != null)
                                        .sort((a, b) => (a.startTimeMinutes ?? 0) - (b.startTimeMinutes ?? 0))
                                        .map((event, index) => {
                                            const startTime = add(dayDate, { minutes: event.startTimeMinutes! });
                                            const endTime = add(startTime, { minutes: event.durationMinutes ?? 0 });

                                            return (
                                                <React.Fragment key={event.id}>
                                                    <ListItem>
                                                        <ListItemText
                                                            primary={
                                                                <Typography variant="h6">
                                                                    {`${formatTime(startTime, timeZone)} - ${formatTime(endTime, timeZone)}: `}
                                                                    {linkifyNames(event.title, event.talentLinks)}
                                                                </Typography>
                                                            }
                                                            secondary={
                                                                <>
                                                                    {event.locationName && <Typography component="span" display="block" variant="body2">Location: {event.locationName}</Typography>}
                                                                    {event.description && <Typography component="span" display="block" variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{linkifyNames(event.description, event.talentLinks)}</Typography>}
                                                                    {event.talentLinks && event.talentLinks.length > 0 && (
                                                                        <Typography component="span" display="block" variant="body2" sx={{ mt: 1 }}>
                                                                            Featuring: {renderTalentList(event.talentLinks)}
                                                                        </Typography>
                                                                    )}
                                                                </>
                                                            }
                                                        />
                                                    </ListItem>
                                                    {index < day.events.length - 1 && <Divider component="li" />}
                                                </React.Fragment>
                                            );
                                        })}
                                </List>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {postConventionDays.length > 0 && (
                <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 }, position: 'relative' }}>
                    <Box sx={imageStyles}>
                        <Image
                            src="https://convention-crasher.s3.amazonaws.com/images/post-con-schedule.png"
                            alt="Post-convention schedule graphic"
                            width={imageSize}
                            height={imageSize}
                            unoptimized
                        />
                    </Box>
                    <Typography variant="h1" component="h2" gutterBottom sx={{ ...h1Styles, color: 'text.secondary', pr: isMobile ? 12 : 28 }}>
                        Post-Convention Schedule
                    </Typography>
                    {postConventionDays.map(day => {
                        const dayDate = conventionDayDate(convention.startDate, day.dayOffset);
                        return (
                            <Box key={day.id} sx={{ mb: 4, mt: 2 }}>
                                <Typography variant="h6" component="h3" gutterBottom sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                                    {formatDate(dayDate, timeZone)}
                                </Typography>
                                <List>
                                    {[...day.events]
                                        .filter(event => event.startTimeMinutes != null)
                                        .sort((a, b) => (a.startTimeMinutes ?? 0) - (b.startTimeMinutes ?? 0))
                                        .map((event, index) => {
                                            const startTime = add(dayDate, { minutes: event.startTimeMinutes! });
                                            const endTime = add(startTime, { minutes: event.durationMinutes ?? 0 });

                                            return (
                                                <React.Fragment key={event.id}>
                                                    <ListItem>
                                                        <ListItemText
                                                            primary={
                                                                <Typography variant="h6">
                                                                    {`${formatTime(startTime, timeZone)} - ${formatTime(endTime, timeZone)}: `}
                                                                    {linkifyNames(event.title, event.talentLinks)}
                                                                </Typography>
                                                            }
                                                            secondary={
                                                                <>
                                                                    {event.locationName && <Typography component="span" display="block" variant="body2">Location: {event.locationName}</Typography>}
                                                                    {event.description && <Typography component="span" display="block" variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{linkifyNames(event.description, event.talentLinks)}</Typography>}
                                                                    {event.talentLinks && event.talentLinks.length > 0 && (
                                                                        <Typography component="span" display="block" variant="body2" sx={{ mt: 1 }}>
                                                                            Featuring: {renderTalentList(event.talentLinks)}
                                                                        </Typography>
                                                                    )}
                                                                </>
                                                            }
                                                        />
                                                    </ListItem>
                                                    {index < day.events.length - 1 && <Divider component="li" />}
                                                </React.Fragment>
                                            );
                                        })}
                                </List>
                            </Box>
                        );
                    })}
                </Box>
            )}
        </Box>
    );
} 