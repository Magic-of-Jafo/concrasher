"use client";

import React, { useTransition, useState } from 'react';
import {
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Typography,
    Box,
    CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { approveRoleApplication, rejectRoleApplication } from '@/lib/actions';
import eventBus from '@/lib/event-bus';

// This type should ideally be generated or shared from a common types file
interface Application {
    id: string;
    requestedRole: string;
    user: {
        name: string | null;
        email: string | null;
    };
}

interface RoleApplicationListProps {
    applications: Application[];
    onApplicationProcessed: (applicationId: string) => void;
}

export default function RoleApplicationList({ applications, onApplicationProcessed }: RoleApplicationListProps) {
    const [isPending, startTransition] = useTransition();
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleApprove = (id: string) => {
        setProcessingId(id);
        startTransition(async () => {
            await approveRoleApplication(id);
            eventBus.emit('applicationProcessed', id);
            setProcessingId(null);
        });
    };

    const handleReject = (id: string) => {
        setProcessingId(id);
        startTransition(async () => {
            await rejectRoleApplication(id);
            eventBus.emit('applicationProcessed', id);
            setProcessingId(null);
        });
    };

    if (applications.length === 0) {
        return <Typography>No pending role applications.</Typography>;
    }

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Pending Role Applications</Typography>
            <List>
                {applications.map((app) => (
                    <ListItem key={app.id} divider>
                        <ListItemText
                            primary={`${app.user.name || 'N/A'} (${app.user.email || 'N/A'})`}
                            secondary={`Role: ${app.requestedRole}`}
                        />
                        <ListItemSecondaryAction>
                            {processingId === app.id ? <CircularProgress size={24} /> : (
                                <>
                                    <IconButton edge="end" aria-label="approve" onClick={() => handleApprove(app.id)} color="success" disabled={isPending}>
                                        <CheckCircleIcon />
                                    </IconButton>
                                    <IconButton edge="end" aria-label="reject" onClick={() => handleReject(app.id)} color="error" disabled={isPending}>
                                        <CancelIcon />
                                    </IconButton>
                                </>
                            )}
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
} 