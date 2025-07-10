import React, { useEffect, useRef, useCallback } from 'react';
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
  isPrimary?: boolean; // To distinguish primary from secondary
}

const PrimaryVenueForm: React.FC<PrimaryVenueFormProps> = ({ value, onChange, onMarkForPromotion, disabled = false, errors, title, isPrimary = false }) => {
  const initialDescriptionRef = useRef(value.description);
  const identityRef = useRef(value.id || (value as any).tempId);
  const currentIdentity = value.id || (value as any).tempId;

  if (currentIdentity !== identityRef.current) {
    initialDescriptionRef.current = value.description;
    identityRef.current = currentIdentity;
  }

  useEffect(() => {
    initialDescriptionRef.current = value.description;
  }, [value.description]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value: eventValue, type } = event.target;
    if (type === 'checkbox') {
      const { checked } = event.target as HTMLInputElement;
      onChange({ [name]: checked });
    } else {
      onChange({ [name]: eventValue });
    }
  }, [onChange]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value: eventValue } = event.target;
    if (name === "websiteUrl" && eventValue && !eventValue.match(/^(\w+):\/\//) && eventValue.includes('.')) {
      onChange({ [name]: `http://${eventValue}` });
    }
  }, [onChange]);

  const handleEditorChange = useCallback((content: string) => {
    if (!disabled) {
      onChange({ description: content });
    }
  }, [disabled, onChange]);

  const handlePhotoUpload = useCallback((url: string) => {
    const newPhotos = [{ url: url, caption: '' }];
    onChange({ photos: newPhotos });
  }, [onChange]);

  const handleRemovePhoto = useCallback(() => {
    onChange({ photos: [] });
  }, [onChange]);

  const handleCaptionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newCaption = event.target.value;
    if (value.photos && value.photos[0]) {
      const updatedPhotos = [{ ...value.photos[0], caption: newCaption }];
      onChange({ photos: updatedPhotos });
    }
  }, [onChange, value.photos]);

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
          value={value.venueName || ''}
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
          label={isPrimary ? "Booking URL" : "Website URL"}
          name="websiteUrl"
          value={value.websiteUrl || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          error={!!errors?.websiteUrl}
          helperText={errors?.websiteUrl || (isPrimary ? "e.g., marriott.com/book-here" : "e.g., example.com or http://example.com")}
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
        value={value.googleMapsUrl || ''}
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
          value={value.streetAddress || ''}
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
          value={value.city || ''}
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
          value={value.stateRegion || ''}
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
          value={value.postalCode || ''}
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
          value={value.country || ''}
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
          value={value.contactEmail || ''}
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
          value={value.contactPhone || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          error={!!errors?.contactPhone}
          helperText={errors?.contactPhone || ''}
          sx={{ flexGrow: 1, flexBasis: '50%' }}
        />
      </Box>

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Venue Photo</Typography>
      {value.photos && value.photos.length > 0 ? (
        <Box>
          <img src={value.photos[0].url} alt="Venue" style={{ maxWidth: '100%', height: 'auto', maxHeight: '300px' }} />
          <TextField
            fullWidth
            label="Photo Caption"
            value={value.photos[0].caption || ''}
            onChange={handleCaptionChange}
            disabled={disabled}
            sx={{ mt: 1 }}
          />
          <Button onClick={handleRemovePhoto} disabled={disabled} color="error" sx={{ mt: 1 }}>
            Remove Photo
          </Button>
        </Box>
      ) : (
        <ImageUploadInput onUpload={handlePhotoUpload} disabled={disabled} />
      )}

      <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>Amenities</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <FormGroup>
          {['Wheelchair Accessible', 'Parking Available', 'Public Transit Nearby', 'On-site Restaurant'].map((amenity) => (
            <FormControlLabel
              key={amenity}
              control={
                <Checkbox
                  checked={(value.amenities || []).includes(amenity)}
                  onChange={() => {
                    const newAmenities = (value.amenities || []).includes(amenity)
                      ? (value.amenities || []).filter(a => a !== amenity)
                      : [...(value.amenities || []), amenity];
                    onChange({ amenities: newAmenities });
                  }}
                  name={amenity}
                  disabled={disabled}
                />
              }
              label={amenity}
            />
          ))}
        </FormGroup>
      </Paper>
    </Box>
  );
};

export default PrimaryVenueForm; 