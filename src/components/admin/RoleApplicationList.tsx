"use client";

import React, { useTransition } from 'react';
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
}

export default function RoleApplicationList({ applications }: RoleApplicationListProps) {
    const [isPending, startTransition] = useTransition();

    const handleApprove = (id: string) => {
        startTransition(async () => {
            await approveRoleApplication(id);
        });
    };

    const handleReject = (id: string) => {
        startTransition(async () => {
            await rejectRoleApplication(id);
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
                            {isPending ? <CircularProgress size={24} /> : (
                                <>
                                    <IconButton edge="end" aria-label="approve" onClick={() => handleApprove(app.id)} color="success">
                                        <CheckCircleIcon />
                                    </IconButton>
                                    <IconButton edge="end" aria-label="reject" onClick={() => handleReject(app.id)} color="error">
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