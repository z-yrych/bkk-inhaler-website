import { z } from "zod";
import { OrderStatusEnum } from "@/lib/models/Order"; // Import your OrderStatusEnum

export const ListOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10), // Max 100 per page
  sortBy: z.string().optional().default("createdAt"), // e.g., 'createdAt', 'totalAmount', 'orderStatus'
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.enum(OrderStatusEnum).optional(), // Filter by a specific order status
  orderId: z.string().trim().optional(), // Filter by custom orderId
  email: z.string().trim().email().optional(), // Filter by customer email
});

export type ListOrdersQueryInput = z.infer<typeof ListOrdersQuerySchema>;

// Schema for updating order status by admin
export const UpdateOrderStatusSchema = z.object({
  status: z.enum(OrderStatusEnum, {
    required_error: "Order status is required.",
    invalid_type_error: "Invalid order status provided.",
  }),
  // Optionally, admin can add a note when updating status
  adminNote: z
    .string()
    .trim()
    .max(500, "Admin note must be 500 characters or less.")
    .optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
