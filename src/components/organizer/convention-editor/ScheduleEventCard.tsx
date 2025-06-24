import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

interface ScheduleEventCardProps {
  event: any;
  // onEdit, onDelete, onDuplicate, etc. will be added
}

export default function ScheduleEventCard({ event }: ScheduleEventCardProps) {
  // TODO: Render event details, add action buttons, make draggable/resizable
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle1">{event.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {event.startTime} - {event.endTime}
        </Typography>
        {/* TODO: Add location, fee info, and action buttons */}
      </CardContent>
    </Card>
  );
} 