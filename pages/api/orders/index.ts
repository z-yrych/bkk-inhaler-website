// pages/api/orders/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ZodError } from "zod";
import axios from "axios";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Product, { IProduct } from "@/lib/models/Product";
import Order, {
  OrderCreationAttributes,
  IOrderItemData,
  OrderStatus,
  IOrder, // Import IOrder for typing savedOrderForErrorHandling
} from "@/lib/models/Order";
import { CreateOrderSchema } from "@/lib/validators/orderValidators";
import { generateOrderId } from "@/lib/utils/orderIdHelper";

// Define a type for the expected structure of PayMongo API errors
interface PayMongoApiError {
  errors: Array<{
    code?: string;
    detail?: string;
    source?: { pointer: string; attribute: string };
  }>;
}

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

  // FIXED: Error at 43:35 - Typed savedOrderForErrorHandling
  let savedOrderForErrorHandling: IOrder | null = null;

  try {
    await dbConnect();

    const validatedData = CreateOrderSchema.parse(req.body);
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
          city: shippingAddress.cityMunicipality,
          province: shippingAddress.province,
          postalCode: shippingAddress.postalCode,
          country: "Philippines",
        },
      },
      orderItems: processedOrderItems,
      totalAmount: calculatedTotalAmount,
      orderStatus: "PENDING_PAYMENT" as OrderStatus,
      paymentDetails: {},
    };

    const savedOrder = await new Order(newOrderData).save();
    savedOrderForErrorHandling = savedOrder;

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
      amount: item.priceAtPurchase, // UNIT PRICE in cents
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
          ],
          payment_method_options: {
            card: { request_three_d_secure: "automatic" },
          },
          line_items: paymongoLineItems,
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: `Payment for Order #${savedOrder.orderId}`,
          statement_descriptor: "YourStoreName",
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
      paymongoCheckoutId = paymongoResponse.data?.data?.id;

      const paymentIntentObject =
        paymongoResponse.data?.data?.attributes?.payment_intent;
      if (typeof paymentIntentObject === "string") {
        paymentIntentIdFromCheckoutResponse = paymentIntentObject;
      } else if (
        typeof paymentIntentObject === "object" &&
        paymentIntentObject !== null &&
        "id" in paymentIntentObject
      ) {
        paymentIntentIdFromCheckoutResponse = (
          paymentIntentObject as { id: string }
        ).id;
      }

      if (!checkoutUrl || !paymongoCheckoutId) {
        console.error(
          "Failed to retrieve checkout_url or checkout_id from PayMongo response:",
          paymongoResponse.data
        );
        throw new Error(
          "PayMongo checkout session creation did not return expected URLs or IDs."
        );
      }

      savedOrder.paymentDetails = savedOrder.paymentDetails || {};
      savedOrder.paymentDetails.paymongoCheckoutId = paymongoCheckoutId;
      savedOrder.paymentDetails.paymongoPaymentIntentId =
        paymentIntentIdFromCheckoutResponse;
      savedOrder.paymentDetails.status = "awaiting_payment_gateway";

      await savedOrder.save();

      console.log(
        `Order ${savedOrder.orderId} updated with CheckoutID: ${paymongoCheckoutId} and PaymentIntentID: ${paymentIntentIdFromCheckoutResponse}`
      );

      if (!checkoutUrl) {
        console.error(
          "Critical: Checkout URL missing from PayMongo response after attempting to save order details."
        );
        return res.status(502).json({
          message:
            "Payment session created but checkout URL was not provided by gateway.",
          orderId: savedOrder.orderId,
          internalOrderId: savedOrder.id,
        });
      }
    } catch (paymongoError) {
      const orderIdentifier = savedOrderForErrorHandling
        ? savedOrderForErrorHandling.orderId || savedOrderForErrorHandling.id
        : "N/A";
      const internalOrderIdentifier = savedOrderForErrorHandling
        ? savedOrderForErrorHandling.id
        : "N/A";

      let errorMessage = "Payment gateway communication error.";
      if (axios.isAxiosError(paymongoError) && paymongoError.response) {
        const paymongoApiError = paymongoError.response
          .data as PayMongoApiError;
        errorMessage =
          paymongoApiError.errors?.[0]?.detail || paymongoError.message;
        console.error(
          `PayMongo API Error for Order ${orderIdentifier} (Status: ${paymongoError.response.status}):`,
          paymongoApiError.errors
        );
      } else if (paymongoError instanceof Error) {
        errorMessage = paymongoError.message;
        console.error(
          `PayMongo API Error (Non-Axios or Network) for Order ${orderIdentifier}:`,
          paymongoError
        );
      } else {
        console.error(
          `Unknown PayMongo API Error for Order ${orderIdentifier}:`,
          paymongoError
        );
      }

      return res.status(502).json({
        message:
          "Could not initiate payment with payment gateway. Please try again later or contact support.",
        error: errorMessage,
        orderId: orderIdentifier,
        internalOrderId: internalOrderIdentifier,
      });
    }

    // Ensure checkoutUrl is defined before sending it in the response
    if (!checkoutUrl) {
      console.error(
        "Critical: Checkout URL is undefined before sending final response."
      );
      return res.status(502).json({
        message: "Failed to obtain checkout URL from payment gateway.",
        orderId: savedOrder.orderId,
        internalOrderId: savedOrder.id,
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
    if (error instanceof Error) {
      return res.status(500).json({
        message: error.message || "Internal Server Error creating order.",
      });
    }
    return res.status(500).json({
      message: "An unexpected Internal Server Error occurred creating order.",
    });
  }
}
