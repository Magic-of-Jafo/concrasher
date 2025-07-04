'use client';

import React, { useRef, useEffect } from 'react';
import { Box, TextField, Typography, FormGroup, FormControlLabel, Checkbox, Button, Paper, Switch, Card, CardMedia, CardActions } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { HotelData, HotelPhotoData } from '@/lib/validators';
import { Editor } from '@tinymce/tinymce-react';
import ImageUploadInput from '@/components/shared/ImageUploadInput';

// Placeholder for a generic FileUpload component
// Assume this component takes an onUploadComplete callback which returns the uploaded file's URL
const FileUploadPlaceholder = ({ onUploadComplete, disabled }: { onUploadComplete: (url: string) => void; disabled?: boolean; }) => {
  return (
    <Button variant="contained" component="label" disabled={disabled} sx={{ mb: 1 }}>
      Upload Photo
      <input type="file" hidden onChange={(e) => {
        if (e.target.files && e.target.files[0]) {
          // In a real scenario, you'd upload the file and get a URL
          // For this placeholder, we'll simulate with a dummy URL
          setTimeout(() => {
            // const dummyUrl = URL.createObjectURL(e.target.files[0]);
            console.log("Placeholder: File selected for hotel photo.");
            onUploadComplete(`https://via.placeholder.com/300x200.png?text=Hotel+Photo`);
            // URL.revokeObjectURL(dummyUrl); // Clean up
          }, 500);
        }
      }} />
    </Button>
  );
};

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
  // TODO: onPhotosChange: (photos: HotelPhotoData[]) => void;
  isPrimaryHotel?: boolean; // To slightly alter UI for primary hotel context if needed
  title?: string; // To allow custom title e.g. "Primary Hotel Details" or "Additional Hotel"
  disabled?: boolean; // Added disabled prop
  errors?: { // Added errors prop
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
    bookingCutoffDate?: string; // Assuming date errors are strings
    parkingInfo?: string;
    // Add any other fields from HotelData that might have validation
  };
}

const HotelForm: React.FC<HotelFormProps> = ({
  formData,
  onFormDataChange,
  isPrimaryHotel = false,
  title = "Hotel Details",
  disabled = false,
  errors // Destructure errors
}) => {
  const initialDescriptionRef = useRef(formData.description);

  useEffect(() => {
    initialDescriptionRef.current = formData.description;
  }, [formData.id, (formData as any).tempId]); // Dependency on item identity, ensuring type safety for tempId if not in HotelData

  // --- START OF REWRITTEN handleChange FUNCTION ---
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    if (name === 'amenitiesPasted') {
      const amenitiesArray = value.split('\n').map(line => line.trim()).filter(line => line !== '');
      onFormDataChange({ amenities: amenitiesArray });
    } else {
      onFormDataChange({ [name]: value } as Partial<HotelData>);
    }
  };

  const handleDateChange = (name: string, date: Date | null) => {
    onFormDataChange({ [name]: date });
  };

  const handleEditorChange = (content: any) => {
    if (!disabled) {
      onFormDataChange({ description: content });
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
      console.warn("Attempted to change caption but no photo exists in formData for hotel");
    }
  };

  // Determine if location details should be shown.
  // For a primary hotel (if separate from venue), location details are always relevant.
  // For additional hotels, location details are always relevant.
  // The isAtPrimaryVenueLocation flag on formData is set by the parent (VenueHotelTab).
  const showLocationDetails = true; // Always show for both primary (if separate) and additional hotels.

  return (
    <Box component="form" noValidate autoComplete="off" sx={{ mt: 2, mb: 3, p: isPrimaryHotel ? 0 : 2, border: isPrimaryHotel ? 'none' : '1px dashed grey', borderRadius: isPrimaryHotel ? 0 : 1 }}>
      <GlobalStyles />
      <Typography variant="h6" gutterBottom>{title}</Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Hotel Name"
          name="hotelName"
          value={formData.hotelName || ''}
          onChange={handleChange}
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
          value={formData.websiteUrl || ''}
          onChange={handleChange}
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
        initialValue={initialDescriptionRef.current || ''} // Use stable initial value from ref
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
          handleEditorChange(content);
        }}
      />

      {showLocationDetails && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Hotel Location</Typography>
          <TextField
            fullWidth
            label="Google Maps URL"
            name="googleMapsUrl"
            value={formData.googleMapsUrl || ''}
            onChange={handleChange}
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
              value={formData.streetAddress || ''}
              onChange={handleChange}
              disabled={disabled}
              error={!!errors?.streetAddress}
              helperText={errors?.streetAddress || ''}
              sx={{ flexGrow: 2, flexBasis: { xs: '100%', md: '66%' } }}
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
              sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '33%' } }}
            />
          </Box>
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
        </>
      )}

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Group Booking Information</Typography>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Group Rate / Booking Code"
          name="groupRateOrBookingCode"
          value={formData.groupRateOrBookingCode || ''}
          onChange={handleChange}
          disabled={disabled}
          error={!!errors?.groupRateOrBookingCode}
          helperText={errors?.groupRateOrBookingCode || ''}
          sx={{ flexGrow: 1 }}
        />
        <TextField
          fullWidth
          label="Group Price (e.g., $150/night)"
          name="groupPrice"
          value={formData.groupPrice || ''}
          onChange={handleChange}
          disabled={disabled}
          error={!!errors?.groupPrice}
          helperText={errors?.groupPrice || ''}
          sx={{ flexGrow: 1 }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Booking Link"
          name="bookingLink"
          value={formData.bookingLink || ''}
          onChange={handleChange}
          disabled={disabled}
          error={!!errors?.bookingLink}
          helperText={errors?.bookingLink || ''}
          sx={{ flexGrow: 2, flexBasis: { xs: '100%', md: '66%' } }}
        />
        <DatePicker
          label="Booking Cut-off Date"
          value={formData.bookingCutoffDate ? new Date(formData.bookingCutoffDate) : null}
          onChange={(date) => handleDateChange('bookingCutoffDate', date)}
          disabled={disabled}
          slotProps={{
            textField: {
              error: !!errors?.bookingCutoffDate,
              helperText: errors?.bookingCutoffDate || '',
            },
          }}
          sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '33%' } }}
        />
      </Box>

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Contact Information</Typography>
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
          sx={{ flexGrow: 1 }}
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
          sx={{ flexGrow: 1 }}
        />
      </Box>

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Hotel Amenities</Typography>
      <TextField
        fullWidth
        label="Hotel Amenities (one per line)"
        name="amenitiesPasted" // <-- Note the name
        value={(formData.amenities || []).join('\n')} // <-- Accessing formData.amenities
        onChange={handleChange}
        multiline
        rows={4}
        disabled={disabled}
        helperText="Enter each amenity on a new line. This will be saved as a list."
        sx={{ mb: 2 }}
      />

      {showLocationDetails && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Hotel Location Access</Typography>
          <TextField
            fullWidth
            label="Parking Information"
            name="parkingInfo"
            value={formData.parkingInfo || ''}
            onChange={handleChange}
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
            value={formData.publicTransportInfo || ''}
            onChange={handleChange}
            multiline
            rows={3}
            disabled={disabled}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Overall Accessibility Notes (Hotel Specific)"
            name="overallAccessibilityNotes"
            value={formData.overallAccessibilityNotes || ''}
            onChange={handleChange}
            multiline
            rows={3}
            disabled={disabled}
            sx={{ mb: 2 }}
          />
        </>
      )}

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Hotel Photo</Typography>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <ImageUploadInput
          label="Upload Hotel Photo"
          currentImageUrl={formData.photos && formData.photos.length > 0 ? formData.photos[0].url : null}
          onUploadComplete={handlePhotoUpload}
          onRemoveImage={handleRemovePhoto}
          disabled={disabled}
        />
        {/* Caption field only if photo exists */}
        {formData.photos && formData.photos.length > 0 && formData.photos[0].url && (
          <TextField
            fullWidth
            label="Photo Caption"
            value={formData.photos[0].caption || ''}
            onChange={handleCaptionChange}
            disabled={disabled}
            variant="outlined"
            size="small"
            sx={{ mt: 1 }}
          />
        )}
        {errors && (errors as any).photos && <Typography color="error" variant="caption">{(errors as any).photos}</Typography>}
      </Paper>

      {!isPrimaryHotel && (
        <Button variant="outlined" color="error" onClick={() => console.log('TODO: Remove this hotel')} sx={{ mt: 1 }}>
          Remove Hotel
        </Button>
      )}
    </Box>
  );
};

export default HotelForm; 