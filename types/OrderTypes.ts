// types/orderTypes.ts
import { Types } from 'mongoose'; // Only import Types if needed for ObjectId in shared type

// Plain data for an order item (NO mongoose.Document extension)
export interface IOrderItemData {
  productId: string | Types.ObjectId; // Use string if product ID is string in API responses
  name: string;
  priceAtPurchase: number;
  quantity: number;
  image?: string;
  // Add any other fields that come from your API for order items
  _id?: string | Types.ObjectId; // if subdocument _id is returned
}

export const OrderStatusEnumArray = [ // Keep your enum array if needed for dropdowns
  "PENDING_PAYMENT", "PAYMENT_FAILED", "PAYMENT_CONFIRMED",
  "PROCESSING", "SHIPPED_LOCAL", "DELIVERED",
  "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN", "REFUNDED",
] as const;
export type OrderStatusType = typeof OrderStatusEnumArray[number];

// Plain data for an order (NO mongoose.Document extension)
// This should match the structure of the JSON you expect from your API endpoint
export interface IOrderData {
  _id: string; // Typically, API returns _id as string
  orderId: string;
  customerDetails: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    shippingAddress: {
      street: string;
      barangay: string;
      city: string; // Or cityMunicipality, match your API response
      province: string;
      postalCode: string;
      country: string;
    };
  };
  orderItems: IOrderItemData[];
  totalAmount: number;
  orderStatus: OrderStatusType;
  paymentDetails: {
    paymongoCheckoutId?: string;
    paymongoPaymentIntentId?: string;
    paymongoPaymentId?: string;
    paymentMethod?: string;
    paymentDate?: string | Date; // API might send as string
    status?: string;
  };
  adminNotes?: string;
  notes?: string;
  createdAt: string | Date; // API might send as string
  updatedAt: string | Date; // API might send as string
  fullName?: string;
  // Include any other fields your API returns for an order
}