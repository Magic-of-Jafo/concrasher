import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { useDebounce } from '../../lib/hooks';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export function SearchBar({ placeholder = 'Search conventions...', className }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams?.get('query') || '');
  
  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(searchValue, 300);

  // Update URL when search changes
  useEffect(() => {
    if (!searchParams) return;
    
    const params = new URLSearchParams(searchParams.toString());
    
    if (debouncedSearch) {
      params.set('query', debouncedSearch);
    } else {
      params.delete('query');
    }
    
    // Reset to page 1 when search changes
    params.set('page', '1');
    
    router.push(`/conventions?${params.toString()}`);
  }, [debouncedSearch, router, searchParams]);

  const handleClear = useCallback(() => {
    setSearchValue('');
  }, []);

  return (
    <TextField
      fullWidth
      variant="outlined"
      placeholder={placeholder}
      value={searchValue}
      onChange={(e) => setSearchValue(e.target.value)}
      className={className}
      sx={{
        bgcolor: 'background.paper',
        '& .MuiOutlinedInput-root': {
          '& fieldset': {
            borderColor: 'divider',
          },
          '&:hover fieldset': {
            borderColor: 'primary.main',
          },
          '&.Mui-focused fieldset': {
            borderColor: 'primary.main',
          },
        },
        '& .MuiInputLabel-root': {
          color: 'text.primary',
        },
        '& .MuiInputBase-input': {
          color: 'text.primary',
        },
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
        endAdornment: searchValue && (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={handleClear}
              edge="end"
            >
              <ClearIcon />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
} 