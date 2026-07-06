import React, { useState, useEffect, useMemo } from 'react';
import { Box, TextField, Typography, Switch, FormControlLabel, Paper, Autocomplete, Button, Chip, Grid, Snackbar, Alert } from '@mui/material';
import { useSession } from 'next-auth/react';
import { setConventionSeries } from '@/lib/actions';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import slugify from 'slugify';
import { BasicInfoFormSchema, type BasicInfoFormData } from '@/lib/validators';
import { ZodError } from 'zod';
import ProseMirrorEditor from '@/components/ui/ProseMirrorEditor';
import { FuzzyStateInput } from '@/components/ui/FuzzyStateInput';
import TagEditor from './TagEditor';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BasicInfoHelperDialog, { type BasicInfoResult } from './BasicInfoHelperDialog';

const COUNTRIES = [
  { label: 'United States', code: 'US' },
  { label: 'England', code: 'GB' },
  { label: 'Italy', code: 'IT' },
  { label: 'Australia', code: 'AU' },
  { label: 'Austria', code: 'AT' },
  { label: 'Switzerland', code: 'CH' },
  { label: 'Spain', code: 'ES' },
  { label: 'France', code: 'FR' },
  { label: 'Germany', code: 'DE' },
  { label: 'Canada', code: 'CA' },
  { label: 'Colombia', code: 'CO' },
  { label: 'Japan', code: 'JP' },
  { label: 'Mexico', code: 'MX' },
  { label: 'Brazil', code: 'BR' },
  { label: 'India', code: 'IN' },
  { label: 'Afghanistan', code: 'AF' },
  { label: 'Albania', code: 'AL' },
  { label: 'Algeria', code: 'DZ' },
  { label: 'Andorra', code: 'AD' },
  { label: 'Angola', code: 'AO' },
  { label: 'Antigua and Barbuda', code: 'AG' },
  { label: 'Argentina', code: 'AR' },
  { label: 'Armenia', code: 'AM' },
  { label: 'Azerbaijan', code: 'AZ' },
  { label: 'Bahamas', code: 'BS' },
  { label: 'Bahrain', code: 'BH' },
  { label: 'Bangladesh', code: 'BD' },
  { label: 'Barbados', code: 'BB' },
  { label: 'Belarus', code: 'BY' },
  { label: 'Belgium', code: 'BE' },
  { label: 'Belize', code: 'BZ' },
  { label: 'Benin', code: 'BJ' },
  { label: 'Bhutan', code: 'BT' },
  { label: 'Bolivia', code: 'BO' },
  { label: 'Bosnia and Herzegovina', code: 'BA' },
  { label: 'Botswana', code: 'BW' },
  { label: 'Brunei', code: 'BN' },
  { label: 'Bulgaria', code: 'BG' },
  { label: 'Burkina Faso', code: 'BF' },
  { label: 'Burundi', code: 'BI' },
  { label: 'Cambodia', code: 'KH' },
  { label: 'Cameroon', code: 'CM' },
  { label: 'Canada', code: 'CA' },
  { label: 'Cape Verde', code: 'CV' },
  { label: 'Central African Republic', code: 'CF' },
  { label: 'Chad', code: 'TD' },
  { label: 'Chile', code: 'CL' },
  { label: 'China', code: 'CN' },
  { label: 'Comoros', code: 'KM' },
  { label: 'Congo', code: 'CG' },
  { label: 'Costa Rica', code: 'CR' },
  { label: 'Croatia', code: 'HR' },
  { label: 'Cuba', code: 'CU' },
  { label: 'Cyprus', code: 'CY' },
  { label: 'Czech Republic', code: 'CZ' },
  { label: 'Denmark', code: 'DK' },
  { label: 'Djibouti', code: 'DJ' },
  { label: 'Dominica', code: 'DM' },
  { label: 'Dominican Republic', code: 'DO' },
  { label: 'Ecuador', code: 'EC' },
  { label: 'Egypt', code: 'EG' },
  { label: 'El Salvador', code: 'SV' },
  { label: 'Equatorial Guinea', code: 'GQ' },
  { label: 'Eritrea', code: 'ER' },
  { label: 'Estonia', code: 'EE' },
  { label: 'Ethiopia', code: 'ET' },
  { label: 'Fiji', code: 'FJ' },
  { label: 'Finland', code: 'FI' },
  { label: 'France', code: 'FR' },
  { label: 'Gabon', code: 'GA' },
  { label: 'Gambia', code: 'GM' },
  { label: 'Georgia', code: 'GE' },
  { label: 'Germany', code: 'DE' },
  { label: 'Ghana', code: 'GH' },
  { label: 'Greece', code: 'GR' },
  { label: 'Grenada', code: 'GD' },
  { label: 'Guatemala', code: 'GT' },
  { label: 'Guinea', code: 'GN' },
  { label: 'Guinea-Bissau', code: 'GW' },
  { label: 'Guyana', code: 'GY' },
  { label: 'Haiti', code: 'HT' },
  { label: 'Honduras', code: 'HN' },
  { label: 'Hungary', code: 'HU' },
  { label: 'Iceland', code: 'IS' },
  { label: 'India', code: 'IN' },
  { label: 'Indonesia', code: 'ID' },
  { label: 'Iran', code: 'IR' },
  { label: 'Iraq', code: 'IQ' },
  { label: 'Ireland', code: 'IE' },
  { label: 'Israel', code: 'IL' },
  { label: 'Italy', code: 'IT' },
  { label: 'Jamaica', code: 'JM' },
  { label: 'Japan', code: 'JP' },
  { label: 'Jordan', code: 'JO' },
  { label: 'Kazakhstan', code: 'KZ' },
  { label: 'Kenya', code: 'KE' },
  { label: 'Kiribati', code: 'KI' },
  { label: 'Kuwait', code: 'KW' },
  { label: 'Kyrgyzstan', code: 'KG' },
  { label: 'Laos', code: 'LA' },
  { label: 'Latvia', code: 'LV' },
  { label: 'Lebanon', code: 'LB' },
  { label: 'Lesotho', code: 'LS' },
  { label: 'Liberia', code: 'LR' },
  { label: 'Libya', code: 'LY' },
  { label: 'Liechtenstein', code: 'LI' },
  { label: 'Lithuania', code: 'LT' },
  { label: 'Luxembourg', code: 'LU' },
  { label: 'Madagascar', code: 'MG' },
  { label: 'Malawi', code: 'MW' },
  { label: 'Malaysia', code: 'MY' },
  { label: 'Maldives', code: 'MV' },
  { label: 'Mali', code: 'ML' },
  { label: 'Malta', code: 'MT' },
  { label: 'Marshall Islands', code: 'MH' },
  { label: 'Mauritania', code: 'MR' },
  { label: 'Mauritius', code: 'MU' },
  { label: 'Mexico', code: 'MX' },
  { label: 'Micronesia', code: 'FM' },
  { label: 'Moldova', code: 'MD' },
  { label: 'Monaco', code: 'MC' },
  { label: 'Mongolia', code: 'MN' },
  { label: 'Montenegro', code: 'ME' },
  { label: 'Morocco', code: 'MA' },
  { label: 'Mozambique', code: 'MZ' },
  { label: 'Myanmar', code: 'MM' },
  { label: 'Namibia', code: 'NA' },
  { label: 'Nauru', code: 'NR' },
  { label: 'Nepal', code: 'NP' },
  { label: 'Netherlands', code: 'NL' },
  { label: 'New Zealand', code: 'NZ' },
  { label: 'Nicaragua', code: 'NI' },
  { label: 'Niger', code: 'NE' },
  { label: 'Nigeria', code: 'NG' },
  { label: 'North Korea', code: 'KP' },
  { label: 'North Macedonia', code: 'MK' },
  { label: 'Norway', code: 'NO' },
  { label: 'Oman', code: 'OM' },
  { label: 'Pakistan', code: 'PK' },
  { label: 'Palau', code: 'PW' },
  { label: 'Palestine', code: 'PS' },
  { label: 'Panama', code: 'PA' },
  { label: 'Papua New Guinea', code: 'PG' },
  { label: 'Paraguay', code: 'PY' },
  { label: 'Peru', code: 'PE' },
  { label: 'Philippines', code: 'PH' },
  { label: 'Poland', code: 'PL' },
  { label: 'Portugal', code: 'PT' },
  { label: 'Qatar', code: 'QA' },
  { label: 'Romania', code: 'RO' },
  { label: 'Russia', code: 'RU' },
  { label: 'Rwanda', code: 'RW' },
  { label: 'Saint Kitts and Nevis', code: 'KN' },
  { label: 'Saint Lucia', code: 'LC' },
  { label: 'Saint Vincent and the Grenadines', code: 'VC' },
  { label: 'Samoa', code: 'WS' },
  { label: 'San Marino', code: 'SM' },
  { label: 'Sao Tome and Principe', code: 'ST' },
  { label: 'Saudi Arabia', code: 'SA' },
  { label: 'Senegal', code: 'SN' },
  { label: 'Serbia', code: 'RS' },
  { label: 'Seychelles', code: 'SC' },
  { label: 'Sierra Leone', code: 'SL' },
  { label: 'Singapore', code: 'SG' },
  { label: 'Slovakia', code: 'SK' },
  { label: 'Slovenia', code: 'SI' },
  { label: 'Solomon Islands', code: 'SB' },
  { label: 'Somalia', code: 'SO' },
  { label: 'South Africa', code: 'ZA' },
  { label: 'South Korea', code: 'KR' },
  { label: 'South Sudan', code: 'SS' },
  { label: 'Spain', code: 'ES' },
  { label: 'Sri Lanka', code: 'LK' },
  { label: 'Sudan', code: 'SD' },
  { label: 'Suriname', code: 'SR' },
  { label: 'Sweden', code: 'SE' },
  { label: 'Switzerland', code: 'CH' },
  { label: 'Syria', code: 'SY' },
  { label: 'Taiwan', code: 'TW' },
  { label: 'Tajikistan', code: 'TJ' },
  { label: 'Tanzania', code: 'TZ' },
  { label: 'Thailand', code: 'TH' },
  { label: 'Timor-Leste', code: 'TL' },
  { label: 'Togo', code: 'TG' },
  { label: 'Tonga', code: 'TO' },
  { label: 'Trinidad and Tobago', code: 'TT' },
  { label: 'Tunisia', code: 'TN' },
  { label: 'Turkey', code: 'TR' },
  { label: 'Turkmenistan', code: 'TM' },
  { label: 'Tuvalu', code: 'TV' },
  { label: 'Uganda', code: 'UG' },
  { label: 'Ukraine', code: 'UA' },
  { label: 'United Arab Emirates', code: 'AE' },
  { label: 'United States', code: 'US' },
  { label: 'Uruguay', code: 'UY' },
  { label: 'Uzbekistan', code: 'UZ' },
  { label: 'Vanuatu', code: 'VU' },
  { label: 'Vatican City', code: 'VA' },
  { label: 'Venezuela', code: 'VE' },
  { label: 'Vietnam', code: 'VN' },
  { label: 'Yemen', code: 'YE' },
  { label: 'Zambia', code: 'ZM' },
  { label: 'Zimbabwe', code: 'ZW' }
];

interface BasicInfoTabProps {
  value: BasicInfoFormData;
  onFormChange: (field: keyof BasicInfoFormData, value: any) => void;
  errors?: Record<string, string>;
  isEditing: boolean;
  conventionId?: string;
}

interface SeriesOption { id: string; name: string; }

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  value,
  onFormChange,
  errors = {},
  isEditing,
  conventionId
}) => {
  const { data: session } = useSession();
  const isAdmin = !!(session?.user?.roles?.includes('ADMIN'));

  const [seriesList, setSeriesList] = useState<SeriesOption[]>([]);
  const [seriesToast, setSeriesToast] = useState<string | null>(null);

  // Admins can reassign a convention's series (to fix imported conventions).
  useEffect(() => {
    if (!isAdmin || !conventionId) return;
    let cancelled = false;
    fetch('/api/organizer/series')
      .then((r) => (r.ok ? r.json() : { series: [] }))
      .then((d) => { if (!cancelled) setSeriesList(d.series || []); })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [isAdmin, conventionId]);

  const handleSeriesChange = async (_e: any, option: SeriesOption | null) => {
    if (!conventionId || !option) return;
    const res = await setConventionSeries(conventionId, option.id);
    if (res.success) {
      onFormChange('seriesId', option.id);
      setSeriesToast(`Series set to "${res.seriesName}".`);
    } else {
      setSeriesToast(res.error || 'Could not change the series.');
    }
  };



  const startDateValue = useMemo(() => {
    return value.startDate ? new Date(value.startDate) : null;
  }, [value.startDate]);

  const endDateValue = useMemo(() => {
    return value.endDate ? new Date(value.endDate) : null;
  }, [value.endDate]);

  const [helperOpen, setHelperOpen] = useState(false);

  // Parse "YYYY-MM-DD" into a local-midnight Date (matches how DatePicker stores
  // a hand-picked day, so helper-filled dates behave identically).
  const parseYMD = (s: string | null): Date | null => {
    const parts = (s || '').split('-').map(Number);
    return parts.length === 3 && parts[0] ? new Date(parts[0], parts[1] - 1, parts[2]) : null;
  };

  // Fill the form from a Listing Helper result (only the fields it found).
  const applyHelperInfo = (info: BasicInfoResult) => {
    if (info.name) {
      onFormChange('name', info.name);
      onFormChange('slug', slugify(info.name, { lower: true, strict: true }));
    }
    const sd = parseYMD(info.startDate);
    const ed = parseYMD(info.endDate);
    if (sd) onFormChange('startDate', sd.toISOString());
    if (ed) onFormChange('endDate', ed.toISOString());
    if (info.isOneDayEvent) onFormChange('isOneDayEvent', true);
    if (info.city) onFormChange('city', info.city);
    if (info.country) onFormChange('country', info.country);
    if (info.stateName) onFormChange('stateName', info.stateName);
    if (info.websiteUrl) onFormChange('websiteUrl', info.websiteUrl);
    if (info.registrationUrl) onFormChange('registrationUrl', info.registrationUrl);
    if (info.descriptionShort) onFormChange('descriptionShort', info.descriptionShort);
    if (info.descriptionMain) onFormChange('descriptionMain', info.descriptionMain);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value: fieldValue } = event.target;
    onFormChange(name as keyof BasicInfoFormData, fieldValue);
    if (name === 'name') {
      const newSlug = slugify(fieldValue, { lower: true, strict: true });
      onFormChange('slug', newSlug);
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate') => (date: Date | null) => {
    onFormChange(field, date ? date.toISOString() : null);

    // If this is a start date change and one-day event is enabled, update end date to match
    if (field === 'startDate' && value.isOneDayEvent && date) {
      onFormChange('endDate', date.toISOString());
    }
  };

  const handleSwitchChange = (field: 'isOneDayEvent' | 'isTBD') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    onFormChange(field, checked);
    if (field === 'isOneDayEvent' && checked && value.startDate) {
      // Set end date to same as start date for one-day events
      onFormChange('endDate', value.startDate);
    }
    if (field === 'isTBD' && checked) {
      onFormChange('startDate', null);
      onFormChange('endDate', null);
    }
  };

  const handleEditorChange = (field: 'descriptionShort' | 'descriptionMain') => (content: string) => {
    onFormChange(field, content);
  };

  const handleCountryChange = (event: any, newValue: { label: string; code: string } | null) => {
    let countryString = '';
    if (typeof newValue === 'string') {
      countryString = newValue;
    } else if (newValue && newValue.label) {
      countryString = newValue.label;
    }
    onFormChange('country', countryString);
    if (countryString !== 'United States') {
      onFormChange('stateName', '');
      onFormChange('stateAbbreviation', '');
    }
  };

  const handleStateChange = (newValue: string) => {
    onFormChange('stateName', newValue);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={() => setHelperOpen(true)}>
            Import convention information from your website
          </Button>
        </Box>

        {isAdmin && conventionId && (
          <Paper elevation={1} sx={{ p: 2, borderLeft: '4px solid', borderColor: 'warning.main' }}>
            <Typography variant="subtitle2" gutterBottom>Admin · Convention Series</Typography>
            <Autocomplete
              options={seriesList}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              value={seriesList.find((s) => s.id === value.seriesId) || null}
              onChange={handleSeriesChange}
              sx={{ maxWidth: 480 }}
              renderInput={(params) => (
                <TextField {...params} label="Series" helperText="Reassign this convention to a different series. Saved immediately." />
              )}
            />
          </Paper>
        )}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <Paper elevation={1} sx={{ p: 2, width: '100%' }}>
              <TextField fullWidth label="Convention Name" name="name" value={value.name} onChange={handleTextChange} error={!!errors?.name} helperText={errors?.name} required sx={{ mb: 2 }} />
              <TextField fullWidth label="URL Slug" name="slug" value={value.slug} disabled error={!!errors?.slug} helperText={errors?.slug || "Auto-generated from convention name."} required />
            </Paper>
          </Box>
          <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mb: 2 }}>
                <FormControlLabel control={<Switch checked={value.isTBD} onChange={handleSwitchChange('isTBD')} />} label="Dates TBD" />
                <FormControlLabel control={<Switch checked={value.isOneDayEvent} onChange={handleSwitchChange('isOneDayEvent')} />} label="One-Day Event" />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker label="Start Date" value={startDateValue} onChange={handleDateChange('startDate')} disabled={value.isTBD} sx={{ flexGrow: 1 }} />
                {!value.isOneDayEvent && (
                  <DatePicker label="End Date" value={endDateValue} onChange={handleDateChange('endDate')} disabled={value.isTBD} sx={{ flexGrow: 1 }} />
                )}
              </Box>
            </Paper>
          </Box>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Location</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Autocomplete
                options={COUNTRIES}
                getOptionLabel={(option: any) => option.label || (typeof option === 'string' ? option : '')}
                value={COUNTRIES.find(opt => opt.label === value.country) || value.country || null}
                onChange={handleCountryChange}
                onInputChange={(_, newInputValue, reason) => { if (reason === 'input') { onFormChange('country', newInputValue); } }}
                freeSolo
                sx={{ width: 250 }}
                renderInput={(params) => <TextField {...params} label="Country" name="country" error={!!errors?.country} helperText={errors?.country} />}
              />
              {value.country === 'United States' && (
                <FuzzyStateInput value={value.stateName || ''} onChange={handleStateChange} error={!!errors?.stateName} />
              )}
              <TextField label="City" name="city" value={value.city || ''} onChange={handleTextChange} error={!!errors?.city} helperText={errors?.city} sx={{ flexGrow: 1 }} />
            </Box>
          </Paper>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Website & Registration</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Website URL"
                name="websiteUrl"
                value={value.websiteUrl || ''}
                onChange={handleTextChange}
                error={!!errors?.websiteUrl}
                helperText={errors?.websiteUrl || "Official convention website"}
              />
              <TextField
                fullWidth
                label="Registration URL"
                name="registrationUrl"
                value={value.registrationUrl || ''}
                onChange={handleTextChange}
                error={!!errors?.registrationUrl}
                helperText={errors?.registrationUrl || "Link to registration page"}
              />
            </Box>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Descriptions & More</Typography>
            <Box sx={{ my: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Short Description</Typography>
              <ProseMirrorEditor value={value.descriptionShort || ''} onChange={handleEditorChange('descriptionShort')} />
            </Box>
            <Box sx={{ my: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Main Description</Typography>
              <ProseMirrorEditor value={value.descriptionMain || ''} onChange={handleEditorChange('descriptionMain')} />
            </Box>

            <TagEditor
              value={value.tags || []}
              onChange={(tags) => onFormChange('tags', tags)}
            />
          </Paper>
        </Box>
      </Box>

      <BasicInfoHelperDialog
        open={helperOpen}
        onClose={() => setHelperOpen(false)}
        onApplied={applyHelperInfo}
      />

      <Snackbar
        open={!!seriesToast}
        autoHideDuration={3000}
        onClose={() => setSeriesToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setSeriesToast(null)} sx={{ width: '100%' }}>
          {seriesToast}
        </Alert>
      </Snackbar>
    </LocalizationProvider>
  );
};

export default BasicInfoTab;