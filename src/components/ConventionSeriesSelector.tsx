import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Button,
  CircularProgress
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { slugify } from '@/lib/utils';

interface ConventionSeries {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}

interface ConventionSeriesSelectorProps {
  initialSeriesId?: string | null;
  onSeriesSelect: (seriesId: string | null) => void;
  onNewSeriesCreate: (series: Omit<ConventionSeries, 'id'>) => void;
}

export default function ConventionSeriesSelector({
  initialSeriesId,
  onSeriesSelect,
  onNewSeriesCreate
}: ConventionSeriesSelectorProps) {
  const { data: session } = useSession();
  const [series, setSeries] = useState<ConventionSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newSeries, setNewSeries] = useState({
    name: '',
    description: '',
    logoUrl: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch user's series
  useEffect(() => {
    const fetchSeries = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/organizer/series');
        if (!response.ok) throw new Error('Failed to fetch series');
        const data = await response.json();
        setSeries(data.series);

        // If an initialSeriesId is provided (e.g., editing an existing convention),
        // and it exists in the fetched list, set it as the selected value.
        // This does not trigger onSeriesSelect, which is correct for initial state setting.
        if (initialSeriesId && data.series.some((s: ConventionSeries) => s.id === initialSeriesId)) {
          setSelectedSeries(initialSeriesId);
        }
        // We no longer automatically select the first series to force the user to make a choice.

      } catch (error) {
        console.error('Error fetching series:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchSeries();
    }
  }, [session, initialSeriesId]);

  // Handle series selection
  const handleSeriesChange = (event: any) => {
    const value = event.target.value;
    setSelectedSeries(value);
    onSeriesSelect(value);
  };

  const handleToggleCreateNew = () => {
    const switchingToCreate = !isCreatingNew;
    setIsCreatingNew(switchingToCreate);
    if (switchingToCreate) {
      // Clear selection when entering create mode
      setSelectedSeries('');
      onSeriesSelect(null);
    }
  };

  // Handle new series input changes
  const handleNewSeriesChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNewSeries(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'name' ? { slug: slugify(value) } : {})
    }));
  };

  // Handle logo upload
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setLogoFile(file);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        setNewSeries(prev => ({ ...prev, logoUrl: data.url }));
      } catch (error) {
        console.error('Error uploading logo:', error);
      } finally {
        setUploading(false);
      }
    }
  });

  // Handle new series creation
  const handleCreateSeries = () => {
    if (!newSeries.name) return;

    onNewSeriesCreate({
      name: newSeries.name,
      slug: slugify(newSeries.name),
      description: newSeries.description,
      logoUrl: newSeries.logoUrl
    });
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ mb: 4 }}>
      {/* Show selector only if not creating and series exist */}
      {!isCreatingNew && series.length > 0 && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select an Existing Series</InputLabel>
          <Select
            value={selectedSeries}
            label="Select an Existing Series"
            onChange={handleSeriesChange}
          >
            {series.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
            {/* "Create New" is now a button */}
          </Select>
        </FormControl>
      )}

      {/* Toggler Button and Title Logic */}
      <Box sx={{ my: 2, textAlign: 'center' }}>
        {series.length > 0 && !isCreatingNew && <Typography>— OR —</Typography>}

        {series.length > 0 && (
          <Button variant="outlined" onClick={handleToggleCreateNew} sx={{ mt: 1 }}>
            {isCreatingNew ? 'Cancel Creation' : 'Create a New Series'}
          </Button>
        )}

        {(isCreatingNew || series.length === 0) && (
          <Typography variant="h6" sx={{ mb: 2 }}>
            {series.length === 0 ? 'Create Your First Convention Series' : 'Create a New Series'}
          </Typography>
        )}
      </Box>

      {/* New Series Form */}
      {(isCreatingNew || series.length === 0) && (
        <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <TextField
            fullWidth
            label="Series Name"
            value={newSeries.name}
            onChange={handleNewSeriesChange('name')}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Description"
            value={newSeries.description}
            onChange={handleNewSeriesChange('description')}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />

          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed #ccc',
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              mb: 2
            }}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <CircularProgress size={24} />
            ) : logoFile ? (
              <Typography>Logo selected: {logoFile.name}</Typography>
            ) : (
              <Typography>
                Drag & drop a logo here, or click to select (max 5MB)
              </Typography>
            )}
          </Box>

          {newSeries.name && (
            <Button
              variant="contained"
              onClick={handleCreateSeries}
              disabled={uploading}
            >
              Create Series
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
} 