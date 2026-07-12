// Single source of truth for the maximum image-upload size.
//
// The server downscales every image to 1600px on its longest edge and
// re-compresses (JPEG q82 / PNG) before storing to S3, so the STORED file is
// small no matter how large the source is. This cap only guards the inbound
// request, so it can be generous — raised from 5MB to 20MB so high-resolution
// sources (phone photos, print-res cover art) aren't rejected. sharp's default
// 268-megapixel input limit still protects against pathological dimensions.
export const MAX_UPLOAD_MB = 20;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
