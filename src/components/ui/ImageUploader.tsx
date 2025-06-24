import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Button, Typography, CircularProgress, Paper, Alert, Tooltip, IconButton } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useDropzone, FileWithPath } from 'react-dropzone';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageUploaderProps {
  label: string;
  onUploadSuccess: (imageUrl: string) => void;
  onUploadStart?: () => void;
  onUploadError?: (errorMessage: string) => void;
  onRemoveImageStart?: () => void;
  onRemoveImageError?: (errorMessage: string) => void;
  initialImageUrl?: string | null;
  recommendedWidth?: number;
  recommendedHeight?: number;
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: number;
  aspectRatioTolerance?: number;
  maxFileSizeMB?: number;
  dropzoneHeight?: string | number;
  imagePreviewStyle?: React.CSSProperties;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
  enableCropping?: boolean;
  cropAspect?: number;
  onCropComplete?: (croppedAreaPixels: PixelCrop | null) => void;
  uploadPathIdentifier?: string;
  finalImageTargetSize?: { width: number; height: number };
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  fileName: string,
  displayedImageElement: HTMLImageElement | null,
  targetWidth: number,
  targetHeight: number
): Promise<File | null> {
  return new Promise((resolve, reject) => {
    if (!displayedImageElement) {
      reject(new Error('Displayed image element reference is not available for scaling.'));
      return;
    }
    if (!(pixelCrop.width > 0 && pixelCrop.height > 0)) {
        reject(new Error('Crop dimensions must be greater than 0.'));
        return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      const scaleX = image.naturalWidth / displayedImageElement.width;
      const scaleY = image.naturalHeight / displayedImageElement.height;

      const sourceX = pixelCrop.x * scaleX;
      const sourceY = pixelCrop.y * scaleY;
      const sourceWidth = pixelCrop.width * scaleX;
      const sourceHeight = pixelCrop.height * scaleY;

      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );

      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      let determinedMimeType = 'image/jpeg';
      if (fileExtension === 'png') {
        determinedMimeType = 'image/png';
      }
      const newFileName = fileName.replace(/(\.[^./]+)$/, `_cropped_${targetWidth}x${targetHeight}$1`);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(new File([blob], newFileName, { type: determinedMimeType }));
      }, determinedMimeType, 0.9);
    };
    image.onerror = (error) => {
      reject(error);
    };
  });
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  onUploadSuccess,
  onUploadStart,
  onUploadError,
  onRemoveImageStart,
  onRemoveImageError,
  initialImageUrl,
  recommendedWidth,
  recommendedHeight,
  minWidth,
  minHeight,
  aspectRatio,
  aspectRatioTolerance = 0.05,
  maxFileSizeMB = 5,
  dropzoneHeight = 150,
  imagePreviewStyle,
  tooltipPlacement = 'top',
  enableCropping = false,
  cropAspect,
  onCropComplete,
  uploadPathIdentifier,
  finalImageTargetSize = { width: 500, height: 500 },
}) => {
  const [file, setFile] = useState<FileWithPath | null>(null);
  const [preview, setPreview] = useState<string | null>(initialImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensionError, setDimensionError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop | undefined>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | undefined>();

  useEffect(() => {
    setPreview(initialImageUrl || null);
    if (!initialImageUrl) {
        setFile(null);
        setCrop(undefined);
        setCompletedCrop(undefined);
        setUploadSuccessMessage(null);
        setError(null);
        setDimensionError(null);
        if (onCropComplete) {
          onCropComplete(null);
        }
    }
  }, [initialImageUrl, onCropComplete]);

  const handleImageValidation = (imageFile: File): Promise<{ valid: boolean; message?: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const { width, height } = img;
          let message = '';

          if (minWidth && width < minWidth) {
            message += `Image width (${width}px) is less than minimum required (${minWidth}px). `;
          }
          if (minHeight && height < minHeight) {
            message += `Image height (${height}px) is less than minimum required (${minHeight}px). `;
          }
          if (!enableCropping && aspectRatio && aspectRatioTolerance) {
            const currentRatio = width / height;
            if (Math.abs(currentRatio - aspectRatio) > aspectRatioTolerance * aspectRatio) {
              const idealRatioString = recommendedWidth && recommendedHeight ? `${recommendedWidth}:${recommendedHeight}` : `~${aspectRatio.toFixed(2)}`;
              message += `Image aspect ratio (${currentRatio.toFixed(2)}) deviates significantly from recommended (${idealRatioString}). `;
            }
          }
          resolve({ valid: !message, message: message.trim() || undefined });
        };
        img.onerror = () => {
          resolve({ valid: false, message: 'Could not load image to check dimensions.' });
        };
        if (e.target?.result) {
            img.src = e.target.result as string;
        } else {
            resolve({ valid: false, message: 'Could not read image data for dimension check.' });
        }
        
      };
      reader.onerror = () => {
         resolve({ valid: false, message: 'Could not read file to check dimensions.' });
      };
      reader.readAsDataURL(imageFile);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: FileWithPath[]) => {
    if (acceptedFiles.length === 0) return;
    const currentFile = acceptedFiles[0];
    setError(null);
    setDimensionError(null);
    setUploadSuccessMessage(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    if (onCropComplete) {
        onCropComplete(null);
    }

    const validationResult = await handleImageValidation(currentFile);
    if (!validationResult.valid) {
      setDimensionError(validationResult.message || 'Image dimensions are not suitable.');
      setFile(null);
      setPreview(initialImageUrl || null);
      return;
    }
    
    setFile(currentFile);
    setPreview(URL.createObjectURL(currentFile));
  }, [initialImageUrl, handleImageValidation, enableCropping, onCropComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif'] },
    maxSize: maxFileSizeMB * 1024 * 1024,
    multiple: false,
    onDropRejected: (fileRejections) => {
      const firstError = fileRejections[0]?.errors[0];
      if (firstError) {
        if (firstError.code === 'file-too-large') {
          setError(`File is larger than ${maxFileSizeMB}MB.`);
        } else if (firstError.code === 'file-invalid-type') {
          setError('Invalid file type. Please upload an image (png, jpg, jpeg, gif).');
        } else {
          setError(firstError.message);
        }
      }
      setFile(null);
      setPreview(initialImageUrl || null);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setUploadSuccessMessage(null);
      if (onCropComplete) {
        onCropComplete(null);
      }
    },
  });

  const handleUpload = async () => {
    if (!file && !initialImageUrl) {
        setError('No image selected to upload.');
        return;
    }

    setIsUploading(true);
    setError(null);
    setDimensionError(null);
    setUploadSuccessMessage(null);
    if(onUploadStart) onUploadStart();

    let fileToUpload: File | null = file;

    if (enableCropping && completedCrop && (completedCrop.width > 0 && completedCrop.height > 0)) {
      if (preview && imgRef.current) {
        try {
          const originalFileName = file ? file.name : 'cropped_image.png';
          fileToUpload = await getCroppedImg(
            preview,
            completedCrop,
            originalFileName,
            imgRef.current,
            finalImageTargetSize.width,
            finalImageTargetSize.height
          );
        } catch (cropError: any) {
          setError(`Cropping failed: ${cropError.message}`);
          setIsUploading(false);
          if(onUploadError) onUploadError(`Cropping failed: ${cropError.message}`);
          return;
        }
      } else {
        setError('Cannot crop, preview image source or image reference is missing.');
        setIsUploading(false);
        if(onUploadError) onUploadError('Cannot crop, preview image source or image reference is missing.');
        return;
      }
    }

    if (!fileToUpload) {
        setError('No valid image file to upload after processing.');
        setIsUploading(false);
        if(onUploadError) onUploadError('No valid image file to upload after processing.');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    
    if (uploadPathIdentifier) {
      formData.append('pathIdentifier', uploadPathIdentifier);
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed with status: ' + response.status }));
        throw new Error(errorData.message || 'Upload failed');
      }
      const data = await response.json();
      onUploadSuccess(data.url);
      setPreview(data.url);
      setFile(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setUploadSuccessMessage('Image uploaded successfully!');
      setTimeout(() => setUploadSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during upload.');
      if(onUploadError) onUploadError(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    setError(null);
    setDimensionError(null);
    setUploadSuccessMessage(null);

    const imageUrlToRemove = preview;

    if (imageUrlToRemove && (initialImageUrl === imageUrlToRemove || file === null)) {
      setIsRemoving(true);
      if (onRemoveImageStart) onRemoveImageStart();
      try {
        const response = await fetch('/api/upload', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl: imageUrlToRemove }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to delete image from server.' }));
          throw new Error(errorData.message || 'Server deletion failed');
        }
        setFile(null);
        setPreview(null);
        setCrop(undefined);
        setCompletedCrop(undefined);
        onUploadSuccess('');
      } catch (err: any) {
        setError(err.message || 'An error occurred while removing the image.');
        if (onRemoveImageError) onRemoveImageError(err.message || 'An error occurred while removing the image.');
      } finally {
        setIsRemoving(false);
      }
    } else {
      setFile(null);
      setPreview(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
      onUploadSuccess('');
    }
  };

  const defaultPreviewStyle: React.CSSProperties = {
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'contain',
    borderRadius: '4px',
    ...imagePreviewStyle,
  };
  
  const effectiveDropzoneHeight = (preview && !enableCropping) ? 'auto' : dropzoneHeight;

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (cropAspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, cropAspect));
    }
  }
  
  const generateTooltipTitle = () => {
    let messages = [];
    if (recommendedWidth && recommendedHeight) {
      messages.push(`Recommended: ${recommendedWidth}x${recommendedHeight}px`);
    }
    if (minWidth && minHeight) {
      messages.push(`Minimum: ${minWidth}x${minHeight}px`);
    }
    const ar = enableCropping ? cropAspect : aspectRatio;
    if (ar) {
        if (recommendedWidth && recommendedHeight && ar === recommendedWidth/recommendedHeight) {
             messages.push(`Ideal Aspect Ratio: ${recommendedWidth}:${recommendedHeight}`);
        } else {
            messages.push(`Ideal Aspect Ratio: ~${ar.toFixed(2)}:1`);
            if (ar === 1) messages.push("(Square)");
            else if (ar === 16/9) messages.push("(16:9 Landscape)");
            else if (ar === 4/3) messages.push("(4:3 Standard)");
        }
    }
    if (maxFileSizeMB) {
      messages.push(`Max file size: ${maxFileSizeMB}MB`);
    }
    if (enableCropping) {
        messages.push(`Output: ${finalImageTargetSize.width}x${finalImageTargetSize.height}px`);
    }
    return messages.length > 0 ? messages.join(' | ') : 'Image specifications';
  };

  const finalPreviewStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    maxHeight: `${finalImageTargetSize.height}px`,
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    borderRadius: '4px',
    ...defaultPreviewStyle,
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, maxWidth: enableCropping ? '100%' : undefined }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ mb: 0 }}>{label}</Typography>
        {(recommendedWidth || minWidth || (enableCropping ? cropAspect : aspectRatio) || maxFileSizeMB || (enableCropping && finalImageTargetSize)) && (
            <Tooltip title={generateTooltipTitle()} placement={tooltipPlacement}>
                <IconButton size="small" sx={{ ml: 0.5, mb: 0.5 }} aria-label="image specifications">
                    <HelpOutlineIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        )}
      </Box>
      {(!file && preview && !enableCropping) ? null : (
         (!preview || enableCropping || !file) && (
            <Box
            {...getRootProps()}
            sx={{
                border: `2px dashed ${isDragActive ? 'primary.main' : 'grey.400'}`,
                borderRadius: 1,
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                minHeight: (preview && enableCropping && file) ? 'auto' : effectiveDropzoneHeight, 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDragActive ? 'action.hover' : 'transparent',
                mb: 1,
                transition: 'background-color 0.2s ease-in-out, border-color 0.2s ease-in-out',
            }}
            >
            <input {...getInputProps()} />
            {isDragActive ? (
                <Typography>Drop the image here...</Typography>
            ) : (preview && enableCropping && file) ? (
                <Typography color="textSecondary" variant="body2">
                Drag & drop to change image, or click to select.
                </Typography>
            ) : !preview ? (
                <Typography color="textSecondary" variant="body2">
                Drag & drop an image here, or click to select.
                <br />Max {maxFileSizeMB}MB.
                </Typography>
            ) : null}
            </Box>
        )
      )}
      
      {preview && (
        <Box sx={{
          mt: 1,
          mb: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          width: '100%', 
          minHeight: 300, 
        }}>
          {(enableCropping && file) ? (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)} 
              onComplete={(c) => {
                setCompletedCrop(c);
                if (onCropComplete) {
                  onCropComplete(c);
                }
              }}
              aspect={cropAspect}
              style={{ maxWidth: 500 }} 
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={preview} 
                onLoad={onImageLoad}
                style={{ 
                  display: 'block', 
                  maxWidth: '100%', 
                  maxHeight: '500px',
                  objectFit: 'contain', 
                }} 
              />
            </ReactCrop>
          ) : (
            <Box sx={{ width: '100%', display:'flex', justifyContent:'center', alignItems:'center' }}>
              <img 
                src={preview} 
                alt="Preview" 
                style={finalPreviewStyle}
              />
            </Box>
          )}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      {dimensionError && <Alert severity="warning" sx={{ mb: 1 }}>{dimensionError}</Alert>}
      {uploadSuccessMessage && <Alert severity="success" sx={{ mb: 1 }}>{uploadSuccessMessage}</Alert>}

      {(file || preview) && (
        <Box sx={{ display: 'flex', justifyContent: file ? 'space-between' : 'flex-end' , alignItems: 'center', mt:1 }}>
          {file && !isUploading && !isRemoving && (
            <Button variant="contained" onClick={handleUpload} size="small">
              Upload Image 
            </Button>
          )}
           {(isUploading || isRemoving) && <CircularProgress size={24} />}
          {preview && !isUploading && (
            <Button variant="outlined" color="secondary" onClick={handleRemoveImage} size="small" disabled={isRemoving}>
              {isRemoving ? 'Removing...' : 'Remove Image'}
            </Button>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default ImageUploader; 