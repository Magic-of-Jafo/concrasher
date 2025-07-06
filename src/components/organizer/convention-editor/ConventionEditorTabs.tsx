import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tabs, Tab, Box, Button, CircularProgress } from '@mui/material';
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

interface ConventionDataForEditor extends BasicInfoFormData {
  id?: string;
  priceTiers?: PriceTier[];
  priceDiscounts?: PriceDiscount[];
  venueHotel?: VenueHotelTabData;
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
  // console.log('[ConventionEditorTabs] Received initialConventionData:', initialConventionData);
  const [activeTab, setActiveTab] = useState(0);

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
    currency: initialConventionData?.settings?.currency || 'USD',
    timezone: initialConventionData?.settings?.timezone || '',
  }));

  const conventionId = initialConventionData?.id;
  // console.log('[ConventionEditorTabs] Derived conventionId:', conventionId);

  useEffect(() => {
    console.log('[ConventionEditorTabs - useEffect] Fired. initialConventionData present?', !!initialConventionData);
    if (initialConventionData) {
      // Restore Basic Info update
      const { priceTiers, priceDiscounts, id, venueHotel, ...basicDataFromInitial } = initialConventionData;
      // setBasicInfoData(prev => ({ ...initialBasicFormData, ...prev, ...basicDataFromInitial }));
      setBasicInfoData({ ...initialBasicFormData, ...basicDataFromInitial }); // Simplified update

      // Restore Pricing Tab update
      setPricingTabData({
        priceTiers: initialConventionData.priceTiers || [],
        priceDiscounts: initialConventionData.priceDiscounts || [],
      });

      // Restore Media Tab update
      setMediaData(initialConventionData.media || []);

      // Restore Settings Tab update
      setSettingsData({
        currency: initialConventionData.settings?.currency || 'USD',
        timezone: initialConventionData.settings?.timezone || '',
      });

      // Corrected Venue/Hotel Tab update
      const loadedVH = venueHotel; // 'venueHotel' was destructured above from initialConventionData
      console.log('[ConventionEditorTabs - useEffect] initialConventionData.venueHotel (loadedVH):', loadedVH);
      console.log('[ConventionEditorTabs - useEffect] loadedVH?.guestsStayAtPrimaryVenue:', loadedVH?.guestsStayAtPrimaryVenue);
      const finalValue = loadedVH?.guestsStayAtPrimaryVenue ?? false;
      console.log('[ConventionEditorTabs - useEffect] resolved guestsStayAtPrimaryVenue for existing:', finalValue);
      setVenueHotelData({
        ...defaultVenueHotelData,
        ...(loadedVH || {}),
        guestsStayAtPrimaryVenue: finalValue
      });
    } else {
      console.log('[ConventionEditorTabs - useEffect] initialConventionData is null/undefined. Resetting forms.');
      // If initialConventionData is cleared (e.g., switching from edit to new), revert to full defaults
      setBasicInfoData(initialBasicFormData); // Reset basic info
      setPricingTabData({ priceTiers: [], priceDiscounts: [] }); // Reset pricing
      setVenueHotelData(defaultVenueHotelData); // Reset venue/hotel
      setSettingsData({ currency: 'USD', timezone: '' }); // Reset settings
    }
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
    // console.log("VenueHotelTab data updated. Is valid:", isValid); // For future use with validation state
  }, []);

  // Dummy handler for onValidationChange, can be expanded later
  const handleVenueHotelValidationChange = useCallback((isValid: boolean) => {
    // Here you could, for example, disable the save button if a tab reports invalid data
  }, []);

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
  const router = useRouter();

  const handleSaveConvention = async () => {
    setLocalIsSaving(true);
    const fullDataToSave: Partial<ConventionDataForEditor> = {
      ...basicInfoData,
      id: conventionId,
      priceTiers: pricingTabData.priceTiers,
      priceDiscounts: pricingTabData.priceDiscounts,
      venueHotel: venueHotelData,
      media: mediaData,
      settings: settingsData,
    };
    await onSave(fullDataToSave);
    setLocalIsSaving(false);
    router.push('/organizer/conventions?toastMessage=Convention+updated+successfully');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="Convention editor tabs">
          <Tab label="Basic Info" {...allyProps(0)} />
          <Tab label="Pricing" {...allyProps(1)} />
          <Tab label="Venue/Hotel" {...allyProps(2)} />
          <Tab label="Schedule" {...allyProps(3)} />
          <Tab label="Media" {...allyProps(4)} />
          <Tab label="Dealers" {...allyProps(5)} />
          <Tab label="Settings" {...allyProps(6)} />
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
          timezone={settingsData.timezone}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <VenueHotelTab
          conventionId={conventionId || null}
          value={venueHotelData}
          onChange={handleVenueHotelDataChange}
          onValidationChange={handleVenueHotelValidationChange}
          disabled={isSaving || localIsSaving}
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
          <MediaTab
            conventionId={conventionId}
            initialMedia={mediaData}
            initialCoverImageUrl={initialConventionData?.coverImageUrl}
            initialProfileImageUrl={initialConventionData?.profileImageUrl}
            onSave={handleMediaSave}
          />
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
            <p>Loading media information...</p>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        <DealersTab conventionId={conventionId!} />
      </TabPanel>

      <TabPanel value={activeTab} index={6}>
        <SettingsTab
          value={settingsData}
          onFormChange={handleSettingsChange}
          isEditing={isEditing}
          conventionId={conventionId}
        />
      </TabPanel>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, mt: 2, gap: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button variant="outlined" onClick={onCancel} disabled={isSaving || localIsSaving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSaveConvention}
          disabled={isSaving || localIsSaving}
          startIcon={isSaving || localIsSaving ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSaving || localIsSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Convention')}
        </Button>
      </Box>
    </Box>
  );
};

export default ConventionEditorTabs; 