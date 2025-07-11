import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tabs, Tab, Box, Button, CircularProgress, Typography } from '@mui/material';
import { BasicInfoTab } from './BasicInfoTab';
import { type BasicInfoFormData } from '@/lib/validators';
import { PricingTab } from './PricingTab';
import { type PricingTabData, type PriceTier, type PriceDiscount } from '@/lib/validators';
import VenueHotelTab from './VenueHotelTab';
import { type VenueHotelTabData, createDefaultVenueHotelTabData } from '@/lib/validators';
import ScheduleTab from './ScheduleTab';
import DealersTab from './DealersTab';
import { MediaTab } from './MediaTab';
import { type ConventionMediaData } from '@/lib/validators';
import { SettingsTab } from './SettingsTab';
import { type ConventionSettingData } from '@/lib/validators';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

interface Currency {
  id: number;
  code: string;
  name: string;
  demonym: string | null;
  majorSingle: string;
  majorPlural: string;
  ISOnum: number | null;
  symbol: string;
  symbolNative: string;
  minorSingle: string;
  minorPlural: string;
  ISOdigits: number;
  decimals: number;
  numToBasic: number | null;
}

const fetchCurrencies = async (): Promise<Currency[]> => {
  const response = await fetch('/api/currencies');
  if (!response.ok) {
    throw new Error('Failed to fetch currencies');
  }
  return response.json();
};


interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`convention-tabpanel-${index}`}
      aria-labelledby={`convention-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function allyProps(index: number) {
  return {
    id: `convention-tab-${index}`,
    'aria-controls': `convention-tabpanel-${index}`,
  };
}

const initialBasicFormData: BasicInfoFormData = {
  name: '',
  slug: '',
  startDate: null,
  endDate: null,
  isOneDayEvent: false,
  isTBD: false,
  city: '',
  stateName: '',
  stateAbbreviation: '',
  country: 'United States',
  descriptionShort: '',
  descriptionMain: '',
  seriesId: '',
  newSeriesName: '',
};

export interface ConventionDataForEditor extends BasicInfoFormData {
  id?: string;
  priceTiers?: PriceTier[];
  priceDiscounts?: PriceDiscount[];
  venueHotel?: VenueHotelTabData;
  venues?: any[]; // Venue data array for API
  hotels?: any[]; // Hotel data array for API
  guestsStayAtPrimaryVenue?: boolean;
  media?: ConventionMediaData[];
  coverImageUrl?: string;
  profileImageUrl?: string;
  settings?: ConventionSettingData;
}

interface ConventionEditorTabsProps {
  initialConventionData?: Partial<ConventionDataForEditor>;
  isEditing: boolean;
  onSave: (data: Partial<ConventionDataForEditor>) => Promise<void>;
  isSaving: boolean;
  onCancel: () => void;
}

const ConventionEditorTabs: React.FC<ConventionEditorTabsProps> = ({
  initialConventionData,
  isEditing,
  onSave,
  isSaving,
  onCancel,
}) => {
  const router = useRouter();
  const { data: currencies } = useQuery<Currency[]>({
    queryKey: ['currencies'],
    queryFn: fetchCurrencies,
    staleTime: Infinity,
  });

  const [activeTab, setActiveTab] = useState(0);
  const [hasVenueHotelTabBeenInteractedWith, setHasVenueHotelTabBeenInteractedWith] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const localStorageKey = 'conventionEditorActiveTab';

  // Effect to load and set active tab from localStorage on initial mount (client-side)
  useEffect(() => {
    const storedTab = localStorage.getItem(localStorageKey);
    if (storedTab) {
      const tabIndex = parseInt(storedTab, 10);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 6) {
        setActiveTab(tabIndex);
        // console.log(`[ConventionEditorTabs] Loaded active tab ${tabIndex} from localStorage.`);
      }
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  const [basicInfoData, setBasicInfoData] = useState<BasicInfoFormData>(() => {
    const { priceTiers, priceDiscounts, id, venueHotel, ...basicDataFromInitial } = initialConventionData || {};
    return {
      ...initialBasicFormData,
      ...basicDataFromInitial,
    };
  });

  const [pricingTabData, setPricingTabData] = useState<PricingTabData>(() => ({
    priceTiers: initialConventionData?.priceTiers || [],
    priceDiscounts: initialConventionData?.priceDiscounts || [],
  }));

  // Memoize the default venue hotel data
  const defaultVenueHotelData = useMemo(() => createDefaultVenueHotelTabData(), []);

  const [venueHotelData, setVenueHotelData] = useState<VenueHotelTabData>(() => {
    const defaultSettings = defaultVenueHotelData;
    console.log('[ConventionEditorTabs - useState init] defaultSettings.guestsStayAtPrimaryVenue:', defaultSettings.guestsStayAtPrimaryVenue);
    if (initialConventionData) { // We have an existing convention's data
      const loadedVH = initialConventionData.venueHotel;
      console.log('[ConventionEditorTabs - useState init] initialConventionData.venueHotel:', loadedVH);
      console.log('[ConventionEditorTabs - useState init] loadedVH?.guestsStayAtPrimaryVenue:', loadedVH?.guestsStayAtPrimaryVenue);
      const finalValue = loadedVH?.guestsStayAtPrimaryVenue ?? false;
      console.log('[ConventionEditorTabs - useState init] resolved guestsStayAtPrimaryVenue for existing:', finalValue);
      return {
        ...defaultSettings, // Apply general defaults for structure
        ...(loadedVH || {}),   // Spread loaded specifics from initialConventionData.venueHotel
        guestsStayAtPrimaryVenue: finalValue
      };
    }
    console.log('[ConventionEditorTabs - useState init] Using full defaultSettings for new convention.');
    // No initialConventionData (new convention): use all settings from createDefaultVenueHotelTabData()
    return defaultSettings;
  });

  const [mediaData, setMediaData] = useState<ConventionMediaData[]>(() =>
    initialConventionData?.media || []
  );

  const [settingsData, setSettingsData] = useState<ConventionSettingData>(() => ({
    currency: initialConventionData?.settings?.currency || '',
    timezone: initialConventionData?.settings?.timezone || '',
  }));

  const currencySymbol = useMemo(() => {
    if (!currencies || !settingsData.currency) {
      return ''; // Return empty string instead of '$' when no currency is set
    }
    const selectedCurrency = currencies.find(c => c.code === settingsData.currency);
    return selectedCurrency?.symbol || ''; // Default to empty string if not found
  }, [currencies, settingsData.currency]);

  const conventionId = initialConventionData?.id;
  const conventionName = initialConventionData?.name || 'this convention';
  // console.log('[ConventionEditorTabs] Derived conventionId:', conventionId);

  useEffect(() => {
    // This effect synchronizes the component's internal state with the initialConventionData prop.
    // This is crucial for populating the form when editing an existing convention.
    const {
      priceTiers,
      priceDiscounts,
      id,
      venueHotel,
      media,
      settings,
      ...basicDataFromInitial
    } = initialConventionData || {};

    setBasicInfoData({ ...initialBasicFormData, ...basicDataFromInitial });
    setPricingTabData({
      priceTiers: priceTiers || [],
      priceDiscounts: priceDiscounts || [],
    });
    setMediaData(media || []);
    setSettingsData({
      currency: settings?.currency || '',
      timezone: settings?.timezone || '',
    });
    setVenueHotelData(venueHotel || defaultVenueHotelData);

  }, [initialConventionData, defaultVenueHotelData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    try {
      localStorage.setItem(localStorageKey, newValue.toString());
      // console.log(`[ConventionEditorTabs] Saved active tab ${newValue} to localStorage.`);
    } catch (error) {
      console.warn('[ConventionEditorTabs] Could not save active tab to localStorage:', error);
    }
  };

  const handleBasicInfoFormChange = (
    fieldName: keyof BasicInfoFormData,
    value: any
  ) => {
    setBasicInfoData((prevData) => ({
      ...prevData,
      [fieldName]: value,
    }));
  };

  const handlePricingDataChange = useCallback((data: PricingTabData) => {
    setPricingTabData(data);
  }, []);

  const handleVenueHotelDataChange = useCallback((data: VenueHotelTabData, isValid: boolean) => {
    setVenueHotelData(data);
    setHasVenueHotelTabBeenInteractedWith(true);
    // console.log("VenueHotelTab data updated. Is valid:", isValid); // For future use with validation state
  }, []);

  // Dummy handler for onValidationChange, can be expanded later
  const handleVenueHotelValidationChange = useCallback((isValid: boolean) => {
    // Here you could, for example, disable the save button if a tab reports invalid data
    // For now, only consider it if the tab has been interacted with.
    if (!hasVenueHotelTabBeenInteractedWith) return;
    // ... logic to handle validation state
  }, [hasVenueHotelTabBeenInteractedWith]);

  const handleMediaSave = useCallback((success: boolean, message?: string) => {
    // Handle media save feedback - could show toast or update state
    console.log('Media save result:', success, message);
  }, []);

  const handleSettingsChange = useCallback((
    fieldName: keyof ConventionSettingData,
    value: any
  ) => {
    setSettingsData((prevData) => ({
      ...prevData,
      [fieldName]: value,
    }));
  }, []);

  const [localIsSaving, setLocalIsSaving] = useState(false);

  const handleSaveConvention = async () => {
    setLocalIsSaving(true);
    setSaveError(null);
    try {
      const fullDataToSave: Partial<ConventionDataForEditor> = {
        ...basicInfoData,
        id: conventionId,
        priceTiers: pricingTabData.priceTiers,
        priceDiscounts: pricingTabData.priceDiscounts,
        venues: (venueHotelData as any).venues,
        hotels: venueHotelData.hotels,
        guestsStayAtPrimaryVenue: venueHotelData.guestsStayAtPrimaryVenue,
        media: mediaData,
        settings: settingsData,
      };

      console.log('[ConventionEditorTabs] Sending data to API:', JSON.stringify(fullDataToSave, null, 2));

      await onSave(fullDataToSave);
      // The onSave function is now responsible for navigation.
      // router.push('/organizer/conventions?toastMessage=Convention+updated+successfully');
    } catch (error) {
      console.error("Failed to save convention:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setSaveError(`Failed to save convention: ${errorMessage}`);
    } finally {
      setLocalIsSaving(false);
    }
  };

  const isSaveDisabled = localIsSaving || isSaving;

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="Convention editor tabs">
          <Tab label="Basic Info" {...allyProps(0)} />
          <Tab label="Pricing" {...allyProps(1)} />
          <Tab label="Venue/Hotel" {...allyProps(2)} />
          <Tab label="Schedule" {...allyProps(3)} />
          <Tab label="Dealers" {...allyProps(4)} disabled={!isEditing} />
          <Tab label="Media" {...allyProps(5)} disabled={!isEditing} />
          <Tab label="Settings" {...allyProps(6)} disabled={!isEditing} />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <BasicInfoTab
          value={basicInfoData}
          onFormChange={handleBasicInfoFormChange}
          isEditing={isEditing}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <PricingTab
          conventionId={conventionId}
          value={pricingTabData}
          onChange={handlePricingDataChange}
          disabled={!isEditing}
          currency={currencySymbol}
          timezone={settingsData.timezone}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <VenueHotelTab
          conventionId={conventionId || null}
          value={venueHotelData}
          onChange={handleVenueHotelDataChange}
          onValidationChange={handleVenueHotelValidationChange}
          disabled={isSaveDisabled}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {conventionId ? (
          <ScheduleTab
            conventionId={conventionId}
            startDate={basicInfoData.startDate}
            isOneDayEvent={basicInfoData.isOneDayEvent}
            conventionName={basicInfoData.name}
            conventionEndDate={basicInfoData.endDate}
          />
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
            <p>Loading schedule information...</p>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        {conventionId ? (
          <DealersTab
            conventionId={conventionId}
          />
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Dealers can be managed after the convention is created.
            </Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        <MediaTab
          conventionId={conventionId as string}
          initialMedia={mediaData}
          initialCoverImageUrl={initialConventionData?.coverImageUrl}
          initialProfileImageUrl={initialConventionData?.profileImageUrl}
          onSave={handleMediaSave}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={6}>
        <SettingsTab
          conventionId={conventionId as string}
          conventionName={conventionName}
          value={settingsData}
          onFormChange={handleSettingsChange}
          isEditing={isEditing}
        />
      </TabPanel>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, mt: 2, gap: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button variant="outlined" onClick={onCancel} disabled={isSaveDisabled}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveConvention}
          disabled={isSaveDisabled}
          sx={{ minWidth: 150 }}
        >
          {isSaveDisabled ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
        </Button>
      </Box>
      {saveError && (
        <Typography color="error" sx={{ mt: 2, textAlign: 'right' }}>
          Failed to save changes: {saveError}
        </Typography>
      )}
    </Box>
  );
};

export default ConventionEditorTabs; 