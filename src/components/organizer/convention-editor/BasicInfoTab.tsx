import React, { useState, useEffect, useMemo } from 'react';
import { Box, TextField, Typography, Switch, FormControlLabel, Paper, Autocomplete } from '@mui/material';
import Grid from '@mui/material/Grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import slugify from 'slugify';
import { BasicInfoFormSchema, type BasicInfoFormData } from '@/lib/validators';
import { ZodError } from 'zod';
import { Editor } from '@tinymce/tinymce-react';
import { FuzzyStateInput } from '@/components/ui/FuzzyStateInput';

// Define the country list with common countries at the top based on magic conventions
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
  { label: 'Gabon', code: 'GA' },
  { label: 'Gambia', code: 'GM' },
  { label: 'Georgia', code: 'GE' },
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
  { label: 'Indonesia', code: 'ID' },
  { label: 'Iran', code: 'IR' },
  { label: 'Iraq', code: 'IQ' },
  { label: 'Ireland', code: 'IE' },
  { label: 'Israel', code: 'IL' },
  { label: 'Jamaica', code: 'JM' },
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
  { label: 'Sri Lanka', code: 'LK' },
  { label: 'Sudan', code: 'SD' },
  { label: 'Suriname', code: 'SR' },
  { label: 'Sweden', code: 'SE' },
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
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  value,
  onFormChange,
  errors = {},
  isEditing
}) => {
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Memoize Date objects to stabilize references for DatePicker
  const startDateValue = useMemo(() => {
    return value.startDate ? new Date(value.startDate) : null;
  }, [value.startDate]);

  const endDateValue = useMemo(() => {
    return value.endDate ? new Date(value.endDate) : null;
  }, [value.endDate]);

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value: fieldValue } = event.target;
    onFormChange(name as keyof BasicInfoFormData, fieldValue);
    if (name === 'name' && !slugManuallyEdited) {
      const newSlug = slugify(fieldValue, { lower: true, strict: true });
      onFormChange('slug', newSlug);
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate') => (date: Date | null) => {
    onFormChange(field, date ? date.toISOString() : null);
  };

  const handleSwitchChange = (field: 'isOneDayEvent' | 'isTBD') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    onFormChange(field, checked);
    if (field === 'isOneDayEvent' && checked && value.startDate) {
      onFormChange('endDate', value.startDate);
    }
  };

  const handleEditorChange = (field: 'descriptionShort' | 'descriptionMain') => (content: string) => {
    onFormChange(field, content);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={0} sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Section: Core Details */}
          <Paper elevation={1} sx={{ p: 2, width: '100%' }}>
            <Typography variant="h6" gutterBottom>Core Details</Typography>
            <TextField
              required
              fullWidth
              name="name"
              label="Convention Name"
              value={value.name || ''}
              onChange={handleTextChange}
              error={!!errors.name}
              helperText={errors.name}
              sx={{ mb: 1 }}
            />
            <TextField
              fullWidth
              disabled
              name="slug"
              label="Slug"
              value={value.slug || ''}
              variant="filled"
              size="small"
              error={!!errors.slug}
              helperText={errors.slug}
              sx={{ mb: 2 }}
            />
          </Paper>

          {/* Dates Section */}
          <Paper elevation={1} sx={{ p: 2, width: '100%' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ mb: 1, fontWeight: 'medium' }}>
              Dates
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={!!value.isTBD}
                  onChange={handleSwitchChange('isTBD')}
                  name="isTBD"
                />
              }
              label="Dates To Be Determined"
              sx={{ mb: 1, display: 'block' }}
            />
            <Box
              sx={{
                minHeight: '130px',
                mt: 1,
              }}
            >
              {!value.isTBD && (
                <>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ width: 250 }}>
                      <DatePicker
                        label="Start Date"
                        value={startDateValue}
                        onChange={handleDateChange('startDate')}
                        disabled={!!value.isTBD}
                      />
                    </Box>
                    {!value.isOneDayEvent && (
                      <Box sx={{ width: 250 }}>
                        <DatePicker
                          label="End Date"
                          value={endDateValue}
                          onChange={handleDateChange('endDate')}
                          disabled={!!value.isTBD}
                          minDate={value.isOneDayEvent && startDateValue ? startDateValue : undefined}
                        />
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!value.isOneDayEvent}
                          onChange={handleSwitchChange('isOneDayEvent')}
                          name="isOneDayEvent"
                          disabled={!!value.isTBD}
                        />
                      }
                      label="One-Day Event"
                    />
                  </Box>
                </>
              )}
            </Box>
          </Paper>

          {/* Section: Location */}
          <Paper elevation={1} sx={{ p: 2, width: '100%' }}>
            <Typography variant="h6" gutterBottom>Location</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Autocomplete
                options={COUNTRIES}
                getOptionLabel={(option: any) => option.label || (typeof option === 'string' ? option : '')}
                value={COUNTRIES.find(opt => opt.label === value.country) || value.country || null}
                onChange={(_, newValue: any) => {
                  let countryString = '';
                  if (typeof newValue === 'string') {
                    countryString = newValue;
                  } else if (newValue && newValue.label) {
                    countryString = newValue.label;
                  }
                  const newFormDataState = { ...value, country: countryString };
                  if (countryString !== 'United States') {
                    newFormDataState.stateName = '';
                    newFormDataState.stateAbbreviation = '';
                  }
                  onFormChange('country', countryString);
                  if (countryString !== 'United States') {
                    onFormChange('stateName', '');
                    onFormChange('stateAbbreviation', '');
                  }
                }}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input') {
                    const updatedFormData = { ...value, country: newInputValue };
                    if (newInputValue !== 'United States') {
                      updatedFormData.stateName = '';
                      updatedFormData.stateAbbreviation = '';
                    }
                    onFormChange('country', newInputValue);
                    if (newInputValue !== 'United States') {
                      onFormChange('stateName', '');
                      onFormChange('stateAbbreviation', '');
                    }
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Country"
                    error={!!errors.country}
                    helperText={errors.country}
                    required
                    sx={{ mb: 1 }}
                  />
                )}
                freeSolo
                sx={{ maxWidth: '250px' }}
              />
              <TextField
                name="city"
                label="City"
                value={value.city || ''}
                onChange={handleTextChange}
                error={!!errors.city}
                helperText={errors.city}
                required
                sx={{ maxWidth: '250px' }}
              />
              {value.country === 'United States' && (
                <FuzzyStateInput
                  value={value.stateName || ''}
                  onChange={(stateName, stateAbbreviation) => {
                    onFormChange('stateName', stateName);
                    onFormChange('stateAbbreviation', stateAbbreviation);
                  }}
                  error={!!errors.stateName}
                  helperText={errors.stateName}
                  required
                  sx={{ maxWidth: '250px' }}
                />
              )}
            </Box>
          </Paper>

          {/* Section: Descriptions */}
          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="h6" gutterBottom>Descriptions</Typography>
            <TextField
              name="descriptionShort"
              label="Short Description"
              multiline
              rows={3}
              value={value.descriptionShort ?? ''}
              onChange={handleTextChange}
              error={!!errors.descriptionShort}
              helperText={errors.descriptionShort || 'A brief description that will appear in listings and previews'}
              fullWidth
              sx={{ mb: 2 }}
            />
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'medium' }}>Main Description</Typography>
            <Editor
              apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
              value={value.descriptionMain ?? ''}
              onEditorChange={handleEditorChange('descriptionMain')}
              init={{
                height: 300,
                menubar: false,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                  'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                  'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                ],
                toolbar: 'undo redo | blocks | ' +
                  'bold italic forecolor | alignleft aligncenter ' +
                  'alignright alignjustify | bullist numlist outdent indent | ' +
                  'removeformat | help',
                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                branding: false,
                statusbar: false
              }}
            />
            <style jsx global>{`
              .tox-statusbar__branding {
                display: none !important;
              }
            `}</style>
            {errors.descriptionMain && (
              <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                {errors.descriptionMain}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>
    </LocalizationProvider>
  );
};

export default BasicInfoTab; 