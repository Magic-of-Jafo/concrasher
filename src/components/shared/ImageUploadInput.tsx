import React, { useState, useCallback } from 'react';
import { Box, Button, CircularProgress, Typography, Alert, Card, CardMedia } from '@mui/material';
import { useDropzone } from 'react-dropzone';

interface ImageUploadInputProps {
  onUploadComplete: (url: string) => void;
  disabled?: boolean;
  currentImageUrl?: string | null;
  onRemoveImage?: () => void; // Callback for when an existing image is removed by this component
  label?: string; // e.g., "Upload Venue Photo"
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  onUploadComplete,
  disabled = false,
  currentImageUrl = null,
  onRemoveImage,
  label = 'Upload Image'
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl);

  React.useEffect(() => {
    // Sync preview with currentImageUrl prop
    setPreview(currentImageUrl);
  }, [currentImageUrl]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      return;
    }
    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);

    // Set preview immediately
    const newPreviewUrl = URL.createObjectURL(file);
    setPreview(newPreviewUrl);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }
      
      onUploadComplete(result.url); // Pass the backend-confirmed URL
      // Preview is already set, no need to set it again from result.url unless backend modifies it

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'An unexpected error occurred during upload.');
      // If upload failed, revert preview to original if one existed, or clear it
      setPreview(currentImageUrl);
      // Revoke object URL if it was set for the failed upload
      if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete, currentImageUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: false,
    disabled: disabled || uploading,
  });

  const handleRemove = async () => {
    const imageUrlToDelete = preview; // The current image URL being displayed
    setPreview(null);
    setError(null);

    if (onRemoveImage) {
      onRemoveImage(); // This will update the parent form state (e.g., set photos: [])
    }

    // If the image URL was one from the server (not a temporary local object URL)
    // and it seems like a relative path we manage, then try to delete it from the server.
    if (imageUrlToDelete && imageUrlToDelete.startsWith('/uploads/images/')) {
      try {
        setUploading(true); // Indicate activity
        const response = await fetch('/api/upload-image', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: imageUrlToDelete }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete image from server.');
        }
        console.log('Image deleted from server:', imageUrlToDelete);
      } catch (err: any) {
        console.error('Server delete error:', err);
        setError(err.message || 'Could not delete image from server.');
        // Optionally, if server delete fails, should we revert the UI? 
        // For now, the UI change (removing preview) is kept, 
        // and an error is shown. The parent form would have already cleared its state.
      } finally {
        setUploading(false);
      }
    }
  };

  if (preview) {
    return (
      <Box sx={{ mb: 2 }}>
        <Card sx={{ maxWidth: 345, mb: 1 }}>
          <CardMedia
            component="img"
            height="140"
            image={preview}
            alt="Uploaded image preview"
          />
        </Card>
        {!disabled && (
          <Button variant="outlined" color="error" onClick={handleRemove} disabled={uploading || disabled}>
            Remove Image
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed grey',
          borderRadius: 1,
          p: 2,
          textAlign: 'center',
          cursor: (disabled || uploading) ? 'not-allowed' : 'pointer',
          backgroundColor: isDragActive ? 'action.hover' : 'transparent',
          opacity: (disabled || uploading) ? 0.7 : 1,
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <CircularProgress size={24} />
        ) : isDragActive ? (
          <Typography>Drop the image here ...</Typography>
        ) : (
          <Typography>{label}</Typography>
        )}
      </Box>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  );
};

export default ImageUploadInput; 