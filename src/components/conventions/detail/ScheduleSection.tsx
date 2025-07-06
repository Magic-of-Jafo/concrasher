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
} from '@mui/material';
import { add, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';


// Based on prisma/schema.prisma
interface ConventionScheduleItem {
    id: string;
    title: string;
    description?: string | null;
    locationName?: string | null;
    startTimeMinutes?: number | null;
    durationMinutes?: number | null;
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
    const scheduleDays: ScheduleDay[] = convention.scheduleDays || [];
    const timeZone = convention.timezone?.ianaId || 'UTC';
    const conventionStartDate = new Date(convention.startDate);

    if (scheduleDays.length === 0) {
        return (
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Schedule
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    The schedule for this convention has not been released yet.
                </Typography>
            </Paper>
        );
    }

    const sortedDays = [...scheduleDays].sort((a, b) => a.dayOffset - b.dayOffset);

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Schedule
            </Typography>
            {sortedDays.map(day => {
                const dayDate = add(conventionStartDate, { days: day.dayOffset });

                return (
                    <Box key={day.id} sx={{ mb: 4 }}>
                        <Typography variant="h5" component="h2" gutterBottom sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
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
                                                            {`${formatTime(startTime, timeZone)} - ${formatTime(endTime, timeZone)}: ${event.title}`}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <>
                                                            {event.locationName && <Typography component="span" display="block" variant="body2">Location: {event.locationName}</Typography>}
                                                            {event.description && <Typography component="span" display="block" variant="body2" sx={{ mt: 1 }}>{event.description}</Typography>}
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
        </Paper>
    );
} 