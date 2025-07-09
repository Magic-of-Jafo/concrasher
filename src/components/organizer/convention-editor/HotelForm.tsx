'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Box, TextField, Typography, FormGroup, FormControlLabel, Checkbox, Button, Paper, Switch } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { HotelData, HotelPhotoData } from '@/lib/validators';
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

interface HotelFormProps {
  formData: HotelData;
  onFormDataChange: (data: Partial<HotelData>) => void;
  isPrimaryHotel?: boolean;
  title?: string;
  disabled?: boolean;
  errors?: {
    hotelName?: string;
    websiteUrl?: string;
    googleMapsUrl?: string;
    streetAddress?: string;
    city?: string;
    stateRegion?: string;
    postalCode?: string;
    country?: string;
    contactEmail?: string;
    contactPhone?: string;
    groupRateOrBookingCode?: string;
    groupPrice?: string;
    bookingLink?: string;
    bookingCutoffDate?: string;
    parkingInfo?: string;
  };
}

const HotelForm: React.FC<HotelFormProps> = ({
  formData,
  onFormDataChange,
  isPrimaryHotel = false,
  title = "Hotel Details",
  disabled = false,
  errors
}) => {
  const [localFormData, setLocalFormData] = useState(formData);
  const initialDescriptionRef = useRef(formData.description);

  useEffect(() => {
    // Sync local state if the authoritative formData prop changes from the parent.
    // This is crucial for when the user adds/removes hotels or when initial data loads.
    // We use functional setState to avoid dependency on localFormData and prevent stale state.
    setLocalFormData(currentLocalData => {
      // Only update if it's a different entity
      if (formData.id !== currentLocalData.id || formData.tempId !== currentLocalData.tempId) {
        return formData;
      }
      return currentLocalData;
    });
  }, [formData]);

  useEffect(() => {
    // Keep the initial description ref updated if the entity changes
    if (formData.id !== initialDescriptionRef.current?.id && formData.tempId !== initialDescriptionRef.current?.tempId) {
      initialDescriptionRef.current = formData.description;
    }
  }, [formData.id, formData.tempId, formData.description]);


  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;

    if (name === 'amenitiesPasted') {
      const amenitiesArray = value.split('\n').map(line => line.trim()).filter(line => line !== '');
      const updatedData = { ...localFormData, amenities: amenitiesArray };
      setLocalFormData(updatedData);
      onFormDataChange({ amenities: amenitiesArray }); // Update parent immediately for this field
    } else {
      setLocalFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = event.target;
    if ((localFormData as any)[name] !== (formData as any)[name]) {
      onFormDataChange({ [name]: (localFormData as any)[name] } as Partial<HotelData>);
    }
  };

  const handleDateChange = (name: string, date: Date | null) => {
    const updatedData = { ...localFormData, [name]: date };
    setLocalFormData(updatedData);
    onFormDataChange({ [name]: date });
  };

  const handleEditorChange = (content: any) => {
    if (!disabled) {
      onFormDataChange({ description: content });
    }
  };

  const handlePhotoUpload = (url: string) => {
    const newPhotos = [{ url: url, caption: '' }];
    setLocalFormData(prev => ({ ...prev, photos: newPhotos }));
    onFormDataChange({ photos: newPhotos });
  };

  const handleRemovePhoto = () => {
    setLocalFormData(prev => ({ ...prev, photos: [] }));
    onFormDataChange({ photos: [] });
  };

  const handleCaptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newCaption = event.target.value;
    if (localFormData.photos && localFormData.photos[0]) {
      const updatedPhotos = [{ ...localFormData.photos[0], caption: newCaption }];
      setLocalFormData(prev => ({ ...prev, photos: updatedPhotos }));
      // This can be debounced or updated onBlur if needed, but for now immediate is fine.
      onFormDataChange({ photos: updatedPhotos });
    }
  };

  const showLocationDetails = true;

  return (
    <Box component="form" noValidate autoComplete="off" sx={{ mt: 2, mb: 3, p: isPrimaryHotel ? 0 : 2, border: isPrimaryHotel ? 'none' : '1px dashed grey', borderRadius: isPrimaryHotel ? 0 : 1 }}>
      <GlobalStyles />
      <Typography variant="h6" gutterBottom>{title}</Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Hotel Name"
          name="hotelName"
          value={localFormData.hotelName || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          disabled={disabled}
          error={!!errors?.hotelName}
          helperText={errors?.hotelName || ''}
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

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Description / Notes</Typography>
      <Editor
        key={formData.id || (formData as any).tempId || `hotel-editor-${title}`}
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

      {showLocationDetails && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Hotel Location</Typography>
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
        </>
      )}

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Booking Information</Typography>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Booking Link"
          name="bookingLink"
          value={localFormData.bookingLink || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          error={!!errors?.bookingLink}
          helperText={errors?.bookingLink || "Direct link for attendees to book rooms"}
          sx={{ flexGrow: 1, flexBasis: '50%' }}
        />
        <DatePicker
          label="Booking Cutoff Date"
          value={localFormData.bookingCutoffDate ? new Date(localFormData.bookingCutoffDate) : null}
          onChange={(date) => handleDateChange('bookingCutoffDate', date)}
          disabled={disabled}
          sx={{ flexGrow: 1, flexBasis: '50%' }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Group Rate / Booking Code"
          name="groupRateOrBookingCode"
          value={localFormData.groupRateOrBookingCode || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          error={!!errors?.groupRateOrBookingCode}
          helperText={errors?.groupRateOrBookingCode || "e.g., 'CONVENTION2024'"}
          sx={{ flexGrow: 1, flexBasis: '50%' }}
        />
        <TextField
          fullWidth
          label="Group Price"
          name="groupPrice"
          value={localFormData.groupPrice || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          error={!!errors?.groupPrice}
          helperText={errors?.groupPrice || "e.g., '$159/night'"}
          sx={{ flexGrow: 1, flexBasis: '50%' }}
        />
      </Box>

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Hotel Amenities</Typography>
      <TextField
        fullWidth
        label="Hotel Amenities (one per line)"
        name="amenitiesPasted"
        value={(localFormData.amenities || []).join('\n')}
        onChange={handleChange}
        multiline
        rows={4}
        disabled={disabled}
        helperText="Enter each amenity on a new line. This will be saved as a list."
        sx={{ mb: 2 }}
      />

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Venue Information</Typography>
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
        error={!!errors?.parkingInfo}
        helperText={errors?.parkingInfo || ''}
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
        label="Overall Accessibility Notes (Hotel Specific)"
        name="overallAccessibilityNotes"
        value={localFormData.overallAccessibilityNotes || ''}
        onChange={handleChange}
        onBlur={handleBlur}
        multiline
        rows={3}
        disabled={disabled}
        sx={{ mb: 2 }}
      />

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Hotel Photo</Typography>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <ImageUploadInput
          label="Upload Hotel Photo"
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

      {!isPrimaryHotel && (
        <Button variant="outlined" color="error" onClick={() => onFormDataChange({ _delete: true } as any)} sx={{ mt: 1 }}>
          Remove Hotel
        </Button>
      )}
    </Box>
  );
};

export default HotelForm; 