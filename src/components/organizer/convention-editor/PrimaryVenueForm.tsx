import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Typography, FormGroup, FormControlLabel, Checkbox, Button, Paper } from '@mui/material';
import { VenueData, VenuePhotoData } from '@/lib/validators';
import { Editor } from '@tinymce/tinymce-react';
import ImageUploadInput from '@/components/shared/ImageUploadInput';

const GlobalStyles = () => (
  <style jsx global>{`
    .tox-statusbar__branding {
      display: none !important;
    }
  `}</style>
);

interface PrimaryVenueFormProps {
  value: VenueData;
  onChange: (data: Partial<VenueData>) => void;
  onMarkForPromotion?: () => void;
  disabled?: boolean;
  errors?: {
    venueName?: string;
    websiteUrl?: string;
    googleMapsUrl?: string;
    streetAddress?: string;
    city?: string;
    stateRegion?: string;
    postalCode?: string;
    country?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  title?: string; // Kept for secondary venues, but optional
}

const PrimaryVenueForm: React.FC<PrimaryVenueFormProps> = ({ value, onChange, onMarkForPromotion, disabled = false, errors, title }) => {
  const [localFormData, setLocalFormData] = useState(value);

  const initialDescriptionRef = useRef(value.description);
  const identityRef = useRef(value.id || (value as any).tempId);
  const currentIdentity = value.id || (value as any).tempId;

  if (currentIdentity !== identityRef.current) {
    initialDescriptionRef.current = value.description;
    identityRef.current = currentIdentity;
  }

  useEffect(() => {
    setLocalFormData(currentLocalData => {
      if (value.id !== currentLocalData.id || value.tempId !== currentLocalData.id) {
        return value;
      }
      return currentLocalData;
    });
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;

    if (type === 'checkbox') {
      const { checked } = event.target as HTMLInputElement;
      const updatedData = { ...localFormData, [name]: checked };
      setLocalFormData(updatedData);
      onChange({ [name]: checked });
    } else if (name === 'amenitiesPasted') {
      const amenitiesArray = value.split('\n').map(line => line.trim()).filter(line => line !== '');
      const updatedData = { ...localFormData, amenities: amenitiesArray };
      setLocalFormData(updatedData);
      onChange({ amenities: amenitiesArray });
    } else {
      setLocalFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    let finalValue: string | Partial<VenueData> = value;

    if (name === "websiteUrl") {
      if (value && !value.match(/^(\w+):\/\//) && value.includes('.')) {
        finalValue = `http://${value}`;
      }
      onChange({ [name]: finalValue });
    } else {
      if ((localFormData as any)[name] !== (value as any)[name]) {
        onChange({ [name]: value } as Partial<VenueData>);
      }
    }
  };

  const handleEditorChange = (content: string) => {
    if (!disabled) {
      onChange({ description: content });
    }
  };

  const handlePhotoUpload = (url: string) => {
    const newPhotos = [{ url: url, caption: '' }];
    setLocalFormData(prev => ({ ...prev, photos: newPhotos }));
    onChange({ photos: newPhotos });
  };

  const handleRemovePhoto = () => {
    setLocalFormData(prev => ({ ...prev, photos: [] }));
    onChange({ photos: [] });
  };

  const handleCaptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newCaption = event.target.value;
    if (localFormData.photos && localFormData.photos[0]) {
      const updatedPhotos = [{ ...localFormData.photos[0], caption: newCaption }];
      setLocalFormData(prev => ({ ...prev, photos: updatedPhotos }));
      onChange({ photos: updatedPhotos });
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <GlobalStyles />
      {title && <Typography variant="h6" gutterBottom>{title}</Typography>}
      {onMarkForPromotion && (
        <Button onClick={onMarkForPromotion} disabled={disabled}>
          Mark as Primary Venue
        </Button>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Venue Name"
          name="venueName"
          value={localFormData.venueName || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          disabled={disabled}
          error={!!errors?.venueName}
          helperText={errors?.venueName || ''}
          sx={{ flexGrow: 1, flexBasis: '50%' }}
        />
        <TextField
          fullWidth
          label="Website URL"
          name="websiteUrl"
          value={localFormData.websiteUrl || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          error={!!errors?.websiteUrl}
          helperText={errors?.websiteUrl || "e.g., example.com or http://example.com"}
          sx={{ flexGrow: 1, flexBasis: '50%' }}
        />
      </Box>

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Description</Typography>
      <Editor
        key={value.id || (value as any).tempId || 'primary-venue-editor'}
        apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY || 'YOUR_FALLBACK_API_KEY'}
        initialValue={initialDescriptionRef.current || ''}
        disabled={disabled}
        init={{
          height: 300,
          menubar: false,
          readonly: disabled,
          plugins: 'autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount',
          toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px } .tox-promotion { display: none !important; } .tox-statusbar__branding { display: none !important; }'
        }}
        onEditorChange={handleEditorChange}
      />

      <TextField
        fullWidth
        label="Google Maps URL"
        name="googleMapsUrl"
        value={localFormData.googleMapsUrl || ''}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        error={!!errors?.googleMapsUrl}
        helperText={errors?.googleMapsUrl || ''}
        sx={{ mb: 2, mt: 2 }}
      />

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Address</Typography>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Street Address"
          name="streetAddress"
          value={localFormData.streetAddress || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          error={!!errors?.streetAddress}
          helperText={errors?.streetAddress || ''}
          sx={{ flexGrow: 2, flexBasis: { xs: '100%', md: '66%' } }}
        />
        <TextField
          fullWidth
          label="City"
          name="city"
          value={localFormData.city || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          error={!!errors?.city}
          helperText={errors?.city || ''}
          sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '33%' } }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="State / Region"
          name="stateRegion"
          value={localFormData.stateRegion || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          error={!!errors?.stateRegion}
          helperText={errors?.stateRegion || ''}
          sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '33.33%' } }}
        />
        <TextField
          fullWidth
          label="Postal Code"
          name="postalCode"
          value={localFormData.postalCode || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          error={!!errors?.postalCode}
          helperText={errors?.postalCode || ''}
          sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '33.33%' } }}
        />
        <TextField
          fullWidth
          label="Country"
          name="country"
          value={localFormData.country || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          error={!!errors?.country}
          helperText={errors?.country || ''}
          sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '33.33%' } }}
        />
      </Box>

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Contact Information</Typography>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Contact Email"
          name="contactEmail"
          type="email"
          value={localFormData.contactEmail || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          error={!!errors?.contactEmail}
          helperText={errors?.contactEmail || ''}
          sx={{ flexGrow: 1, flexBasis: '50%' }}
        />
        <TextField
          fullWidth
          label="Contact Phone"
          name="contactPhone"
          value={localFormData.contactPhone || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          error={!!errors?.contactPhone}
          helperText={errors?.contactPhone || ''}
          sx={{ flexGrow: 1, flexBasis: '50%' }}
        />
      </Box>

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Amenities</Typography>
      <TextField
        fullWidth
        label="Venue Amenities (one per line)"
        name="amenitiesPasted"
        value={(localFormData.amenities || []).join('\n')}
        onChange={handleChange}
        multiline
        rows={4}
        disabled={disabled}
        helperText="Enter each amenity on a new line."
        sx={{ mb: 2 }}
      />

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Venue-Specific Information</Typography>
      <TextField
        fullWidth
        label="Parking Information"
        name="parkingInfo"
        value={localFormData.parkingInfo || ''}
        onChange={handleChange}
        onBlur={handleBlur}
        multiline
        rows={3}
        disabled={disabled}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Public Transportation Access"
        name="publicTransportInfo"
        value={localFormData.publicTransportInfo || ''}
        onChange={handleChange}
        onBlur={handleBlur}
        multiline
        rows={3}
        disabled={disabled}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Overall Accessibility Notes"
        name="overallAccessibilityNotes"
        value={localFormData.overallAccessibilityNotes || ''}
        onChange={handleChange}
        onBlur={handleBlur}
        multiline
        rows={3}
        disabled={disabled}
        sx={{ mb: 2 }}
      />

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Venue Photo</Typography>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <ImageUploadInput
          label="Upload Venue Photo"
          currentImageUrl={localFormData.photos && localFormData.photos.length > 0 ? localFormData.photos[0].url : null}
          onUploadComplete={handlePhotoUpload}
          onRemoveImage={handleRemovePhoto}
          disabled={disabled}
        />
        {localFormData.photos && localFormData.photos.length > 0 && localFormData.photos[0].url && (
          <TextField
            fullWidth
            label="Photo Caption"
            name="caption"
            value={localFormData.photos[0].caption || ''}
            onChange={handleCaptionChange}
            disabled={disabled}
            variant="outlined"
            size="small"
            sx={{ mt: 1 }}
          />
        )}
      </Paper>
    </Box>
  );
};

export default PrimaryVenueForm; 