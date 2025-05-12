// lib/models/Order.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

// 1. Readonly tuple for order statuses, ensuring type safety
export const OrderStatusEnum = [
  "PENDING_PAYMENT", // Initial state after checkout, before PayMongo confirmation
  "PAYMENT_FAILED", // If PayMongo reports a failure or user cancels
  "PAYMENT_CONFIRMED", // PayMongo success webhook received, stock decremented
  "PROCESSING", // Admin acknowledged, preparing for shipment
  "SHIPPED_LOCAL", // Shipped within the Philippines / Out for local delivery
  "DELIVERED", // Customer received
  "CANCELLED_BY_CUSTOMER", // If customer cancels (feature might be added later)
  "CANCELLED_BY_ADMIN", // If admin cancels the order
  "REFUNDED", // If a refund was processed
  // Optional: "SHIPPED_INTERNATIONAL" if applicable to your store
] as const;

// 2. Creates a union type from the OrderStatusEnum values
export type OrderStatus = (typeof OrderStatusEnum)[number];

// 3. Plain data structure for an order item (used for creation and within IOrder)
export interface IOrderItemData {
  productId: Types.ObjectId; // Mongoose will store as ObjectId
  name: string; // Denormalized product name
  priceAtPurchase: number; // In cents
  quantity: number;
  image?: string; // Denormalized product image URL
}

// 4. Interface for Mongoose subdocument for individual items within an order
export interface IOrderItem extends Document, IOrderItemData {} // Extends Document and IOrderItemData

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required for order item."],
    },
    name: {
      type: String,
      required: [true, "Product name is required for order item."],
      trim: true,
    },
    priceAtPurchase: {
      type: Number,
      required: [true, "Price at purchase is required for order item."],
      min: [0, "Price at purchase cannot be negative."],
      validate: {
        validator: Number.isInteger,
        message: (props: any) =>
          `${props.value} is not an integer value for priceAtPurchase (cents).`,
      },
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required for order item."],
      min: [1, "Quantity must be at least 1."],
      validate: {
        validator: Number.isInteger,
        message: (props: any) =>
          `${props.value} is not an integer value for quantity.`,
      },
    },
    image: {
      type: String,
      trim: true,
    },
  },
  { _id: false } // No separate _id for these subdocuments
);

// 5. Main Order interface (Mongoose Document)
export interface IOrder extends Document {
  _id: Types.ObjectId; // Explicitly typed _id
  orderId: string; // Custom human-readable ID
  customerDetails: {
    [x: string]: any;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    shippingAddress: {
      street: string;
      barangay: string;
      city: string; // Mongoose schema uses 'city'
      province: string;
      postalCode: string;
      country: string;
    };
    billingAddress?: {
      // Optional
      street?: string;
      barangay?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      country?: string;
    };
  };
  orderItems: Types.DocumentArray<IOrderItem>; // Array of Mongoose subdocuments
  totalAmount: number; // In cents
  orderStatus: OrderStatus;
  paymentDetails: {
    paymongoCheckoutId?: string; // For cs_... (Checkout Session ID)
    paymongoPaymentIntentId?: string; // For pi_... (Payment Intent ID)
    paymongoPaymentId?: string; // For pay_... (actual Payment ID from webhook, if different from PI)
    paymentMethod?: string; // e.g., 'card', 'gcash'
    paymentDate?: Date; // When payment was confirmed
    status?: string; // e.g., 'awaiting_payment_gateway', 'paid', 'failed' (your internal payment status)
  };
  shippingInfo?: {
    trackingNumber?: string;
    courier?: string;
    // estimatedDeliveryDate?: Date; // Removed as per earlier MVP decision, can be added back
    shippedDate?: Date;
    deliveredDate?: Date;
  };
  notes?: string;
  adminNotes?: string;
  createdAt: Date; // Automatically added by Mongoose via timestamps
  updatedAt: Date; // Automatically added by Mongoose via timestamps
}

// 6. Plain data structure for CREATING a new order (for API input)
export interface OrderCreationAttributes {
  orderId: string;
  customerDetails: {
    // Matches structure of IOrder.customerDetails
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    shippingAddress: {
      street: string;
      barangay: string;
      city: string; // Data coming from Zod's 'cityMunicipality' will map to this
      province: string;
      postalCode: string;
      country: string;
    };
    // billingAddress is optional, so not required in creation attributes unless always collected
  };
  orderItems: IOrderItemData[]; // Uses plain array of plain item data objects
  totalAmount: number;
  orderStatus: OrderStatus; // e.g., 'PENDING_PAYMENT'
  paymentDetails?: Partial<IOrder["paymentDetails"]>; // Can be initialized as {} or with some defaults
  notes?: string;
  adminNotes?: string;
  // createdAt and updatedAt are not part of creation data
}

export interface IOrderModel extends Model<IOrder> {}

const OrderSchema = new Schema<IOrder, IOrderModel>(
  {
    orderId: {
      type: String,
      required: [true, "Custom Order ID is required."],
      trim: true,
      // unique constraint handled by index below
    },
    customerDetails: {
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [
          /.+@.+\..+/,
          "Please enter a valid email address for customer.",
        ],
      },
      firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: [1, "First name cannot be empty."],
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: [1, "Last name cannot be empty."],
      },
      phone: { type: String, trim: true },
      shippingAddress: {
        street: { type: String, required: true, trim: true },
        barangay: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true }, // Named 'city' here
        province: { type: String, required: true, trim: true },
        postalCode: { type: String, required: true, trim: true },
        country: {
          type: String,
          required: true,
          trim: true,
          default: "Philippines",
        },
      },
      billingAddress: {
        street: { type: String, trim: true },
        barangay: { type: String, trim: true },
        city: { type: String, trim: true },
        province: { type: String, trim: true },
        postalCode: { type: String, trim: true },
        country: { type: String, trim: true },
      },
    },
    orderItems: [OrderItemSchema], // Array of the subdocument schema
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required."],
      min: [0, "Total amount cannot be negative."],
      validate: {
        validator: Number.isInteger,
        message: (props: any) =>
          `${props.value} is not an integer value for totalAmount (cents).`,
      },
    },
    orderStatus: {
      type: String,
      enum: {
        values: OrderStatusEnum as unknown as string[], // Keep this cast if OrderStatusEnum is `as const`
        message: 'Order status "{VALUE}" is not supported.', // <-- CORRECTED: Use a static string with {VALUE}
      },
      default: "PENDING_PAYMENT",
      required: true,
    },
    paymentDetails: {
      paymongoCheckoutId: { type: String, trim: true },
      paymongoPaymentIntentId: { type: String, trim: true },
      paymongoPaymentId: { type: String, trim: true },
      paymentMethod: { type: String, trim: true },
      paymentDate: { type: Date },
      status: { type: String, trim: true },
    },
    shippingInfo: {
      trackingNumber: { type: String, trim: true },
      courier: { type: String, trim: true },
      shippedDate: { type: Date },
      deliveredDate: { type: Date },
    },
    notes: { type: String, trim: true },
    adminNotes: { type: String, trim: true },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: {
      virtuals: true, // Ensure virtuals like 'id' are included
      transform: (_doc, ret) => {
        delete ret.__v; // Remove Mongoose version key
        // ret.id = ret._id; // Already handled by virtuals: true and default Mongoose behavior
        // delete ret._id; // Don't delete _id if 'id' virtual relies on it
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexing
OrderSchema.index({ orderId: 1 }, { unique: true });
OrderSchema.index({ "customerDetails.email": 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ createdAt: -1 });

const Order =
  (mongoose.models.Order as IOrderModel) ||
  mongoose.model<IOrder, IOrderModel>("Order", OrderSchema);

export default Order;
