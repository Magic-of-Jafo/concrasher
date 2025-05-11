"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "./auth"; // Assuming authOptions are exported from here
import { db } from "./db"; // Assuming Prisma client is exported as db
import { ProfileSchema, type ProfileSchemaInput } from "./validators";
import { revalidatePath } from "next/cache";
import { Role, RequestedRole, ApplicationStatus } from "@prisma/client"; // Added import

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