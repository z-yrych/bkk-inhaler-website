// lib/validators/adminUserValidators.ts
import { z } from 'zod';

// Schema for an existing admin CREATING another admin user
// This is functionally identical to AdminRegistrationSchema but kept separate for semantic clarity
// if admin-driven creation might diverge from self-registration in the future.
// For now, we could also re-export AdminRegistrationSchema here or import it directly in the API route.
// Let's define it explicitly here for now, but acknowledge the duplication.
// OR BETTER YET: We will import AdminRegistrationSchema from adminAuthValidators.ts in the API route itself.
// This file (adminUserValidators.ts) will then ONLY contain the UPDATE schema.

// Schema for an existing admin UPDATING another admin user's details
export const AdminUserUpdateSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: 'First name cannot be empty if provided.' })
    .max(50, { message: 'First name must be 50 characters or less.' })
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(1, { message: 'Last name cannot be empty if provided.' })
    .max(50, { message: 'Last name must be 50 characters or less.' })
    .optional(),
  email: z
    .string()
    .trim()
    .email({ message: 'Invalid email address.' })
    .max(100, { message: 'Email must be 100 characters or less.' })
    .optional(),
  // If password is provided, it means the admin intends to change/reset the target admin's password.
  // If omitted, the target admin's password remains unchanged.
  password: z
    .string()
    .min(8, { message: 'New password must be at least 8 characters long.' })
    .max(100, { message: 'New password must be 100 characters or less.' })
    .optional(),
})
.refine(data => {
    return Object.values(data).some(value => value !== undefined);
  }, {
  message: 'At least one field must be provided for an update.',
});
export type AdminUserUpdateInput = z.infer<typeof AdminUserUpdateSchema>;