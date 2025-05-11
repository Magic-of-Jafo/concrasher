"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "./auth"; // Assuming authOptions are exported from here
import { db } from "./db"; // Assuming Prisma client is exported as db
import { ProfileSchema, type ProfileSchemaInput } from "./validators";
import { revalidatePath } from "next/cache";

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