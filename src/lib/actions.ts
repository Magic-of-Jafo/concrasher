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
  // ConventionScheduleItemBulkUploadSchema, // Corrected: Removed the problematic one, this is the main schema for the array - THIS LINE IS THE CULPRIT
} from './validators';

// ... existing code ...

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
        name: validatedData.data.name,
        bio: validatedData.data.bio,
      },
    });

    revalidatePath("/profile");

    return {
      success: true,
      message: "Profile updated successfully.",
      user: { // Return relevant parts of the updated user, excluding sensitive data
        id: user.id,
        name: user.name,
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

export async function applyForOrganizerRole(): Promise<{
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

  try {
    // Check if user already has the ORGANIZER role
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (user?.roles.includes(Role.ORGANIZER)) {
      return {
        success: false,
        error: "You are already an Organizer.",
        applicationStatus: ApplicationStatus.APPROVED, // Or some other status to indicate already has role
      };
    }

    // Check if user has an existing PENDING application for ORGANIZER
    const existingApplication = await db.roleApplication.findFirst({
      where: {
        userId: userId,
        requestedRole: RequestedRole.ORGANIZER,
        status: ApplicationStatus.PENDING,
      },
    });

    if (existingApplication) {
      return {
        success: false,
        error: "You already have a pending application for the Organizer role.",
        applicationStatus: ApplicationStatus.PENDING,
      };
    }

    // Create the role application
    await db.roleApplication.create({
      data: {
        userId: userId,
        requestedRole: RequestedRole.ORGANIZER,
        status: ApplicationStatus.PENDING,
      },
    });

    revalidatePath("/profile"); // Or the relevant profile page path

    return {
      success: true,
      message: "Your application for the Organizer role has been submitted successfully.",
      applicationStatus: ApplicationStatus.PENDING,
    };
  } catch (error) {
    console.error("Error applying for Organizer role:", error);
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
              set: [...new Set([...application.user.roles, Role.ORGANIZER])],
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
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Ensure dates are stringified for client component
    const serializableApplications = applications.map(app => ({
      ...app,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(), // Though not explicitly used in UI, good practice
      user: app.user // user object is already serializable as selected
    }));

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

  const parsedInput = ConventionScheduleItemBulkInputSchema.safeParse({
    conventionId,
    items: normalizedItemsForZod
  });

  if (!parsedInput.success) {
    const itemSpecificErrors = parsedInput.error.issues.map(issue => {
      let itemIndex = -1;
      if (issue.path.length > 1 && issue.path[0] === 'items' && typeof issue.path[1] === 'number') {
        itemIndex = issue.path[1];
      }
      return {
        itemIndex: itemIndex,
        message: `Validation error for item at index ${itemIndex !== -1 ? itemIndex : '(unknown)'}: [${issue.path.join('.')}] ${issue.message}`,
        originalItem: itemIndex !== -1 && itemIndex < rawItems.length ? rawItems[itemIndex] : undefined
      };
    });
    return {
      success: false,
      error: "Invalid bulk input format. See detailed errors.",
      errors: itemSpecificErrors.length > 0 ? itemSpecificErrors : [{ itemIndex: -1, message: "General validation error with bulk input." }],
    };
  }

  const validatedItems = parsedInput.data.scheduleItems;
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