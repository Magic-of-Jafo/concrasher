'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Container,
  Paper,
  Typography,
  CircularProgress,
  Box,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import { ConventionStatus } from '@prisma/client';
import ConventionSeriesSelector from '@/components/ConventionSeriesSelector';
import ConventionEditorTabs from '@/components/organizer/convention-editor/ConventionEditorTabs';
import { type BasicInfoFormData, type PriceTier, type PriceDiscount, type VenueHotelTabData, type VenueData, type HotelData, type ConventionMediaData, createDefaultVenueHotelTabData } from '@/lib/validators';
import AdminGuard from '@/components/auth/AdminGuard';

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
  status?: ConventionStatus; // Add status property
  priceTiers?: PriceTier[];
  priceDiscounts?: PriceDiscount[];
  venueHotel: VenueHotelTabData; // USE IMPORTED TYPE
  media?: ConventionMediaData[]; // Add media field
  coverImageUrl?: string; // Add cover image URL
  profileImageUrl?: string; // Add profile image URL
  settings?: { currency: string; timezone: string; }; // Add settings field
  keywords?: string[]; // Add keywords field
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
  websiteUrl: '',
  registrationUrl: '',
  seriesId: undefined,
  newSeriesName: '',
};

// Initial state for the whole page data, ensuring venueHotel and its sub-fields are defined.
const initialPageConventionData: PageConventionData = {
  ...initialBasicInfoValues,
  // id will be set from params or on creation
  priceTiers: [],
  priceDiscounts: [],
  venueHotel: createDefaultVenueHotelTabData(), // Use factory from validators
};

// Status colors and labels
const statusColors: Record<ConventionStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info'> = {
  [ConventionStatus.DRAFT]: 'default',
  [ConventionStatus.PUBLISHED]: 'primary',
  [ConventionStatus.PAST]: 'secondary',
  [ConventionStatus.CANCELLED]: 'error',
};

const statusLabels: Record<ConventionStatus, string> = {
  [ConventionStatus.DRAFT]: 'Draft',
  [ConventionStatus.PUBLISHED]: 'Published',
  [ConventionStatus.PAST]: 'Past Event',
  [ConventionStatus.CANCELLED]: 'Cancelled',
};

interface NewSeriesData extends Omit<ConventionSeries, 'id'> { }

// Define local interfaces for how API data might be initially shaped. 
// These are for mapping the raw API response before transforming to shared validator types.
interface ApiPhotoData { id?: string; url: string; caption?: string; }
interface ApiVenueData {
  id?: string; conventionId?: string; isPrimaryVenue: boolean; venueName: string;
  description?: string; websiteUrl?: string; googleMapsUrl?: string; streetAddress?: string;
  city?: string; stateRegion?: string; postalCode?: string; country?: string;
  contactEmail?: string; contactPhone?: string; amenities?: string[]; parkingInfo?: string;
  publicTransportInfo?: string; overallAccessibilityNotes?: string; photos?: ApiPhotoData[];
}
interface ApiHotelData {
  id?: string; conventionId?: string; isPrimaryHotel: boolean; isAtPrimaryVenueLocation: boolean;
  hotelName: string; description?: string; websiteUrl?: string; googleMapsUrl?: string;
  streetAddress?: string; city?: string; stateRegion?: string; postalCode?: string; country?: string;
  contactEmail?: string; contactPhone?: string; amenities?: string[]; photos?: ApiPhotoData[];
  parkingInfo?: string; publicTransportInfo?: string; overallAccessibilityNotes?: string;
  bookingLink?: string; bookingCutoffDate?: Date | string | null; groupRateOrBookingCode?: string; groupPrice?: string;
}

// Component for status selection
function StatusSelector({ currentStatus, onStatusChange, isUpdating }: {
  currentStatus: ConventionStatus | undefined;
  onStatusChange: (newStatus: ConventionStatus) => void;
  isUpdating: boolean;
}) {
  if (!currentStatus) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Chip
        label={statusLabels[currentStatus]}
        color={statusColors[currentStatus]}
        size="small"
      />
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="status-select-label">Status</InputLabel>
        <Select
          labelId="status-select-label"
          value={currentStatus}
          label="Status"
          onChange={(e) => onStatusChange(e.target.value as ConventionStatus)}
          disabled={isUpdating}
        >
          <MenuItem value={ConventionStatus.PUBLISHED}>
            {statusLabels[ConventionStatus.PUBLISHED]}
          </MenuItem>
          <MenuItem value={ConventionStatus.DRAFT}>
            {statusLabels[ConventionStatus.DRAFT]}
          </MenuItem>
          <MenuItem value={ConventionStatus.PAST}>
            {statusLabels[ConventionStatus.PAST]}
          </MenuItem>
          <MenuItem value={ConventionStatus.CANCELLED}>
            {statusLabels[ConventionStatus.CANCELLED]}
          </MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}

function ConventionEditPage() { // Remove params from props
  const router = useRouter();
  const params = useParams(); // Use the hook here
  const conventionId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : undefined; // Get ID from hook

  const { data: session, status: sessionStatus } = useSession();
  const isEditing = !!conventionId; // Determine if editing based on conventionId

  const [currentStep, setCurrentStep] = useState<'selectSeries' | 'editDetails'>('editDetails');

  // Initialize with a fully formed structure
  const [conventionPageData, setConventionPageData] = useState<PageConventionData>(() => ({
    ...initialPageConventionData,
    id: conventionId, // Set current convention ID here
    venueHotel: {
      ...createDefaultVenueHotelTabData(), // Ensure a valid default structure
      // conventionId might not be needed directly on venueHotel, but on individual venues/hotels if required by backend for association
    }
  }));

  const [isLoading, setIsLoading] = useState(isEditing); // Start true if editing, false if new
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const conventionPageDataRef = useRef(conventionPageData);

  // Handle status updates
  const handleStatusChange = async (newStatus: ConventionStatus) => {
    if (!conventionId || newStatus === conventionPageData.status) return;

    setIsUpdatingStatus(true);
    setError(null);

    try {
      const response = await fetch(`/api/conventions/${conventionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      const updatedConvention = await response.json();

      // Update local state
      setConventionPageData(prev => ({
        ...prev,
        status: updatedConvention.status,
      }));

    } catch (err: any) {
      setError(err.message || 'Failed to update status');

      // Don't revert the UI state here - let it show the attempted change
      // The user will see the error message and can try again
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    conventionPageDataRef.current = conventionPageData;
  }, [conventionPageData]);

  // Load existing convention data if editing
  useEffect(() => {
    if (conventionId && isEditing) {
      const loadConvention = async () => {
        try {
          const response = await fetch(`/api/organizer/conventions/${conventionId}`);
          if (!response.ok) {
            if (response.status === 404) {
              setError('The requested convention could not be found. It may have been deleted or you may not have permission to view it.');
            } else {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to load convention');
            }
            return;
          }
          const loadedApiConvention = await response.json(); // This is the raw data from your API

          // Also load settings data
          let conventionSettings = null;
          try {
            const settingsResponse = await fetch(`/api/organizer/conventions/${conventionId}/settings`);
            if (settingsResponse.ok) {
              const settingsData = await settingsResponse.json();
              conventionSettings = settingsData;
            }
          } catch (settingsError) {
            console.warn('[EditPage] Failed to load settings:', settingsError);
          }

          let finalPrimaryVenue: VenueData | undefined = undefined;
          const finalSecondaryVenues: VenueData[] = [];
          const finalHotels: HotelData[] = [];

          // Transform API venues to VenueData (from @/lib/validators)
          if (loadedApiConvention.venues && Array.isArray(loadedApiConvention.venues)) {
            loadedApiConvention.venues.forEach((apiVenue: ApiVenueData) => {
              const venue: VenueData = {
                id: apiVenue.id,
                isPrimaryVenue: apiVenue.isPrimaryVenue || false,
                markedForPrimaryPromotion: false,
                venueName: apiVenue.venueName || '',
                description: apiVenue.description || '',
                websiteUrl: apiVenue.websiteUrl || '',
                googleMapsUrl: apiVenue.googleMapsUrl || '',
                streetAddress: apiVenue.streetAddress || '',
                city: apiVenue.city || '',
                stateRegion: apiVenue.stateRegion || '',
                postalCode: apiVenue.postalCode || '',
                country: apiVenue.country || '',
                contactEmail: apiVenue.contactEmail || '',
                contactPhone: apiVenue.contactPhone || '',
                amenities: Array.isArray(apiVenue.amenities) ? apiVenue.amenities.map(String) : [],
                parkingInfo: apiVenue.parkingInfo || '',
                publicTransportInfo: apiVenue.publicTransportInfo || '',
                overallAccessibilityNotes: apiVenue.overallAccessibilityNotes || '',
                photos: Array.isArray(apiVenue.photos) ? apiVenue.photos.map((p: ApiPhotoData) => ({ url: p.url, caption: p.caption, id: p.id })) : [],
              };
              if (venue.isPrimaryVenue) {
                finalPrimaryVenue = venue;
              } else {
                finalSecondaryVenues.push(venue);
              }
            });
          }

          // This is the actual boolean value from the database via the API.
          // Default to false if undefined (though it should be present now).
          const actualGuestsStayAtPrimaryVenue = loadedApiConvention.guestsStayAtPrimaryVenue ?? false;

          // Transform API hotels to HotelData (from @/lib/validators)
          let finalPrimaryHotelDetails: HotelData | undefined = undefined;

          if (loadedApiConvention.hotels && Array.isArray(loadedApiConvention.hotels)) {
            loadedApiConvention.hotels.forEach((apiHotel: ApiHotelData) => {
              const commonHotelData: HotelData = { // Ensure type matches HotelData
                id: apiHotel.id,
                isPrimaryHotel: apiHotel.isPrimaryHotel || false, // Keep this to identify it
                isAtPrimaryVenueLocation: apiHotel.isAtPrimaryVenueLocation || false,
                markedForPrimaryPromotion: false, // Initialize with default
                hotelName: apiHotel.hotelName || '',
                description: apiHotel.description || '',
                websiteUrl: apiHotel.websiteUrl || '',
                googleMapsUrl: apiHotel.googleMapsUrl || '',
                streetAddress: apiHotel.streetAddress || '',
                city: apiHotel.city || '',
                stateRegion: apiHotel.stateRegion || '',
                postalCode: apiHotel.postalCode || '',
                country: apiHotel.country || '',
                contactEmail: apiHotel.contactEmail || '',
                contactPhone: apiHotel.contactPhone || '',
                amenities: Array.isArray(apiHotel.amenities) ? apiHotel.amenities.map(String) : [],
                photos: Array.isArray(apiHotel.photos) ? apiHotel.photos.map(p => ({ url: p.url, caption: p.caption, id: p.id })) : [],
                parkingInfo: apiHotel.parkingInfo || '',
                publicTransportInfo: apiHotel.publicTransportInfo || '',
                overallAccessibilityNotes: apiHotel.overallAccessibilityNotes || '',
                bookingLink: apiHotel.bookingLink || '',
                bookingCutoffDate: apiHotel.bookingCutoffDate ? new Date(apiHotel.bookingCutoffDate) : null,
                groupRateOrBookingCode: apiHotel.groupRateOrBookingCode || '',
                groupPrice: apiHotel.groupPrice || '',
              };

              // Add all hotels to the finalHotels array
              finalHotels.push(commonHotelData);

              // If guests are NOT staying at the primary venue and this is the primary hotel,
              // also set it as finalPrimaryHotelDetails for backward compatibility
              if (actualGuestsStayAtPrimaryVenue === false && apiHotel.isPrimaryHotel) {
                finalPrimaryHotelDetails = commonHotelData;
              }
            });
          }

          // Construct the VenueHotelTabData object using transformed data
          const transformedVenueHotelData: VenueHotelTabData = {
            primaryVenue: finalPrimaryVenue,
            secondaryVenues: finalSecondaryVenues,
            primaryHotelDetails: finalPrimaryHotelDetails,
            hotels: finalHotels,
            guestsStayAtPrimaryVenue: actualGuestsStayAtPrimaryVenue, // Use the direct value from API
          };

          setConventionPageData({
            id: conventionId,
            name: loadedApiConvention.name || '',
            slug: loadedApiConvention.slug || '',
            status: loadedApiConvention.status || ConventionStatus.DRAFT,
            startDate: loadedApiConvention.startDate ? new Date(loadedApiConvention.startDate) : null,
            endDate: loadedApiConvention.endDate ? new Date(loadedApiConvention.endDate) : null,
            isOneDayEvent: loadedApiConvention.isOneDayEvent || false,
            isTBD: loadedApiConvention.isTBD || false,
            city: loadedApiConvention.city || '',
            stateName: loadedApiConvention.stateName || loadedApiConvention.stateAbbreviation || '',
            stateAbbreviation: loadedApiConvention.stateAbbreviation || '',
            country: loadedApiConvention.country || '',
            descriptionShort: loadedApiConvention.descriptionShort || '',
            descriptionMain: loadedApiConvention.descriptionMain || '',
            websiteUrl: loadedApiConvention.websiteUrl || '',
            registrationUrl: loadedApiConvention.registrationUrl || '',
            seriesId: loadedApiConvention.seriesId || undefined,
            newSeriesName: '',
            priceTiers: loadedApiConvention.priceTiers || [],
            priceDiscounts: loadedApiConvention.priceDiscounts || [],
            venueHotel: transformedVenueHotelData, // Use the fully transformed object
            media: loadedApiConvention.media || [],
            coverImageUrl: loadedApiConvention.coverImageUrl,
            profileImageUrl: loadedApiConvention.profileImageUrl,
            settings: conventionSettings || { currency: 'USD', timezone: '' },
            keywords: loadedApiConvention.keywords || [], // Add keywords mapping
          });

          if (loadedApiConvention.seriesId || loadedApiConvention.conventionSeriesId) {
            setCurrentStep('editDetails');
          } else {
            setCurrentStep('selectSeries');
          }

        } catch (err: any) {
          setError(err.message || 'An unexpected error occurred.');
        } finally {
          setIsLoading(false);
        }
      };

      if (sessionStatus === 'authenticated') {
        loadConvention();
      }
    }
  }, [conventionId, isEditing, sessionStatus]);

  // Check if user has permission to edit this convention
  useEffect(() => {
    if (sessionStatus === 'authenticated' && conventionPageData && session?.user) {
      const isAdmin = session.user.roles?.includes('ADMIN');
      const isOrganizer = session.user.roles?.includes('ORGANIZER');

      if (!isAdmin && !isOrganizer) {
        router.push('/unauthorized');
        return;
      }

      // If user is Organizer, check if they own the series that this convention belongs to
      if (isOrganizer && !isAdmin && conventionPageData.seriesId) {
        // Check if the organizer owns the series
        const checkSeriesOwnership = async () => {
          try {
            const response = await fetch(`/api/organizer/series/${conventionPageData.seriesId}/check-ownership`);
            if (!response.ok) {
              router.push('/unauthorized');
              return;
            }
            const { isOwner } = await response.json();
            if (!isOwner) {
              router.push('/unauthorized');
            }
          } catch (error) {
            console.error('Error checking series ownership:', error);
            router.push('/unauthorized');
          }
        };

        checkSeriesOwnership();
      }
    }
  }, [sessionStatus, session, conventionPageData, router]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
    // An admin OR an organizer can edit a convention
    if (sessionStatus === 'authenticated' && !session?.user?.roles?.some(role => ['ADMIN', 'ORGANIZER'].includes(role))) {
      router.push('/unauthorized');
    }
  }, [sessionStatus, session, router]);

  const handleExistingSeriesSelected = (selectedSeriesId: string | null) => {
    if (selectedSeriesId) {
      setConventionPageData(prevData => ({
        ...prevData,
        seriesId: selectedSeriesId,
      } as PageConventionData)); // Ensure type consistency
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
        ...prevData,
        seriesId: createdSeries.id,
      } as PageConventionData)); // Ensure type consistency
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

    // Merge the latest data from the active tab with the ref data from all other tabs
    const finalData = { ...conventionPageDataRef.current, ...dataFromTabs };

    try {
      // Helper to remove temporary UI-only fields
      const cleanObject = (obj: any) => {
        if (!obj) return undefined;
        const { tempId, markedForPrimaryPromotion, ...rest } = obj;
        return rest;
      };

      // Handle primary hotel switching logic BEFORE cleaning
      let processedHotels = finalData.venueHotel?.hotels || [];

      const hotelToPromote = processedHotels.find(h => h.markedForPrimaryPromotion);

      if (hotelToPromote) {
        // Set all hotels to not primary
        processedHotels = processedHotels.map(h => ({
          ...h,
          isPrimaryHotel: false,
          markedForPrimaryPromotion: false
        }));

        // Set the marked hotel as primary
        const promotedHotelIndex = processedHotels.findIndex(h => h.id === hotelToPromote.id);
        if (promotedHotelIndex !== -1) {
          processedHotels[promotedHotelIndex] = {
            ...processedHotels[promotedHotelIndex],
            isPrimaryHotel: true,
            markedForPrimaryPromotion: false
          };
        }
      }

      // Now clean the hotels after processing the primary hotel switching
      const cleanedHotels = processedHotels.map(cleanObject);

      // Construct payload, ensuring to use the merged finalData
      const payload = {
        ...finalData,
        venueHotel: {
          primaryVenue: finalData.venueHotel?.primaryVenue ? cleanObject(finalData.venueHotel.primaryVenue) : null,
          secondaryVenues: finalData.venueHotel?.secondaryVenues?.map(cleanObject) || [],
          primaryHotelDetails: finalData.venueHotel?.primaryHotelDetails ? cleanObject(finalData.venueHotel.primaryHotelDetails) : null,
          hotels: cleanedHotels || [],
          guestsStayAtPrimaryVenue: finalData.venueHotel?.guestsStayAtPrimaryVenue,
        }
      };

      // Remove fields that shouldn't be in the PUT body for convention root
      delete (payload as any).priceTiers;
      delete (payload as any).priceDiscounts;
      delete (payload as any).newSeriesName; // Should not be sent

      const response = await fetch(`/api/organizer/conventions/${conventionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save convention. Status: ${response.status}`);
      }

      const savedConvention = await response.json();

      // Update local state with any new data from the server (like new IDs)
      setConventionPageData(prev => ({
        ...prev,
        ...savedConvention,
        venueHotel: {
          ...prev.venueHotel,
          ...savedConvention.venueHotel,
        }
      }));

      // Optionally, show a success message
      // e.g., using a toast notification library
      console.log('Convention saved successfully!');

      // Redirect based on user role
      if (session?.user?.roles?.includes('ADMIN')) {
        router.push('/admin/conventions');
      } else {
        router.push('/organizer/conventions'); // Default for Organizers
      }

    } catch (err: any) {
      console.error('Save failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      // Re-throw the error so the calling component knows about the failure.
      throw new Error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh" flexDirection="column">
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading Convention Data...</Typography>
      </Box>
    );
  }

  if (sessionStatus === 'loading') {
    return <p>Loading session...</p>;
  }

  if (sessionStatus === 'unauthenticated' || (sessionStatus === 'authenticated' && !session?.user?.roles?.some(role => ['ADMIN', 'ORGANIZER'].includes(role)))) {
    return <p>Redirecting...</p>;
  }

  if (error && !conventionPageData) { // If loading failed and no data, show error prominently
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h1" component="h1">
          {isEditing ? `Edit ${conventionPageData.name || 'Convention'}` : 'Create New Convention'}
        </Typography>
        {isEditing && (
          <StatusSelector
            currentStatus={conventionPageData.status}
            onStatusChange={handleStatusChange}
            isUpdating={isUpdatingStatus}
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {currentStep === 'selectSeries' && !isEditing ? (
        <Paper elevation={3} sx={{ p: 4 }}>
          <ConventionSeriesSelector
            onSeriesSelect={handleExistingSeriesSelected}
            onNewSeriesCreate={handleNewSeriesCreated}
          />
        </Paper>
      ) : (
        <ConventionEditorTabs
          initialConventionData={conventionPageData}
          onSave={handleSubmitConvention}
          onCancel={handleCancel}
          isSaving={isSaving}
          isEditing={isEditing}
        />
      )}
    </Container>
  );
}

export default function GuardedConventionEditPage() {
  return <ConventionEditPage />;
} 