import { useState, useEffect, useCallback } from 'react';
import { TextField, Box, Typography, CircularProgress, SxProps, Theme } from '@mui/material';
import Fuse from 'fuse.js';
import { useDebounce } from '@/hooks/useDebounce';

// Define the state data structure
interface StateData {
  name: string;
  abbreviation: string;
}

// List of US states
const US_STATES: StateData[] = [
  { name: 'Alabama', abbreviation: 'AL' },
  { name: 'Alaska', abbreviation: 'AK' },
  { name: 'Arizona', abbreviation: 'AZ' },
  { name: 'Arkansas', abbreviation: 'AR' },
  { name: 'California', abbreviation: 'CA' },
  { name: 'Colorado', abbreviation: 'CO' },
  { name: 'Connecticut', abbreviation: 'CT' },
  { name: 'Delaware', abbreviation: 'DE' },
  { name: 'Florida', abbreviation: 'FL' },
  { name: 'Georgia', abbreviation: 'GA' },
  { name: 'Hawaii', abbreviation: 'HI' },
  { name: 'Idaho', abbreviation: 'ID' },
  { name: 'Illinois', abbreviation: 'IL' },
  { name: 'Indiana', abbreviation: 'IN' },
  { name: 'Iowa', abbreviation: 'IA' },
  { name: 'Kansas', abbreviation: 'KS' },
  { name: 'Kentucky', abbreviation: 'KY' },
  { name: 'Louisiana', abbreviation: 'LA' },
  { name: 'Maine', abbreviation: 'ME' },
  { name: 'Maryland', abbreviation: 'MD' },
  { name: 'Massachusetts', abbreviation: 'MA' },
  { name: 'Michigan', abbreviation: 'MI' },
  { name: 'Minnesota', abbreviation: 'MN' },
  { name: 'Mississippi', abbreviation: 'MS' },
  { name: 'Missouri', abbreviation: 'MO' },
  { name: 'Montana', abbreviation: 'MT' },
  { name: 'Nebraska', abbreviation: 'NE' },
  { name: 'Nevada', abbreviation: 'NV' },
  { name: 'New Hampshire', abbreviation: 'NH' },
  { name: 'New Jersey', abbreviation: 'NJ' },
  { name: 'New Mexico', abbreviation: 'NM' },
  { name: 'New York', abbreviation: 'NY' },
  { name: 'North Carolina', abbreviation: 'NC' },
  { name: 'North Dakota', abbreviation: 'ND' },
  { name: 'Ohio', abbreviation: 'OH' },
  { name: 'Oklahoma', abbreviation: 'OK' },
  { name: 'Oregon', abbreviation: 'OR' },
  { name: 'Pennsylvania', abbreviation: 'PA' },
  { name: 'Rhode Island', abbreviation: 'RI' },
  { name: 'South Carolina', abbreviation: 'SC' },
  { name: 'South Dakota', abbreviation: 'SD' },
  { name: 'Tennessee', abbreviation: 'TN' },
  { name: 'Texas', abbreviation: 'TX' },
  { name: 'Utah', abbreviation: 'UT' },
  { name: 'Vermont', abbreviation: 'VT' },
  { name: 'Virginia', abbreviation: 'VA' },
  { name: 'Washington', abbreviation: 'WA' },
  { name: 'West Virginia', abbreviation: 'WV' },
  { name: 'Wisconsin', abbreviation: 'WI' },
  { name: 'Wyoming', abbreviation: 'WY' }
];

// Configure Fuse.js for fuzzy searching
const fuse = new Fuse(US_STATES, {
  keys: ['name', 'abbreviation'],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 2
});

// Define the props interface
interface FuzzyStateInputProps {
  value: string;
  onChange: (stateName: string, stateAbbreviation: string) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  sx?: SxProps<Theme>;
}

export const FuzzyStateInput: React.FC<FuzzyStateInputProps> = ({
  value,
  onChange,
  error,
  helperText,
  disabled,
  sx,
  required = false
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const debouncedInput = useDebounce(inputValue, 300);

  // Memoize the onChange handler to prevent infinite loops
  const handleChange = useCallback((stateName: string, stateAbbreviation: string) => {
    onChange(stateName, stateAbbreviation);
  }, [onChange]);

  useEffect(() => {
    if (debouncedInput.length >= 2) {
      setIsSearching(true);
      const results = fuse.search(debouncedInput);

      if (results.length > 0 && results[0].score && results[0].score < 0.3) {
        const match = results[0].item;
        setSuggestion(match.name);
        // Only call onChange if the value actually changed
        if (match.name !== value) {
          handleChange(match.name, match.abbreviation);
        }
      } else {
        setSuggestion(null);
      }
      setIsSearching(false);
    } else {
      setSuggestion(null);
    }
  }, [debouncedInput, handleChange, value]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);

    if (newValue.length < 2) {
      setSuggestion(null);
    }
  };

  const handleBlur = () => {
    // First check for state abbreviation
    if (inputValue.length === 2 && /^[A-Za-z]{2}$/.test(inputValue)) {
      const stateMatch = US_STATES.find(state =>
        state.abbreviation.toLowerCase() === inputValue.toLowerCase()
      );
      if (stateMatch) {
        setInputValue(stateMatch.name);
        handleChange(stateMatch.name, stateMatch.abbreviation);
        return;
      }
    }

    // Then check for fuzzy match
    if (suggestion && inputValue !== suggestion) {
      setInputValue(suggestion);
      // Find the state data for the suggestion
      const stateData = US_STATES.find(state => state.name === suggestion);
      if (stateData) {
        handleChange(stateData.name, stateData.abbreviation);
      }
    } else if (!suggestion && inputValue.length > 0) {
      // Clear the input if there's no valid suggestion
      setInputValue('');
      handleChange('', '');
    }
  };

  return (
    <Box sx={{ position: 'relative', ...(sx || {}) }}>
      <TextField
        fullWidth
        label="State"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        error={error}
        helperText={helperText}
        disabled={disabled}
        required={required}
        autoComplete="off"
      />
      {suggestion && inputValue !== suggestion && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            color: 'text.secondary',
            mt: 0.5
          }}
        >
          Detected input: {suggestion}
        </Typography>
      )}
    </Box>
  );
}; 