"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Correctly import authOptions
import { db } from "@/lib/db"; // Ensure db is imported
import { setEventTalent, findClaimCandidates, claimTalent, findOrCreateUnclaimedTalent, type ClaimCandidate } from "@/lib/talent";
import { memberStrength, gateStatus, TALENT_APPLY_REQUIREMENTS } from "@/lib/profile-strength";
import { PROMO_PHOTO_LIMIT, resolveTalentCardImage, billingSort, type ResolvedTalentCardImage } from "@/lib/talent-cards";
import { ProfileSchema, type ProfileSchemaInput } from "./validators";
import { revalidatePath } from "next/cache";
import { Role, RequestedRole, ApplicationStatus, User, Convention, ScheduleDay, ConventionScheduleItem, ConventionType, MediaType } from "@prisma/client"; // Added import
import { Prisma } from '@prisma/client'; // For types if needed
import {
  ConventionScheduleItemCreateSchema,
  ConventionScheduleItemUpdateSchema,
  ScheduleEventFeeTierSchema,
  type ConventionScheduleItemCreateInput,
  type ConventionScheduleItemUpdateInput,
  type ScheduleEventFeeTierInput,
  BrandCreateSchema,
  type BrandCreateInput,
  BrandUpdateSchema,
  type BrandUpdateInput,
  ConventionMediaSchema,
  type ConventionMediaData,
  ConventionSettingSchema,
  type ConventionSettingData,
} from './validators';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Configure S3 Client for deletion
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

// ... existing code ...

export async function createBrand(data: BrandCreateInput): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: any;
  brand?: any; // Consider defining a proper brand type
}> {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }

  // Authorization check: User must have an approved BRAND_CREATOR application or be an ADMIN
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  });

  if (!user?.roles.includes(Role.ADMIN)) {
    const approvedBrandCreatorApplication = await db.roleApplication.findFirst({
      where: {
        userId: session.user.id,
        requestedRole: RequestedRole.BRAND_CREATOR,
        status: ApplicationStatus.APPROVED,
      }
    });
    if (!approvedBrandCreatorApplication) {
      return { success: false, error: "Authorization failed: You must have an approved Brand Creator application to perform this action." };
    }
  }

  const validatedData = BrandCreateSchema.safeParse(data);

  if (!validatedData.success) {
    return {
      success: false,
      error: "Invalid data provided.",
      fieldErrors: validatedData.error.flatten().fieldErrors,
    };
  }

  try {
    const newBrand = await db.$transaction(async (prisma) => {
      const brand = await prisma.brand.create({
        data: {
          name: validatedData.data.name,
          description: validatedData.data.description,
          logoUrl: validatedData.data.logoUrl,
          websiteUrl: validatedData.data.websiteUrl,
          ownerId: session.user.id, // Direct link to the owner user
        },
      });

      await prisma.brandUser.create({
        data: {
          brandId: brand.id,
          userId: session.user.id,
          role: 'OWNER', // Assign the user as the owner
        },
      });

      return brand;
    });

    revalidatePath("/profile"); // Revalidate profile to show brand-related info
    // Also revalidate any pages where brands are listed

    return {
      success: true,
      message: "Brand created successfully!",
      brand: newBrand,
    };

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, error: 'A brand with this name already exists.' };
    }
    console.error("Error creating brand:", error);
    return {
      success: false,
      error: "An unexpected error occurred while creating the brand.",
    };
  }
}

export async function getUserBrands(userId: string): Promise<{
  success: boolean;
  brands?: any[];
  error?: string;
}> {
  "use server";

  try {
    const brands = await db.brand.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId: userId
              }
            }
          }
        ]
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      success: true,
      brands
    };
  } catch (error) {
    console.error("Error fetching user brands:", error);
    return {
      success: false,
      error: "Failed to fetch brands."
    };
  }
}

export async function deleteBrand(brandId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }

  try {
    const brand = await db.brand.findUnique({
      where: { id: brandId },
      include: {
        members: true
      }
    });

    if (!brand) {
      return { success: false, error: "Brand not found." };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    const isOwner = brand.ownerId === session.user.id;
    const isAdmin = user?.roles.includes(Role.ADMIN) ?? false;

    if (!isOwner && !isAdmin) {
      return { success: false, error: "Authorization failed. You are not the owner of this brand." };
    }

    // Delete the brand (this will cascade delete brand members)
    await db.brand.delete({
      where: { id: brandId }
    });

    revalidatePath("/profile");

    return {
      success: true,
      message: "Brand deleted successfully!"
    };

  } catch (error) {
    console.error("Error deleting brand:", error);
    return {
      success: false,
      error: "An unexpected error occurred while deleting the brand."
    };
  }
}

export async function updateBrand(data: BrandUpdateInput): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: any;
}> {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }

  const validatedData = BrandUpdateSchema.safeParse(data);

  if (!validatedData.success) {
    return {
      success: false,
      error: "Invalid data provided.",
      fieldErrors: validatedData.error.flatten().fieldErrors,
    };
  }

  const { id, ...updateData } = validatedData.data;

  try {
    const brand = await db.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      return { success: false, error: "Brand not found." };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    const isOwner = brand.ownerId === session.user.id;
    const isAdmin = user?.roles.includes(Role.ADMIN) ?? false;

    if (!isOwner && !isAdmin) {
      return { success: false, error: "Authorization failed. You are not the owner of this brand." };
    }

    await db.brand.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/profile");
    revalidatePath(`/brands/${id}/edit`);

    return {
      success: true,
      message: "Brand updated successfully!",
    };

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, error: 'A brand with this name already exists.' };
    }
    console.error("Error updating brand:", error);
    return {
      success: false,
      error: "An unexpected error occurred while updating the brand.",
    };
  }
}

export async function updateUserProfile(data: ProfileSchemaInput) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required. Please log in.",
        fieldErrors: null,
      };
    }

    const validatedData = ProfileSchema.safeParse(data);

    if (!validatedData.success) {
      return {
        success: false,
        error: "Invalid input.",
        fieldErrors: validatedData.error.flatten().fieldErrors,
      };
    }

    // Ensure users can only update their own profile
    // The prisma update query uses session.user.id in the where clause,
    // which inherently enforces this.

    // Home base changed? Re-geocode so distance sorting stays truthful. The
    // lookup is best-effort: a miss clears stale coordinates rather than
    // leaving them pointing at the previous city.
    const before = await db.user.findUnique({
      where: { id: session.user.id },
      select: { homeCity: true, homeStateName: true, homeStateAbbreviation: true, homeCountry: true, homeLatitude: true },
    });
    const d = validatedData.data;
    const homeChanged =
      before?.homeCity !== d.homeCity ||
      before?.homeStateName !== d.homeStateName ||
      before?.homeStateAbbreviation !== d.homeStateAbbreviation ||
      before?.homeCountry !== d.homeCountry;
    let homeCoords: { homeLatitude: number | null; homeLongitude: number | null } | {} = {};
    if (homeChanged || (d.homeCity && before?.homeLatitude == null)) {
      const { geocodePlace } = await import("@/lib/geocode");
      const hit = await geocodePlace({
        city: d.homeCity,
        state: d.homeStateName || d.homeStateAbbreviation,
        country: d.homeCountry,
      });
      homeCoords = { homeLatitude: hit?.latitude ?? null, homeLongitude: hit?.longitude ?? null };
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        firstName: validatedData.data.firstName,
        lastName: validatedData.data.lastName,
        stageName: validatedData.data.stageName,
        bio: validatedData.data.bio,
        useStageNamePublicly: validatedData.data.useStageNamePublicly,
        homeCity: validatedData.data.homeCity,
        homeStateName: validatedData.data.homeStateName,
        homeStateAbbreviation: validatedData.data.homeStateAbbreviation,
        homeCountry: validatedData.data.homeCountry,
        ...homeCoords,
      },
    });

    revalidatePath("/profile");

    return {
      success: true,
      message: "Profile updated successfully.",
      user: { // Return relevant parts of the updated user, excluding sensitive data
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        stageName: user.stageName,
        email: user.email,
        bio: user.bio,
        image: user.image,
        homeCity: user.homeCity,
        homeStateName: user.homeStateName,
        homeStateAbbreviation: user.homeStateAbbreviation,
        homeCountry: user.homeCountry,
      }
    };
  } catch (error) {
    console.error("Error updating profile:", error);
    // Consider more specific error handling or logging here
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
      fieldErrors: null,
    };
  }
}

export async function updateUserProfileImage(imageUrl: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
    });
    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile image:', error);
    return { success: false, message: 'Failed to update profile image.' };
  }
}

export async function clearUserProfileImage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  try {
    // First, find the user to get the current image URL
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    const imageUrl = user?.image;

    // If there's an image, delete it from S3
    if (imageUrl) {
      try {
        const url = new URL(imageUrl);
        const s3Key = url.pathname.substring(1); // Remove leading '/'

        if (s3Key) {
          console.log(`[clearUserProfileImage] Deleting ${s3Key} from S3.`);
          const deleteCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
          });
          await s3Client.send(deleteCommand);
        }
      } catch (s3Error) {
        // Log the S3 error but don't block the profile update
        console.error(`Failed to delete profile image from S3: ${imageUrl}`, s3Error);
      }
    }

    // Then, update the database
    await db.user.update({
      where: { id: session.user.id },
      data: { image: null },
    });

    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    console.error('Error clearing user profile image:', error);
    return { success: false, message: 'Failed to update database.' };
  }
}

export async function requestRoles(roles: RequestedRole[]): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  applicationStatus?: ApplicationStatus;
}> {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      success: false,
      error: "Authentication required. Please log in.",
    };
  }

  const userId = session.user.id;

  if (!roles || roles.length === 0) {
    return { success: false, error: "No roles specified for application." };
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    const existingApplications = await db.roleApplication.findMany({
      where: {
        userId: userId,
        requestedRole: { in: roles },
        status: ApplicationStatus.PENDING,
      },
    });

    const rolesToCreate: RequestedRole[] = [];

    for (const role of roles) {
      // Check if user already has the role
      const roleEnum = Role[role as keyof typeof Role]; // Convert string to enum
      if (user?.roles.includes(roleEnum)) {
        console.log(`User already has role: ${role}`);
        continue; // Skip if they already have the role
      }

      // Check if there is a pending application for this role
      if (existingApplications.some(app => app.requestedRole === role)) {
        console.log(`User already has a pending application for: ${role}`);
        continue; // Skip if pending application exists
      }

      rolesToCreate.push(role);
    }

    if (rolesToCreate.length === 0) {
      return {
        success: false,
        error: "You either already have the requested role(s) or an application is already pending.",
        applicationStatus: ApplicationStatus.PENDING, // Or reflect the most relevant status
      };
    }

    // Create the role applications
    await db.roleApplication.createMany({
      data: rolesToCreate.map(role => ({
        userId: userId,
        requestedRole: role,
        status: ApplicationStatus.PENDING,
      })),
    });

    revalidatePath("/profile"); // Or the relevant profile page path

    return {
      success: true,
      message: `Your application for the following role(s) has been submitted successfully: ${rolesToCreate.join(', ')}.`,
      applicationStatus: ApplicationStatus.PENDING,
    };
  } catch (error) {
    console.error("Error applying for roles:", error);
    return {
      success: false,
      error: "An unexpected error occurred while submitting your application. Please try again.",
    };
  }
}

export async function activateTalentRole(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  roles?: Role[];
}> {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      success: false,
      error: "Authentication required. Please log in.",
    };
  }

  const userId = session.user.id;

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (!user) {
      // Should not happen if session is valid
      return { success: false, error: "User not found." };
    }

    if (user.roles.includes(Role.TALENT)) {
      return {
        success: false,
        error: "Talent role is already active.",
        roles: user.roles,
      };
    }

    const updatedRoles = [...user.roles, Role.TALENT];

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        roles: updatedRoles,
      },
      select: { roles: true }, // Select roles to return updated roles
    });

    revalidatePath("/profile"); // Or the relevant profile page path

    return {
      success: true,
      message: "Talent role has been activated successfully!",
      roles: updatedUser.roles,
    };
  } catch (error) {
    console.error("Error activating Talent role:", error);
    return {
      success: false,
      error: "An unexpected error occurred while activating the Talent role. Please try again.",
    };
  }
}

export async function deactivateTalentRole(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  roles?: Role[];
}> {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      success: false,
      error: "Authentication required. Please log in.",
    };
  }

  const userId = session.user.id;

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (!user) {
      return { success: false, error: "User not found." };
    }

    if (!user.roles.includes(Role.TALENT)) {
      return {
        success: false,
        error: "Talent role is not active, cannot deactivate.",
        roles: user.roles,
      };
    }

    // Remove TALENT role
    const updatedRoles = user.roles.filter(role => role !== Role.TALENT);

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        roles: updatedRoles,
      },
      select: { roles: true },
    });

    revalidatePath("/profile");

    return {
      success: true,
      message: "Talent role has been deactivated successfully.",
      roles: updatedUser.roles,
    };
  } catch (error) {
    console.error("Error deactivating Talent role:", error);
    return {
      success: false,
      error: "An unexpected error occurred while deactivating the Talent role. Please try again.",
    };
  }
}

export async function activateTalentProfile(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  isActive?: boolean;
}> {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      success: false,
      error: "Authentication required. Please log in.",
    };
  }

  const userId = session.user.id;

  try {
    let talentProfile = await db.talentProfile.findUnique({
      where: { userId },
      select: { isActive: true },
    });

    // If no talent profile exists, create one
    if (!talentProfile) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, stageName: true, useStageNamePublicly: true, image: true, bio: true },
      });

      // Gate: require the profile essentials (photo, name, bio) before going
      // public as talent. Concrete checklist, not an opaque threshold.
      const gate = gateStatus(
        memberStrength({
          image: user?.image,
          firstName: user?.firstName,
          lastName: user?.lastName,
          stageName: user?.stageName,
          bio: user?.bio,
        }),
        TALENT_APPLY_REQUIREMENTS,
      );
      if (!gate.met) {
        return {
          success: false,
          error: `Finish your profile first — you still need to: ${gate.missing.map((m) => m.label.toLowerCase()).join(', ')}.`,
        };
      }

      // Claim-first: if a scraped, unclaimed profile exactly matches this user's
      // name, claim it instead of creating a duplicate (schedule links and
      // appearances come with it). Fuzzy matches are NOT auto-claimed here — they
      // could be a different person; the "Is this you?" nudge confirms those.
      const names = [
        [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim(),
        (user?.stageName || '').trim(),
      ].filter(Boolean);
      for (const name of names) {
        const exact = (await findClaimCandidates(name)).find((c) => !c.fuzzy);
        if (exact) {
          const claimed = await claimTalent(userId, exact.id);
          if (claimed.ok) {
            await db.talentProfile.update({ where: { id: exact.id }, data: { isActive: true } });
            revalidatePath("/profile");
            revalidatePath(`/t/${exact.id}`);
            return {
              success: true,
              message: `Claimed your existing profile "${exact.displayName}" — its listings came with it.`,
              isActive: true,
            };
          }
        }
      }

      // Leave displayName blank as requested instead of defaulting to "Talent"
      const displayName = '';

      talentProfile = await db.talentProfile.create({
        data: {
          userId,
          displayName,
          tagline: '',
          bio: '',
          profilePictureUrl: '',
          websiteUrl: '',
          contactEmail: '',
          skills: [],
          isActive: true,
        },
        select: { isActive: true },
      });

      revalidatePath("/profile");

      return {
        success: true,
        message: "Talent profile has been created and activated successfully!",
        isActive: talentProfile.isActive,
      };
    }

    if (talentProfile.isActive) {
      return {
        success: false,
        error: "Talent profile is already active.",
        isActive: talentProfile.isActive,
      };
    }

    const updatedProfile = await db.talentProfile.update({
      where: { userId },
      data: { isActive: true },
      select: { id: true, isActive: true },
    });

    revalidatePath("/profile");
    // The public page caches (revalidate = 3600); bust it so the profile
    // reappears immediately.
    revalidatePath(`/t/${updatedProfile.id}`);

    return {
      success: true,
      message: "Talent profile has been activated successfully!",
      isActive: updatedProfile.isActive,
    };
  } catch (error) {
    console.error("Error activating talent profile:", error);
    return {
      success: false,
      error: "An unexpected error occurred while activating the talent profile. Please try again.",
    };
  }
}

export async function deactivateTalentProfile(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  isActive?: boolean;
}> {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      success: false,
      error: "Authentication required. Please log in.",
    };
  }

  const userId = session.user.id;

  try {
    const talentProfile = await db.talentProfile.findUnique({
      where: { userId },
      select: { isActive: true },
    });

    if (!talentProfile) {
      return {
        success: false,
        error: "Talent profile not found.",
      };
    }

    if (!talentProfile.isActive) {
      return {
        success: false,
        error: "Talent profile is already inactive.",
        isActive: talentProfile.isActive,
      };
    }

    const updatedProfile = await db.talentProfile.update({
      where: { userId },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });

    revalidatePath("/profile");
    // The public page caches (revalidate = 3600); bust it so the profile is
    // hidden immediately, not up to an hour later.
    revalidatePath(`/t/${updatedProfile.id}`);

    return {
      success: true,
      message: "Talent profile has been deactivated successfully!",
      isActive: updatedProfile.isActive,
    };
  } catch (error) {
    console.error("Error deactivating talent profile:", error);
    return {
      success: false,
      error: "An unexpected error occurred while deactivating the talent profile. Please try again.",
    };
  }
}

export async function searchProfiles(
  query: string,
  profileType: 'USER' | 'BRAND'
): Promise<{ id: string; name: string | null; }[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    // Return empty or throw error if user is not authenticated
    return [];
  }

  if (!query || query.trim().length < 2) {
    return []; // Don't search for very short queries
  }

  try {
    if (profileType === 'USER') {
      const users = await db.user.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { stageName: { contains: query, mode: 'insensitive' } },
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          stageName: true,
        },
        take: 10, // Limit results
      });
      return users.map(user => ({
        id: user.id,
        name: user.stageName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      }));
    } else if (profileType === 'BRAND') {
      const brands = await db.brand.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
        },
        take: 10,
      });
      return brands;
    }

    return [];
  } catch (error) {
    console.error(`Error searching profiles for type ${profileType}:`, error);
    return []; // Return empty array on error
  }
}

export async function searchBrands(
  query: string
): Promise<{ id: string; name: string | null; profileType: 'BRAND' }[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return [];
  }

  if (!query || query.trim().length < 3) {
    return []; // Don't search for very short queries (3 chars minimum for autocomplete)
  }

  try {
    const brands = await db.brand.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
      },
      take: 10, // Show up to 10 brand results
      orderBy: {
        name: 'asc', // Sort alphabetically for better UX
      },
    });

    // Add profile type to each result
    return brands.map(brand => ({ ...brand, profileType: 'BRAND' as const }));
  } catch (error) {
    console.error('Error searching brands:', error);
    return [];
  }
}

export async function addDealerLink(
  conventionId: string,
  linkedProfileId: string,
  profileType: 'USER' | 'BRAND',
  overrides?: { displayNameOverride?: string; descriptionOverride?: string; }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required.' };
  }

  try {
    // Authorization check: User must be an organizer of the convention's series.
    const convention = await db.convention.findUnique({
      where: { id: conventionId },
      select: { series: { select: { organizerUserId: true } } },
    });

    if (convention?.series?.organizerUserId !== session.user.id) {
      return { success: false, error: 'You are not authorized to edit this convention.' };
    }

    // Get the highest order value for existing links to append the new one
    const lastDealerLink = await db.conventionDealerLink.findFirst({
      where: { conventionId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newOrder = (lastDealerLink?.order ?? 0) + 1;

    const newDealerLink = await db.conventionDealerLink.create({
      data: {
        conventionId,
        linkedProfileId,
        profileType,
        displayNameOverride: overrides?.displayNameOverride,
        descriptionOverride: overrides?.descriptionOverride,
        order: newOrder,
      },
    });

    revalidatePath(`/organizer/conventions/${conventionId}/edit`); // Revalidate the editor page

    return { success: true, data: newDealerLink };

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // The .code property can be accessed in a type-safe way
      if (error.code === 'P2002') {
        return { success: false, error: 'This profile is already linked as a dealer for this convention.' };
      }
    }
    console.error('Error adding dealer link:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function updateDealerLink(
  dealerLinkId: string,
  overrides: { displayNameOverride?: string; descriptionOverride?: string; }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required.' };
  }

  try {
    // Authorization check
    const dealerLink = await db.conventionDealerLink.findUnique({
      where: { id: dealerLinkId },
      select: {
        convention: {
          select: { id: true, series: { select: { organizerUserId: true } } }
        }
      }
    });

    if (!dealerLink || dealerLink.convention.series?.organizerUserId !== session.user.id) {
      return { success: false, error: 'You are not authorized to edit this link.' };
    }

    const updatedDealerLink = await db.conventionDealerLink.update({
      where: { id: dealerLinkId },
      data: {
        displayNameOverride: overrides.displayNameOverride,
        descriptionOverride: overrides.descriptionOverride,
      },
    });

    revalidatePath(`/organizer/conventions/${dealerLink.convention.id}/edit`);

    return { success: true, data: updatedDealerLink };

  } catch (error) {
    console.error('Error updating dealer link:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function removeDealerLink(dealerLinkId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required.' };
  }

  try {
    // Authorization check
    const dealerLink = await db.conventionDealerLink.findUnique({
      where: { id: dealerLinkId },
      select: {
        convention: {
          select: { id: true, series: { select: { organizerUserId: true } } }
        }
      }
    });

    if (!dealerLink || dealerLink.convention.series?.organizerUserId !== session.user.id) {
      return { success: false, error: 'You are not authorized to remove this link.' };
    }

    await db.conventionDealerLink.delete({
      where: { id: dealerLinkId },
    });

    revalidatePath(`/organizer/conventions/${dealerLink.convention.id}/edit`);

    return { success: true };

  } catch (error) {
    console.error('Error removing dealer link:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function getDealerLinks(conventionId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required.', data: [] };
  }

  try {
    const dealerLinks = await db.conventionDealerLink.findMany({
      where: { conventionId },
      orderBy: { order: 'asc' },
    });

    // Enhance dealer links with profile information
    const enhancedDealerLinks = await Promise.all(
      dealerLinks.map(async (link) => {
        let profile: { id: string; name: string | null } | null = null;
        if (link.profileType === 'USER') {
          const userProfile = await db.user.findUnique({
            where: { id: link.linkedProfileId },
            select: { id: true, firstName: true, lastName: true, stageName: true },
          });
          if (userProfile) {
            profile = {
              id: userProfile.id,
              name: userProfile.stageName || `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()
            };
          }
        } else if (link.profileType === 'BRAND') {
          profile = await db.brand.findUnique({
            where: { id: link.linkedProfileId },
            select: { id: true, name: true },
          });
        }
        return { ...link, profile };
      })
    );

    return { success: true, data: enhancedDealerLinks };
  } catch (error) {
    console.error('Error fetching dealer links:', error);
    return { success: false, error: 'An unexpected error occurred.', data: [] };
  }
}

export async function reviewOrganizerApplication(
  applicationId: string,
  newStatus: typeof ApplicationStatus.APPROVED | typeof ApplicationStatus.REJECTED
): Promise<{ success: boolean; message: string }> {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as User & { roles: Role[] }).roles?.includes(Role.ADMIN)) {
    return { success: false, message: 'Unauthorized: Admin role required.' };
  }

  try {
    const application = await db.roleApplication.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    if (application.requestedRole !== RequestedRole.ORGANIZER) {
      return { success: false, message: 'This action is only for ORGANIZER role applications.' };
    }

    if (application.status !== ApplicationStatus.PENDING) {
      return { success: false, message: `Application is not in PENDING state (current: ${application.status}).` };
    }

    if (newStatus === ApplicationStatus.APPROVED) {
      await db.$transaction(async (prisma) => {
        await prisma.user.update({
          where: { id: application.userId },
          data: {
            roles: {
              // Prisma's way to add an enum to an array if it doesn't exist
              // This ensures the user gets the ORGANIZER role.
              // A more robust way for arrays if order/uniqueness is complex:
              // fetch roles, add new role, make unique, then set.
              // For simple enum addition, push should work if the DB/Prisma handles uniqueness
              // or if we manually ensure it. Prisma's `set` is safer for replacing the array.
              set: Array.from(new Set([...application.user.roles, Role.ORGANIZER])),
            },
          },
        });
        await prisma.roleApplication.update({
          where: { id: applicationId },
          data: { status: ApplicationStatus.APPROVED },
        });
      });
      revalidatePath('/profile'); // Admin panel lives at /profile?tab=admin
      revalidatePath('/admin/applications'); // Or specific applications page
      return { success: true, message: 'Application approved successfully.' };
    } else if (newStatus === ApplicationStatus.REJECTED) {
      await db.roleApplication.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.REJECTED },
      });
      revalidatePath('/profile'); // Admin panel lives at /profile?tab=admin
      revalidatePath('/admin/applications'); // Or specific applications page
      return { success: true, message: 'Application rejected successfully.' };
    } else {
      // Should not happen due to TypeScript types, but good for runtime safety
      return { success: false, message: 'Invalid status provided.' };
    }
  } catch (error) {
    console.error('Error reviewing application:', error);
    return { success: false, message: 'An error occurred while processing the application.' };
  }
}

export async function getPendingOrganizerApplicationsAction(): Promise<{
  success: boolean;
  applications?: any[]; // Adjust type to be serializable, e.g., RoleApplicationWithUserClient from the page
  error?: string;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as User & { roles: Role[] }).roles?.includes(Role.ADMIN)) {
    return { success: false, error: 'Unauthorized: Admin role required.' };
  }

  try {
    const applications = await db.roleApplication.findMany({
      where: {
        status: ApplicationStatus.PENDING,
        requestedRole: RequestedRole.ORGANIZER,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            stageName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Ensure dates are stringified for client component
    const serializableApplications = applications.map(app => {
      const userWithName = {
        ...app.user,
        name: app.user.stageName || `${app.user.firstName || ''} ${app.user.lastName || ''}`.trim()
      };
      return {
        ...app,
        user: userWithName,
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString(),
      };
    });

    return { success: true, applications: serializableApplications };
  } catch (error) {
    console.error('Error fetching pending organizer applications:', error);
    return { success: false, error: 'Failed to fetch applications.' };
  }
}

// --- Convention Schedule CRUD Actions ---

export async function createScheduleItem(input: {
  conventionId: string;
  scheduleDayId?: string | null; // Now optional
  data: ConventionScheduleItemCreateInput;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }

  // TODO: Authorization check needs to be fixed in a separate story.
  // The logic to link a convention organizer to the convention itself
  // is not straightforward in the current schema.

  const validatedData = ConventionScheduleItemCreateSchema.safeParse(input.data);

  if (!validatedData.success) {
    return {
      success: false,
      error: "Invalid input.",
      fieldErrors: validatedData.error.flatten().fieldErrors,
    };
  }

  // hasFee is not a column on the model (only in the Zod schema) — drop it.
  const { feeTiers, hasFee, ...itemData } = validatedData.data;

  try {
    const newItem = await db.conventionScheduleItem.create({
      data: {
        ...itemData,
        eventType: itemData.eventType || 'Other',
        conventionId: input.conventionId,
        scheduleDayId: input.scheduleDayId, // Can be null for unscheduled events
        // Ensure fee tiers are created if provided
        feeTiers: feeTiers && feeTiers.length > 0
          ? {
            create: feeTiers.map(tier => ({
              label: tier.label,
              amount: tier.amount,
            })),
          }
          : undefined,
      },
      include: {
        feeTiers: true, // Include fee tiers in the returned object
      },
    });

    // Persist performers (talent tagging). `talent` is stripped by the Zod
    // schema, so read it from the raw input; setEventTalent matches/creates
    // unclaimed profiles and links them to the event + convention.
    const talent = (input.data as any)?.talent;
    if (Array.isArray(talent)) {
      await setEventTalent(newItem.id, input.conventionId, talent);
    }

    const itemWithRelations = await db.conventionScheduleItem.findUniqueOrThrow({
      where: { id: newItem.id },
      include: {
        feeTiers: true,
        talentLinks: {
          include: { talentProfile: { select: { id: true, displayName: true, userId: true } } },
          orderBy: { order: 'asc' },
        },
      },
    });

    revalidatePath(`/organizer/conventions/${input.conventionId}/edit`);
    return { success: true, item: itemWithRelations };
  } catch (error: any) {
    console.error("FULL ERROR when creating schedule item:", error);
    return { success: false, error: `Database error: ${error.message}` };
  }
}

export async function updateScheduleItem(input: {
  conventionId: string; // For revalidation and auth
  data: ConventionScheduleItemUpdateInput;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }

  // TODO: Authorization check needs to be fixed in a separate story.
  // The logic to link a convention organizer to the convention itself
  // is not straightforward in the current schema.

  const validatedData = ConventionScheduleItemUpdateSchema.safeParse(input.data);
  if (!validatedData.success) {
    return {
      success: false,
      error: "Invalid input.",
      fieldErrors: validatedData.error.flatten().fieldErrors,
    };
  }

  // venueId/scheduleDayId must be written through their relations (Prisma
  // rejects the scalar FK on this update input); hasFee is not a column on the
  // model (only in the Zod schema). Pull all three out of the scalar spread.
  const { id, feeTiers, venueId, scheduleDayId, hasFee, ...itemData } = validatedData.data;
  if (!id) {
    return { success: false, error: "Item ID is required for updates." };
  }

  try {
    const updatedItem = await db.$transaction(async (tx) => {
      // 1. Update the main schedule item details
      const item = await tx.conventionScheduleItem.update({
        where: { id },
        data: {
          ...itemData,
          ...(scheduleDayId !== undefined
            ? { scheduleDay: scheduleDayId === null ? { disconnect: true } : { connect: { id: scheduleDayId } } }
            : {}),
          ...(venueId !== undefined
            ? { venue: venueId === null ? { disconnect: true } : { connect: { id: venueId } } }
            : {}),
        },
      });

      // 2. Handle fee tiers
      if (feeTiers) {
        // Get existing fee tiers for comparison
        const existingTiers = await tx.scheduleEventFeeTier.findMany({
          where: { scheduleItemId: id },
        });
        const existingTierIds = existingTiers.map(t => t.id);
        const incomingTierIds = feeTiers.map(t => t.id).filter(Boolean);

        // Tiers to delete: exist in DB but not in submission
        const tiersToDelete = existingTierIds.filter(existingId => !incomingTierIds.includes(existingId));
        if (tiersToDelete.length > 0) {
          await tx.scheduleEventFeeTier.deleteMany({
            where: { id: { in: tiersToDelete } },
          });
        }

        // Tiers to update or create
        for (const tierData of feeTiers) {
          if (tierData.id && existingTierIds.includes(tierData.id)) {
            // Update existing tier
            await tx.scheduleEventFeeTier.update({
              where: { id: tierData.id },
              data: { label: tierData.label, amount: tierData.amount },
            });
          } else {
            // Create new tier
            await tx.scheduleEventFeeTier.create({
              data: {
                scheduleItemId: id,
                label: tierData.label,
                amount: tierData.amount,
              },
            });
          }
        }
      }

      // 3. Refetch the updated item with its tiers for the return value
      const finalItem = await tx.conventionScheduleItem.findUniqueOrThrow({
        where: { id },
        include: { feeTiers: true },
      });

      return finalItem;
    });

    // Persist performers (talent tagging). `talent` is stripped by the Zod
    // schema, so read it from the raw input. Runs outside the transaction.
    const talent = (input.data as any)?.talent;
    if (Array.isArray(talent)) {
      await setEventTalent(id, input.conventionId, talent);
    }

    const itemWithRelations = await db.conventionScheduleItem.findUniqueOrThrow({
      where: { id },
      include: {
        feeTiers: true,
        talentLinks: {
          include: { talentProfile: { select: { id: true, displayName: true, userId: true } } },
          orderBy: { order: 'asc' },
        },
      },
    });

    revalidatePath(`/organizer/conventions/${input.conventionId}/edit`);
    return { success: true, item: itemWithRelations };

  } catch (error: any) {
    console.error("Failed to update schedule item:", error);
    return { success: false, error: `Database error: ${error.message}` };
  }
}

export async function deleteScheduleItem(id: string, conventionId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required.' };
  }
  try {
    // Find item to get conventionId for revalidation
    const item = await db.conventionScheduleItem.findUnique({ where: { id } });
    if (!item) return { success: false, error: 'Schedule item not found.' };
    await db.scheduleEventFeeTier.deleteMany({ where: { scheduleItemId: id } });
    await db.conventionScheduleItem.delete({ where: { id } });
    revalidatePath(`/organizer/conventions/${conventionId}/edit`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting schedule item:', error);
    return { success: false, error: 'Failed to delete schedule item.' };
  }
}

export async function getScheduleItemsByConvention(conventionId: string) {
  // If running in the browser, fetch from the API route
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/conventions/${conventionId}/schedule-items`);
      const data = await res.json();
      return data;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch schedule items.' };
    }
  }
  // If running on the server, use direct db access
  try {
    const items = await db.conventionScheduleItem.findMany({
      where: { conventionId },
      include: {
        feeTiers: true,
        talentLinks: {
          include: { talentProfile: { select: { id: true, displayName: true, userId: true } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [
        { dayOffset: 'asc' },
        { startTimeMinutes: 'asc' }
      ],
    });
    return { success: true, items };
  } catch (error) {
    console.error('Error fetching schedule items:', error);
    return { success: false, error: 'Failed to fetch schedule items.' };
  }
}

/**
 * Initialize schedule days for a convention: create a ScheduleDay for each day from startDate to endDate (inclusive).
 * Each gets a sequential dayOffset (0, 1, ...), isOfficial: true, and a label (e.g., 'Day 1').
 */
export async function initializeScheduleDays(conventionId: string) {
  try {
    const convention = await db.convention.findUnique({
      where: { id: conventionId },
      select: { startDate: true, endDate: true },
    });
    if (!convention || !convention.startDate || !convention.endDate) {
      return { success: false, error: 'Convention start and end dates are required.' };
    }
    const start = new Date(convention.startDate);
    const end = new Date(convention.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return { success: false, error: 'Invalid convention dates.' };
    }
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const createdDays = [];
    for (let i = 0; i < days; i++) {
      const label = `Day ${i + 1}`; // Default label for official days
      const day = await db.scheduleDay.create({
        data: {
          conventionId,
          dayOffset: i,
          isOfficial: true,
          label,
        },
      });
      createdDays.push(day);
    }
    return { success: true, days: createdDays };
  } catch (error) {
    console.error('Error initializing schedule days:', error);
    return { success: false, error: 'Failed to initialize schedule days.' };
  }
}

export async function addScheduleDay(conventionId: string, dayOffset: number) {
  "use server";
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required." };
    }

    const existingDay = await db.scheduleDay.findFirst({
      where: {
        conventionId: conventionId,
        dayOffset: dayOffset,
      },
    });

    if (existingDay) {
      return { success: false, error: `Day with offset ${dayOffset} already exists for this convention.` };
    }

    let defaultLabel = `Day ${dayOffset + 1}`;
    if (dayOffset < 0) {
      defaultLabel = `Pre-Con Day ${Math.abs(dayOffset)}`;
    } else if (dayOffset === 0 && !existingDay) {
      defaultLabel = "Day 1 (Added)";
    }

    const newScheduleDay = await db.scheduleDay.create({
      data: {
        conventionId: conventionId,
        dayOffset: dayOffset,
        isOfficial: false,
        label: defaultLabel,
      },
    });

    revalidatePath(`/organizer/conventions/edit/${conventionId}/schedule`);
    revalidatePath('/'); // Revalidate front page

    return { success: true, day: newScheduleDay };

  } catch (error) {
    console.error("Error adding schedule day:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: "Database error occurred while adding day." };
    }
    return { success: false, error: "An unexpected error occurred while adding the schedule day." };
  }
}

export async function deleteScheduleDay(conventionId: string, scheduleDayId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }

  try {
    // Verify user is an organizer for this convention
    const convention = await db.convention.findUnique({
      where: { id: conventionId },
      select: {
        series: {
          select: {
            organizerUserId: true
          }
        }
      },
    });

    if (!convention) {
      return { success: false, error: "Convention not found." };
    }
    if (!convention.series || !convention.series.organizerUserId) {
      return { success: false, error: "Convention series information or organizer ID is missing. Cannot verify permissions." };
    }

    const isOrganizer = convention.series.organizerUserId === session.user.id;

    if (!isOrganizer) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { roles: true },
      });
      if (!user?.roles.includes(Role.ADMIN)) {
        return { success: false, error: "Permission denied. You are not authorized to modify this convention's schedule." };
      }
    }

    const scheduleDayToDelete = await db.scheduleDay.findUnique({
      where: { id: scheduleDayId, conventionId: conventionId },
    });

    if (!scheduleDayToDelete) {
      return { success: false, error: "Schedule day not found for this convention." };
    }

    if (scheduleDayToDelete.isOfficial) {
      return { success: false, error: "Cannot delete an official convention day. Only manually added (non-official) days can be deleted." };
    }

    const targetDayOffset = scheduleDayToDelete.dayOffset;

    await db.$transaction(async (prisma) => {
      console.log(`[Transaction deleteScheduleDay] Starting for scheduleDayId: ${scheduleDayId}, targetDayOffset: ${targetDayOffset}`);
      const itemsToUnschedule = await prisma.conventionScheduleItem.findMany({
        where: {
          conventionId: conventionId,
          dayOffset: targetDayOffset
        },
        select: { id: true, title: true },
      });
      console.log(`[Transaction deleteScheduleDay] Found ${itemsToUnschedule.length} items to unschedule based on dayOffset ${targetDayOffset}:`, itemsToUnschedule.map(i => `${i.id} (${i.title})`));
      if (itemsToUnschedule.length > 0) {
        try {
          const updateResult = await prisma.conventionScheduleItem.updateMany({
            where: {
              id: { in: itemsToUnschedule.map(item => item.id) },
            },
            data: {
              dayOffset: null,
              startTimeMinutes: null,
              durationMinutes: null,
              scheduleDayId: null,
            },
          });
          console.log(`[Transaction deleteScheduleDay] conventionScheduleItem.updateMany result:`, updateResult);
        } catch (updateError) {
          console.error(`[Transaction deleteScheduleDay] Error during conventionScheduleItem.updateMany:`, updateError);
          throw updateError;
        }
      }
      try {
        console.log(`[Transaction deleteScheduleDay] Attempting to delete ScheduleDay record with id: ${scheduleDayId}`);
        const deleteDayResult = await prisma.scheduleDay.delete({
          where: { id: scheduleDayId },
        });
        console.log(`[Transaction deleteScheduleDay] ScheduleDay.delete result:`, deleteDayResult);
      } catch (deleteError) {
        console.error(`[Transaction deleteScheduleDay] Error during ScheduleDay.delete:`, deleteError);
        throw deleteError;
      }
      console.log(`[Transaction deleteScheduleDay] Completed successfully for scheduleDayId: ${scheduleDayId}`);
    });

    revalidatePath(`/organizer/conventions/edit/${conventionId}/schedule`);
    revalidatePath('/'); // Revalidate front page
    return { success: true, message: "Schedule day and its associated events have been successfully processed." };

  } catch (error) {
    console.error("Error deleting schedule day:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: `Database error: ${error.message}` };
    }
    return { success: false, error: "An unexpected error occurred while deleting the schedule day." };
  }
}

export async function approveRoleApplication(applicationId: string): Promise<{ success: boolean; error?: string }> {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  if (!session.user.roles || !session.user.roles.includes(Role.ADMIN)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const application = await db.roleApplication.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!application) {
      return { success: false, error: "Application not found." };
    }

    // If the request is for ORGANIZER, grant the role.
    if (application.requestedRole === RequestedRole.ORGANIZER) {
      const user = application.user;
      if (!user.roles.includes(Role.ORGANIZER)) {
        await db.user.update({
          where: { id: user.id },
          data: {
            roles: {
              push: Role.ORGANIZER,
            },
          },
        });
      }
    }

    // For all cases, update the application status to APPROVED.
    await db.roleApplication.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.APPROVED },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error approving role application:", error);
    return { success: false, error: "Failed to approve application." };
  }
}

export async function rejectRoleApplication(applicationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    });

    if (!user?.roles.includes(Role.ADMIN)) {
      return { success: false, error: "Insufficient permissions" };
    }

    await db.roleApplication.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.REJECTED },
    });

    revalidatePath('/admin/applications');
    return { success: true };

  } catch (error) {
    console.error('Error rejecting role application:', error);
    return { success: false, error: "Failed to reject application" };
  }
}

export async function updateConventionMedia(
  conventionId: string,
  mediaData: ConventionMediaData[]
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: any;
}> {
  "use server";

  // console.log('[updateConventionMedia] Called with conventionId:', conventionId);
  // console.log('[updateConventionMedia] Media data count:', mediaData.length);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required." };
    }

    // Verify user has permission to edit this convention
    const convention = await db.convention.findUnique({
      where: { id: conventionId },
      include: {
        series: {
          select: { organizerUserId: true }
        }
      }
    });

    if (!convention) {
      return { success: false, error: "Convention not found." };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    });

    const isAdmin = user?.roles.includes(Role.ADMIN);
    const isOrganizer = convention.series?.organizerUserId === session.user.id;

    if (!isAdmin && !isOrganizer) {
      return { success: false, error: "Authorization failed. You don't have permission to edit this convention." };
    }

    // Normalize order (assign index when missing) BEFORE validation
    const mediaDataWithOrder = mediaData.map((m, idx) => ({ ...m, order: m.order ?? idx }));

    // Validate media data
    const validatedMediaData: ConventionMediaData[] = [];
    for (let idx = 0; idx < mediaDataWithOrder.length; idx++) {
      const media = mediaDataWithOrder[idx];
      const validationResult = ConventionMediaSchema.safeParse(media);
      if (!validationResult.success) {
        console.error(`[updateConventionMedia] Validation failed for media item ${idx}:`, validationResult.error);
        console.error(`[updateConventionMedia] Detailed validation issues:`, validationResult.error.issues);
        console.error(`[updateConventionMedia] Failed media item:`, media);
        return {
          success: false,
          error: "Invalid media data provided.",
          fieldErrors: validationResult.error.flatten().fieldErrors,
        };
      }
      validatedMediaData.push(validationResult.data);
    }

    // Update media in transaction
    await db.$transaction(async (tx) => {
      // Determine which media items to delete from S3 and the database
      const existingMedia = await tx.conventionMedia.findMany({
        where: { conventionId },
      });

      const newMediaUrls = new Set(mediaData.map(m => m.url));
      const mediaToDelete = existingMedia.filter(m => !newMediaUrls.has(m.url));

      if (mediaToDelete.length > 0) {
        // Delete from S3
        for (const media of mediaToDelete) {
          try {
            // Extract the key from the full S3 URL
            const url = new URL(media.url);
            const s3Key = url.pathname.substring(1); // Remove leading '/'

            if (s3Key) {
              const deleteCommand = new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: s3Key,
              });
              await s3Client.send(deleteCommand);
              console.log(`[updateConventionMedia] Deleted ${s3Key} from S3.`);
            }
          } catch (s3Error) {
            // Log the error but don't block the database update
            console.error(`[updateConventionMedia] Failed to delete ${media.url} from S3:`, s3Error);
          }
        }

        // Delete from database
        await tx.conventionMedia.deleteMany({
          where: {
            id: {
              in: mediaToDelete.map(m => m.id),
            },
          },
        });
      }

      // Upsert the new/updated media data
      for (const media of mediaData) {
        const validationResult = ConventionMediaSchema.safeParse(media);
        if (!validationResult.success) {
          console.error(`[updateConventionMedia] Validation failed for media item during upsert:`, validationResult.error);
          console.error(`[updateConventionMedia] Detailed validation issues:`, validationResult.error.issues);
          console.error(`[updateConventionMedia] Failed media item:`, media);
          return {
            success: false,
            error: "Invalid media data provided.",
            fieldErrors: validationResult.error.flatten().fieldErrors,
          };
        }
        const validatedMedia = validationResult.data;

        // Check if media with the same URL already exists
        const existingMediaWithSameUrl = await tx.conventionMedia.findFirst({
          where: {
            conventionId,
            url: validatedMedia.url,
          },
        });

        if (existingMediaWithSameUrl) {
          // Update existing media
          await tx.conventionMedia.update({
            where: { id: existingMediaWithSameUrl.id },
            data: {
              type: validatedMedia.type,
              caption: validatedMedia.caption || null,
              order: validatedMedia.order,
            },
          });
        } else {
          // Create new media
          await tx.conventionMedia.create({
            data: {
              conventionId,
              type: validatedMedia.type,
              url: validatedMedia.url,
              caption: validatedMedia.caption || null,
              order: validatedMedia.order,
            },
          });
        }
      }
    });

    revalidatePath(`/organizer/conventions/${conventionId}/edit`);
    revalidatePath('/'); // Revalidate front page
    return {
      success: true,
      message: "Media updated successfully!",
    };

  } catch (error) {
    console.error("Error updating convention media:", error);
    return {
      success: false,
      error: "An unexpected error occurred while updating media.",
    };
  }
}

export async function updateConventionImages(
  conventionId: string,
  coverImageUrl?: string,
  profileImageUrl?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  "use server";

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required." };
    }

    // Verify user has permission to edit this convention
    const convention = await db.convention.findUnique({
      where: { id: conventionId },
      include: {
        series: {
          select: { organizerUserId: true }
        }
      }
    });

    if (!convention) {
      return { success: false, error: "Convention not found." };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    });

    const isAdmin = user?.roles.includes(Role.ADMIN);
    const isOrganizer = convention.series?.organizerUserId === session.user.id;

    if (!isAdmin && !isOrganizer) {
      return { success: false, error: "Authorization failed. You don't have permission to edit this convention." };
    }

    // Update the convention's cover and profile image URLs
    const updateData: { coverImageUrl?: string | null; profileImageUrl?: string | null } = {};

    if (coverImageUrl !== undefined) {
      updateData.coverImageUrl = coverImageUrl || null;
    }

    if (profileImageUrl !== undefined) {
      updateData.profileImageUrl = profileImageUrl || null;
    }

    await db.convention.update({
      where: { id: conventionId },
      data: updateData
    });

    revalidatePath(`/organizer/conventions/${conventionId}/edit`);
    revalidatePath('/'); // Revalidate front page
    return {
      success: true,
      message: "Convention images updated successfully!",
    };

  } catch (error) {
    console.error("Error updating convention images:", error);
    return {
      success: false,
      error: "An unexpected error occurred while updating images.",
    };
  }
}

export async function updateConventionSettings(
  conventionId: string,
  settings: ConventionSettingData
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: any;
}> {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }

  console.log('[updateConventionSettings] Input settings:', settings);

  const validatedData = ConventionSettingSchema.safeParse(settings);
  console.log('[updateConventionSettings] Validation result:', validatedData.success);

  if (!validatedData.success) {
    console.error('[updateConventionSettings] Validation failed:', validatedData.error);
    return {
      success: false,
      error: "Invalid data provided.",
      fieldErrors: validatedData.error.flatten().fieldErrors,
    };
  }

  try {
    // Check if user has permission to update this convention
    console.log('[updateConventionSettings] Checking convention:', conventionId);

    const convention = await db.convention.findUnique({
      where: { id: conventionId },
      select: {
        id: true,
        series: {
          select: { organizerUserId: true }
        }
      },
    });

    console.log('[updateConventionSettings] Convention found:', !!convention);
    console.log('[updateConventionSettings] Convention series organizer:', convention?.series?.organizerUserId);

    if (!convention) {
      return { success: false, error: "Convention not found." };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    const isOrganizer = convention.series?.organizerUserId === session.user.id;
    const isAdmin = user?.roles.includes(Role.ADMIN) ?? false;

    console.log('[updateConventionSettings] User ID:', session.user.id);
    console.log('[updateConventionSettings] Is organizer:', isOrganizer);
    console.log('[updateConventionSettings] Is admin:', isAdmin);

    if (!isOrganizer && !isAdmin) {
      return { success: false, error: "Authorization failed. You are not authorized to update this convention." };
    }

    // Validate timezone ID if provided
    let timezoneId = validatedData.data.timezone;
    if (timezoneId) {
      const timezone = await db.timezone.findUnique({
        where: { id: timezoneId },
        select: { id: true, ianaId: true }
      });

      if (!timezone) {
        console.error('[updateConventionSettings] Invalid timezone ID:', timezoneId);
        return {
          success: false,
          error: "Invalid timezone selected.",
          fieldErrors: { timezone: ["Invalid timezone selected"] }
        };
      }

      console.log('[updateConventionSettings] Validated timezone:', timezone);
    }

    // Update Convention with timezone foreign key. Only touch the timezone
    // when it was actually provided, so partial saves (e.g. the Pricing tab
    // sending only baseChannelLabel) don't wipe it.
    console.log('[updateConventionSettings] Updating Convention with timezone foreign key');
    console.log('[updateConventionSettings] Data to save:', validatedData.data);

    if (settings.timezone !== undefined) {
      await db.convention.update({
        where: { id: conventionId },
        data: {
          timezoneId: timezoneId || null,
          updatedAt: new Date(),
        },
      });
      console.log('[updateConventionSettings] Convention timezone updated successfully');
    }

    // Pricing-tab settings (ConventionSetting key/value).
    const tabSettings: Array<[string, string | undefined]> = [
      ['baseChannelLabel', validatedData.data.baseChannelLabel],
      ['channelOrder', validatedData.data.channelOrder],
      ['channelsSameProduct', validatedData.data.channelsSameProduct],
      ['secondaryChannelLabel', validatedData.data.secondaryChannelLabel],
    ];
    for (const [key, value] of tabSettings) {
      if (value === undefined) continue;
      await db.conventionSetting.upsert({
        where: { conventionId_key: { conventionId, key } },
        update: { value, updatedAt: new Date() },
        create: { conventionId, key, value },
      });
    }

    // Also handle ConventionSetting for currency (if needed in the future)
    if (validatedData.data.currency) {
      const currencyRecord = await db.currency.findUnique({
        where: { code: validatedData.data.currency },
      });

      if (!currencyRecord) {
        return { success: false, error: 'Invalid currency code provided.' };
      }

      await db.conventionSetting.upsert({
        where: {
          conventionId_key: {
            conventionId: conventionId,
            key: 'currency'
          }
        },
        update: {
          value: validatedData.data.currency,
          currencyId: currencyRecord.id,
          updatedAt: new Date(),
        },
        create: {
          conventionId: conventionId,
          key: 'currency',
          value: validatedData.data.currency,
          currencyId: currencyRecord.id,
        },
      });
    }

    revalidatePath(`/organizer/conventions/${conventionId}/edit`);
    revalidatePath('/'); // Revalidate front page

    return {
      success: true,
      message: "Convention settings updated successfully!",
    };

  } catch (error) {
    console.error("Error updating convention settings:", error);
    return {
      success: false,
      error: "An unexpected error occurred while updating convention settings.",
    };
  }
}

/**
 * Fill the convention's timezone and currency Settings from a locale the
 * venue helper inferred from the venue's address. Strictly fill-only: a value
 * the organizer (or a previous run) already set is never overwritten, so this
 * is safe to call on every helper apply.
 *
 * Returns what was actually set so the UI can tell the organizer.
 */
export async function applyDetectedConventionLocale(
  conventionId: string,
  locale: { timezone?: string | null; currency?: string | null },
  // Per-field organizer opt-in to replace a value that is already set (the
  // helper dialog shows a checkbox when Settings aren't blank). Without it,
  // existing values are never touched.
  overwrite?: { timezone?: boolean; currency?: boolean }
): Promise<{ success: boolean; error?: string; timezoneSet?: string; timezoneSetId?: string; currencySet?: string }> {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }

  try {
    const convention = await db.convention.findUnique({
      where: { id: conventionId },
      select: { id: true, timezoneId: true, series: { select: { organizerUserId: true } } },
    });
    if (!convention) return { success: false, error: "Convention not found." };

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    const isOrganizer = convention.series?.organizerUserId === session.user.id;
    const isAdmin = user?.roles.includes(Role.ADMIN) ?? false;
    if (!isOrganizer && !isAdmin) {
      return { success: false, error: "You are not authorized to update this convention." };
    }

    const result: { success: boolean; timezoneSet?: string; timezoneSetId?: string; currencySet?: string } = { success: true };

    // Timezone: resolve the IANA id against the seeded Timezone table (same
    // matching the enrichment agent uses). Set when currently unset, or when
    // the organizer explicitly opted to replace the existing value.
    const iana = (locale.timezone || "").trim();
    if (iana && (!convention.timezoneId || overwrite?.timezone)) {
      const tz = await db.timezone.findFirst({
        where: { OR: [{ ianaId: iana }, { utcAliases: { has: iana } }] },
        select: { id: true, ianaId: true },
      });
      if (tz && tz.id !== convention.timezoneId) {
        await db.convention.update({
          where: { id: conventionId },
          data: { timezoneId: tz.id, updatedAt: new Date() },
        });
        result.timezoneSet = tz.ianaId;
        result.timezoneSetId = tz.id;
      }
    }

    // Currency: validate against the Currency table. Set when the convention
    // has no currency setting yet, or when the organizer opted to replace it.
    const code = (locale.currency || "").trim().toUpperCase();
    if (code) {
      const existing = await db.conventionSetting.findUnique({
        where: { conventionId_key: { conventionId, key: "currency" } },
        select: { value: true },
      });
      if ((!existing?.value || overwrite?.currency) && existing?.value !== code) {
        const currencyRecord = await db.currency.findUnique({ where: { code } });
        if (currencyRecord) {
          await db.conventionSetting.upsert({
            where: { conventionId_key: { conventionId, key: "currency" } },
            update: { value: code, currencyId: currencyRecord.id, updatedAt: new Date() },
            create: { conventionId, key: "currency", value: code, currencyId: currencyRecord.id },
          });
          result.currencySet = code;
        }
      }
    }

    if (result.timezoneSet || result.currencySet) {
      revalidatePath(`/organizer/conventions/${conventionId}/edit`);
    }
    return result;
  } catch (error) {
    console.error("[applyDetectedConventionLocale] Error:", error);
    return { success: false, error: "Could not apply the detected locale." };
  }
}

/**
 * Save the admin-curated front-page majors strip: an ordered list of
 * {label, series} slots. Admin only. An empty list clears the setting and
 * returns the strip to its built-in name-matching defaults.
 */
export async function saveMajorsSlots(
  slots: { id: string; label: string; seriesId: string }[]
): Promise<{ success: boolean; error?: string }> {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Authentication required." };
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!(user?.roles.includes(Role.ADMIN) ?? false)) {
    return { success: false, error: "Admin access required." };
  }

  const { MAJORS_SETTING_KEY, MAJORS_MAX_SLOTS } = await import("@/lib/majors");

  try {
    const cleaned = (Array.isArray(slots) ? slots : [])
      .map((s) => ({
        id: String(s?.id || "").trim(),
        label: String(s?.label || "").trim(),
        seriesId: String(s?.seriesId || "").trim(),
      }))
      .filter((s) => s.id && s.seriesId)
      .slice(0, MAJORS_MAX_SLOTS);

    // Every slot must point at a real series; a stale id would render a
    // permanently empty card.
    const seriesIds = cleaned.map((s) => s.seriesId);
    const found = await db.conventionSeries.findMany({
      where: { id: { in: seriesIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(found.map((s) => [s.id, s.name]));
    if (found.length !== new Set(seriesIds).size) {
      return { success: false, error: "One of the selected series no longer exists." };
    }

    // Blank label falls back to the series name so a card never renders empty.
    const finalSlots = cleaned.map((s) => ({ ...s, label: s.label || nameById.get(s.seriesId) || "" }));

    if (finalSlots.length === 0) {
      await db.siteSetting.deleteMany({ where: { key: MAJORS_SETTING_KEY } });
    } else {
      const value = JSON.stringify(finalSlots);
      await db.siteSetting.upsert({
        where: { key: MAJORS_SETTING_KEY },
        update: { value },
        create: { key: MAJORS_SETTING_KEY, value },
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/conventions");
    return { success: true };
  } catch (error) {
    console.error("[saveMajorsSlots] Error:", error);
    return { success: false, error: "Could not save the majors cards." };
  }
}

export async function getConventionSettings(
  conventionId: string
): Promise<ConventionSettingData | null> {
  "use server";

  try {
    // Load convention with timezone relationship
    const convention = await db.convention.findUnique({
      where: { id: conventionId },
      select: {
        timezoneId: true,
        timezone: {
          select: {
            id: true,
            ianaId: true,
            value: true
          }
        }
      },
    });

    if (!convention) {
      return null;
    }

    // Load currency from ConventionSetting
    const currencySetting = await db.conventionSetting.findUnique({
      where: {
        conventionId_key: {
          conventionId: conventionId,
          key: 'currency'
        }
      },
      select: { value: true }
    });

    const tabSettingRows = await db.conventionSetting.findMany({
      where: { conventionId, key: { in: ['baseChannelLabel', 'channelOrder', 'channelsSameProduct', 'secondaryChannelLabel'] } },
      select: { key: true, value: true },
    });
    const tabSettings = Object.fromEntries(tabSettingRows.map((r) => [r.key, r.value]));

    const settingsData: ConventionSettingData = {
      currency: currencySetting?.value || '',
      timezone: convention.timezoneId || '',
      baseChannelLabel: tabSettings.baseChannelLabel || '',
      channelOrder: tabSettings.channelOrder || '',
      channelsSameProduct: tabSettings.channelsSameProduct || '',
      secondaryChannelLabel: tabSettings.secondaryChannelLabel || '',
    };

    console.log('[getConventionSettings] Loaded settings:', settingsData);
    console.log('[getConventionSettings] Timezone info:', convention.timezone);

    return settingsData;
  } catch (error) {
    console.error("Error loading convention settings:", error);
    return null;
  }
}

export async function deleteConvention(conventionId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }

  try {
    const convention = await db.convention.findUnique({
      where: { id: conventionId },
      select: {
        series: {
          select: {
            organizerUserId: true,
          },
        },
      },
    });

    if (!convention) {
      return { success: false, error: "Convention not found." };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { roles: true } });
    const isOwner = convention.series?.organizerUserId === session.user.id;
    const isAdmin = user?.roles.includes(Role.ADMIN) ?? false;

    if (!isOwner && !isAdmin) {
      return { success: false, error: "Authorization failed. You do not have permission to delete this convention." };
    }

    await db.convention.delete({
      where: { id: conventionId },
    });

    revalidatePath('/profile');
    revalidatePath('/conventions'); // Revalidate public listing
    revalidatePath('/'); // Revalidate front page

    return {
      success: true,
      message: 'Convention has been permanently deleted.',
    };

  } catch (error) {
    console.error("Error deleting convention:", error);
    // Using a property check instead of `instanceof` for better testability with mocks
    if (error && typeof error === 'object' && 'code' in error) {
      // Handle specific Prisma errors if necessary
      return { success: false, error: "A database error occurred while deleting the convention." };
    }
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Festival shows (Productions)
// ──────────────────────────────────────────────────────────────────────────

/** True if the current user may edit this convention (admin or owning organizer). */
async function canEditConvention(conventionId: string, userId: string, roles: Role[]): Promise<boolean> {
  if (roles.includes(Role.ADMIN)) return true;
  const convention = await db.convention.findUnique({
    where: { id: conventionId },
    select: { series: { select: { organizerUserId: true } } },
  });
  return !!convention && convention.series?.organizerUserId === userId;
}

/** Flip a convention between CONVENTION and FESTIVAL mode. */
export async function setConventionType(conventionId: string, type: ConventionType) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.' };
  if (!(await canEditConvention(conventionId, session.user.id, session.user.roles as Role[]))) {
    return { success: false, error: 'You are not authorized to edit this convention.' };
  }
  try {
    await db.convention.update({ where: { id: conventionId }, data: { type } });
    revalidatePath(`/organizer/conventions/${conventionId}/edit`);
    return { success: true, type };
  } catch (error) {
    console.error('Error setting convention type:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/** Reassign a convention to a different series. Admin-only (used to fix up the
 *  imported conventions that landed without a series). */
export async function setConventionSeries(conventionId: string, seriesId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.' };
  if (!((session.user as User & { roles: Role[] }).roles?.includes(Role.ADMIN))) {
    return { success: false, error: 'Only admins can change a convention\'s series.' };
  }
  try {
    const series = await db.conventionSeries.findUnique({ where: { id: seriesId }, select: { id: true, name: true } });
    if (!series) return { success: false, error: 'Series not found.' };
    await db.convention.update({ where: { id: conventionId }, data: { seriesId } });
    revalidatePath(`/organizer/conventions/${conventionId}/edit`);
    return { success: true, seriesName: series.name };
  } catch (error) {
    console.error('Error setting convention series:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function getProductionsForConvention(conventionId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.', data: [] as any[] };
  if (!(await canEditConvention(conventionId, session.user.id, session.user.roles as Role[]))) {
    return { success: false, error: 'You are not authorized to view this convention.', data: [] as any[] };
  }
  try {
    const productions = await db.production.findMany({
      where: { conventionId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { performances: true } } },
    });
    return { success: true, data: productions };
  } catch (error) {
    console.error('Error fetching productions:', error);
    return { success: false, error: 'An unexpected error occurred.', data: [] as any[] };
  }
}

export interface ProductionInput {
  title: string;
  tagline?: string | null;
  ageRating?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  detailsUrl?: string | null;
  priceTiers?: Prisma.InputJsonValue | null;
  priceNote?: string | null;
}

export async function createProduction(conventionId: string, data: ProductionInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.' };
  if (!(await canEditConvention(conventionId, session.user.id, session.user.roles as Role[]))) {
    return { success: false, error: 'You are not authorized to edit this convention.' };
  }
  if (!data.title?.trim()) return { success: false, error: 'A show title is required.' };
  try {
    const last = await db.production.findFirst({
      where: { conventionId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const production = await db.production.create({
      data: {
        conventionId,
        title: data.title.trim(),
        tagline: data.tagline ?? null,
        ageRating: data.ageRating ?? null,
        description: data.description ?? null,
        coverImageUrl: data.coverImageUrl ?? null,
        detailsUrl: data.detailsUrl ?? null,
        priceTiers: data.priceTiers ?? undefined,
        priceNote: data.priceNote ?? null,
        order: (last?.order ?? -1) + 1,
      },
    });
    revalidatePath(`/organizer/conventions/${conventionId}/edit`);
    return { success: true, data: production };
  } catch (error) {
    console.error('Error creating production:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function updateProduction(productionId: string, data: ProductionInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.' };
  const existing = await db.production.findUnique({
    where: { id: productionId },
    select: { conventionId: true },
  });
  if (!existing) return { success: false, error: 'Show not found.' };
  if (!(await canEditConvention(existing.conventionId, session.user.id, session.user.roles as Role[]))) {
    return { success: false, error: 'You are not authorized to edit this convention.' };
  }
  if (!data.title?.trim()) return { success: false, error: 'A show title is required.' };
  try {
    const production = await db.production.update({
      where: { id: productionId },
      data: {
        title: data.title.trim(),
        tagline: data.tagline ?? null,
        ageRating: data.ageRating ?? null,
        description: data.description ?? null,
        coverImageUrl: data.coverImageUrl ?? null,
        detailsUrl: data.detailsUrl ?? null,
        priceTiers: data.priceTiers ?? undefined,
        priceNote: data.priceNote ?? null,
      },
    });
    revalidatePath(`/organizer/conventions/${existing.conventionId}/edit`);
    return { success: true, data: production };
  } catch (error) {
    console.error('Error updating production:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/** Delete a show. Its performances are detached (productionId set null) so the
 *  schedule items survive as standalone events rather than being destroyed. */
export async function deleteProduction(productionId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.' };
  const existing = await db.production.findUnique({
    where: { id: productionId },
    select: { conventionId: true },
  });
  if (!existing) return { success: false, error: 'Show not found.' };
  if (!(await canEditConvention(existing.conventionId, session.user.id, session.user.roles as Role[]))) {
    return { success: false, error: 'You are not authorized to edit this convention.' };
  }
  try {
    await db.conventionScheduleItem.updateMany({
      where: { productionId },
      data: { productionId: null },
    });
    await db.production.delete({ where: { id: productionId } });
    revalidatePath(`/organizer/conventions/${existing.conventionId}/edit`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting production:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Festival performances (showings of a Production)
// A performance is a ConventionScheduleItem linked via productionId.
// ──────────────────────────────────────────────────────────────────────────

const DEFAULT_PERFORMANCE_EVENT_TYPE = 'Stage/Gala Show';

export interface PerformanceInput {
  dayOffset: number;
  startTimeMinutes?: number | null;
  durationMinutes?: number | null;
  venueId?: string | null;
  locationName?: string | null;
  soldOut?: boolean;
}

/** Authorize against a production and return its convention + title, or null. */
async function authorizeProduction(productionId: string, userId: string, roles: Role[]) {
  const production = await db.production.findUnique({
    where: { id: productionId },
    select: { conventionId: true, title: true },
  });
  if (!production) return null;
  const allowed = await canEditConvention(production.conventionId, userId, roles);
  return allowed ? production : null;
}

/** Find an existing schedule day for this offset so the public day grouping lines up. */
async function findScheduleDayId(conventionId: string, dayOffset: number): Promise<string | null> {
  const day = await db.scheduleDay.findFirst({
    where: { conventionId, dayOffset },
    select: { id: true },
  });
  return day?.id ?? null;
}

export async function getPerformancesForProduction(productionId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.', data: [] as any[] };
  const prod = await authorizeProduction(productionId, session.user.id, session.user.roles as Role[]);
  if (!prod) return { success: false, error: 'Not authorized.', data: [] as any[] };
  try {
    const performances = await db.conventionScheduleItem.findMany({
      where: { productionId },
      orderBy: [{ dayOffset: 'asc' }, { startTimeMinutes: 'asc' }],
      include: { venue: { select: { id: true, venueName: true } } },
    });
    return { success: true, data: performances };
  } catch (error) {
    console.error('Error fetching performances:', error);
    return { success: false, error: 'An unexpected error occurred.', data: [] as any[] };
  }
}

async function buildPerformanceData(conventionId: string, title: string, p: PerformanceInput) {
  return {
    conventionId,
    title,
    eventType: DEFAULT_PERFORMANCE_EVENT_TYPE,
    atPrimaryVenue: false,
    dayOffset: p.dayOffset,
    startTimeMinutes: p.startTimeMinutes ?? null,
    durationMinutes: p.durationMinutes ?? null,
    venueId: p.venueId ?? null,
    locationName: p.locationName?.trim() || null,
    soldOut: p.soldOut ?? false,
    scheduleDayId: await findScheduleDayId(conventionId, p.dayOffset),
  };
}

export async function createPerformance(productionId: string, p: PerformanceInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.' };
  const prod = await authorizeProduction(productionId, session.user.id, session.user.roles as Role[]);
  if (!prod) return { success: false, error: 'Not authorized.' };
  try {
    const data = await buildPerformanceData(prod.conventionId, prod.title, p);
    const item = await db.conventionScheduleItem.create({ data: { ...data, productionId } });
    revalidatePath(`/organizer/conventions/${prod.conventionId}/edit`);
    return { success: true, data: item };
  } catch (error: any) {
    console.error('Error creating performance:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/** Create several showings at once (the repeat helper). */
export async function createPerformancesBulk(productionId: string, performances: PerformanceInput[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.' };
  const prod = await authorizeProduction(productionId, session.user.id, session.user.roles as Role[]);
  if (!prod) return { success: false, error: 'Not authorized.' };
  if (!performances.length) return { success: false, error: 'No showings to add.' };
  try {
    for (const p of performances) {
      const data = await buildPerformanceData(prod.conventionId, prod.title, p);
      await db.conventionScheduleItem.create({ data: { ...data, productionId } });
    }
    revalidatePath(`/organizer/conventions/${prod.conventionId}/edit`);
    return { success: true, count: performances.length };
  } catch (error: any) {
    console.error('Error creating performances:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function updatePerformance(itemId: string, p: PerformanceInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.' };
  const item = await db.conventionScheduleItem.findUnique({
    where: { id: itemId },
    select: { conventionId: true },
  });
  if (!item) return { success: false, error: 'Performance not found.' };
  if (!(await canEditConvention(item.conventionId, session.user.id, session.user.roles as Role[]))) {
    return { success: false, error: 'Not authorized.' };
  }
  try {
    const scheduleDayId = await findScheduleDayId(item.conventionId, p.dayOffset);
    await db.conventionScheduleItem.update({
      where: { id: itemId },
      data: {
        dayOffset: p.dayOffset,
        startTimeMinutes: p.startTimeMinutes ?? null,
        durationMinutes: p.durationMinutes ?? null,
        locationName: p.locationName?.trim() || null,
        soldOut: p.soldOut ?? false,
        // FK relations must be written through connect/disconnect on update.
        venue: p.venueId ? { connect: { id: p.venueId } } : { disconnect: true },
        scheduleDay: scheduleDayId ? { connect: { id: scheduleDayId } } : { disconnect: true },
      },
    });
    revalidatePath(`/organizer/conventions/${item.conventionId}/edit`);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating performance:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function deletePerformance(itemId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.' };
  const item = await db.conventionScheduleItem.findUnique({
    where: { id: itemId },
    select: { conventionId: true },
  });
  if (!item) return { success: false, error: 'Performance not found.' };
  if (!(await canEditConvention(item.conventionId, session.user.id, session.user.roles as Role[]))) {
    return { success: false, error: 'Not authorized.' };
  }
  try {
    await db.conventionScheduleItem.delete({ where: { id: itemId } });
    revalidatePath(`/organizer/conventions/${item.conventionId}/edit`);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting performance:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
// ── featured convention (front page) ─────────────────────────────────────────

/**
 * Admin-only: pick THE featured convention for the front page (or null to
 * return to automatic selection). Stored as a SiteSetting so exactly one
 * value exists — radio semantics for free.
 */
/**
 * Set the pool of featured conventions (the front page rotates one at random per
 * load). Stored comma-joined in the 'featured_convention_id' SiteSetting; empty
 * means automatic selection. A single legacy id reads back as a one-item pool.
 */
export async function setFeaturedConventions(conventionIds: string[]): Promise<{
  success: boolean;
  error?: string;
}> {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { roles: true } });
  if (!user?.roles.includes(Role.ADMIN)) {
    return { success: false, error: "Admins only." };
  }

  try {
    const clean = Array.from(new Set((conventionIds || []).map((s) => s.trim()).filter(Boolean)));
    let valid: string[] = [];
    if (clean.length) {
      const found = await db.convention.findMany({
        where: { id: { in: clean }, deletedAt: null },
        select: { id: true },
      });
      const ok = new Set(found.map((f) => f.id));
      valid = clean.filter((id) => ok.has(id)); // keep caller order, drop stale ids
    }
    await db.siteSetting.upsert({
      where: { key: 'featured_convention_id' },
      update: { value: valid.join(',') },
      create: { key: 'featured_convention_id', value: valid.join(',') },
    });
    revalidatePath('/');
    revalidatePath('/admin/conventions');
    return { success: true };
  } catch (error) {
    console.error('Error setting featured conventions:', error);
    return { success: false, error: 'A database error occurred.' };
  }
}

/**
 * Claim flow — the "is this you?" nudge. Returns unclaimed talent profiles whose
 * name matches the current user's (exact + fuzzy, so a schedule misspelling
 * still surfaces the profile). Empty when the user already owns a talent profile
 * or hasn't entered a name yet.
 */
export async function getClaimCandidatesForCurrentUser(): Promise<ClaimCandidate[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      stageName: true,
      talentProfile: { select: { id: true } },
    },
  });
  if (!user || user.talentProfile) return []; // already owns a profile — nothing to claim
  const names = [
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
    (user.stageName || '').trim(),
  ].filter(Boolean);
  if (names.length === 0) return [];

  const byId = new Map<string, ClaimCandidate>();
  for (const name of names) {
    for (const c of await findClaimCandidates(name)) {
      if (!byId.has(c.id)) byId.set(c.id, c);
    }
  }
  return Array.from(byId.values());
}

/** Claim an unclaimed talent profile for the current user (guards in claimTalent). */
export async function claimTalentProfile(talentId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Please log in to claim a profile.' };
  const result = await claimTalent(session.user.id, talentId);
  if (!result.ok) return { success: false, error: result.error };
  revalidatePath('/profile');
  revalidatePath(`/t/${talentId}`);
  return { success: true };
}

export interface TalentMediaItem {
  id: string;
  url: string;
  type: MediaType;
  caption: string | null;
  order: number | null;
}

/** Add a gallery photo, video link, or promo photo to the current user's talent profile. */
export async function addTalentMedia(input: {
  url: string;
  type: 'IMAGE' | 'VIDEO_LINK' | 'PROMO_IMAGE';
  caption?: string;
}): Promise<{ success: boolean; media?: TalentMediaItem; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Please log in.' };
  const url = (input.url || '').trim();
  if (!url) return { success: false, error: 'A URL is required.' };
  if (input.type === 'VIDEO_LINK' && !/^https?:\/\/.+/i.test(url)) {
    return { success: false, error: 'Enter a valid video URL (starting with http).' };
  }
  const profile = await db.talentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, _count: { select: { media: true } } },
  });
  if (!profile) return { success: false, error: 'Create your talent profile first.' };

  // Promo photos are capped (they're a curated set, not a gallery) and ordered
  // within their own type — the first promo photo is the talent's default card
  // image everywhere they're featured.
  let order = profile._count.media;
  if (input.type === 'PROMO_IMAGE') {
    const promoCount = await db.talentProfileMedia.count({
      where: { talentProfileId: profile.id, type: 'PROMO_IMAGE' },
    });
    if (promoCount >= PROMO_PHOTO_LIMIT) {
      return { success: false, error: `You can have up to ${PROMO_PHOTO_LIMIT} promo photos. Remove one first.` };
    }
    order = promoCount;
  }

  const media = await db.talentProfileMedia.create({
    data: {
      talentProfileId: profile.id,
      url,
      type: input.type as MediaType,
      caption: input.caption?.trim() || null,
      order,
    },
    select: { id: true, url: true, type: true, caption: true, order: true },
  });
  revalidatePath('/profile');
  return { success: true, media };
}

/** Remove a talent media item (owner or admin); best-effort S3 cleanup for uploaded images. */
export async function removeTalentMedia(mediaId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Please log in.' };
  const media = await db.talentProfileMedia.findUnique({
    where: { id: mediaId },
    select: { id: true, url: true, type: true, talentProfile: { select: { userId: true } } },
  });
  if (!media) return { success: false, error: 'Media not found.' };
  const isAdmin = (session.user as { roles?: string[] }).roles?.includes('ADMIN');
  if (media.talentProfile.userId !== session.user.id && !isAdmin) {
    return { success: false, error: 'You can only remove your own media.' };
  }

  await db.talentProfileMedia.delete({ where: { id: mediaId } });

  if ((media.type === 'IMAGE' || media.type === 'PROMO_IMAGE') && media.url.includes(`${BUCKET_NAME}.s3`)) {
    try {
      const key = new URL(media.url).pathname.replace(/^\//, '');
      if (key) await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    } catch (e) {
      console.warn('[removeTalentMedia] S3 cleanup skipped:', e);
    }
  }
  revalidatePath('/profile');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Convention Talent tab (2026-07): the organizer's billing board. Rows are
// auto-populated by the Schedule Helper (setEventTalent upserts
// ConventionTalent); the organizer arranges order/visibility/card image here.
// ---------------------------------------------------------------------------

/** Organizer-or-admin guard shared by the talent-tab actions. */
async function canEditConventionTalent(conventionId: string, userId: string): Promise<boolean> {
  const convention = await db.convention.findUnique({
    where: { id: conventionId },
    select: { series: { select: { organizerUserId: true } } },
  });
  if (!convention) return false;
  if (convention.series?.organizerUserId === userId) return true;
  const user = await db.user.findUnique({ where: { id: userId }, select: { roles: true } });
  return !!user?.roles.includes(Role.ADMIN);
}

export interface ConventionTalentRow {
  linkId: string;
  talentProfileId: string;
  displayName: string;
  order: number | null;
  isVisible: boolean;
  isHeadliner: boolean;
  /** The stored (raw) choice — may be stale; use `resolved` for display. */
  imageUrl: string | null;
  resolved: ResolvedTalentCardImage;
  promoPhotos: { id: string; url: string }[];
  profilePictureUrl: string | null;
  fromSchedule: boolean;
  claimed: boolean;
  assignedAt: string;
}

async function loadConventionTalentRows(conventionId: string): Promise<ConventionTalentRow[]> {
  const links = await db.conventionTalent.findMany({
    where: { conventionId },
    select: {
      id: true,
      order: true,
      isVisible: true,
      isHeadliner: true,
      imageUrl: true,
      overrideDisplayName: true,
      assignedAt: true,
      talentProfile: {
        select: {
          id: true,
          displayName: true,
          profilePictureUrl: true,
          userId: true,
          media: {
            where: { type: 'PROMO_IMAGE' },
            orderBy: { order: 'asc' },
            select: { id: true, url: true },
          },
          scheduleLinks: {
            where: { scheduleItem: { conventionId } },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  const rows = links.map((l) => ({
    linkId: l.id,
    talentProfileId: l.talentProfile.id,
    displayName: l.overrideDisplayName || l.talentProfile.displayName,
    order: l.order,
    isVisible: l.isVisible,
    isHeadliner: l.isHeadliner,
    imageUrl: l.imageUrl,
    resolved: resolveTalentCardImage({
      chosenUrl: l.imageUrl,
      promoUrls: l.talentProfile.media.map((m) => m.url),
      profilePictureUrl: l.talentProfile.profilePictureUrl,
    }),
    promoPhotos: l.talentProfile.media,
    profilePictureUrl: l.talentProfile.profilePictureUrl,
    fromSchedule: l.talentProfile.scheduleLinks.length > 0,
    claimed: l.talentProfile.userId !== null,
    assignedAt: l.assignedAt.toISOString(),
  }));
  return billingSort(rows);
}

/** The editor's Talent tab data: every talent attached to this convention, billing-sorted. */
export async function getConventionTalentArrangement(conventionId: string): Promise<{
  success: boolean;
  rows?: ConventionTalentRow[];
  error?: string;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.' };
  if (!(await canEditConventionTalent(conventionId, session.user.id))) {
    return { success: false, error: 'Permission denied.' };
  }
  try {
    return { success: true, rows: await loadConventionTalentRows(conventionId) };
  } catch (error) {
    console.error('Could not load convention talent arrangement:', error);
    return { success: false, error: 'Could not load talent. Please try again.' };
  }
}

/**
 * Persist the organizer's arrangement. Image rule enforced server-side: when
 * the talent has promo photos, the stored image must be one of them (anything
 * else is coerced to null = "their default"); organizers may only store their
 * own image for talent with no promo photos.
 */
export async function saveConventionTalentArrangement(
  conventionId: string,
  arrangement: Array<{ linkId: string; order: number; isVisible: boolean; isHeadliner: boolean; imageUrl: string | null }>,
): Promise<{ success: boolean; rows?: ConventionTalentRow[]; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.' };
  if (!(await canEditConventionTalent(conventionId, session.user.id))) {
    return { success: false, error: 'Permission denied.' };
  }

  const links = await db.conventionTalent.findMany({
    where: { conventionId },
    select: {
      id: true,
      talentProfile: {
        select: {
          id: true,
          userId: true,
          profilePictureUrl: true,
          media: { where: { type: 'PROMO_IMAGE' }, select: { url: true } },
        },
      },
    },
  });
  const byId = new Map(links.map((l) => [l.id, l]));

  for (const item of arrangement) {
    const link = byId.get(item.linkId);
    if (!link) continue; // stale row from another session — skip, don't fail the save
    const promoUrls = link.talentProfile.media.map((m) => m.url);
    let imageUrl = item.imageUrl?.trim() || null;
    if (promoUrls.length > 0) {
      // Talent controls their promotion: only their own photos are storable.
      if (imageUrl && !promoUrls.includes(imageUrl)) imageUrl = null;
    }
    await db.conventionTalent.update({
      where: { id: item.linkId },
      data: { order: item.order, isVisible: item.isVisible, isHeadliner: item.isHeadliner, imageUrl },
    });

    // Streamlining rule (2026-07-14): the FIRST organizer to upload an image
    // for an UNCLAIMED, picture-less talent also seeds it as that profile's
    // picture, so the next organizer (and the public profile page) get an
    // image for free. Strictly first-wins and unclaimed-only: never touches a
    // claimed profile, and never overwrites an existing picture — once the
    // person claims the profile, the photo is entirely theirs to change.
    if (
      imageUrl &&
      promoUrls.length === 0 &&
      link.talentProfile.userId === null &&
      !link.talentProfile.profilePictureUrl
    ) {
      await db.talentProfile.update({
        where: { id: link.talentProfile.id },
        data: { profilePictureUrl: imageUrl },
      });
      revalidatePath(`/t/${link.talentProfile.id}`);
    }
  }

  revalidatePath(`/conventions/${conventionId}`);
  return { success: true, rows: await loadConventionTalentRows(conventionId) };
}

/**
 * Attach a talent to the convention by picking an existing profile or typing a
 * new name (which creates an unclaimed profile — the Schedule Helper pipeline).
 */
export async function addTalentToConvention(
  conventionId: string,
  input: { talentId?: string; name?: string },
): Promise<{ success: boolean; rows?: ConventionTalentRow[]; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required.' };
  if (!(await canEditConventionTalent(conventionId, session.user.id))) {
    return { success: false, error: 'Permission denied.' };
  }

  let talentId = input.talentId;
  if (!talentId) {
    const name = (input.name || '').trim();
    if (!name) return { success: false, error: 'Enter a name.' };
    const t = await findOrCreateUnclaimedTalent(name);
    if (!t) return { success: false, error: 'Could not create that talent profile.' };
    talentId = t.id;
  }

  await db.conventionTalent.upsert({
    where: { conventionId_talentProfileId: { conventionId, talentProfileId: talentId } },
    create: { conventionId, talentProfileId: talentId },
    update: {},
  });

  revalidatePath(`/conventions/${conventionId}`);
  return { success: true, rows: await loadConventionTalentRows(conventionId) };
}
