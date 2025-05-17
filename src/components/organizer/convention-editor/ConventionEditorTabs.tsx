import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Box, Button, CircularProgress } from '@mui/material';
import { BasicInfoTab } from './BasicInfoTab';
import { type BasicInfoFormData } from '@/lib/validators';
import { PricingTab } from './PricingTab';
import { type PricingTabData, type PriceTier, type PriceDiscount } from '@/lib/validators';

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
  country: '',
  descriptionShort: undefined,
  descriptionMain: undefined,
  seriesId: undefined,
  newSeriesName: '',
};

interface ConventionDataForEditor extends BasicInfoFormData {
  id?: string;
  priceTiers?: PriceTier[];
  priceDiscounts?: PriceDiscount[];
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
  console.log('[ConventionEditorTabs] Received initialConventionData:', initialConventionData);
  const [activeTab, setActiveTab] = useState(0);

  const localStorageKey = 'conventionEditorActiveTab';

  // Effect to load and set active tab from localStorage on initial mount (client-side)
  useEffect(() => {
    const storedTab = localStorage.getItem(localStorageKey);
    if (storedTab) {
      const tabIndex = parseInt(storedTab, 10);
      // Assuming 2 tabs (0 and 1). Validate against the actual number of tabs if it can change.
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 1) { 
        setActiveTab(tabIndex);
        console.log(`[ConventionEditorTabs] Loaded active tab ${tabIndex} from localStorage.`);
      }
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  const [basicInfoData, setBasicInfoData] =
    useState<BasicInfoFormData>(() => {
      const { priceTiers, priceDiscounts, id, ...basicDataFromInitial } = initialConventionData || {};
      return {
        ...initialBasicFormData,
        ...basicDataFromInitial,
      };
    });

  const [pricingTabData, setPricingTabData] = useState<PricingTabData>(() => ({
    priceTiers: initialConventionData?.priceTiers || [],
    priceDiscounts: initialConventionData?.priceDiscounts || [],
  }));
  
  const conventionId = initialConventionData?.id;
  console.log('[ConventionEditorTabs] Derived conventionId:', conventionId);

  useEffect(() => {
    if (initialConventionData) {
      const { priceTiers, priceDiscounts, id, ...basicDataFromInitial } = initialConventionData;
      setBasicInfoData(prev => ({ ...initialBasicFormData, ...prev, ...basicDataFromInitial }));
      setPricingTabData({
        priceTiers: initialConventionData.priceTiers || [],
        priceDiscounts: initialConventionData.priceDiscounts || [],
      });
    } else {
      setBasicInfoData(initialBasicFormData);
      setPricingTabData({ priceTiers: [], priceDiscounts: [] });
    }
  }, [initialConventionData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    try {
      localStorage.setItem(localStorageKey, newValue.toString());
      console.log(`[ConventionEditorTabs] Saved active tab ${newValue} to localStorage.`);
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
  
  const handlePricingDataChange = (data: PricingTabData) => {
    setPricingTabData(data);
  };

  const handleSaveConvention = async () => {
    const fullDataToSave: Partial<ConventionDataForEditor> = {
      ...basicInfoData,
      id: conventionId,
      priceTiers: pricingTabData.priceTiers,
      priceDiscounts: pricingTabData.priceDiscounts,
    };
    console.log('Saving combined convention data:', fullDataToSave);
    await onSave(fullDataToSave);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="Convention editor tabs">
          <Tab label="Basic Info & Series" {...allyProps(0)} />
          <Tab label="Pricing" {...allyProps(1)} />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <BasicInfoTab
          initialData={basicInfoData}
          onFormChange={handleBasicInfoFormChange}
          isEditing={isEditing}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <PricingTab
          conventionId={conventionId}
          value={pricingTabData}
          onChange={handlePricingDataChange}
        />
      </TabPanel>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, mt: 2, gap: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button variant="outlined" onClick={onCancel} disabled={isSaving}>
            Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSaveConvention} 
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Convention')}
        </Button>
      </Box>
    </Box>
  );
};

export default ConventionEditorTabs; 