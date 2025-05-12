// lib/validators/orderValidators.ts
import { z } from 'zod';

// Schema for a single item in the order (used by CreateOrderSchema)
export const OrderItemSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID is required.' })
    .trim()
    // Basic check for MongoDB ObjectId like format (24 hex characters)
    // More robust validation (existence) will be done server-side.
    .regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid Product ID format.' }),
  quantity: z
    .number({ required_error: 'Quantity is required.', invalid_type_error: 'Quantity must be a number.' })
    .int({ message: 'Quantity must be an integer.' })
    .positive({ message: 'Quantity must be greater than 0.' })
    .min(1, { message: 'Minimum quantity is 1.' }),
});
export type OrderItemInput = z.infer<typeof OrderItemSchema>;


// Schema for the customer's shipping address (Philippines context, used by CreateOrderSchema)
export const ShippingAddressSchema = z.object({
  street: z // e.g., House/Unit No., Building, Street Name, Subdivision
    .string({ required_error: 'Street address is required.' })
    .trim()
    .min(5, { message: 'Street address must be at least 5 characters long.' })
    .max(200, { message: 'Street address must be 200 characters or less.' }),
  barangay: z
    .string({ required_error: 'Barangay is required.' })
    .trim()
    .min(2, { message: 'Barangay must be at least 2 characters long.' })
    .max(100, { message: 'Barangay must be 100 characters or less.' }),
  cityMunicipality: z // City or Municipality
    .string({ required_error: 'City or Municipality is required.' })
    .trim()
    .min(2, { message: 'City/Municipality must be at least 2 characters long.' })
    .max(100, { message: 'City/Municipality must be 100 characters or less.' }),
  province: z
    .string({ required_error: 'Province is required.' })
    .trim()
    .min(2, { message: 'Province must be at least 2 characters long.' })
    .max(100, { message: 'Province must be 100 characters or less.' }),
  postalCode: z
    .string({ required_error: 'Postal code is required.' })
    .trim()
    .regex(/^\d{4}$/, { message: 'Invalid postal code format (should be 4 digits).' }), // PH postal codes are 4 digits
});
export type ShippingAddressInput = z.infer<typeof ShippingAddressSchema>;


// Main schema for creating a new order (guest checkout)
export const CreateOrderSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required.' })
    .trim()
    .min(3, { message: 'Full name must be at least 3 characters long.' })
    .max(100, { message: 'Full name must be 100 characters or less.' }),
  email: z
    .string({ required_error: 'Email is required.' })
    .trim()
    .email({ message: 'Invalid email address.' })
    .max(100, { message: 'Email must be 100 characters or less.' }),
  phone: z // Philippines phone number format
    .string({ required_error: 'Phone number is required.' })
    .trim()
    .regex(/^(09|\+639)\d{9}$/, { message: 'Invalid Philippine phone number format (e.g., 09xxxxxxxxx or +639xxxxxxxxx).' }),
  shippingAddress: ShippingAddressSchema,
  orderItems: z
    .array(OrderItemSchema)
    .min(1, { message: 'Your cart is empty. Please add at least one item to your order.' }),
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;


// --- NEW SCHEMA FOR ORDER TRACKING ---
export const TrackOrderSchema = z.object({
  orderId: z // This is your custom, human-readable orderId
    .string({ required_error: 'Order ID is required.' })
    .trim()
    .min(1, { message: 'Order ID cannot be empty.' })
    // You might want to add a regex here if your custom order IDs follow a very specific pattern
    // e.g., .regex(/^[0-9]{8}-[0-9]{6}-[A-Z0-9]{4}$/, { message: 'Invalid Order ID format.' })
    .max(50, { message: 'Order ID seems too long.'}), // Optional: max length
  email: z // Customer's email for verification
    .string({ required_error: 'Email address is required.' })
    .trim()
    .email({ message: 'Invalid email address.' })
    .max(100, { message: 'Email must be 100 characters or less.' }),
});
export type TrackOrderInput = z.infer<typeof TrackOrderSchema>;
// --- END OF NEW SCHEMA ---
