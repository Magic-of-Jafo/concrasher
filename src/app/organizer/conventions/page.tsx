'use client';

import { useState, useEffect } from 'react';
import { Box, Container, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button } from '@mui/material';
import { Convention } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';

export default function OrganizerConventionsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [conventions, setConventions] = useState<Convention[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Check if user is an organizer
    if (status === 'authenticated' && !session?.user?.roles?.includes('ORGANIZER')) {
      router.push('/');
      return;
    }

    const fetchConventions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/organizer/conventions', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 403) {
            setError(errorData.error || 'You do not have permission to view this page');
          } else {
            throw new Error(errorData.error || `Failed to fetch conventions: ${response.status}`);
          }
          return;
        }
        
        const data: Convention[] = await response.json();
        setConventions(data);
      } catch (error) {
        console.error('Error fetching conventions:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch conventions');
      } finally {
        setIsLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchConventions();
    }
  }, [status, router, session?.user?.roles]);

  if (status === 'loading' || isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          bgcolor: 'background.paper',
          minHeight: '100vh'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            My Conventions
          </Typography>
          <Button
            component={Link}
            href="/organizer/conventions/new"
            variant="contained"
            color="primary"
          >
            Create Convention
          </Button>
        </Box>

        {error ? (
          <Box sx={{ color: 'error.main', p: 2 }}>
            Error: {error}
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={1}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conventions.map((convention) => (
                  <TableRow key={convention.id}>
                    <TableCell>{convention.name}</TableCell>
                    <TableCell>{format(new Date(convention.startDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(convention.endDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{convention.status}</TableCell>
                  </TableRow>
                ))}
                {conventions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No conventions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
} 