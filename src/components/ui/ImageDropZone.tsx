'use client';

import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface ImageDropZoneProps {
    /** Open the file picker (click / keyboard). */
    onPick: () => void;
    /** A file was dropped onto the zone. */
    onFile: (file: File) => void;
    label?: string;
    hint?: string;
    disabled?: boolean;
}

/**
 * One clean box that communicates all three ways to add an image: click it,
 * drag a file onto it, or paste from the clipboard. Paste itself is handled by
 * the surrounding uploader (it already listens on its container); this provides
 * the click + drag affordance and the visual cue.
 */
export default function ImageDropZone({
    onPick,
    onFile,
    label = 'Add an image',
    hint = 'Click, drag an image here, or paste (Ctrl/Cmd+V)',
    disabled = false,
}: ImageDropZoneProps) {
    const [dragOver, setDragOver] = useState(false);

    return (
        <Box
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={label}
            onClick={() => !disabled && onPick()}
            onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPick(); } }}
            onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer?.files?.[0];
                if (!disabled && f && f.type.startsWith('image/')) onFile(f);
            }}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                py: 4,
                px: 2,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: dragOver ? 'primary.main' : 'divider',
                bgcolor: dragOver ? 'action.hover' : 'transparent',
                borderRadius: 2,
                cursor: disabled ? 'not-allowed' : 'pointer',
                outline: 'none',
                opacity: disabled ? 0.6 : 1,
                transition: 'border-color .15s, background-color .15s',
                '&:hover': !disabled ? { borderColor: 'primary.main', bgcolor: 'action.hover' } : {},
                '&:focus-visible': { borderColor: 'primary.main', boxShadow: (t) => `0 0 0 3px ${t.palette.primary.main}33` },
            }}
        >
            <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{label}</Typography>
            <Typography variant="caption" color="text.secondary">{hint}</Typography>
        </Box>
    );
}
