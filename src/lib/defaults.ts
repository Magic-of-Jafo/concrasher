/**
 * Default image utilities
 */

// Default profile image path - now using S3 bucket
export const DEFAULT_PROFILE_IMAGE_PATH = 'https://convention-crasher.s3.us-east-1.amazonaws.com/images/defaults/profile_default.png';

/**
 * Get profile image URL with fallback to default
 * @param profileImageUrl - The convention's profile image URL
 * @returns The profile image URL or default image path
 */
export function getProfileImageUrl(profileImageUrl: string | null | undefined): string {
    return profileImageUrl || DEFAULT_PROFILE_IMAGE_PATH;
}

/**
 * Check if using default profile image
 * @param profileImageUrl - The convention's profile image URL
 * @returns true if using default image
 */
export function isDefaultProfileImage(profileImageUrl: string | null | undefined): boolean {
    return !profileImageUrl;
}

/**
 * Convert local upload paths to S3 URLs
 * @param imageUrl - The image URL (could be local path or already S3 URL)
 * @returns The S3 URL if it's a local path, or the original URL if already S3
 */
export function getS3ImageUrl(imageUrl: string | null | undefined): string {
    if (!imageUrl) return DEFAULT_PROFILE_IMAGE_PATH;

    // If it's already an S3 URL, return as is
    if (imageUrl.startsWith('https://convention-crasher.s3.us-east-1.amazonaws.com/')) {
        return imageUrl;
    }

    // If it's a local upload path, convert to S3 URL
    if (imageUrl.startsWith('/uploads/')) {
        return `https://convention-crasher.s3.us-east-1.amazonaws.com${imageUrl}`;
    }

    // If it's a relative path to static images, convert to S3 URL
    if (imageUrl.startsWith('/images/')) {
        return `https://convention-crasher.s3.us-east-1.amazonaws.com${imageUrl}`;
    }

    // Return as is for other URLs (like external URLs)
    return imageUrl;
} 