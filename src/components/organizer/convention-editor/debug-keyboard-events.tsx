import React, { useEffect } from 'react';
import { Box, TextField, Typography, Button } from '@mui/material';

interface DebugKeyboardEventsProps {
    onClose: () => void;
}

const DebugKeyboardEvents: React.FC<DebugKeyboardEventsProps> = ({ onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                console.log('🔍 Debug: KeyDown event detected', {
                    key: e.key,
                    target: e.target,
                    currentTarget: e.currentTarget,
                    bubbles: e.bubbles,
                    cancelable: e.cancelable,
                    defaultPrevented: e.defaultPrevented,
                    eventPhase: e.eventPhase,
                    isTrusted: e.isTrusted,
                    composed: e.composed,
                    path: e.composedPath?.()
                });

                // Check if preventDefault was called
                if (e.defaultPrevented) {
                    console.log('🚫 Debug: preventDefault was called on this event!');
                }
            }
        };

        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                console.log('🔍 Debug: KeyPress event detected', {
                    key: e.key,
                    target: e.target,
                    defaultPrevented: e.defaultPrevented
                });
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                console.log('🔍 Debug: KeyUp event detected', {
                    key: e.key,
                    target: e.target,
                    defaultPrevented: e.defaultPrevented
                });
            }
        };

        // Add listeners at different phases
        document.addEventListener('keydown', handleKeyDown, true); // Capture phase
        document.addEventListener('keydown', handleKeyDown, false); // Bubble phase
        document.addEventListener('keypress', handleKeyPress, true);
        document.addEventListener('keypress', handleKeyPress, false);
        document.addEventListener('keyup', handleKeyUp, true);
        document.addEventListener('keyup', handleKeyUp, false);

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('keydown', handleKeyDown, false);
            document.removeEventListener('keypress', handleKeyPress, true);
            document.removeEventListener('keypress', handleKeyPress, false);
            document.removeEventListener('keyup', handleKeyUp, true);
            document.removeEventListener('keyup', handleKeyUp, false);
        };
    }, []);

    return (
        <Box sx={{ p: 2, border: '2px solid red', borderRadius: 1, mb: 2 }}>
            <Typography variant="h6" color="error" gutterBottom>
                🔍 Debug Mode: Keyboard Event Tracker
            </Typography>
            <Typography variant="body2" gutterBottom>
                Open DevTools Console and try typing Enter or Space in the field below.
                Check the console for event details.
            </Typography>

            <TextField
                fullWidth
                label="Test Field - Try Enter and Space"
                multiline
                rows={3}
                placeholder="Type here and press Enter or Space..."
                sx={{ mb: 2 }}
                onKeyDown={(e) => {
                    console.log('🎯 Debug: TextField onKeyDown', {
                        key: e.key,
                        defaultPrevented: e.defaultPrevented,
                        target: e.target
                    });
                }}
                onKeyPress={(e) => {
                    console.log('🎯 Debug: TextField onKeyPress', {
                        key: e.key,
                        defaultPrevented: e.defaultPrevented
                    });
                }}
            />

            <Button
                variant="contained"
                color="error"
                onClick={onClose}
                sx={{ mr: 1 }}
            >
                Close Debug Mode
            </Button>

            <Button
                variant="outlined"
                onClick={() => console.clear()}
            >
                Clear Console
            </Button>
        </Box>
    );
};

export default DebugKeyboardEvents; 