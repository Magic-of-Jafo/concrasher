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
import ConventionEditorTabs from '@/components/organizer/convention-editor/ConventionEditorTabs';
import { type BasicInfoFormData } from '@/lib/validators';

// Define ConventionSeries interface locally
interface ConventionSeries {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}

// This page-level initialFormData is used if creating a new convention directly on this page (though new/page.tsx is typical)
// or as a base before loading existing data.
const pageInitialFormData: BasicInfoFormData = {
  name: '',
  slug: '',
  startDate: null,
  endDate: null,
  isOneDayEvent: false,
  isTBD: false,
  city: '',
  state: '',
  country: '',
  descriptionShort: null, // Align with ConventionEditorTabs initial state
  descriptionMain: null,  // Align with ConventionEditorTabs initial state
  seriesId: null,
  newSeriesName: '', // Align with ConventionEditorTabs initial state
};

interface NewSeriesData extends Omit<ConventionSeries, 'id'> {}

export default function ConventionEditPage({ params }: { params: { id?: string } }) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const isEditing = !!params.id;
  
  const [currentStep, setCurrentStep] = useState<'selectSeries' | 'editDetails'>(isEditing ? 'editDetails' : 'selectSeries');
  // conventionFormData on page level is for loading initial data and series selection
  const [conventionFormData, setConventionFormData] = useState<BasicInfoFormData>(pageInitialFormData);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  // Load existing convention data if editing
  useEffect(() => {
    if (isEditing && params.id) {
      const loadConvention = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/organizer/conventions/${params.id}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load convention');
          }
          const loadedConvention = await response.json(); // Renamed for clarity
          setConventionFormData({
            name: loadedConvention.name || '',
            slug: loadedConvention.slug || '',
            startDate: loadedConvention.startDate ? new Date(loadedConvention.startDate) : null,
            endDate: loadedConvention.endDate ? new Date(loadedConvention.endDate) : null,
            isOneDayEvent: loadedConvention.isOneDayEvent || false,
            isTBD: loadedConvention.isTBD || false,
            city: loadedConvention.city || '',
            // Prefer stateAbbreviation, fallback to state, then empty string
            state: loadedConvention.stateAbbreviation || loadedConvention.state || '', 
            country: loadedConvention.country || '',
            descriptionShort: loadedConvention.descriptionShort,
            descriptionMain: loadedConvention.descriptionMain,
            seriesId: loadedConvention.seriesId, // Critical field
            newSeriesName: '', 
          });
          
          // If editing and no seriesId, force series selection. Otherwise, go to details.
          if (loadedConvention.seriesId) {
            setCurrentStep('editDetails');
          } else {
            setCurrentStep('selectSeries'); // Force series selection if missing
          }

        } catch (err: any) {
          setError(err.message || 'Failed to load convention data.');
          setCurrentStep('editDetails'); // Fallback to details view on error to avoid blocking UI
        } finally {
          setIsLoading(false);
        }
      };
      loadConvention();
    } else if (!isEditing) {
      // For new conventions (if this page were used for it, though new/page.tsx is standard)
      setCurrentStep('selectSeries');
      setIsLoading(false); 
    }
  }, [isEditing, params.id]); // Removed 'router' from dependencies as it's stable

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
    if (sessionStatus === 'authenticated' && !session?.user?.roles?.includes('ORGANIZER')) {
      router.push('/unauthorized');
    }
  }, [sessionStatus, session, router]);

  const handleExistingSeriesSelected = (selectedSeriesId: string | null) => {
    if (selectedSeriesId) {
      setConventionFormData(prevData => ({
        ...prevData,
        seriesId: selectedSeriesId,
      }));
      setCurrentStep('editDetails');
      setSeriesError(null);
    }
  };

  const handleNewSeriesCreated = async (newSeriesData: NewSeriesData) => {
    setIsSaving(true); // Use main isSaving state
    setSeriesError(null);
    try {
      const response = await fetch('/api/convention-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSeriesData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create new series');
      }
      const createdSeries: ConventionSeries = await response.json();

      setConventionFormData(prevData => ({
        ...prevData,
        seriesId: createdSeries.id,
      }));
      setCurrentStep('editDetails');
    } catch (err: any) {
      setSeriesError(err.message || 'An unexpected error occurred while creating the series.');
    } finally {
      setIsSaving(false); // Reset main isSaving state
    }
  };

  // This function is now the callback for ConventionEditorTabs' save button
  const handleSubmitConvention = async (dataFromTabs: BasicInfoFormData) => {
    setIsSaving(true);
    setError(null);
    
    // dataFromTabs is BasicInfoFormData.
    const dataToSubmit: BasicInfoFormData = { ...dataFromTabs }; 
    
    // If isTBD is true, isOneDayEvent must be false.
    // Dates (startDate, endDate) are preserved as per form input regardless of isTBD state.
    // The API will handle date validation conditionally based on isTBD.
    if (dataToSubmit.isTBD) {
      dataToSubmit.isOneDayEvent = false;
    }
    // No longer nullifying startDate and endDate here if isTBD is true.

    const payload: any = { ...dataToSubmit };

    if (!isEditing) {
      payload.status = 'DRAFT'; 
    }

    try {
      const url = isEditing 
        ? `/api/organizer/conventions/${params.id}`
        : '/api/organizer/conventions'; 
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} convention`);
      }

      const conventionResult = await response.json();
      router.push('/organizer/conventions'); 
    } catch (err: any) {
      console.error('Client-side error during handleSubmitConvention:', err); // Enhanced logging
      const errorMessage = err.response?.data?.error || err.message || 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (sessionStatus === 'loading' || (isLoading && isEditing)) { // Only show main loader if actually loading existing
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }
  
  // This check might be redundant if session check redirects, but good for safety.
  if (sessionStatus !== 'authenticated' || !session?.user?.roles?.includes('ORGANIZER')) {
    // Or show an unauthorized message, redirect is handled by useEffect
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <Typography>Loading session or redirecting...</Typography>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {isEditing ? 'Edit Convention' : 'Create New Convention'}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Show series selector if currentStep is 'selectSeries' (for new or existing without seriesId) */}
        {currentStep === 'selectSeries' ? (
          <Paper elevation={2} sx={{ p: 3, maxWidth: 700, mx: 'auto', mb: 3 }}>
            <Typography variant="h6" gutterBottom align="center">
              {isEditing && !conventionFormData.seriesId 
                ? 'Link Convention to Series' 
                : 'Link or Create Convention Series'}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph align="center">
              {isEditing && !conventionFormData.seriesId
                ? 'This convention is not currently linked to a series. Please select an existing series or create a new one.'
                : 'Every convention must belong to a series. Select an existing series or create a new one to begin.'}
            </Typography>
            {seriesError && <Alert severity="error" sx={{ mb: 2 }}>{seriesError}</Alert>}
            <ConventionSeriesSelector 
              onSeriesSelect={handleExistingSeriesSelected}
              onNewSeriesCreate={handleNewSeriesCreated}
              // Consider passing currentSeriesId if selector can use it for pre-selection,
              // though if in 'selectSeries' step, seriesId on conventionFormData is likely null.
              // currentSeriesId={conventionFormData.seriesId} 
            />
          </Paper>
        ) : (
          // Render ConventionEditorTabs once series is selected/exists or if editing with a seriesId
          <> 
            <ConventionEditorTabs 
              initialConventionData={conventionFormData}
              isEditing={isEditing}
              onSave={handleSubmitConvention} // Pass the refactored submit handler
              isSaving={isSaving} // Pass the page's saving state
              onCancel={handleCancel} // Pass the cancel handler
            />
          </>
        )}
      </Paper>
    </Container>
  );
} 