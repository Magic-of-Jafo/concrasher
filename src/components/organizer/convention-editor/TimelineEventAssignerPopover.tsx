import React, { useState, useEffect } from 'react';
import { Select, MenuItem, FormControl, InputLabel, Popover, Box } from '@mui/material';

// Define VirtualElement for anchor positioning
interface VirtualElement {
  getBoundingClientRect: () => DOMRect;
}

interface TimelineEventAssignerPopoverProps {
  open: boolean;
  anchorPosition?: { top: number; left: number };
  allScheduleItems: any[];
  onClose: () => void;
  onSelectExisting: (eventId: string) => void;
  onCreateNew: () => void;
}

export default function TimelineEventAssignerPopover({
  open,
  anchorPosition,
  allScheduleItems,
  onClose,
  onSelectExisting,
  onCreateNew,
}: TimelineEventAssignerPopoverProps) {
  const [currentSelection, setCurrentSelection] = useState('');

  useEffect(() => {
    if (open) {
      setCurrentSelection('');
    }
  }, [open]);

  const handleChange = (event: any) => {
    const eventId = event.target.value;
    setCurrentSelection(eventId);

    if (eventId === '__CREATE_NEW__') {
      onCreateNew();
    } else {
      onSelectExisting(eventId);
    }
    onClose();
  };

  const items = Array.isArray(allScheduleItems) ? allScheduleItems : [];

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      PaperProps={{
        sx: {
          p: 2,
          minWidth: 250,
        },
        onMouseDown: (e: React.MouseEvent<HTMLElement>) => e.stopPropagation(),
      }}
    >
      <FormControl 
        fullWidth 
        size="small" 
        onClick={(e: React.MouseEvent<HTMLElement>) => e.stopPropagation()}
      >
        <InputLabel id="assign-event-popover-label">Select Event</InputLabel>
        <Select
          labelId="assign-event-popover-label"
          label="Select Event"
          value={currentSelection}
          onChange={handleChange}
          autoFocus
        >
          <MenuItem value="__CREATE_NEW__"><em>Create New Event...</em></MenuItem>
          {items.map((eventItem: any) => (
            <MenuItem key={eventItem.id} value={eventItem.id}>
              {eventItem.title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Popover>
  );
} 