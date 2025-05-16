import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Box, Button, CircularProgress } from '@mui/material';
import { BasicInfoTab } from './BasicInfoTab';
import { type BasicInfoFormData, BasicInfoFormSchema } from '@/lib/validators';

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

const initialFormData: BasicInfoFormData = {
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

interface ConventionEditorTabsProps {
  initialConventionData?: Partial<BasicInfoFormData>; // For editing
  isEditing: boolean;
  onSave: (data: BasicInfoFormData) => Promise<void>; // Function to call on save
  isSaving: boolean;
  onCancel: () => void; // New prop for cancel action
}

const ConventionEditorTabs: React.FC<ConventionEditorTabsProps> = ({
  initialConventionData,
  isEditing,
  onSave,
  isSaving,
  onCancel, // Destructure new prop
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [conventionDataState, setConventionDataState] =
    useState<BasicInfoFormData>({
      ...initialFormData,
      ...(initialConventionData || {}),
    });

  useEffect(() => {
    // If initialData is provided (editing), update state
    if (initialConventionData) {
      setConventionDataState(prev => ({ ...prev, ...initialConventionData }));
    }
  }, [initialConventionData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFormChange = (
    fieldName: keyof BasicInfoFormData,
    value: any
  ) => {
    setConventionDataState((prevData) => ({
      ...prevData,
      [fieldName]: value,
    }));
  };

  const handleSaveConvention = async () => {
    // TODO: Add full validation before calling onSave
    console.log('Saving convention data:', conventionDataState);
    await onSave(conventionDataState);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="Convention editor tabs">
          <Tab label="Basic Info & Series" {...allyProps(0)} />
          {/* Future tabs will be added here */}
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <BasicInfoTab
          initialData={conventionDataState}
          onFormChange={handleFormChange}
          isEditing={isEditing}
        />
      </TabPanel>

      {/* Other TabPanels will go here */}

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