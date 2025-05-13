// lib/models/Order.ts
import mongoose, {
  Schema,
  Document,
  Model,
  Types,
  ValidatorProps,
} from "mongoose";

// 1. Readonly tuple for order statuses, ensuring type safety
export const OrderStatusEnum = [
  "PENDING_PAYMENT",
  "PAYMENT_FAILED",
  "PAYMENT_CONFIRMED",
  "PROCESSING",
  "SHIPPED_INTERNATIONAL", // Optional
  "SHIPPED_LOCAL",
  "DELIVERED",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_ADMIN",
  "REFUNDED",
] as const;

// 2. Creates a union type from the OrderStatusEnum values
export type OrderStatus = (typeof OrderStatusEnum)[number];

// 3. Plain data structure for an order item (used for creation and within IOrder)
export interface IOrderItemData {
  productId: Types.ObjectId; // Mongoose will store as ObjectId. Or use `Types.ObjectId | IProductData` if it can be populated.
  name: string;
  priceAtPurchase: number; // In cents
  quantity: number;
  image?: string;
}

// 4. Interface for Mongoose subdocument for individual items within an order
export interface IOrderItem extends Document, IOrderItemData {}

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
        message: (props: ValidatorProps) =>
          `${props.value} is not an integer value for priceAtPurchase (cents).`,
      },
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required for order item."],
      min: [1, "Quantity must be at least 1."],
      validate: {
        validator: Number.isInteger,
        message: (props: ValidatorProps) =>
          `${props.value} is not an integer value for quantity.`,
      },
    },
    image: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// 5. Main Order interface (Mongoose Document)
export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderId: string;
  customerDetails: {
    fullName: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    shippingAddress: {
      street: string;
      barangay: string;
      city: string;
      province: string;
      postalCode: string;
      country: string;
    };
    billingAddress?: {
      street?: string;
      barangay?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      country?: string;
    };
  };
  orderItems: Types.DocumentArray<IOrderItem>;
  totalAmount: number;
  orderStatus: OrderStatus;
  paymentDetails: {
    paymongoCheckoutId?: string;
    paymongoPaymentIntentId?: string;
    paymongoPaymentId?: string;
    paymentMethod?: string;
    paymentDate?: Date;
    status?: string;
  };
  shippingInfo?: {
    trackingNumber?: string;
    courier?: string;
    shippedDate?: Date;
    deliveredDate?: Date;
  };
  notes?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 6. Plain data structure for CREATING a new order (for API input)
export interface OrderCreationAttributes {
  orderId: string;
  customerDetails: {
    // This structure should match IOrder['customerDetails']
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    shippingAddress: {
      street: string;
      barangay: string;
      city: string; // This is what Mongoose schema expects
      province: string;
      postalCode: string;
      country: string;
    };
  };
  orderItems: IOrderItemData[];
  totalAmount: number;
  orderStatus: OrderStatus;
  paymentDetails?: Partial<IOrder["paymentDetails"]>;
  notes?: string;
  adminNotes?: string;
}

// FIXED: Error 151:18 (was 153:18 / 155:18) - Used the correct ESLint rule name in the disable comment
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IOrderModel extends Model<IOrder> {}

const OrderSchema = new Schema<IOrder, IOrderModel>(
  {
    orderId: {
      type: String,
      required: [true, "Custom Order ID is required."],
      trim: true,
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
        city: { type: String, required: true, trim: true },
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
    orderItems: [OrderItemSchema],
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required."],
      min: [0, "Total amount cannot be negative."],
      validate: {
        validator: Number.isInteger,
        message: (props: ValidatorProps) =>
          `${props.value} is not an integer value for totalAmount (cents).`,
      },
    },
    orderStatus: {
      type: String,
      enum: {
        values: OrderStatusEnum as unknown as string[],
        message: 'Order status "{VALUE}" is not supported.',
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
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
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

OrderSchema.index({ orderId: 1 }, { unique: true });
OrderSchema.index({ "customerDetails.email": 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ createdAt: -1 });

const Order =
  (mongoose.models.Order as IOrderModel) ||
  mongoose.model<IOrder, IOrderModel>("Order", OrderSchema);

export default Order;
