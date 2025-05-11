"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Correctly import authOptions
import { db } from "@/lib/db"; // Ensure db is imported
import { ProfileSchema, type ProfileSchemaInput } from "./validators";
import { revalidatePath } from "next/cache";
import { Role, RequestedRole, ApplicationStatus, User } from "@prisma/client"; // Added import
import { Prisma } from '@prisma/client'; // For types if needed

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