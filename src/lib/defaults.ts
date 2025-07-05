/**
 * Default image utilities
 */

// Default profile image path
export const DEFAULT_PROFILE_IMAGE_PATH = '/images/defaults/profile_default.png';

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