'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { BasicInfoFormSchema } from '@/lib/validators';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper to check if user is an organizer
async function checkOrganizerAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  // TODO: Add check for organizer role
  return session.user;
}

// Create a new convention with basic info
export async function createConvention(formData: z.infer<typeof BasicInfoFormSchema>) {
  try {
    await checkOrganizerAccess();

    // Validate the form data
    const validatedData = BasicInfoFormSchema.parse(formData);

    // Fetch default SEO keywords
    const seoSettings = await prisma.sEOSetting.findUnique({
      where: { id: 'singleton' },
      select: { defaultKeywords: true },
    });

    // Create the convention
    const convention = await prisma.convention.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        isOneDayEvent: validatedData.isOneDayEvent,
        isTBD: validatedData.isTBD,
        city: validatedData.city || '',
        stateAbbreviation: validatedData.stateAbbreviation || undefined,
        stateName: validatedData.stateName || undefined,
        country: validatedData.country || '',
        descriptionShort: validatedData.descriptionShort || undefined,
        descriptionMain: validatedData.descriptionMain || undefined,
        status: 'DRAFT', // New conventions start as drafts
        keywords: seoSettings?.defaultKeywords || [],
      },
    });

    // Revalidate the conventions list and redirect to the new convention
    revalidatePath('/organizer/conventions');
    redirect(`/organizer/conventions/${convention.id}/edit`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: 'Validation failed',
        details: error.errors,
      };
    }
    console.error('Error creating convention:', error);
    return {
      error: 'Failed to create convention',
    };
  }
}

// Update an existing convention's basic info
export async function updateConventionBasicInfo(
  conventionId: string,
  formData: z.infer<typeof BasicInfoFormSchema>
) {
  try {
    await checkOrganizerAccess();

    // Validate the form data
    const validatedData = BasicInfoFormSchema.parse(formData);

    // Update the convention
    const convention = await prisma.convention.update({
      where: { id: conventionId },
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        isOneDayEvent: validatedData.isOneDayEvent,
        isTBD: validatedData.isTBD,
        city: validatedData.city || '',
        stateAbbreviation: validatedData.stateAbbreviation || undefined,
        stateName: validatedData.stateName || undefined,
        country: validatedData.country || '',
        descriptionShort: validatedData.descriptionShort || undefined,
        descriptionMain: validatedData.descriptionMain || undefined,
      },
    });

    // Revalidate the convention page and list
    revalidatePath(`/organizer/conventions/${conventionId}`);
    revalidatePath('/organizer/conventions');

    return { success: true, convention };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: 'Validation failed',
        details: error.errors,
      };
    }
    console.error('Error updating convention:', error);
    return {
      error: 'Failed to update convention',
    };
  }
}

// Get a convention by ID
export async function getConvention(id: string) {
  try {
    await checkOrganizerAccess();

    const convention = await prisma.convention.findUnique({
      where: { id },
    });

    if (!convention) {
      throw new Error('Convention not found');
    }

    return { convention };
  } catch (error) {
    console.error('Error fetching convention:', error);
    return {
      error: 'Failed to fetch convention',
    };
  }
} 