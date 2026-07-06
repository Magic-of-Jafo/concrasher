'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Container,
  Paper,
  Typography,
  CircularProgress,
  Box,
  Alert,
} from '@mui/material';
import ConventionSeriesSelector from '@/components/ConventionSeriesSelector';
import ConventionEditorTabs, { type ConventionDataForEditor } from '@/components/organizer/convention-editor/ConventionEditorTabs';
import { type BasicInfoFormData } from '@/lib/validators';
import { slugify } from '@/lib/utils';

// Define ConventionSeries interface locally
interface ConventionSeries {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}

// Minimal initial data for the page, seriesId will be populated by selector
const pageInitialConventionData: Partial<BasicInfoFormData> = {
  seriesId: undefined,
};

// This can be Omit<ConventionSeries, 'id'> if ConventionSeries is defined as above
interface NewSeriesData extends Omit<ConventionSeries, 'id'> { }

export default function NewConventionPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [currentStep, setCurrentStep] = useState<'selectSeries' | 'nameIt' | 'editDetails'>('selectSeries');
  // This state will hold the seriesId and any other top-level data not in BasicInfoTab
  const [topLevelConventionData, setTopLevelConventionData] = useState<Partial<BasicInfoFormData>>(pageInitialConventionData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
    if (sessionStatus === 'authenticated' && !session?.user?.roles?.includes('ORGANIZER')) {
      router.push('/unauthorized');
    }
  }, [sessionStatus, session, router]);

  // Once a series is chosen, create the DRAFT immediately and jump into the
  // wizard — no name step. The wizard adopts the real name from the website
  // import (and the organizer can rename inline anytime). A placeholder name +
  // random slug keeps the row valid until then.
  const createDraftAndGoToWizard = async (seriesId: string, suggestedName?: string) => {
    setIsSaving(true);
    setError(null);
    setSeriesError(null);
    const name = (suggestedName && suggestedName.trim()) || 'Untitled convention';
    const create = async (slug: string) =>
      fetch('/api/organizer/conventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, seriesId, isTBD: true, isOneDayEvent: false }),
      });
    try {
      const rand = () => Math.random().toString(36).slice(2, 8);
      let response = await create(`${slugify(name)}-${rand()}`);
      if (response.status === 409) response = await create(`${slugify(name)}-${rand()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create convention');
      }
      const newConvention = await response.json();
      router.push(`/organizer/conventions/${newConvention.id}/wizard`);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsSaving(false);
    }
  };

  const handleExistingSeriesSelected = (selectedSeriesId: string | null) => {
    if (selectedSeriesId) createDraftAndGoToWizard(selectedSeriesId);
  };

  const handleNewSeriesCreated = async (newSeriesData: NewSeriesData) => {
    setIsSaving(true);
    setSeriesError(null);
    try {
      const response = await fetch('/api/organizer/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSeriesData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create new series');
      }
      const responseData = await response.json();
      const createdSeries: ConventionSeries = responseData.series;
      // Seed the draft's name from the series name (nicer starting point).
      await createDraftAndGoToWizard(createdSeries.id, createdSeries.name);
    } catch (err: any) {
      setSeriesError(err.message || 'An unexpected error occurred while creating the series.');
      setIsSaving(false);
    }
  };

  // This is the onSave handler for ConventionEditorTabs
  const handleSubmitConvention = async (dataFromTabs: Partial<ConventionDataForEditor>) => {
    setIsSaving(true);
    setError(null);

    let dataToSubmit: any = {
      ...dataFromTabs,
      // On initial creation, dates are not set, so it's always TBD.
      isTBD: true,
    };

    // If isTBD is true, isOneDayEvent must be false.
    // Dates (startDate, endDate) are preserved as per form input regardless of isTBD state.
    // The API will handle date validation conditionally based on isTBD.
    if (dataToSubmit.isTBD) {
      dataToSubmit.isOneDayEvent = false;
    }
    // No longer nullifying startDate and endDate here if isTBD is true.

    dataToSubmit.status = 'DRAFT';

    try {
      const response = await fetch('/api/organizer/conventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create convention');
      }
      const newConvention = await response.json();
      router.push('/profile?tab=organizer');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (sessionStatus === 'loading') {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (sessionStatus !== 'authenticated' || !session?.user?.roles?.includes('ORGANIZER')) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <Typography>Loading session or redirecting...</Typography>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {currentStep === 'selectSeries' ? (
        <Paper elevation={2} sx={{ p: 3, maxWidth: 700, mx: 'auto' }}>
          <Typography variant="h5" gutterBottom align="center">
            Link or Create Convention Series
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph align="center">
            Every convention must belong to a series. Select an existing series or create a new one to begin.
          </Typography>
          {seriesError && <Alert severity="error" sx={{ mb: 2 }}>{seriesError}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {isSaving ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 4 }}>
              <CircularProgress size={22} />
              <Typography color="text.secondary">Setting up your convention…</Typography>
            </Box>
          ) : (
            <ConventionSeriesSelector
              onSeriesSelect={handleExistingSeriesSelected}
              onNewSeriesCreate={handleNewSeriesCreated}
            />
          )}
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ p: { xs: 2, md: 4 } }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Create New Convention
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <ConventionEditorTabs
            initialConventionData={{ seriesId: topLevelConventionData.seriesId }} // Pass only necessary initial data like seriesId
            isEditing={false} // This is the new page
            onSave={handleSubmitConvention}
            isSaving={isSaving}
            onCancel={handleCancel}
          />
        </Paper>
      )}
    </Container>
  );
} 