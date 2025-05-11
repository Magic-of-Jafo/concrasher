import { z } from 'zod';

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