// pages/api/orders/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ZodError } from "zod";
import axios from "axios";
import mongoose from "mongoose"; // For mongoose.Types.ObjectId
import dbConnect from "@/lib/dbConnect";
import Product, { IProduct } from "@/lib/models/Product";
import Order, {
  // IOrder, // savedOrder will be of type IOrder
  OrderCreationAttributes,
  IOrderItemData,
  OrderStatus, // Assuming OrderStatus is exported: export type OrderStatus = (typeof OrderStatusEnum)[number];
} from "@/lib/models/Order";
import {
  CreateOrderSchema,
  CreateOrderInput,
} from "@/lib/validators/orderValidators";
import { generateOrderId } from "@/lib/utils/orderIdHelper";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    await dbConnect();

    const validatedData = CreateOrderSchema.parse(req.body as CreateOrderInput);
    const {
      fullName,
      email,
      phone,
      shippingAddress,
      orderItems: validatedOrderItems,
    } = validatedData;

    console.log("Received fullName from Zod:", fullName);

    let customerFirstName: string = "";
    let customerLastName: string = "";
    const trimmedFullName = fullName.trim();

    if (trimmedFullName) {
      const nameParts = trimmedFullName.split(/\s+/);
      customerFirstName = nameParts.shift() || "";
      if (nameParts.length > 0) {
        customerLastName = nameParts.join(" ");
      }
    }
    console.log("Parsed customerFirstName:", customerFirstName);
    console.log("Parsed customerLastName:", customerLastName);

    const processedOrderItems: IOrderItemData[] = [];
    let calculatedTotalAmount = 0;

    for (const item of validatedOrderItems) {
      const product: IProduct | null = await Product.findById(item.productId);

      if (!product) {
        return res.status(400).json({
          message: `Product with ID ${item.productId} not found. Please remove it from your cart or try again.`,
        });
      }
      if (!product.isActive) {
        return res.status(400).json({
          message: `Product "${product.name}" is currently unavailable. Please remove it from your cart.`,
        });
      }
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Only ${product.stockQuantity} left. Please reduce the quantity.`,
        });
      }

      processedOrderItems.push({
        productId: product._id as mongoose.Types.ObjectId,
        name: product.name,
        priceAtPurchase: product.price,
        quantity: item.quantity,
        image:
          product.images && product.images.length > 0
            ? product.images[0]
            : undefined,
      });
      calculatedTotalAmount += product.price * item.quantity;
    }

    calculatedTotalAmount = Math.round(calculatedTotalAmount);
    const customOrderId = await generateOrderId();

    const newOrderData: OrderCreationAttributes = {
      orderId: customOrderId,
      customerDetails: {
        firstName: customerFirstName,
        lastName: customerLastName,
        email: email.toLowerCase(),
        phone,
        shippingAddress: {
          street: shippingAddress.street,
          barangay: shippingAddress.barangay,
          city: shippingAddress.cityMunicipality, // Maps Zod's cityMunicipality to Mongoose schema's 'city'
          province: shippingAddress.province,
          postalCode: shippingAddress.postalCode,
          country: "Philippines",
        },
      },
      orderItems: processedOrderItems,
      totalAmount: calculatedTotalAmount,
      orderStatus: "PENDING_PAYMENT" as OrderStatus, // Explicitly type if using string literal for enum
      paymentDetails: {}, // Initial empty payment details
    };

    const savedOrder = await new Order(newOrderData).save();

    const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!paymongoSecretKey) {
      console.error("PayMongo API secret key is not configured.");
      return res.status(500).json({
        message:
          "Payment gateway API key configuration error. Please contact support.",
        orderId: savedOrder.orderId,
        internalOrderId: savedOrder.id,
      });
    }

    const paymongoLineItems = processedOrderItems.map((item) => ({
      currency: "PHP",
      amount: item.priceAtPurchase * item.quantity,
      name: item.name,
      quantity: item.quantity,
    }));

    const paymongoPayload = {
      data: {
        attributes: {
          billing: {
            name: fullName,
            email: email.toLowerCase(),
            phone: phone,
            address: {
              line1: shippingAddress.street,
              city: shippingAddress.cityMunicipality,
              state: shippingAddress.province,
              postal_code: shippingAddress.postalCode,
              country: "PH",
            },
          },
          payment_method_types: [
            "gcash",
            "paymaya",
            "card",
            "dob",
            "billease",
            "atome",
          ], // Customize as per your PayMongo setup
          payment_method_options: {
            card: { request_three_d_secure: "automatic" },
          },
          line_items: paymongoLineItems,
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: `Payment for Order #${savedOrder.orderId}`,
          statement_descriptor: "YourStoreName", // Max 22 Chars for some card processors
          success_url: `${appUrl}/checkout/success?order_id_internal=${savedOrder.id}`,
          cancel_url: `${appUrl}/checkout/cancel?order_id_internal=${savedOrder.id}`,
          metadata: {
            internal_order_id: savedOrder.id,
            customer_email: email.toLowerCase(),
          },
        },
      },
    };

    let checkoutUrl;
    let paymongoCheckoutId;
    let paymentIntentIdFromCheckoutResponse;

    try {
      const paymongoResponse = await axios.post(
        "https://api.paymongo.com/v1/checkout_sessions",
        paymongoPayload,
        {
          auth: { username: paymongoSecretKey, password: "" },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      console.log(
        "PayMongo Create Checkout Session Response:",
        JSON.stringify(paymongoResponse.data, null, 2)
      );

      checkoutUrl = paymongoResponse.data?.data?.attributes?.checkout_url;
      paymongoCheckoutId = paymongoResponse.data?.data?.id; // cs_xxx

      const paymentIntentObject =
        paymongoResponse.data?.data?.attributes?.payment_intent;
      if (typeof paymentIntentObject === "string") {
        paymentIntentIdFromCheckoutResponse = paymentIntentObject; // pi_xxx
      } else if (
        typeof paymentIntentObject === "object" &&
        paymentIntentObject !== null
      ) {
        paymentIntentIdFromCheckoutResponse = paymentIntentObject.id; // pi_xxx
      }

      if (!checkoutUrl || !paymongoCheckoutId) {
        console.error(
          "Failed to retrieve checkout_url or checkout_id from PayMongo response:",
          paymongoResponse.data
        );
        // Order already saved, user can retry payment or contact support.
        // Not throwing an error here, but logging it. The calling client will get the 502 from below.
        // We will return the 502 outside this block if these are not found.
      }

      // Update the order with PayMongo details
      // Ensure paymentDetails is initialized if it could be undefined
      savedOrder.paymentDetails = savedOrder.paymentDetails || {};
      savedOrder.paymentDetails.paymongoCheckoutId = paymongoCheckoutId;
      savedOrder.paymentDetails.paymongoPaymentIntentId =
        paymentIntentIdFromCheckoutResponse; // Store Payment Intent ID
      savedOrder.paymentDetails.status = "awaiting_payment_gateway";

      await savedOrder.save();

      console.log(
        `Order ${savedOrder.orderId} updated with CheckoutID: ${paymongoCheckoutId} and PaymentIntentID: ${paymentIntentIdFromCheckoutResponse}`
      );

      if (!checkoutUrl) {
        // If checkoutUrl is still missing after trying to parse
        console.error(
          "Critical: Checkout URL missing from PayMongo response after attempting to save order details."
        );
        // This indicates a problem with PayMongo's response or our parsing of it.
        // The order exists but we can't redirect the user.
        return res.status(502).json({
          message:
            "Payment session created but checkout URL was not provided by gateway.",
          orderId: savedOrder.orderId,
          internalOrderId: savedOrder.id,
        });
      }
    } catch (paymongoError: any) {
      const orderIdentifier = savedOrder
        ? savedOrder.orderId || savedOrder.id
        : "N/A";
      const internalOrderIdentifier = savedOrder ? savedOrder.id : "N/A";
      console.error(
        `PayMongo API Error during checkout session creation for Order ${orderIdentifier}:`,
        paymongoError.response?.data || paymongoError.message
      );
      return res.status(502).json({
        message:
          "Could not initiate payment with payment gateway. Please try again later or contact support.",
        error:
          paymongoError.response?.data?.errors?.[0]?.detail ||
          "Payment gateway communication error.",
        orderId: orderIdentifier,
        internalOrderId: internalOrderIdentifier,
      });
    }

    return res.status(201).json({
      message:
        "Order created and payment session initiated. Redirecting to payment...",
      checkoutUrl: checkoutUrl,
      orderId: savedOrder.orderId,
      internalOrderId: savedOrder.id,
      paymongoCheckoutId: paymongoCheckoutId,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res
        .status(400)
        .json({ message: "Validation error.", errors: error.errors });
    }
    console.error("Create Order General Error:", error);
    if (error instanceof Error && (error as any).isCustomError) {
      return res.status(400).json({ message: error.message });
    }
    return res
      .status(500)
      .json({ message: "Internal Server Error creating order." });
  }
}
