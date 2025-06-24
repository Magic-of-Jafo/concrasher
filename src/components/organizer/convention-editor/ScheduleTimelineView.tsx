import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface ScheduleTimelineViewProps {
  scheduleItems: any[];
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  // onCreate and dayOffset are not used by this list view
}

export default function ScheduleTimelineView({ scheduleItems, onEdit, onDelete }: ScheduleTimelineViewProps) {
  return (
    <Box sx={{ p: 0 }}> {/* Removed main border and minHeight, assuming parent handles layout */}
      {scheduleItems.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>No events scheduled yet.</Typography>
      ) : (
        scheduleItems.map((item) => (
          <Box 
            key={item.id} 
            sx={{ 
              mb: 1, 
              p: 1.5, 
              border: '1px solid #eee', 
              borderRadius: 2, 
              background: '#fff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              '&:hover': { borderColor: '#ccc' }
            }}
          >
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              {item.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton aria-label="Edit" onClick={() => onEdit && onEdit(item)} size="small">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton aria-label="Delete" onClick={() => onDelete && onDelete(item)} size="small" sx={{ color: '#d32f2f' }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
}
