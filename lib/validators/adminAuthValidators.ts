import { z } from 'zod';

export const AdminRegistrationSchema = z.object({
  firstName: z.string().trim().min(1, { message: 'First name is required.' }).max(50, { message: 'First name must be 50 characters or less.' }),
  lastName: z.string().trim().min(1, { message: 'Last name is required.' }).max(50, { message: 'Last name must be 50 characters or less.' }),
  email: z.string().trim().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }).max(100, { message: 'Password must be 100 characters or less.' }),
  // role will be 'ADMIN' by default as per User schema, so not needed in registration input
});

export type AdminRegistrationInput = z.infer<typeof AdminRegistrationSchema>;


export const AdminLoginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }), // Min 1 because existence is key, length check is on registration
});

export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;