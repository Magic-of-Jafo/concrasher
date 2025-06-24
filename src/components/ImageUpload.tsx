'use client';

import { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Paper,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { uploadImage } from '@/lib/upload';

interface ImageUploadProps {
  value?: string | string[];
  onChange: (url: string | string[]) => void;
  onError?: (error: string) => void;
  label?: string;
  multiple?: boolean;
  maxFiles?: number;
  accept?: string;
}

export default function ImageUpload({
  value,
  onChange,
  onError,
  label = 'Upload Image',
  multiple = false,
  maxFiles = 1,
  accept = 'image/*',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (files.length > maxFiles) {
      onError?.(`Please select at most ${maxFiles} file(s)`);
      return;
    }

    try {
      setIsUploading(true);
      setProgress(0);

      if (multiple) {
        const urls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const url = await uploadImage(files[i], (p) => {
            setProgress((p * (i + 1)) / files.length);
          });
          urls.push(url);
        }
        const current: string[] = Array.isArray(value) ? value.filter(Boolean) : [];
        const merged = [...current, ...urls].filter((u) => !!u && typeof u === 'string');
        onChange(merged);
      } else {
        const url = await uploadImage(files[0], setProgress);
        onChange(url);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (removeUrl?: string) => {
    if (multiple && removeUrl) {
      const arr = Array.isArray(value) ? value.filter((u) => u !== removeUrl && !!u) : [];
      onChange(arr);
      // If the image is a local upload, delete it from the server
      if (removeUrl.startsWith('/uploads/')) {
        const key = removeUrl.split('/').pop();
        try {
          const response = await fetch('/api/upload', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key }),
          });
          if (!response.ok) {
            console.error('Failed to delete image from server:', await response.text());
          }
        } catch (error) {
          console.error('Error deleting image:', error);
        }
      }
    } else {
      onChange('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box>
      <label htmlFor={label.replace(/\s+/g, '-').toLowerCase() + '-input'} style={{ display: 'none' }}>{label}</label>
      <input
        id={label.replace(/\s+/g, '-').toLowerCase() + '-input'}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        ref={fileInputRef}
        data-testid={label.toLowerCase().includes('gallery') ? 'gallery-upload-input' : 'banner-upload-input'}
      />

      {multiple ? (
        Array.isArray(value) && value.filter((u) => !!u && typeof u === 'string').length > 0 ? (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {value.filter((u) => !!u && typeof u === 'string').map((url) => (
              <Box key={url} sx={{ position: 'relative', width: 'fit-content' }}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <img
                    src={url}
                    alt="Preview"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '200px',
                      objectFit: 'contain',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemove(url)}
                    disabled={isUploading}
                    sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Paper>
              </Box>
            ))}
          </Box>
        ) : (
          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUploadIcon />}
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {label}
          </Button>
        )
      ) : (
        value ? (
          <Box sx={{ position: 'relative', width: 'fit-content' }}>
            <Paper
              elevation={2}
              sx={{
                p: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <img
                src={value as string}
                alt="Preview"
                style={{
                  maxWidth: '200px',
                  maxHeight: '200px',
                  objectFit: 'contain',
                }}
              />
              <IconButton
                size="small"
                onClick={() => handleRemove()}
                disabled={isUploading}
                sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
              >
                <DeleteIcon />
              </IconButton>
            </Paper>
          </Box>
        ) : (
          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUploadIcon />}
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {label}
          </Button>
        )
      )}

      {isUploading && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress variant="determinate" value={progress} size={20} />
          <Typography variant="body2" color="text.secondary">
            Uploading... {Math.round(progress)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
} 