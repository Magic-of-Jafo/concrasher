import { z } from 'zod';
import { ConventionStatus as PrismaConventionStatusEnum } from '@prisma/client';

export const RegistrationSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  confirmPassword: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }), // Min 1 as empty check, actual length check is not specified for login, only for registration.
});

export const ProfileSchema = z.object({
  name: z.string().min(1, { message: "Display name is required" }).optional(), // Assuming name can be empty if user wants to remove it, but if provided, not empty.
  bio: z.string().max(200, { message: "Bio must be 200 characters or less" }).optional(),
});

export type ProfileSchemaInput = z.infer<typeof ProfileSchema>;

// Use the Prisma generated enum for ConventionStatus
export const ConventionStatusEnum = z.nativeEnum(PrismaConventionStatusEnum);

export const ConventionCreateSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  // slug: z.string().min(1, { message: 'Slug is required' }), // Slug will be auto-generated or handled separately
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  city: z.string().min(1, { message: 'City is required' }),
  state: z.string().min(1, { message: 'State is required' }),
  country: z.string().min(1, { message: 'Country is required' }),
  venueName: z.string().optional(),
  description: z.string().optional(),
  websiteUrl: z.string().url({ message: 'Invalid URL' }).optional().or(z.literal('')),
  // organizerUserId: z.string().cuid({ message: 'Invalid Organizer ID' }), // Will be set from session/admin context
  conventionSeriesId: z.string().cuid({ message: 'Invalid Series ID' }).optional(),
  status: ConventionStatusEnum,
  bannerImageUrl: z.string().optional().or(z.literal('')),
  galleryImageUrls: z.array(z.string()).default([]),
});

export const ConventionUpdateSchema = ConventionCreateSchema.partial().extend({
  // Ensure slug is optional for updates if it's being handled or already set
  // slug: z.string().min(1, { message: 'Slug is required' }).optional(), 
});

export type ConventionCreateInput = z.infer<typeof ConventionCreateSchema>;
export type ConventionUpdateInput = z.infer<typeof ConventionUpdateSchema>; 