'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Container, Paper, CircularProgress, Box } from '@mui/material';
import ConventionWizard from '@/components/organizer/wizard/ConventionWizard';

// The Convention Listing Wizard page. Resumable: reopening this URL picks up
// where the organizer left off (all steps save as they go). Ownership is
// enforced by the APIs the wizard calls (organizer-of-series or admin).
export default function ConventionWizardPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const { data: session, status: sessionStatus } = useSession();

    useEffect(() => {
        if (sessionStatus === 'unauthenticated') router.push('/login');
        if (
            sessionStatus === 'authenticated' &&
            !session?.user?.roles?.some((r: string) => r === 'ORGANIZER' || r === 'ADMIN')
        ) {
            router.push('/unauthorized');
        }
    }, [sessionStatus, session, router]);

    if (sessionStatus !== 'authenticated') {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper elevation={2} sx={{ p: { xs: 2, md: 4 } }}>
                <ConventionWizard conventionId={params.id} />
            </Paper>
        </Container>
    );
}
