import { z } from 'zod';

// Shared image URL validation
const imageURLValidation = z
  .string()
  .url({ message: 'Image must be a valid URL.' })
  .refine(url => url.startsWith('http://') || url.startsWith('https://'), {
    message: 'Image URL must start with http:// or https://',
  });

// Schema for creating a new product
export const ProductCreationSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required.' })
    .trim()
    .min(3, { message: 'Product name must be at least 3 characters long.' })
    .max(150, { message: 'Product name must be 150 characters or less.' }),
  // Slug will be auto-generated from the name server-side, so not typically part of creation input.
  // If you want to allow manual slug input, add it here and make it optional.
  description: z
    .string({ required_error: 'Product description is required.' })
    .trim()
    .min(10, { message: 'Product description must be at least 10 characters long.' }),
  price: z // Price in cents
    .number({ required_error: 'Price is required.', invalid_type_error: 'Price must be a number.' })
    .int({ message: 'Price must be an integer (cents).' })
    .positive({ message: 'Price must be a positive number.' })
    .min(1, { message: 'Price must be at least 1 cent.' }), // Smallest unit
  stockQuantity: z
    .number({ required_error: 'Stock quantity is required.', invalid_type_error: 'Stock quantity must be a number.' })
    .int({ message: 'Stock quantity must be an integer.' })
    .min(0, { message: 'Stock quantity cannot be negative.' }), // Can be 0
  images: z // Array of image URLs
    .array(imageURLValidation)
    .min(1, { message: 'At least one product image is required.' })
    .max(10, { message: 'A maximum of 10 images are allowed.' }), // Example limit
  scentProfile: z // Array of strings describing the scent
    .array(z.string().trim().min(1, {message: "Scent profile items cannot be empty."}))
    .min(1, { message: 'At least one scent profile item is required.' })
    .optional(), // Making it optional if not every product must have it defined at creation
  benefits: z // Array of strings describing benefits
    .array(z.string().trim().min(1, {message: "Benefit items cannot be empty."}))
    .min(1, { message: 'At least one benefit item is required.' })
    .optional(),
  usageInstructions: z
    .string({ required_error: 'Usage instructions are required.' })
    .trim()
    .min(10, { message: 'Usage instructions must be at least 10 characters long.' }),
  ingredients: z // Array of strings listing ingredients
    .array(z.string().trim().min(1, {message: "Ingredient items cannot be empty."}))
    .min(1, { message: 'At least one ingredient is required.' }),
  isActive: z // Admin can set if product is active at creation
    .boolean()
    .optional() // Defaults to true in the Mongoose schema
    .default(true),
});
export type ProductCreationInput = z.infer<typeof ProductCreationSchema>;


// Schema for updating an existing product
export const ProductUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { message: 'Product name must be at least 3 characters long.' })
    .max(150, { message: 'Product name must be 150 characters or less.' })
    .optional(),
  // Slug might be updated automatically if name changes, or allow manual override
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens and no leading/trailing hyphens or consecutive hyphens.'})
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, { message: 'Product description must be at least 10 characters long.' })
    .optional(),
  price: z // Price in cents
    .number({ invalid_type_error: 'Price must be a number.' })
    .int({ message: 'Price must be an integer (cents).' })
    .positive({ message: 'Price must be a positive number.' })
    .min(1, { message: 'Price must be at least 1 cent.' })
    .optional(),
  stockQuantity: z
    .number({ invalid_type_error: 'Stock quantity must be a number.' })
    .int({ message: 'Stock quantity must be an integer.' })
    .min(0, { message: 'Stock quantity cannot be negative.' })
    .optional(),
  images: z // Allows replacing or updating the list of images
    .array(imageURLValidation)
    .min(1, { message: 'At least one product image is required.' })
    .max(10, { message: 'A maximum of 10 images are allowed.' })
    .optional(),
  scentProfile: z
    .array(z.string().trim().min(1, {message: "Scent profile items cannot be empty."}))
    .min(1, { message: 'At least one scent profile item is required.' })
    .optional(),
  benefits: z
    .array(z.string().trim().min(1, {message: "Benefit items cannot be empty."}))
    .min(1, { message: 'At least one benefit item is required.' })
    .optional(),
  usageInstructions: z
    .string()
    .trim()
    .min(10, { message: 'Usage instructions must be at least 10 characters long.' })
    .optional(),
  ingredients: z
    .array(z.string().trim().min(1, {message: "Ingredient items cannot be empty."}))
    .min(1, { message: 'At least one ingredient is required.' })
    .optional(),
  isActive: z
    .boolean()
    .optional(),
})
.refine(data => {
    // Ensure at least one field is provided for an update.
    return Object.values(data).some(value => value !== undefined);
  }, {
  message: 'At least one field must be provided for a product update.',
});
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;

