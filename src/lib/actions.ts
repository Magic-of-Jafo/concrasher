"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Correctly import authOptions
import { db } from "@/lib/db"; // Ensure db is imported
import { ProfileSchema, type ProfileSchemaInput } from "./validators";
import { revalidatePath } from "next/cache";
import { Role, RequestedRole, ApplicationStatus, User, Convention, ScheduleDay, ConventionScheduleItem } from "@prisma/client"; // Added import
import { Prisma } from '@prisma/client'; // For types if needed
import {
  ConventionScheduleItemCreateSchema,
  ConventionScheduleItemUpdateSchema,
  ScheduleEventFeeTierSchema,
  type ConventionScheduleItemCreateInput,
  type ConventionScheduleItemUpdateInput,
  type ScheduleEventFeeTierInput,
  ConventionScheduleItemBulkInputSchema, // Added for bulk upload
  BrandCreateSchema,
  type BrandCreateInput,
  BrandUpdateSchema,
  type BrandUpdateInput,
  ConventionMediaSchema,
  type ConventionMediaData,
  ConventionSettingSchema,
  type ConventionSettingData,
  // ConventionScheduleItemBulkUploadSchema, // Corrected: Removed the problematic one, this is the main schema for the array - THIS LINE IS THE CULPRIT
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

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        firstName: validatedData.data.firstName,
        lastName: validatedData.data.lastName,
        stageName: validatedData.data.stageName,
        bio: validatedData.data.bio,
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
      revalidatePath('/admin/dashboard'); // Or specific applications page
      revalidatePath('/admin/applications'); // Or specific applications page
      return { success: true, message: 'Application approved successfully.' };
    } else if (newStatus === ApplicationStatus.REJECTED) {
      await db.roleApplication.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.REJECTED },
      });
      revalidatePath('/admin/dashboard'); // Or specific applications page
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

  const { feeTiers, ...itemData } = validatedData.data;

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

    revalidatePath(`/organizer/conventions/${input.conventionId}/edit`);
    return { success: true, item: newItem };
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

  const { id, feeTiers, ...itemData } = validatedData.data;
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
          scheduleDayId: itemData.scheduleDayId,
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

    revalidatePath(`/organizer/conventions/${input.conventionId}/edit`);
    return { success: true, item: updatedItem };

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
      include: { feeTiers: true },
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
    return { success: true, message: "Schedule day and its associated events have been successfully processed." };

  } catch (error) {
    console.error("Error deleting schedule day:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: `Database error: ${error.message}` };
    }
    return { success: false, error: "An unexpected error occurred while deleting the schedule day." };
  }
}

export async function bulkCreateScheduleItems(
  conventionId: string,
  rawItems: any[] // Raw items from JSON input, expect array of objects
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  createdCount?: number;
  errors?: { itemIndex: number; message: string; originalItem?: any }[];
}> {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }

  // Authorization: Check if user is admin or organizer of this convention
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true }
  });
  const userRoles = user?.roles || [];

  if (!userRoles.includes(Role.ADMIN)) {
    const conventionForAuth = await db.convention.findUnique({
      where: { id: conventionId },
      select: { series: { select: { organizerUserId: true } } },
    });
    if (!conventionForAuth?.series?.organizerUserId || conventionForAuth.series.organizerUserId !== session.user.id) {
      return { success: false, error: "Unauthorized. You must be an admin or the organizer of this convention." };
    }
  }

  if (!Array.isArray(rawItems)) {
    return { success: false, error: "Invalid input: Expected an array of schedule items." };
  }

  const normalizedItemsForZod = rawItems.map((item) => {
    let mutableItem = { ...item };
    if (typeof mutableItem.startTimeMinutes === 'number' && mutableItem.startTimeMinutes >= 1440) {
      const additionalDays = Math.floor(mutableItem.startTimeMinutes / 1440);
      mutableItem.dayOffset = (typeof mutableItem.dayOffset === 'number' ? mutableItem.dayOffset : 0) + additionalDays;
      mutableItem.startTimeMinutes %= 1440;
    }
    if (typeof mutableItem.dayOffset !== 'number') {
      mutableItem.dayOffset = 0;
    }
    return mutableItem;
  });

  const payload = {
    conventionId,
    scheduleItems: normalizedItemsForZod,
  };

  // Validate the entire payload against the main schema
  const validationResult = ConventionScheduleItemBulkInputSchema.safeParse(payload);

  if (!validationResult.success) {
    return {
      success: false,
      error: "Payload validation failed.",
      errors: validationResult.error.issues.map(issue => {
        let itemIndex = -1;
        if (issue.path.length > 1 && issue.path[0] === 'scheduleItems' && typeof issue.path[1] === 'number') {
          itemIndex = issue.path[1];
        }
        return {
          itemIndex: itemIndex,
          message: `Validation error for item at index ${itemIndex !== -1 ? itemIndex : '(unknown)'}: [${issue.path.join('.')}] ${issue.message}`,
          originalItem: itemIndex !== -1 && itemIndex < rawItems.length ? rawItems[itemIndex] : undefined
        };
      }),
    };
  }

  const validatedItems = validationResult.data.scheduleItems;
  const itemProcessingErrors: { itemIndex: number; message: string; originalItem?: any }[] = [];
  let createdCount = 0;

  try {
    await db.$transaction(async (tx) => {
      for (let i = 0; i < validatedItems.length; i++) {
        const itemData = validatedItems[i];
        const originalItemForError = rawItems[i];

        try {
          let scheduleDay = await tx.scheduleDay.findFirst({
            where: { conventionId, dayOffset: itemData.dayOffset },
          });

          if (!scheduleDay) {
            scheduleDay = await tx.scheduleDay.create({
              data: {
                conventionId,
                dayOffset: itemData.dayOffset,
                isOfficial: false,
                label: `Day ${itemData.dayOffset + 1} (Auto-created)`,
              },
            });
          }

          const newScheduleItem = await tx.conventionScheduleItem.create({
            data: {
              conventionId,
              scheduleDayId: scheduleDay.id,
              title: itemData.title,
              startTimeMinutes: normalizedItemsForZod[i].startTimeMinutes,
              durationMinutes: itemData.durationMinutes,
              description: itemData.description,
              locationName: itemData.locationName,
              venueId: itemData.venueId,
              eventType: itemData.eventType || 'Other',
              atPrimaryVenue: !itemData.venueId,
              dayOffset: itemData.dayOffset,
            },
          });

          if (itemData.feeTiers && itemData.feeTiers.length > 0) {
            await tx.scheduleEventFeeTier.createMany({
              data: itemData.feeTiers.map(tier => ({
                scheduleItemId: newScheduleItem.id,
                label: tier.label,
                amount: tier.amount,
              })),
            });
          }
          createdCount++;
        } catch (e: any) {
          console.error(`Error processing item at index ${i} ('${itemData.title}') during bulk create:`, e);
          itemProcessingErrors.push({
            itemIndex: i,
            message: `Failed to process item '${itemData.title}': ${e.message || 'Unknown error'}`,
            originalItem: originalItemForError
          });
        }
      }

      if (itemProcessingErrors.length > 0 && itemProcessingErrors.length === validatedItems.length) {
        throw new Error("All items failed during bulk processing. Transaction rolled back.");
      }
    });

    if (itemProcessingErrors.length > 0) {
      return {
        success: createdCount > 0,
        message: `Bulk operation partially completed. ${createdCount} item(s) created. ${itemProcessingErrors.length} item(s) failed.`,
        createdCount: createdCount,
        errors: itemProcessingErrors,
      };
    }

    revalidatePath(`/organizer/conventions/${conventionId}/edit`);
    return {
      success: true,
      message: `${createdCount} schedule item(s) created successfully.`,
      createdCount: createdCount,
    };

  } catch (error: any) {
    console.error("Error during bulk schedule item creation process:", error);
    return {
      success: false,
      error: `Bulk creation failed: ${error.message || 'An unexpected error occurred.'}`,
      createdCount: createdCount,
      errors: itemProcessingErrors.length > 0 ? itemProcessingErrors : undefined,
    };
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

    // Update Convention with timezone foreign key
    console.log('[updateConventionSettings] Updating Convention with timezone foreign key');
    console.log('[updateConventionSettings] Data to save:', validatedData.data);

    await db.convention.update({
      where: { id: conventionId },
      data: {
        timezoneId: timezoneId || null,
        updatedAt: new Date(),
      },
    });

    console.log('[updateConventionSettings] Convention timezone updated successfully');

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

    const settingsData: ConventionSettingData = {
      currency: currencySetting?.value || '',
      timezone: convention.timezoneId || '',
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

    revalidatePath('/organizer/conventions');
    revalidatePath('/conventions'); // Revalidate public listing

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