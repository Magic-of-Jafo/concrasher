import { z } from 'zod';

export const ImageUploadResponseSchema = z.object({
  url: z.string(),
  key: z.string(),
});

export type ImageUploadResponse = z.infer<typeof ImageUploadResponseSchema>;

export const ImageUploadErrorSchema = z.object({
  message: z.string(),
  details: z.string().optional(),
  timestamp: z.string().optional(),
});

export type ImageUploadError = z.infer<typeof ImageUploadErrorSchema>;

export async function uploadImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Upload error:', errorData);
      throw new Error(errorData.details || errorData.message || 'Upload failed');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(error instanceof Error ? error.message : 'Upload failed');
  }
} 