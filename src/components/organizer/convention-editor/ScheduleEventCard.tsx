import React from 'react';
import { Card, CardContent, Typography, CardActions, Button } from '@mui/material';

interface ScheduleEventCardProps {
  event: any;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ScheduleEventCard({ event, onEdit, onDelete }: ScheduleEventCardProps) {
  // TODO: Render event details, add action buttons, make draggable/resizable
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle1">{event.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {event.startTime} - {event.endTime}
        </Typography>
        {/* TODO: Add location, fee info */}
      </CardContent>
      <CardActions>
        <Button size="small" onClick={onEdit}>Edit</Button>
        <Button size="small" onClick={onDelete}>Delete</Button>
      </CardActions>
    </Card>
  );
} 