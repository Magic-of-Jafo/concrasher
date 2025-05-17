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
import { type BasicInfoFormData, type PriceTier, type PriceDiscount } from '@/lib/validators';

// Define ConventionSeries interface locally
interface ConventionSeries {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}

// This interface will hold the complete data for the convention being edited on this page
interface PageConventionData extends BasicInfoFormData {
  id?: string; // Convention ID itself
  priceTiers?: PriceTier[];
  priceDiscounts?: PriceDiscount[];
  // Add other top-level fields if the API for fetching a single convention returns more
}

// pageInitialFormData is more of a base for BasicInfo, might not need it if PageConventionData starts undefined
const initialBasicInfoValues: BasicInfoFormData = {
  name: '',
  slug: '',
  startDate: null,
  endDate: null,
  isOneDayEvent: false,
  isTBD: false,
  city: '',
  stateName: '', // Changed from state to stateName for consistency with BasicInfoFormSchema
  stateAbbreviation: '', // Added for consistency
  country: '',
  descriptionShort: undefined,
  descriptionMain: undefined,
  seriesId: undefined,
  newSeriesName: '',
};

interface NewSeriesData extends Omit<ConventionSeries, 'id'> {}

export default function ConventionEditPage({ params }: { params: { id: string } }) { // params.id is expected to be a string here
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const isEditing = true; // Since params.id is required for this page
  
  const [currentStep, setCurrentStep] = useState<'selectSeries' | 'editDetails'>('editDetails');
  
  // State to hold all convention data for the editor tabs
  const [conventionPageData, setConventionPageData] = useState<PageConventionData | undefined>(undefined);
  
  const [isLoading, setIsLoading] = useState(true); // Start true if editing
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  // Load existing convention data if editing
  useEffect(() => {
    if (params.id) {
      const loadConvention = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/organizer/conventions/${params.id}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load convention');
          }
          const loadedApiConvention = await response.json(); // Data from API
          
          setConventionPageData({
            ...initialBasicInfoValues, // Start with all required fields
            id: params.id,
            name: loadedApiConvention.name || '',
            slug: loadedApiConvention.slug || '',
            startDate: loadedApiConvention.startDate ? new Date(loadedApiConvention.startDate) : null,
            endDate: loadedApiConvention.endDate ? new Date(loadedApiConvention.endDate) : null,
            isOneDayEvent: loadedApiConvention.isOneDayEvent || false,
            isTBD: loadedApiConvention.isTBD || false,
            city: loadedApiConvention.city || '',
            stateName: loadedApiConvention.stateName || loadedApiConvention.stateAbbreviation || '',
            stateAbbreviation: loadedApiConvention.stateAbbreviation || '',
            country: loadedApiConvention.country || '',
            descriptionShort: loadedApiConvention.descriptionShort,
            descriptionMain: loadedApiConvention.descriptionMain,
            seriesId: loadedApiConvention.conventionSeriesId || loadedApiConvention.seriesId,
            priceTiers: loadedApiConvention.priceTiers || [], 
            priceDiscounts: loadedApiConvention.priceDiscounts || [],
          });
          
          if (loadedApiConvention.seriesId || loadedApiConvention.conventionSeriesId) {
            setCurrentStep('editDetails');
          } else {
            setCurrentStep('selectSeries');
          }

        } catch (err: any) {
          setError(err.message || 'Failed to load convention data.');
          setCurrentStep('editDetails'); 
        } finally {
          setIsLoading(false);
        }
      };
      loadConvention();
    } else {
      // This case should ideally not be reached if params.id is guaranteed by routing for an edit page.
      // If it can be reached, redirect or show an error.
      setError('Convention ID is missing. Cannot edit.');
      setIsLoading(false);
      // router.push('/organizer/conventions'); // Or some error page
    }
  }, [params.id]);

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
      setConventionPageData(prevData => ({
        ...(prevData || initialBasicInfoValues), // Ensure prevData is not undefined and spread initial values first
        id: prevData?.id, // Preserve existing id if any
        priceTiers: prevData?.priceTiers || [],
        priceDiscounts: prevData?.priceDiscounts || [],
        seriesId: selectedSeriesId,
      } as PageConventionData));
      setCurrentStep('editDetails');
      setSeriesError(null);
    }
  };

  const handleNewSeriesCreated = async (newSeriesData: NewSeriesData) => {
    setIsSaving(true); 
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

      setConventionPageData(prevData => ({
        ...(prevData || initialBasicInfoValues),
        id: prevData?.id, // Preserve existing id
        priceTiers: prevData?.priceTiers || [],
        priceDiscounts: prevData?.priceDiscounts || [],
        seriesId: createdSeries.id,
      } as PageConventionData));
      setCurrentStep('editDetails');
    } catch (err: any) {
      setSeriesError(err.message || 'An unexpected error occurred while creating the series.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitConvention = async (dataFromTabs: Partial<PageConventionData>) => {
    setIsSaving(true);
    setError(null);
    
    const currentData = conventionPageData || initialBasicInfoValues;

    const payload: BasicInfoFormData = {
        name: dataFromTabs.name ?? currentData.name ?? '',
        slug: dataFromTabs.slug ?? currentData.slug ?? '',
        startDate: (dataFromTabs.startDate !== undefined ? dataFromTabs.startDate : currentData.startDate) || null,
        endDate: (dataFromTabs.endDate !== undefined ? dataFromTabs.endDate : currentData.endDate) || null,
        isOneDayEvent: dataFromTabs.isOneDayEvent ?? currentData.isOneDayEvent ?? false,
        isTBD: dataFromTabs.isTBD ?? currentData.isTBD ?? false,
        city: dataFromTabs.city ?? currentData.city ?? '',
        stateName: dataFromTabs.stateName ?? currentData.stateName ?? '',
        stateAbbreviation: dataFromTabs.stateAbbreviation ?? currentData.stateAbbreviation ?? '',
        country: dataFromTabs.country ?? currentData.country ?? '',
        descriptionShort: dataFromTabs.descriptionShort ?? currentData.descriptionShort,
        descriptionMain: dataFromTabs.descriptionMain ?? currentData.descriptionMain,
        seriesId: dataFromTabs.seriesId ?? currentData.seriesId,
        newSeriesName: dataFromTabs.newSeriesName, 
    };

    if (payload.isTBD) {
      payload.isOneDayEvent = false;
    }
    
    // Note: The main save button in ConventionEditorTabs saves basic info. Pricing tab has its own save.
    // This handleSubmitConvention is for the main save button.

    try {
      const url = `/api/organizer/conventions/${params.id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), 
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update convention`);
      }

      const conventionResult = await response.json();
      // Optionally, update conventionPageData with conventionResult if API returns full updated object
      // setConventionPageData(prev => ({...prev, ...conventionResult, id: params.id }));
      router.push('/organizer/conventions?toastMessage=Convention+updated+successfully'); // Or back to conventions list
    } catch (err: any) {
      console.error('Client-side error during handleSubmitConvention:', err);
      setError(err.message || 'Failed to update convention. Please check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/organizer/conventions');
  };

  if (isLoading && !conventionPageData) { // Show loading only if data isn't there yet
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (sessionStatus === 'loading') {
    return <p>Loading session...</p>; 
  }
  
  if (sessionStatus === 'unauthenticated' || (sessionStatus === 'authenticated' && !session?.user?.roles?.includes('ORGANIZER'))) {
    return <p>Redirecting...</p>;
  }

  if (error && !conventionPageData) { // If loading failed and no data, show error prominently
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 3, mt: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Convention
        </Typography>
        {currentStep === 'selectSeries' && conventionPageData && (
          <ConventionSeriesSelector 
            onSeriesSelect={handleExistingSeriesSelected}
            onNewSeriesCreate={handleNewSeriesCreated}
            initialSeriesId={conventionPageData?.seriesId}
          />
        )}
        {currentStep === 'editDetails' && conventionPageData && (
          <ConventionEditorTabs
            initialConventionData={conventionPageData} 
            isEditing={isEditing}
            onSave={handleSubmitConvention} 
            isSaving={isSaving}
            onCancel={handleCancel}
          />
        )}
         {error && currentStep === 'editDetails' && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>} 
      </Paper>
    </Container>
  );
} 