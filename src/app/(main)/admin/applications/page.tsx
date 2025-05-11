'use client';

import React, { useState, useEffect, startTransition } from 'react';
// import { db } from '@/lib/db'; // REMOVE THIS LINE
import { reviewOrganizerApplication, getPendingOrganizerApplicationsAction } from '@/lib/actions'; // Added getPendingOrganizerApplicationsAction
import { ApplicationStatus, RequestedRole } from '@prisma/client'; // Role, User, RoleApplication are not directly needed here if types are well defined for action returns
import { Button, Container, Typography, Paper, List, ListItem, ListItemText, CircularProgress, Alert, Box, Chip } from '@mui/material';

// Client-side type for applications, matching what getPendingOrganizerApplicationsAction returns
interface RoleApplicationWithUserClient {
  id: string;
  userId: string;
  requestedRole: RequestedRole; // Assuming RequestedRole enum is available client-side or stringified
  status: ApplicationStatus;    // Assuming ApplicationStatus enum is available client-side or stringified
  createdAt: string; // Dates are stringified by the action
  updatedAt: string; 
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
}

// REMOVE placeholder getPendingOrganizerApplications function
/*
async function getPendingOrganizerApplications() {
    // ... old code ...
    return []; 
}
*/

export default function AdminRoleApplicationsPage() {
  const [applications, setApplications] = useState<RoleApplicationWithUserClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchApplications = async () => {
    setIsLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const result = await getPendingOrganizerApplicationsAction();
      if (result.success && result.applications) {
        setApplications(result.applications as RoleApplicationWithUserClient[]); // Cast to client type
      } else {
        setError(result.error || 'Failed to fetch applications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleReview = async (applicationId: string, newStatusString: 'APPROVED' | 'REJECTED') => {
    setFeedback(null);
    setError(null); 
    try {
      startTransition(async () => {
        const result = await reviewOrganizerApplication(applicationId, newStatusString);
        if (result.success) {
          setFeedback({ type: 'success', message: result.message });
          fetchApplications(); // Refresh the list
        } else {
          setFeedback({ type: 'error', message: result.message });
          // Optionally set general error as well if feedback isn't prominent enough
          // setError(result.message);
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during review.';
      setFeedback({ type: 'error', message: errorMessage });
      // setError(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Pending Organizer Applications
      </Typography>
      
      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}
      
      {error && !feedback && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {applications.length === 0 && !error && (
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="subtitle1">No pending organizer applications.</Typography>
        </Paper>
      )}

      {applications.length > 0 && (
        <Paper elevation={3}>
          <List>
            {applications.map((app) => (
              <ListItem key={app.id} divider
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 1}}>
                    <Button 
                      variant="contained" 
                      color="success" 
                      onClick={() => handleReview(app.id, 'APPROVED')} // Pass as string
                      size="small"
                    >
                      Approve
                    </Button>
                    <Button 
                      variant="contained" 
                      color="error" 
                      onClick={() => handleReview(app.id, 'REJECTED')} // Pass as string
                      size="small"
                    >
                      Reject
                    </Button>
                  </Box>
                }
              >
                <ListItemText 
                  primary={`${app.user.name || 'N/A'} (${app.user.email || 'N/A'})`}
                  secondary={
                    <>
                      Application ID: {app.id} <br />
                      Applied on: {new Date(app.createdAt).toLocaleDateString()} <br />
                      Requested Role: <Chip label={app.requestedRole} size="small" /> <br />
                      Status: <Chip label={app.status} size="small" />
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Container>
  );
} 