import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254));

const newPassword = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'Password must contain letters and numbers');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email,
  password: newPassword,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
