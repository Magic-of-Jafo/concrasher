import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Typography, FormGroup, FormControlLabel, Checkbox, Button, Paper, Card, CardMedia, CardActions } from '@mui/material';
import { VenueData, VenuePhotoData } from '@/lib/validators';
import { Editor } from '@tinymce/tinymce-react';
import ImageUploadInput from '@/components/shared/ImageUploadInput';

// ADD THIS STYLE BLOCK
const GlobalStyles = () => (
  <style jsx global>{`
    .tox-statusbar__branding {
      display: none !important;
    }
  `}</style>
);

interface PrimaryVenueFormProps {
  title?: string;
  formData: VenueData;  // Require full VenueData
  onFormDataChange: (data: Partial<VenueData>) => void;
  disabled?: boolean;
  errors?: { // Added errors prop
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
    // Add any other fields from VenueData that might have validation
  };
  // TODO: onPhotosChange: (photos: VenuePhotoData[]) => void;
}

const PrimaryVenueForm: React.FC<PrimaryVenueFormProps> = ({ title = 'Venue Details', formData, onFormDataChange, disabled = false, errors }) => {
  const [localVenueName, setLocalVenueName] = useState(formData.venueName);
  const initialDescriptionRef = useRef(formData.description); // Store initial description

  useEffect(() => {
    if (formData.venueName !== localVenueName) {
        setLocalVenueName(formData.venueName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.venueName]);

  // Update ref only when formData.id or tempId changes, indicating a different item
  useEffect(() => {
    initialDescriptionRef.current = formData.description;
  }, [formData.id, (formData as any).tempId]); // Dependency on item identity

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    
    let finalValue = value;

    // Special handling for websiteUrl to prepend http:// if no scheme is present
    if (name === "websiteUrl") {
      if (value && !value.match(/^(\w+):\/\//) && value.includes('.')) {
        finalValue = `http://${value}`;
      }
      // For websiteUrl, call onFormDataChange directly with the potentially modified value.
      onFormDataChange({ [name]: finalValue });
      return; // Exit early as we've handled this field.
    }
    
    // Handle other fields
    if (name === "venueName") {
      setLocalVenueName(value); // Update local state for venueName
      // onFormDataChange for venueName is handled by onBlur
    } else if (type === 'checkbox') {
      const { checked } = event.target as HTMLInputElement;
      onFormDataChange({ [name]: checked });
    } else if (name === 'amenitiesPasted') {
      const amenitiesArray = value.split('\n').map(line => line.trim()).filter(line => line !== '');
      onFormDataChange({ amenities: amenitiesArray });
    } else {
      // For any other fields not specifically handled above, update parent immediately.
      onFormDataChange({ [name]: value });
    }
  };

  const handleVenueNameBlur = () => {
    // Update parent state only when the venueName field loses focus
    if (formData.venueName !== localVenueName) { // Only update if different
        onFormDataChange({ venueName: localVenueName });
    }
  };

  const handlePhotoUpload = (url: string) => {
    onFormDataChange({ photos: [{ url: url, caption: formData.photos?.[0]?.caption || '' }] });
  };

  const handleRemovePhoto = () => {
    onFormDataChange({ photos: [] });
  };

  const handleCaptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (formData.photos && formData.photos[0]) {
      // Ensure we preserve the URL when changing caption
      onFormDataChange({ photos: [{ ...formData.photos[0], url: formData.photos[0].url, caption: event.target.value }] });
    } else {
      // If for some reason photos[0] doesn't exist but we are trying to set a caption (should not happen with current UI)
      // We might initialize it with a null URL or handle error, for now, let's assume photos[0] exists if caption is being changed.
       console.warn("Attempted to change caption but no photo exists in formData");
    }
  };

  return (
    <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
      <GlobalStyles />
      <Typography variant="h6" gutterBottom>{title}</Typography>
      
      {/* Row 1: Venue Name and Website URL */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Venue Name"
          name="venueName"
          value={localVenueName}
          onChange={handleChange}
          onBlur={handleVenueNameBlur}
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
          value={formData.websiteUrl || ''}
          onChange={handleChange}
          disabled={disabled}
          error={!!errors?.websiteUrl}
          helperText={errors?.websiteUrl || "e.g., example.com or http://example.com"}
          sx={{ flexGrow: 1, flexBasis: '50%' }}
        />
      </Box>

      {/* Row 2: Description */}
      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Description</Typography>
      <Editor
        key={formData.id || (formData as any).tempId || 'primary-venue-editor'}
        apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY || 'YOUR_FALLBACK_API_KEY'}
        initialValue={initialDescriptionRef.current || ''}
        disabled={disabled}
        init={{
          height: 300,
          menubar: false,
          readonly: disabled,
          plugins:
            'autolink lists link image charmap preview anchor ' +
            'searchreplace visualblocks code fullscreen ' +
            'insertdatetime media table help wordcount',
          toolbar:
            'undo redo | formatselect | ' +
            'bold italic backcolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | help',
          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px } .tox-promotion { display: none !important; } .tox-statusbar__branding { display: none !important; }'
        }}
        onEditorChange={(content: any, editor: any) => {
          if (!disabled) {
            onFormDataChange({ description: content });
          }
        }}
      />

      {/* Row 3: Google Maps URL */}
      <TextField
        fullWidth
        label="Google Maps URL"
        name="googleMapsUrl"
        value={formData.googleMapsUrl || ''}
        onChange={handleChange}
        disabled={disabled}
        error={!!errors?.googleMapsUrl}
        helperText={errors?.googleMapsUrl || ''}
        sx={{ mb: 2, mt:2 }}
      />
      
      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Address</Typography>
      {/* Row 4: Street Address and City */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Street Address"
          name="streetAddress"
          value={formData.streetAddress || ''}
          onChange={handleChange}
          disabled={disabled}
          error={!!errors?.streetAddress}
          helperText={errors?.streetAddress || ''}
          sx={{ flexGrow: 2, flexBasis: { xs: '100%', md: '66%' } }} // Approx 8/12
        />
        <TextField
          fullWidth
          label="City"
          name="city"
          value={formData.city || ''}
          onChange={handleChange}
          disabled={disabled}
          error={!!errors?.city}
          helperText={errors?.city || ''}
          sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '33%' } }} // Approx 4/12
        />
      </Box>
      {/* Row 5: State/Region, Postal Code, Country */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="State / Region"
          name="stateRegion"
          value={formData.stateRegion || ''}
          onChange={handleChange}
          disabled={disabled}
          error={!!errors?.stateRegion}
          helperText={errors?.stateRegion || ''}
          sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '33.33%' } }}
        />
        <TextField
          fullWidth
          label="Postal Code"
          name="postalCode"
          value={formData.postalCode || ''}
          onChange={handleChange}
          disabled={disabled}
          error={!!errors?.postalCode}
          helperText={errors?.postalCode || ''}
          sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '33.33%' } }}
        />
        <TextField
          fullWidth
          label="Country"
          name="country"
          value={formData.country || ''}
          onChange={handleChange}
          disabled={disabled}
          error={!!errors?.country}
          helperText={errors?.country || ''}
          sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '33.33%' } }}
        />
      </Box>

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Contact Information</Typography>
      {/* Row 6: Contact Email and Phone */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Contact Email"
          name="contactEmail"
          value={formData.contactEmail || ''}
          onChange={handleChange}
          type="email"
          disabled={disabled}
          error={!!errors?.contactEmail}
          helperText={errors?.contactEmail || ''}
          sx={{ flexGrow: 1, flexBasis: '50%' }}
        />
        <TextField
          fullWidth
          label="Contact Phone"
          name="contactPhone"
          value={formData.contactPhone || ''}
          onChange={handleChange}
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
        value={(formData.amenities || []).join('\n')}
        onChange={handleChange}
        multiline
        rows={4}
        disabled={disabled}
        helperText="Enter each amenity on a new line. This will be saved as a list."
        sx={{ mb: 2 }}
      />

      <Typography variant="h6" sx={{ mt: 2, mb: 1 }} gutterBottom>Location & Access Information</Typography>
      {/* Parking Info, Public Transport, Accessibility Notes - each full width */}
      <TextField
        fullWidth
        label="Parking Information"
        name="parkingInfo"
        value={formData.parkingInfo || ''}
        onChange={handleChange}
        multiline
        rows={3}
        disabled={disabled}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Public Transportation Access"
        name="publicTransportInfo"
        value={formData.publicTransportInfo || ''}
        onChange={handleChange}
        multiline
        rows={3}
        disabled={disabled}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Overall Accessibility Notes"
        name="overallAccessibilityNotes"
        value={formData.overallAccessibilityNotes || ''}
        onChange={handleChange}
        multiline
        rows={3}
        disabled={disabled}
        sx={{ mb: 2 }}
      />

      {/* Venue Photo Section - MOVED HERE (to the bottom) */}
      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Venue Photo</Typography>
      <ImageUploadInput
        label="Upload Venue Photo"
        currentImageUrl={formData.photos?.[0]?.url || null}
        onUploadComplete={handlePhotoUpload}
        onRemoveImage={handleRemovePhoto}
        disabled={disabled}
      />
      {formData.photos && formData.photos.length > 0 && formData.photos[0].url && (
        <TextField
          fullWidth
          label="Photo Caption"
          name="photoCaption" 
          value={formData.photos[0].caption || ''}
          onChange={handleCaptionChange}
          disabled={disabled}
          sx={{ mt: 1, mb: 2 }}
        />
      )}
    </Box>
  );
};

export default React.memo(PrimaryVenueForm); 