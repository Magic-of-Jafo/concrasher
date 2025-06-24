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
import { type BasicInfoFormData, type PriceTier, type PriceDiscount, type VenueHotelTabData, type VenueData, type HotelData, createDefaultVenueHotelTabData } from '@/lib/validators';

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
  venueHotel: VenueHotelTabData; // USE IMPORTED TYPE
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

// Initial state for the whole page data, ensuring venueHotel and its sub-fields are defined.
const initialPageConventionData: PageConventionData = {
  ...initialBasicInfoValues,
  // id will be set from params or on creation
  priceTiers: [],
  priceDiscounts: [],
  venueHotel: createDefaultVenueHotelTabData(), // Use factory from validators
};

interface NewSeriesData extends Omit<ConventionSeries, 'id'> {}

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

export default function ConventionEditPage({ params }: { params: { id: string } }) { // params.id is expected to be a string here
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const isEditing = true; // Since params.id is required for this page
  
  const [currentStep, setCurrentStep] = useState<'selectSeries' | 'editDetails'>('editDetails');
  
  // Initialize with a fully formed structure
  const [conventionPageData, setConventionPageData] = useState<PageConventionData>(() => ({
    ...initialPageConventionData,
    id: params.id, // Set current convention ID here
    venueHotel: {
        ...createDefaultVenueHotelTabData(), // Ensure a valid default structure
        // conventionId might not be needed directly on venueHotel, but on individual venues/hotels if required by backend for association
    }
  }));
  
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
          const loadedApiConvention = await response.json(); // This is the raw data from your API
          
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

              // If guests are NOT staying at the primary venue (i.e., they need a separate hotel),
              // and this hotel is marked as the primary hotel, then it's our finalPrimaryHotelDetails.
              if (actualGuestsStayAtPrimaryVenue === false && apiHotel.isPrimaryHotel) {
                finalPrimaryHotelDetails = commonHotelData;
              } else {
                // Otherwise, it's just an additional hotel (or it's the primary hotel but guests ARE at primary venue, so we don't list it separately here)
                // We only add to finalHotels if it's NOT the primary hotel that we've already assigned to finalPrimaryHotelDetails
                if (!(actualGuestsStayAtPrimaryVenue === false && apiHotel.isPrimaryHotel)) {
                     finalHotels.push(commonHotelData);
                }
              }
            });
          }
          
          // Construct the VenueHotelTabData object using transformed data
          const transformedVenueHotelData: VenueHotelTabData = {
            primaryVenue: finalPrimaryVenue, 
            secondaryVenues: finalSecondaryVenues,
            hotels: finalHotels,
            guestsStayAtPrimaryVenue: actualGuestsStayAtPrimaryVenue, // Use the direct value from API
            primaryHotelDetails: finalPrimaryHotelDetails, 
          };

          setConventionPageData({
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
            descriptionShort: loadedApiConvention.descriptionShort || '',
            descriptionMain: loadedApiConvention.descriptionMain || '',
            seriesId: loadedApiConvention.conventionSeriesId || loadedApiConvention.seriesId,
            priceTiers: loadedApiConvention.priceTiers || [], 
            priceDiscounts: loadedApiConvention.priceDiscounts || [],
            venueHotel: transformedVenueHotelData, // Assign the ALIGNED data structure
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

    // Initialize variables to hold the final venue and hotel data for the API
    let finalPrimaryVenueForApi: VenueData | undefined | null = dataFromTabs.venueHotel?.primaryVenue;
    let allOtherVenuesForApi: VenueData[] = [];
    let finalPrimaryHotelDetailsForApi: HotelData | undefined | null = dataFromTabs.venueHotel?.primaryHotelDetails;
    
    // Initialize allOtherHotelsForApi, ensuring isPrimaryHotel is false and stripping any UI-only flags like markedForPrimaryPromotion
    let allOtherHotelsForApi: HotelData[] = (dataFromTabs.venueHotel?.hotels || []).map(hotel => {
      const { markedForPrimaryPromotion, ...restOfHotel } = hotel as any; // Cast to access and then remove UI flag
      return { ...restOfHotel, isPrimaryHotel: false };
    });

    if (dataFromTabs.venueHotel) {
      // --- Venue Promotion Logic ---
      const currentPrimaryVenue = dataFromTabs.venueHotel.primaryVenue;
      const secondaryVenues = dataFromTabs.venueHotel.secondaryVenues || [];
      let promotedVenueFromSecondaries: VenueData | undefined = undefined;
      let promotedVenueIndex = -1;

      secondaryVenues.forEach((venue, index) => {
        if (venue.markedForPrimaryPromotion && !promotedVenueFromSecondaries) {
          promotedVenueFromSecondaries = { ...venue, isPrimaryVenue: true, markedForPrimaryPromotion: false };
          promotedVenueIndex = index;
        }
      });

      if (promotedVenueFromSecondaries) {
        // A secondary venue is promoted
        if (currentPrimaryVenue) {
          allOtherVenuesForApi.push({ ...currentPrimaryVenue, isPrimaryVenue: false, markedForPrimaryPromotion: false });
        }
        finalPrimaryVenueForApi = promotedVenueFromSecondaries;
        secondaryVenues.forEach((venue, index) => {
          if (index !== promotedVenueIndex) {
            allOtherVenuesForApi.push({ ...venue, isPrimaryVenue: false, markedForPrimaryPromotion: false });
          }
        });
      } else {
        // No secondary venue promoted, current primary (if any) remains primary.
        // allOtherVenuesForApi are just the non-promoted secondary venues.
        finalPrimaryVenueForApi = currentPrimaryVenue; // Already set at initialization, ensure isPrimary:true if it exists
        if (finalPrimaryVenueForApi) finalPrimaryVenueForApi.isPrimaryVenue = true;
        
        allOtherVenuesForApi = secondaryVenues.map(venue => ({ ...venue, isPrimaryVenue: false, markedForPrimaryPromotion: false }));
      }
      allOtherVenuesForApi.forEach(v => delete (v as any).markedForPrimaryPromotion); // Clean UI field
      // --- End Venue Promotion Logic ---

      // --- Hotel Promotion Logic ---
      // This logic mirrors the Venue Promotion Logic.
      // It decides which hotel becomes the single primary hotel sent to the API
      // based on dataFromTabs.venueHotel.primaryHotelDetails and any hotel in
      // dataFromTabs.venueHotel.hotels marked for primary promotion.

      let finalPrimaryHotelDetailsForApi_temp: HotelData | undefined | null = dataFromTabs.venueHotel?.primaryHotelDetails;
      let allOtherHotelsForApi_temp: HotelData[] = [];

      if (dataFromTabs.venueHotel) {
        const currentPrimaryHotelInForm = dataFromTabs.venueHotel.primaryHotelDetails;
        const additionalHotelsFromForm = dataFromTabs.venueHotel.hotels || [];
        
        console.log('[EditPage] handleSubmitConvention: Raw additionalHotelsFromForm from tabs:', JSON.stringify(additionalHotelsFromForm, null, 2));
        additionalHotelsFromForm.forEach(h => console.log(`[EditPage] Hotel: ${h.hotelName}, Marked for promotion: ${(h as any).markedForPrimaryPromotion}` ));

        let promotedHotelFromAdditionals: HotelData | undefined = undefined;
        let promotedHotelIndexInAdditionals = -1;

        additionalHotelsFromForm.forEach((hotel, index) => {
          // Use 'markedForPrimaryPromotion' which is a UI flag from DisplayHotelData
          if ((hotel as any).markedForPrimaryPromotion && !promotedHotelFromAdditionals) {
            // Take a clean copy, ensure isPrimaryHotel is true, and remove UI flags
            const { markedForPrimaryPromotion, tempId, ...restOfHotel } = hotel as any;
            promotedHotelFromAdditionals = { ...restOfHotel, isPrimaryHotel: true };
            promotedHotelIndexInAdditionals = index;
          }
        });

        if (promotedHotelFromAdditionals) {
          // An additional hotel is promoted to be the primary.
          finalPrimaryHotelDetailsForApi_temp = promotedHotelFromAdditionals;

          // The hotel that was in the primaryHotelDetails form (if any) now becomes an 'other' hotel.
          if (currentPrimaryHotelInForm) {
            const { markedForPrimaryPromotion, tempId, ...restOfOldPrimary } = currentPrimaryHotelInForm as any;
            allOtherHotelsForApi_temp.push({ ...restOfOldPrimary, isPrimaryHotel: false });
          }
          // Add all other non-promoted additional hotels to the 'other' hotels list.
          additionalHotelsFromForm.forEach((hotel, index) => {
            if (index !== promotedHotelIndexInAdditionals) {
              const { markedForPrimaryPromotion, tempId, ...restOfHotel } = hotel as any;
              allOtherHotelsForApi_temp.push({ ...restOfHotel, isPrimaryHotel: false });
            }
          });
        } else {
          // No additional hotel was marked for promotion.
          // The hotel in primaryHotelDetails form (if any) remains the primary.
          if (currentPrimaryHotelInForm) {
            const { markedForPrimaryPromotion, tempId, ...restOfPrimary } = currentPrimaryHotelInForm as any;
            finalPrimaryHotelDetailsForApi_temp = { ...restOfPrimary, isPrimaryHotel: true };
          } else {
            finalPrimaryHotelDetailsForApi_temp = undefined; // No primary hotel specified at all
          }
          // All hotels from the additional hotels list are non-primary.
          allOtherHotelsForApi_temp = additionalHotelsFromForm.map(hotel => {
            const { markedForPrimaryPromotion, tempId, ...restOfHotel } = hotel as any;
            return { ...restOfHotel, isPrimaryHotel: false };
          });
        }
      } else {
        // No venueHotel data in dataFromTabs, so no hotel details to process.
        finalPrimaryHotelDetailsForApi_temp = undefined;
        allOtherHotelsForApi_temp = [];
      }
      // Assign to the variables used in payloadForApi
      finalPrimaryHotelDetailsForApi = finalPrimaryHotelDetailsForApi_temp;
      allOtherHotelsForApi = allOtherHotelsForApi_temp;
      // --- End Hotel Promotion Logic ---
    } else {
      // No venueHotel data in dataFromTabs, clear all venue/hotel related fields for API
      finalPrimaryVenueForApi = undefined;
      allOtherVenuesForApi = [];
      finalPrimaryHotelDetailsForApi = undefined;
      allOtherHotelsForApi = [];
    }

    // Construct the final payload for the API
    const payloadForApi = {
      // Basic info fields from dataFromTabs
      name: dataFromTabs.name,
      slug: dataFromTabs.slug,
      startDate: dataFromTabs.startDate,
      endDate: dataFromTabs.endDate,
      isOneDayEvent: dataFromTabs.isOneDayEvent,
      isTBD: dataFromTabs.isTBD,
      city: dataFromTabs.city,
      stateName: dataFromTabs.stateName,
      stateAbbreviation: dataFromTabs.stateAbbreviation,
      country: dataFromTabs.country,
      descriptionShort: dataFromTabs.descriptionShort,
      descriptionMain: dataFromTabs.descriptionMain,
      seriesId: dataFromTabs.seriesId,
      // Price tiers and discounts from dataFromTabs
      priceTiers: dataFromTabs.priceTiers,
      priceDiscounts: dataFromTabs.priceDiscounts,
      // Venue and Hotel information
      venueHotel: {
        primaryVenue: finalPrimaryVenueForApi, // Contains the single primary venue or undefined
        guestsStayAtPrimaryVenue: dataFromTabs.venueHotel?.guestsStayAtPrimaryVenue ?? false,
        primaryHotelDetails: finalPrimaryHotelDetailsForApi, // Now correctly determined by new Hotel Promotion Logic
        hotels: allOtherHotelsForApi, // Array of non-primary hotels, correctly determined
        secondaryVenues: allOtherVenuesForApi, // Array of non-primary venues
      },
    };

    console.log('[EditPage] PayloadForApi being sent (entire object):', JSON.stringify(payloadForApi, null, 2));
    if (payloadForApi.venueHotel?.primaryVenue) {
      console.log('[EditPage] Chosen Primary Venue for API:', JSON.stringify(payloadForApi.venueHotel.primaryVenue, null, 2));
    }
    // console.log('[EditPage] All other venues collected (API might not use this array directly for updates):', JSON.stringify(allOtherVenuesForApi, null, 2));

    try {
      const url = `/api/organizer/conventions/${params.id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadForApi), // Send the more complete payload
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update convention`);
      }

      const conventionResult = await response.json();
      // Optionally, update conventionPageData with conventionResult if API returns full updated object
      // setConventionPageData(prev => ({...prev, ...conventionResult, id: params.id }));

      // START OF MODIFICATION: Update local state before navigating
      // First, transform the API response (conventionResult) to match PageConventionData structure
      let transformedPrimaryVenue: VenueData | undefined = undefined;
      const transformedSecondaryVenues: VenueData[] = [];
      const transformedHotels: HotelData[] = [];
      let transformedPrimaryHotelDetails: HotelData | undefined = undefined;

      if (conventionResult.venues && Array.isArray(conventionResult.venues)) {
        conventionResult.venues.forEach((apiVenue: ApiVenueData) => {
          const venue: VenueData = {
            id: apiVenue.id,
            isPrimaryVenue: apiVenue.isPrimaryVenue || false,
            markedForPrimaryPromotion: false, // Reset UI flag
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
            transformedPrimaryVenue = venue;
          } else {
            transformedSecondaryVenues.push(venue);
          }
        });
      }

      const actualGuestsStayAtPrimaryVenue = conventionResult.guestsStayAtPrimaryVenue ?? false;

      if (conventionResult.hotels && Array.isArray(conventionResult.hotels)) {
        conventionResult.hotels.forEach((apiHotel: ApiHotelData) => {
          const commonHotelData: HotelData = {
            id: apiHotel.id,
            isPrimaryHotel: apiHotel.isPrimaryHotel || false,
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
          if (actualGuestsStayAtPrimaryVenue === false && apiHotel.isPrimaryHotel) {
            transformedPrimaryHotelDetails = commonHotelData;
          } else {
            if (!(actualGuestsStayAtPrimaryVenue === false && apiHotel.isPrimaryHotel)) {
                transformedHotels.push(commonHotelData);
            }
          }
        });
      }

      const transformedVenueHotelData: VenueHotelTabData = {
        primaryVenue: transformedPrimaryVenue, 
        secondaryVenues: transformedSecondaryVenues,
        hotels: transformedHotels,
        guestsStayAtPrimaryVenue: actualGuestsStayAtPrimaryVenue,
        primaryHotelDetails: transformedPrimaryHotelDetails, 
      };

      setConventionPageData(prevData => ({
        ...prevData, // Keep existing data not directly from conventionResult (like non-API fields or UI state)
        id: conventionResult.id || params.id, // Ensure ID is from result or params
        name: conventionResult.name || '',
        slug: conventionResult.slug || '',
        startDate: conventionResult.startDate ? new Date(conventionResult.startDate) : null,
        endDate: conventionResult.endDate ? new Date(conventionResult.endDate) : null,
        isOneDayEvent: conventionResult.isOneDayEvent || false,
        isTBD: conventionResult.isTBD || false,
        city: conventionResult.city || '',
        stateName: conventionResult.stateName || conventionResult.stateAbbreviation || '',
        stateAbbreviation: conventionResult.stateAbbreviation || '',
        country: conventionResult.country || '',
        descriptionShort: conventionResult.descriptionShort || '',
        descriptionMain: conventionResult.descriptionMain || '',
        seriesId: conventionResult.seriesId, // API should return seriesId
        priceTiers: conventionResult.priceTiers || [], 
        priceDiscounts: conventionResult.priceDiscounts || [],
        venueHotel: transformedVenueHotelData,
      }));
      // END OF MODIFICATION

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
          {conventionPageData?.name ? `Edit ${conventionPageData.name}` : 'Edit Convention'}
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