import { Role } from '@prisma/client';

interface UserForDisplay {
  id: string;
  firstName: string | null;
  lastName: string | null;
  stageName: string | null;
  useStageNamePublicly?: boolean | null;
}

/**
 * Gets the display name for a user based on their preference settings
 */
export function getUserDisplayName(user: UserForDisplay): string {
  if (user.useStageNamePublicly && user.stageName) {
    return user.stageName;
  }

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || 'User';
}

/**
 * Gets the identifier to use in URLs for a user
 * Always uses the user ID for bulletproof, permanent URLs
 */
export function getUserUrlIdentifier(user: UserForDisplay): string {
  return user.id;
}

/**
 * Generates a public profile URL for a user
 */
export function getUserProfileUrl(user: UserForDisplay): string {
  const identifier = getUserUrlIdentifier(user);
  return `/u/${identifier}`;
}

/**
 * Formats role labels for display
 */
export function formatRoleLabel(role: Role): string {
  return role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Gets role color for Material-UI components
 */
export function getRoleColor(role: Role): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
  switch (role) {
    case Role.ADMIN: return 'secondary';
    case Role.ORGANIZER: return 'primary';
    case Role.TALENT: return 'success';
    case Role.BRAND_CREATOR: return 'info';
    default: return 'default';
  }
}

// Talent Profile URL functions

interface TalentProfileForUrl {
  id: string;
}

/**
 * Generates a public talent profile URL
 */
export function getTalentProfileUrl(talentProfile: TalentProfileForUrl): string {
  return `/t/${talentProfile.id}`;
} 